"use server";
import { z } from "zod";
import { comAtor } from "@/lib/actions/helpers";
import { salvarAvaliacao, salvarEnergia } from "@/server/services/avaliacoes";
import { FormulaBlockedError } from "@/lib/clinical/types";
import type { EnergyInput } from "@/lib/clinical/energy/calculate";
import type { Pair } from "@/lib/clinical/assess";

const pos = z.number().positive();
const assessmentSchema = z.object({
  consultationId: z.string().uuid(), assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: pos, heightCm: pos, waistCm: pos.optional(), hipCm: pos.optional(),
  central: z.record(z.string(), pos).optional(), pairs: z.record(z.string(), z.object({ right: pos, left: pos })).optional(),
});
/** A idade vem do cadastro (data de nascimento) e a consulta precisa estar em rascunho. */
export async function saveAssessment(raw: unknown) {
  const p = assessmentSchema.safeParse(raw);
  if (!p.success) return { ok: false as const, message: "Revise os valores informados." };
  return comAtor((a) => salvarAvaliacao(a, { ...p.data, central: p.data.central as never, pairs: p.data.pairs as Partial<Record<Pair, { right: number; left: number }>> }));
}
export async function saveEnergy(consultationId: string, input: EnergyInput, macro?: Parameters<typeof salvarEnergia>[3]) {
  return comAtor(async (a) => {
    try { return await salvarEnergia(a, consultationId, input, macro); }
    catch (e) { if (e instanceof FormulaBlockedError) throw new (await import("@/server/sql")).RegraNegocio("Equação em revisão científica: indisponível por enquanto."); throw e; }
  });
}
