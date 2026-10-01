import { bmi, waistHipRatio, waistHeightRatio, asymmetry } from "./anthropometry/indices";
import { classifyBmi, BMI_CLASSIFICATION } from "./classifications/bmi";
import { bodyFatPercent, fatMassKg, leanMassKg, FAT_EQUATIONS, type FatEquation } from "./body-composition/fat";

export const PAIRS = ["forearm", "biceps_relaxed", "biceps_contracted", "thigh_proximal", "thigh_medial", "thigh_distal", "calf"] as const;
export type Pair = (typeof PAIRS)[number];

export function assess(i: { weightKg: number; heightCm: number; waistCm?: number; hipCm?: number; pairs?: Partial<Record<Pair, { right: number; left: number }>>; density?: number; fatEquation?: FatEquation }) {
  const imc = bmi(i.weightKg, i.heightCm);
  const out: Record<string, unknown> = { bmi: imc, bmi_class: classifyBmi(imc), classification_source: BMI_CLASSIFICATION.source, classification_version: BMI_CLASSIFICATION.version };
  if (i.waistCm && i.hipCm) out.waist_hip_ratio = waistHipRatio(i.waistCm, i.hipCm);
  if (i.waistCm) out.waist_height_ratio = waistHeightRatio(i.waistCm, i.heightCm);
  if (i.pairs) out.asymmetry = Object.fromEntries(Object.entries(i.pairs).map(([k, v]) => [k, asymmetry(v!.right, v!.left)]));
  if (i.density !== undefined) {
    const eq = i.fatEquation ?? "siri";
    const pct = bodyFatPercent(i.density, eq);
    Object.assign(out, { fat_equation: eq, fat_equation_version: FAT_EQUATIONS[eq].version, body_fat_percentage: pct, fat_mass_kg: fatMassKg(i.weightKg, pct), lean_mass_kg: leanMassKg(i.weightKg, pct) });
  }
  return out;
}
