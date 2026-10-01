export const KCAL_PER_G = { protein: 4, carbohydrate: 4, fat: 9 } as const;
export interface MacroResult { protein_g: number; carbohydrate_g: number; fat_g: number; kcal: number; vet: number; deviation_pct: number; coherent: boolean }
const TOLERANCE_PCT = 2;

function finish(p: number, c: number, f: number, vet: number): MacroResult {
  const kcal = p * 4 + c * 4 + f * 9;
  const dev = ((kcal - vet) / vet) * 100;
  return { protein_g: p, carbohydrate_g: c, fat_g: f, kcal, vet, deviation_pct: dev, coherent: Math.abs(dev) <= TOLERANCE_PCT };
}
export function macrosByPercent(vet: number, pct: { protein: number; carbohydrate: number; fat: number }): MacroResult {
  if (Math.abs(pct.protein + pct.carbohydrate + pct.fat - 100) > 0.01) throw new Error("Os percentuais devem somar 100%");
  if (Object.values(pct).some((x) => x < 0)) throw new Error("Percentual negativo");
  return finish((vet * pct.protein / 100) / 4, (vet * pct.carbohydrate / 100) / 4, (vet * pct.fat / 100) / 9, vet);
}
/** Proteína e gordura em g/kg; carboidrato é o restante do VET. */
export function macrosByGramsPerKg(vet: number, weightKg: number, g: { protein: number; fat: number }): MacroResult {
  if (!(weightKg > 0) || g.protein < 0 || g.fat < 0) throw new Error("Valores inválidos");
  const p = g.protein * weightKg, f = g.fat * weightKg;
  const remaining = vet - p * 4 - f * 9;
  if (remaining < 0) throw new Error("Proteína e gordura excedem o VET");
  return finish(p, remaining / 4, f, vet);
}
