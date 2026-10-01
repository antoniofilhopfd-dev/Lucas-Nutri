import { supabaseServer } from "@/lib/supabase/server";
export type Result<T = unknown> = ({ ok: true } & T) | { ok: false; message: string };
export const SAVE_ERROR = "Não foi possível salvar. Tente novamente.";
/** Sessão obrigatória; detalhes técnicos só no log do servidor, nunca para o usuário. */
export async function withSession<T>(fn: (sb: Awaited<ReturnType<typeof supabaseServer>>, userId: string) => Promise<Result<T>>): Promise<Result<T>> {
  try {
    const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser();
    if (!user) return { ok: false, message: "Faça login para continuar." };
    return await fn(sb, user.id);
  } catch (e) { console.error("action", e); return { ok: false, message: SAVE_ERROR }; }
}
export const fail = (e: unknown, ctx: string): Result<never> => { console.error(ctx, e); return { ok: false, message: SAVE_ERROR }; };
