"use server";
import { z } from "zod";
import { withSession, fail } from "@/lib/actions/helpers";
import { buildAssessment, buildCircumferences, buildEnergy, type AssessmentInput } from "@/lib/db/rows";
import { FormulaBlockedError } from "@/lib/clinical/types";
import type { EnergyInput } from "@/lib/clinical/energy/calculate";

const pos = z.number().positive();
const assessmentSchema = z.object({
  patientId: z.string().uuid(), consultationId: z.string().uuid(), assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: pos, heightCm: pos, waistCm: pos.optional(), hipCm: pos.optional(),
  central: z.record(z.string(), pos).optional(),
  pairs: z.record(z.string(), z.object({ right: pos, left: pos })).optional(),
});

/** Grava avaliação + perímetros. A idade vem da data de nascimento do cadastro (lida via RLS). */
export async function saveAssessment(raw: unknown) {
  const p = assessmentSchema.safeParse(raw); if (!p.success) return { ok: false as const, message: "Revise os valores informados." };
  return withSession(async (sb) => {
    const { data: pt, error: e0 } = await sb.from("patients").select("birth_date").eq("id", p.data.patientId).single();
    if (e0 || !pt) return fail(e0, "saveAssessment.patient");
    const input = { ...p.data, birthDate: pt.birth_date } as AssessmentInput;
    const { data: a, error } = await sb.from("anthropometric_assessments").insert(buildAssessment(input)).select("id").single();
    if (error || !a) return fail(error, "saveAssessment.insert");
    const circ = buildCircumferences(a.id, input);
    if (circ.length) { const { error: e2 } = await sb.from("circumference_measurements").insert(circ); if (e2) return fail(e2, "saveAssessment.circ"); }
    return { ok: true as const, id: a.id as string };
  });
}

/** Grava o cálculo energético completo (inputs/outputs) e a estratégia. Equações bloqueadas retornam aviso claro. */
export async function saveEnergy(patientId: string, consultationId: string, input: EnergyInput, macro?: Parameters<typeof buildEnergy>[3]) {
  let built: ReturnType<typeof buildEnergy>;
  try { built = buildEnergy(patientId, consultationId, input, macro); }
  catch (e) { return { ok: false as const, message: e instanceof FormulaBlockedError ? "Equação em revisão científica: indisponível por enquanto." : e instanceof Error ? e.message : "Dados inválidos." }; }
  return withSession(async (sb) => {
    const { data: c, error } = await sb.from("energy_calculations").insert(built.calc).select("id").single();
    if (error || !c) return fail(error, "saveEnergy.calc");
    const { error: e2 } = await sb.from("caloric_strategies").insert(built.strategy(c.id)); if (e2) return fail(e2, "saveEnergy.strategy");
    return { ok: true as const, id: c.id as string };
  });
}
