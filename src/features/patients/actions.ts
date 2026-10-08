"use server";
import { patientSchema } from "./schema";
import { comAtor } from "@/lib/actions/helpers";
import { criarPaciente, emitirCodigoPaciente } from "@/server/services/pacientes";

export async function createPatient(raw: unknown) {
  const p = patientSchema.safeParse(raw);
  if (!p.success) return { ok: false as const, message: "Revise os campos destacados.", fields: p.error.flatten().fieldErrors as Record<string, string[]> };
  return comAtor((a) => criarPaciente(a, p.data));
}
/** O nutricionista gera o código de acesso do paciente (mostrado uma única vez, para enviar pelo WhatsApp). */
export async function gerarCodigoAcesso(patientId: string) {
  return comAtor(async (a) => ({ codigo: await emitirCodigoPaciente(a, patientId) }));
}
