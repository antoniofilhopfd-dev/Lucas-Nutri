import { bmr, type BmrEquation, type BmrInput } from "./bmr";
import { totalByFactor, totalDetailed, exerciseKcalPerDay, type ActivityLevel, type Activity } from "./expenditure";
import { applyStrategy, type Strategy } from "./strategy";

export interface EnergyInput extends BmrInput { equation: BmrEquation; method: { type: "factor"; level: ActivityLevel | number } | { type: "detailed"; activities: Activity[]; tef?: number }; strategy: Strategy }
/** Retorna inputs + outputs completos para persistir em jsonb e reconstruir o cálculo. */
export function calculateEnergy(i: EnergyInput) {
  const b = bmr(i.equation, i);
  const t = i.method.type === "factor" ? totalByFactor(b.kcal, i.method.level)
    : totalDetailed(b.kcal, exerciseKcalPerDay(need(i.weightKg), i.method.activities).daily, i.method.tef);
  const s = applyStrategy(t.get, i.strategy);
  return { inputs: i, outputs: { tmb: b.kcal, equation: b.equation, equation_version: b.equation_version, reference: b.reference, ...t, vet: s.vet, strategy_delta: s.delta } };
}
const need = (n?: number) => { if (!n) throw new Error("Peso obrigatório"); return n; };
