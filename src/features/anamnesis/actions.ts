"use server";
import { comAtor } from "@/lib/actions/helpers";
import { registrarAnamnese, decidirItens } from "@/server/services/anamnese";
import { getExtractor } from "@/lib/ai/registry";
import type { ExtractedItem } from "@/lib/ai/types";

/** Extrai e devolve PROPOSTAS. Só o relato e o provedor ficam registrados; nada vira dado clínico sem revisão. */
export async function extractAnamnesis(consultationId: string, text: string) {
  if (!text.trim()) return { ok: false as const, message: "Escreva ou grave o relato do paciente." };
  const ex = getExtractor();
  const items = await ex.extract(text, "text");
  return comAtor(async (a) => ({ anamnesisId: (await registrarAnamnese(a, consultationId, { rawText: text, extractor: ex.name })).id, items }));
}
export async function saveAnamnesisReview(anamnesisId: string, items: ExtractedItem[]) { return comAtor(async (a) => { await decidirItens(a, anamnesisId, items); return {}; }); }
