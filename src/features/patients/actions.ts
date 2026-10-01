"use server";
import { patientSchema } from "./schema";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type ActionResult = { ok: true; id: string } | { ok: false; message: string; fields?: Record<string, string[]> };

export async function createPatient(raw: unknown): Promise<ActionResult> {
  const parsed = patientSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Revise os campos destacados.", fields: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user || !["nutritionist", "admin"].includes(user.app_metadata?.role)) return { ok: false, message: "Acesso negado." };
  const v = parsed.data;
  try {
    const admin = supabaseAdmin();
    const { data: created, error } = await admin.auth.admin.createUser({ phone: v.phone, phone_confirm: true, app_metadata: { role: "patient" } });
    if (error || !created.user) throw error;
    const id = created.user.id;
    const { error: e1 } = await admin.from("profiles").insert({ id, role: "patient", full_name: v.full_name });
    if (e1) throw e1;
    const { full_name: _n, ...rest } = v;
    const { error: e2 } = await admin.from("patients").insert({ ...rest, email: v.email || null, id, nutritionist_id: user.id });
    if (e2) throw e2;
    return { ok: true, id };
  } catch (err) {
    console.error("createPatient", err); // detalhe técnico só no log do servidor
    return { ok: false, message: "Não foi possível salvar. Tente novamente." };
  }
}
