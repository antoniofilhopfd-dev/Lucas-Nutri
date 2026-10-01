"use server";
import { withSession, fail } from "@/lib/actions/helpers";
import { buildAnamnesis, buildAnamnesisItems } from "@/lib/db/rows";
import { getExtractor } from "@/lib/ai/registry";
import type { ExtractedItem } from "@/lib/ai/types";

/** Extrai e devolve propostas SEM gravar dados clínicos. Só o relato e o provedor são registrados. */
export async function extractAnamnesis(patientId: string, consultationId: string, text: string) {
  if (!text.trim()) return { ok: false as const, message: "Escreva ou grave o relato do paciente." };
  const ex = getExtractor();    // padrão local; provedor externo exige consentimento
  const items = await ex.extract(text, "text");
  return withSession(async (sb) => {
    const { data: a, error } = await sb.from("anamneses").insert(buildAnamnesis(patientId, consultationId, { rawText: text, extractor: ex.name })).select("id").single();
    if (error || !a) return fail(error, "extractAnamnesis");
    return { ok: true as const, anamnesisId: a.id as string, items };
  });
}
/** Grava a decisão do nutricionista sobre cada item (confirmado, editado ou excluído). */
export async function saveAnamnesisReview(anamnesisId: string, patientId: string, items: ExtractedItem[]) {
  if (items.some((i) => i.status === "pending")) return { ok: false as const, message: "Ainda há itens sem decisão." };
  return withSession(async (sb) => {
    const { error } = await sb.from("anamnesis_items").insert(buildAnamnesisItems(anamnesisId, patientId, items));
    return error ? fail(error, "saveAnamnesisReview") : { ok: true as const };
  });
}
