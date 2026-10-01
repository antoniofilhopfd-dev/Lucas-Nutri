"use server";
import { withSession, fail } from "@/lib/actions/helpers";
import { messageSchema } from "./rules";
import { buildMessage } from "@/lib/db/rows";

/** O destinatário é resolvido no servidor (paciente ↔ nutricionista responsável); o RLS reforça. */
export async function sendMessage(patientId: string, raw: unknown) {
  const p = messageSchema.safeParse(raw); if (!p.success || p.data.kind !== "text") return { ok: false as const, message: "Escreva uma mensagem." };
  const body = p.data.body;
  return withSession(async (sb, uid) => {
    const { data: pt, error } = await sb.from("patients").select("id, nutritionist_id").eq("id", patientId).single();
    if (error || !pt) return fail(error, "sendMessage.patient");
    const receiver = uid === pt.id ? pt.nutritionist_id : pt.id;
    const { error: e2 } = await sb.from("messages").insert(buildMessage(patientId, uid, receiver, body));
    return e2 ? fail(e2, "sendMessage") : { ok: true as const };
  });
}
export async function markRead(ids: string[]) {
  return withSession(async (sb) => { const { error } = await sb.rpc("mark_read", { p_ids: ids }); return error ? fail(error, "markRead") : { ok: true as const }; });
}
