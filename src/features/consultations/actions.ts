"use server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({
  patient_id: z.string().uuid(),
  consultation_type: z.enum(["initial", "follow_up", "reassessment", "online"]),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
});
export type CreateConsultationResult = { ok: true; id: string } | { ok: false; message: string };

/** O RLS garante que o paciente pertence à carteira de quem cria; aqui só validamos a forma. */
export async function createConsultation(raw: unknown): Promise<CreateConsultationResult> {
  const p = schema.safeParse(raw); if (!p.success) return { ok: false, message: "Revise os campos." };
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, message: "Faça login para continuar." };
  const { data, error } = await sb.from("consultations").insert({ ...p.data, nutritionist_id: user.id }).select("id").single();
  if (error || !data) { console.error("createConsultation", error); return { ok: false, message: "Não foi possível criar a consulta. Tente novamente." }; }
  return { ok: true, id: data.id };
}
export async function finalizeConsultation(id: string): Promise<{ ok: boolean; message?: string }> {
  const sb = await supabaseServer(); const { error } = await sb.rpc("finalize_consultation", { p_id: id });
  if (error) { console.error("finalizeConsultation", error); return { ok: false, message: "Não foi possível finalizar a consulta." }; }
  return { ok: true };
}
export async function amendConsultation(id: string, reason: string, notes: string): Promise<{ ok: boolean; message?: string }> {
  if (reason.trim().length < 5) return { ok: false, message: "Informe o motivo da alteração (mín. 5 caracteres)." };
  const sb = await supabaseServer(); const { error } = await sb.rpc("amend_consultation", { p_id: id, p_reason: reason, p_notes: notes });
  if (error) { console.error("amendConsultation", error); return { ok: false, message: "Não foi possível registrar a emenda." }; }
  return { ok: true };
}
