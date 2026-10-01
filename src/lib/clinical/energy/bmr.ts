import { FormulaBlockedError, type FormulaMeta, type Sex } from "../types";

export type BmrEquation = "mifflin" | "harris_benedict_revised" | "katch_mcardle" | "cunningham" | "fao_who";
export const BMR_META: Record<BmrEquation, FormulaMeta> = {
  mifflin: { id: "mifflin", name: "Mifflin-St Jeor", author: "Mifflin et al.", year: 1990, population: "Adultos", equation: "10·P + 6,25·A − 5·I + (5 | −161)", reference: "Mifflin MD et al. (1990) Am J Clin Nutr 51:241-247.", version: "1.0", effective_date: "2026-10-01", status: "approved" },
  harris_benedict_revised: { id: "harris_benedict_revised", name: "Harris-Benedict revisada", author: "Roza & Shizgal", year: 1984, population: "Adultos", equation: "H: 88,362 + 13,397·P + 4,799·A − 5,677·I | M: 447,593 + 9,247·P + 3,098·A − 4,330·I", reference: "Roza AM, Shizgal HM (1984) Am J Clin Nutr 40:168-182.", version: "1.0", effective_date: "2026-10-01", status: "approved" },
  katch_mcardle: { id: "katch_mcardle", name: "Katch-McArdle", author: "Katch & McArdle", year: null, population: "Adultos (requer MLG)", equation: "370 + 21,6·MLG", reference: "McArdle WD, Katch FI, Katch VL. Exercise Physiology.", version: "1.0", effective_date: "2026-10-01", status: "approved" },
  cunningham: { id: "cunningham", name: "Cunningham", author: "Cunningham", year: 1980, population: "Atletas (requer MLG)", equation: "500 + 22·MLG", reference: "Cunningham JJ (1980) Am J Clin Nutr 33:2372-2374.", version: "1.0", effective_date: "2026-10-01", status: "approved" },
  // Coeficientes por faixa etária não fornecidos: nada é inferido.
  fao_who: { id: "fao_who", name: "FAO/OMS", author: "FAO/WHO/UNU", year: 1985, population: "Por faixa etária", equation: "—", reference: "FAO/WHO/UNU (1985); FAO (2001) Human energy requirements.", version: "0.0", effective_date: "2026-10-01", status: "pending_review" },
};

export interface BmrInput { sex: Sex; weightKg?: number; heightCm?: number; age?: number; leanMassKg?: number }
const need = (v: number | undefined, label: string) => { if (v === undefined || !(v > 0)) throw new Error(`${label} obrigatório para esta equação`); return v; };

/** Retorna TMB (kcal/dia) e metadados. Katch/Cunningham nunca estimam MLG silenciosamente. */
export function bmr(eq: BmrEquation, i: BmrInput) {
  const meta = BMR_META[eq];
  if (meta.status !== "approved") throw new FormulaBlockedError(meta.id);
  let kcal: number;
  switch (eq) {
    case "mifflin": kcal = 10 * need(i.weightKg, "Peso") + 6.25 * need(i.heightCm, "Altura") - 5 * need(i.age, "Idade") + (i.sex === "male" ? 5 : -161); break;
    case "harris_benedict_revised": {
      const [w, h, a] = [need(i.weightKg, "Peso"), need(i.heightCm, "Altura"), need(i.age, "Idade")];
      kcal = i.sex === "male" ? 88.362 + 13.397 * w + 4.799 * h - 5.677 * a : 447.593 + 9.247 * w + 3.098 * h - 4.33 * a; break;
    }
    case "katch_mcardle": kcal = 370 + 21.6 * need(i.leanMassKg, "Massa livre de gordura"); break;
    case "cunningham": kcal = 500 + 22 * need(i.leanMassKg, "Massa livre de gordura"); break;
    default: throw new FormulaBlockedError(eq);
  }
  return { kcal, equation: meta.id, equation_version: meta.version, reference: meta.reference };
}
