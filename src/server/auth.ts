/** Autenticação ligada ao Next (cookies/redirect). Servidor-only. Cookie httpOnly com token aleatório; o banco guarda só o hash. */
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { criarSessaoDb, encerrarSessaoDb, registrar, usuarioDaSessao, SESSAO_DIAS, type Papel, type Usuario } from "./auth-core";
import { AcessoNegado, type Actor } from "./authz";

export const COOKIE_SESSAO = "bn_sessao";
/** Modo demonstração (protótipo) ou banco não configurado: nenhuma área real abre. */
export const modoDemo = () => process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.MYSQL_URL;

export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  if (modoDemo()) return null;
  return usuarioDaSessao((await cookies()).get(COOKIE_SESSAO)?.value);
});
export async function ipDaRequisicao(): Promise<string | null> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
export const homeDo = (p: Papel) => (p === "patient" ? "/paciente" : "/nutri");

export async function exigirUsuario(papeis?: Papel[]): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) redirect(modoDemo() ? "/demo" : "/login");
  if (papeis && !papeis.includes(u.papel)) {
    await registrar("acesso_negado", { usuarioId: u.id, detalhe: "área de outro perfil", ip: await ipDaRequisicao() });
    redirect("/acesso-negado");
  }
  return u;
}
/** Para ações de servidor: devolve quem é o ator ou lança AcessoNegado (sem sessão, nada passa). */
export async function actorAtual(): Promise<Actor> {
  const u = await usuarioAtual();
  if (!u) throw new AcessoNegado("Sessão expirada. Entre de novo.");
  return { id: u.id, papel: u.papel };
}
export async function abrirSessao(usuarioId: string): Promise<void> {
  const h = await headers();
  const { token, expira } = await criarSessaoDb(usuarioId, await ipDaRequisicao(), h.get("user-agent"));
  (await cookies()).set(COOKIE_SESSAO, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expira, maxAge: SESSAO_DIAS * 86_400 });
}
export async function fecharSessao(): Promise<void> {
  const c = await cookies();
  const token = c.get(COOKIE_SESSAO)?.value;
  if (token) await encerrarSessaoDb(token);
  c.delete(COOKIE_SESSAO);
}
