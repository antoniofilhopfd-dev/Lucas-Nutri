import { transacao } from "../mysql";
import { auditar, exigirEscritaConsulta, type Actor } from "../authz";
import { inserir, dataISO } from "../sql";
import { buildAssessment, buildCircumferences, buildEnergy, type AssessmentInput } from "@/lib/db/rows";
import type { EnergyInput } from "@/lib/clinical/energy/calculate";

export type EntradaAvaliacao = Omit<AssessmentInput, "patientId" | "birthDate">;

/** Grava avaliação + perímetros só com a consulta em rascunho. A idade vem da data de nascimento do cadastro. */
export async function salvarAvaliacao(a: Actor, i: EntradaAvaliacao): Promise<{ id: string }> {
  return transacao(async (q) => {
    const c = await exigirEscritaConsulta(q, a, i.consultationId, true);
    const [p] = await q.consultar<{ birth_date: Date | string }>("SELECT birth_date FROM patients WHERE id=?", [c.patient_id]);
    const full: AssessmentInput = { ...i, patientId: c.patient_id, birthDate: dataISO(p.birth_date) };
    const id = await inserir(q, "anthropometric_assessments", buildAssessment(full));
    for (const r of buildCircumferences(id, full)) await inserir(q, "circumference_measurements", r);
    await auditar(q, a, { patientId: c.patient_id, consultationId: c.id, action: "insert", entity: "anthropometric_assessments", entityId: id });
    return { id };
  });
}

/** Grava o cálculo energético completo (entradas e saídas) e a estratégia. */
export async function salvarEnergia(a: Actor, consultationId: string, input: EnergyInput, macro?: Parameters<typeof buildEnergy>[4]): Promise<{ id: string }> {
  return transacao(async (q) => {
    const c = await exigirEscritaConsulta(q, a, consultationId, true);
    const built = buildEnergy(c.patient_id, c.id, a.id, input, macro);
    const id = await inserir(q, "energy_calculations", built.calc);
    await inserir(q, "caloric_strategies", built.strategy(id));
    await auditar(q, a, { patientId: c.patient_id, consultationId: c.id, action: "insert", entity: "energy_calculations", entityId: id });
    return { id };
  });
}

export async function salvarComposicao(a: Actor, consultationId: string, r: { protocol?: string; formulaVersion?: string; fatEquation?: string; fatEquationVersion?: string; inputs: unknown; outputs: unknown }): Promise<{ id: string }> {
  return transacao(async (q) => {
    const c = await exigirEscritaConsulta(q, a, consultationId, true);
    const id = await inserir(q, "body_composition_results", { patient_id: c.patient_id, consultation_id: c.id, protocol: r.protocol ?? null, formula_version: r.formulaVersion ?? null, fat_equation: r.fatEquation ?? null, fat_equation_version: r.fatEquationVersion ?? null, inputs: r.inputs, outputs: r.outputs });
    await auditar(q, a, { patientId: c.patient_id, consultationId: c.id, action: "insert", entity: "body_composition_results", entityId: id });
    return { id };
  });
}

import { exigirLerPaciente } from "../authz";
/** Resumo para o prontuário: as duas últimas avaliações e o último cálculo energético. */
export async function resumoClinico(a: Actor, patientId: string) {
  return transacao(async (q) => {
    await exigirLerPaciente(q, a, patientId);
    const avaliacoes = await q.consultar<{ assessment_date: Date; weight_kg: number; bmi: number }>("SELECT assessment_date, weight_kg, bmi FROM anthropometric_assessments WHERE patient_id=? ORDER BY assessment_date DESC LIMIT 2", [patientId]);
    const [energia] = await q.consultar<{ equation: string; equation_version: string; outputs: unknown }>("SELECT equation, equation_version, outputs FROM energy_calculations WHERE patient_id=? ORDER BY created_at DESC LIMIT 1", [patientId]);
    const consultas = await q.consultar<{ id: string; consultation_type: string; status: string; record_state: string }>("SELECT id, consultation_type, status, record_state FROM consultations WHERE patient_id=? ORDER BY COALESCE(scheduled_at, created_at) DESC LIMIT 5", [patientId]);
    return { avaliacoes, energia: energia ?? null, consultas };
  });
}
