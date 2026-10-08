import { actorAtual } from "@/server/auth";
import { AcessoNegado, type Actor } from "@/server/authz";
import { RegraNegocio } from "@/server/sql";

export type Result<T = unknown> = ({ ok: true } & T) | { ok: false; message: string };
export const SAVE_ERROR = "Não foi possível salvar. Tente novamente.";

/** Sessão obrigatória. Erros de regra viram mensagem clara; detalhes técnicos só no log do servidor. */
export async function comAtor<T>(fn: (a: Actor) => Promise<T>): Promise<Result<T extends object ? T : { value: T }>> {
  try {
    const r = await fn(await actorAtual());
    return ({ ok: true, ...(r !== null && typeof r === "object" ? r : { value: r }) }) as never;
  } catch (e) {
    if (e instanceof AcessoNegado) return { ok: false, message: e.message === "Acesso negado." ? "Você não tem acesso a este recurso." : e.message };
    if (e instanceof RegraNegocio) return { ok: false, message: e.message };
    console.error("action", e);
    return { ok: false, message: SAVE_ERROR };
  }
}
