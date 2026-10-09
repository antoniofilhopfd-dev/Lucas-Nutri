"use server";
import { redirect } from "next/navigation";
import { abrirSessao, actorAtual, homeDo, ipDaRequisicao, modoDemo } from "@/server/auth";
import { registrar } from "@/server/auth-core";
import { aceitarConvite, criarConvite, criarPrimeiroAdmin, revogarConvite, semProfissionais } from "@/server/convites";
import { AcessoNegado } from "@/server/authz";
import { RegraNegocio } from "@/server/sql";
import { revalidatePath } from "next/cache";

type R<T = object> = ({ ok: true } & T) | { ok: false; message: string };
const msg = (e: unknown): { ok: false; message: string } => {
  if (e instanceof RegraNegocio || e instanceof AcessoNegado || (e instanceof Error && /senha|símbolo|número|letra/i.test(e.message))) return { ok: false, message: (e as Error).message };
  console.error("convite", e);
  return { ok: false, message: "Não foi possível concluir. Tente novamente." };
};
const redirecionar = (e: unknown) => { if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e; };

/** Primeiro acesso do sistema (só enquanto não há nenhum profissional). Cria o administrador e já entra. */
export async function primeiroAcesso(f: { nome: string; email: string; senha: string }): Promise<R> {
  if (modoDemo() || !(await semProfissionais())) return { ok: false, message: "Indisponível." };
  try {
    const { id } = await criarPrimeiroAdmin(f);
    await abrirSessao(id);
    await registrar("primeiro_acesso", { usuarioId: id, ip: await ipDaRequisicao() });
    redirect(homeDo("admin"));
  } catch (e) { redirecionar(e); return msg(e); }
}

/** O convidado escolhe a própria senha e entra. */
export async function aceitar(token: string, senha: string): Promise<R> {
  if (modoDemo()) return { ok: false, message: "Indisponível." };
  try {
    const { id } = await aceitarConvite(token, senha);
    await abrirSessao(id);
    await registrar("convite_aceito", { usuarioId: id, ip: await ipDaRequisicao() });
    redirect("/nutri");
  } catch (e) { redirecionar(e); return msg(e); }
}

export async function convidar(f: { nome: string; email: string; crn: string; papel: "nutritionist" | "admin" }): Promise<R<{ link: string; expira: string }>> {
  try {
    const { token, expira } = await criarConvite(await actorAtual(), f);
    revalidatePath("/nutri/equipe");
    const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
    return { ok: true, link: `${base}/convite/${token}`, expira: expira.toLocaleDateString("pt-BR") };
  } catch (e) { return msg(e); }
}
export async function revogar(id: string): Promise<R> {
  try { await revogarConvite(await actorAtual(), id); revalidatePath("/nutri/equipe"); return { ok: true }; } catch (e) { return msg(e); }
}
