/** Montagem das linhas gravadas no banco. Funções puras; o contrato com o schema é verificado em rows.test.ts. */
import { ageAt } from "@/lib/utils/age";
import { assess, type Pair } from "@/lib/clinical/assess";
import { calculateEnergy, type EnergyInput } from "@/lib/clinical/energy/calculate";
import { BMR_META } from "@/lib/clinical/energy/bmr";
import { macrosByPercent, macrosByGramsPerKg } from "@/lib/clinical/macronutrients/macros";
import type { ExtractedItem } from "@/lib/ai/types";
import { toPersist } from "@/features/anamnesis/review";

export interface AssessmentInput {
  patientId: string; consultationId: string; assessmentDate: string; birthDate: string;
  weightKg: number; heightCm: number; waistCm?: number; hipCm?: number;
  central?: Partial<Record<"neck" | "shoulder" | "chest" | "abdomen", number>>;
  pairs?: Partial<Record<Pair, { right: number; left: number }>>;
}
export function buildAssessment(i: AssessmentInput) {
  const r = assess({ weightKg: i.weightKg, heightCm: i.heightCm, waistCm: i.waistCm, hipCm: i.hipCm, pairs: i.pairs }) as Record<string, any>;
  return {
    patient_id: i.patientId, consultation_id: i.consultationId, assessment_date: i.assessmentDate,
    age_at_assessment: ageAt(i.birthDate, i.assessmentDate),       // idade na data da avaliação, preservada
    weight_kg: i.weightKg, height_cm: i.heightCm,
    bmi: r.bmi, waist_hip_ratio: r.waist_hip_ratio ?? null, waist_height_ratio: r.waist_height_ratio ?? null,
    classification_source: r.classification_source, classification_version: r.classification_version,
  };
}
export function buildCircumferences(assessmentId: string, i: AssessmentInput) {
  const rows: { assessment_id: string; patient_id: string; site: string; side: "right" | "left" | "center"; value_cm: number }[] = [];
  const base = { assessment_id: assessmentId, patient_id: i.patientId };
  for (const [site, v] of Object.entries(i.pairs ?? {})) { rows.push({ ...base, site, side: "right", value_cm: v!.right }, { ...base, site, side: "left", value_cm: v!.left }); }
  for (const [site, v] of Object.entries({ ...i.central, waist: i.waistCm, hip: i.hipCm })) if (v) rows.push({ ...base, site, side: "center", value_cm: v });
  return rows;   // assimetria nunca é gravada: é derivada |D − E|
}

export function buildEnergy(patientId: string, consultationId: string, input: EnergyInput, macro?: { mode: "percent"; pct: { protein: number; carbohydrate: number; fat: number } } | { mode: "g_per_kg"; protein: number; fat: number }) {
  const r = calculateEnergy(input);
  const o = r.outputs as Record<string, any>;
  const calc = {
    patient_id: patientId, consultation_id: consultationId, equation: o.equation, equation_version: o.equation_version,
    method: o.method as "factorial" | "detailed", tef: o.tef ?? null, inputs: r.inputs, outputs: r.outputs,
  };
  const s = input.strategy;
  let macroOut: unknown = null, macroIn: unknown = null;
  if (macro?.mode === "percent") { macroIn = macro; macroOut = macrosByPercent(o.vet, macro.pct); }
  if (macro?.mode === "g_per_kg") { macroIn = macro; macroOut = macrosByGramsPerKg(o.vet, input.weightKg!, macro); }
  const strategy = (energyCalculationId: string) => ({
    patient_id: patientId, consultation_id: consultationId, energy_calculation_id: energyCalculationId,
    strategy_type: s.type, strategy_value: s.type === "percent" ? s.value : s.type === "absolute" ? s.kcal : null,
    get_kcal: o.get, vet_kcal: o.vet, macro_mode: macro?.mode ?? null, macro_inputs: macroIn, macro_outputs: macroOut,
  });
  return { calc, strategy, version: BMR_META[input.equation].version };
}

export const buildCheckin = (patientId: string, date: string, c: { waterMl: number; goalMl?: number; trained?: boolean; modality?: string; minutes?: number }) => ({
  patient_id: patientId, checkin_date: date, water_ml: c.waterMl, water_goal_ml: c.goalMl ?? 3000,
  trained: c.trained ?? null, training_modality: c.trained ? c.modality ?? null : null, training_minutes: c.trained ? c.minutes ?? null : null,
});
export const buildMealLog = (patientId: string, m: { mealType: string; photoPath?: string; before?: string; after?: string }) => ({
  patient_id: patientId, meal_type: m.mealType, photo_path: m.photoPath ?? null, feeling_before: m.before ?? null, feeling_after: m.after ?? null,
});
export const buildMessage = (patientId: string, senderId: string, receiverId: string, body: string) => ({ patient_id: patientId, sender_id: senderId, receiver_id: receiverId, kind: "text" as const, body });

/** Só itens confirmados/editados chegam ao banco como dado clínico; os demais ficam registrados com o status. */
export function buildAnamnesisItems(anamnesisId: string, patientId: string, items: ExtractedItem[]) {
  return items.map((i) => ({ anamnesis_id: anamnesisId, patient_id: patientId, category: i.category, field: i.field, value: i.value, source_kind: i.source.kind, source_snippet: i.source.snippet, confidence: i.confidence ?? null, status: i.status }));
}
export const confirmedOnly = (items: ExtractedItem[]) => toPersist(items);
export const buildAnamnesis = (patientId: string, consultationId: string, o: { rawText: string; extractor: string; stt?: string }) => ({ patient_id: patientId, consultation_id: consultationId, raw_text: o.rawText, extractor_provider: o.extractor, stt_provider: o.stt ?? null });

export const buildDiet = (patientId: string, consultationId: string, o: { vetKcal?: number; notes?: string; version?: number; parentId?: string }) => ({
  patient_id: patientId, consultation_id: consultationId, version: o.version ?? 1, parent_id: o.parentId ?? null, status: "draft" as const, notes: o.notes ?? null, vet_kcal: o.vetKcal ?? null,
});
export const buildDietMeal = (dietId: string, name: string, time: string | null, position: number) => ({ diet_id: dietId, name, meal_time: time, position });
export const buildDietFood = (mealId: string, foodId: string, quantity: number, household?: string) => ({ meal_id: mealId, food_id: foodId, quantity, household_measure: household ?? null });
