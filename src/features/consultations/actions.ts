"use server";
import { z } from "zod";
import { comAtor } from "@/lib/actions/helpers";
import { criarConsulta, finalizarConsulta, emendarConsulta } from "@/server/services/consultas";

const schema = z.object({ patient_id: z.string().uuid(), consultation_type: z.enum(["initial", "follow_up", "reassessment", "online"]), scheduled_at: z.string().datetime({ offset: true }).optional() });

export async function createConsultation(raw: unknown) {
  const p = schema.safeParse(raw);
  if (!p.success) return { ok: false as const, message: "Revise os campos." };
  return comAtor((a) => criarConsulta(a, { patientId: p.data.patient_id, consultationType: p.data.consultation_type, scheduledAt: p.data.scheduled_at ? new Date(p.data.scheduled_at) : undefined }));
}
export async function finalizeConsultation(id: string) { return comAtor(async (a) => { await finalizarConsulta(a, id); return {}; }); }
export async function amendConsultation(id: string, reason: string, notes: string) { return comAtor(async (a) => { await emendarConsulta(a, id, reason, notes); return {}; }); }
