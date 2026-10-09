"use server";
import { redirect } from "next/navigation";
import { nutritionistLoginSchema, phoneSchema, otpSchema, GENERIC_LOGIN_ERROR, GENERIC_CODE_ERROR } from "./schemas";
import { abrirSessao, fecharSessao, homeDo, ipDaRequisicao, modoDemo, usuarioAtual } from "@/server/auth";
import { autenticarProfissional, bloqueadoPorFalhas, contaPendente, emitirCodigo, entrarComCodigo, pacientePorTelefone, registrar } from "@/server/auth-core";
import { bancoDireto } from "@/server/mysql";
import { enviarCodigo, smsConfigurado } from "@/server/sms";

type R = { ok: false; message: string } | { ok: true };
const FAIL = (message: string): R => ({ ok: false, message });
const BLOQUEADO = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";

/** Nutricionista/admin: CRN (ou e-mail) + senha. A mensagem de erro é a mesma para conta inexistente e senha errada. */
export async function loginProfissional(raw: unknown): Promise<R> {
  if (modoDemo()) return FAIL("O sistema está em modo demonstração.");
  const p = nutritionistLoginSchema.safeParse(raw);
  if (!p.success) return FAIL(p.error.issues[0].message);
  const ip = await ipDaRequisicao(), id = p.data.identifier.toUpperCase();
  try {
    if (await bloqueadoPorFalhas(id, ip)) return FAIL(BLOQUEADO);
    const u = await autenticarProfissional(p.data.identifier, p.data.password);
    if (!u) { if (await contaPendente(p.data.identifier, p.data.password)) return FAIL("Seu cadastro está aguardando aprovação do administrador."); await registrar("login_falhou", { identificador: id, ip }); return FAIL(GENERIC_LOGIN_ERROR); }
    await abrirSessao(u.id);
    await registrar("login_ok", { usuarioId: u.id, identificador: id, ip });
    redirect(homeDo(u.papel));
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    console.error("loginProfissional", e);
    return FAIL("Não foi possível entrar. Tente novamente.");
  }
}

/** Paciente, passo 1: envia o código. A resposta é a mesma exista ou não o telefone (evita enumeração). */
export async function pedirCodigo(raw: unknown): Promise<R> {
  if (modoDemo()) return FAIL("O sistema está em modo demonstração.");
  const p = phoneSchema.safeParse(raw);
  if (!p.success) return FAIL(p.error.issues[0].message);
  const ip = await ipDaRequisicao();
  try {
    if (await bloqueadoPorFalhas(p.data.phone, ip)) return FAIL(BLOQUEADO);
    const u = await pacientePorTelefone(p.data.phone);
    await registrar("codigo_pedido", { identificador: p.data.phone, ip });
    // Sem provedor de SMS não há como entregar um código novo; emitir aqui invalidaria o que o nutricionista enviou pelo WhatsApp.
    if (u && smsConfigurado()) await enviarCodigo(p.data.phone, await emitirCodigo(bancoDireto(), u.id));
  } catch (e) { console.error("pedirCodigo", e); }
  return { ok: true };
}
/** Paciente, passo 2: confere o código (uso único, 10 min, 5 tentativas). */
export async function entrarPaciente(raw: unknown): Promise<R> {
  if (modoDemo()) return FAIL("O sistema está em modo demonstração.");
  const p = otpSchema.safeParse(raw);
  if (!p.success) return FAIL(p.error.issues[0].message);
  const ip = await ipDaRequisicao();
  try {
    if (await bloqueadoPorFalhas(p.data.phone, ip)) return FAIL(BLOQUEADO);
    const u = await entrarComCodigo(p.data.phone, p.data.token);
    if (!u) { await registrar("login_falhou", { identificador: p.data.phone, ip }); return FAIL(GENERIC_CODE_ERROR); }
    await abrirSessao(u.id);
    await registrar("login_ok", { usuarioId: u.id, identificador: p.data.phone, ip });
    redirect(homeDo(u.papel));
  } catch (e) {
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    console.error("entrarPaciente", e);
    return FAIL("Não foi possível entrar. Tente novamente.");
  }
}
export async function logout() { await fecharSessao(); redirect("/login"); }
export async function goHome() { const u = await usuarioAtual(); redirect(u ? homeDo(u.papel) : "/login"); }
