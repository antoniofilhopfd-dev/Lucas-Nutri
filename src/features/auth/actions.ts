"use server";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nutritionistLoginSchema, phoneSchema, otpSchema, GENERIC_LOGIN_ERROR } from "./schemas";
import { homeFor, isRole } from "@/lib/auth/roles";

type R = { ok: false; message: string } | { ok: true };
const FAIL = (message: string): R => ({ ok: false, message });

async function auditLogin(method: string) {
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser();
  if (user) await sb.from("audit_logs").insert({ user_id: user.id, action: "login", entity: "auth", entity_id: method });
}

/** Nutricionista: CRN + senha. O CRN é resolvido para o e-mail interno no servidor (nunca exposto). */
export async function loginNutritionist(raw: unknown): Promise<R> {
  const p = nutritionistLoginSchema.safeParse(raw); if (!p.success) return FAIL(p.error.issues[0].message);
  try {
    const admin = supabaseAdmin();
    const { data: n } = await admin.from("nutritionists").select("id").eq("crn", p.data.crn).maybeSingle();
    if (!n) return FAIL(GENERIC_LOGIN_ERROR);
    const { data: u } = await admin.auth.admin.getUserById(n.id);
    if (!u.user?.email) return FAIL(GENERIC_LOGIN_ERROR);
    const sb = await supabaseServer();
    const { error } = await sb.auth.signInWithPassword({ email: u.user.email, password: p.data.password });
    if (error) return FAIL(GENERIC_LOGIN_ERROR);
    await auditLogin("crn_password");
  } catch (e) { console.error("loginNutritionist", e); return FAIL("Não foi possível entrar. Tente novamente."); }
  redirect("/nutri");
}

/** Paciente, passo 1: envia o SMS. Não cria usuário: só pacientes cadastrados pelo nutricionista entram. */
export async function sendPatientOtp(raw: unknown): Promise<R> {
  const p = phoneSchema.safeParse(raw); if (!p.success) return FAIL(p.error.issues[0].message);
  const sb = await supabaseServer();
  const { error } = await sb.auth.signInWithOtp({ phone: p.data.phone, options: { shouldCreateUser: false } });
  if (error) console.error("sendPatientOtp", error.message);
  return { ok: true };   // resposta idêntica exista ou não o telefone (evita enumeração)
}
/** Paciente, passo 2: valida o código. */
export async function verifyPatientOtp(raw: unknown): Promise<R> {
  const p = otpSchema.safeParse(raw); if (!p.success) return FAIL(p.error.issues[0].message);
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.verifyOtp({ phone: p.data.phone, token: p.data.token, type: "sms" });
  if (error || !data.user) return FAIL("Código inválido ou expirado.");
  const role = data.user.app_metadata?.role;
  if (role !== "patient") { await sb.auth.signOut(); return FAIL("Código inválido ou expirado."); }
  await auditLogin("phone_otp");
  redirect("/paciente");
}
export async function logout() {
  const sb = await supabaseServer(); await sb.auth.signOut(); redirect("/login");
}
export async function goHome() {
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser();
  const r = user?.app_metadata?.role; redirect(isRole(r) ? homeFor(r) : "/login");
}
