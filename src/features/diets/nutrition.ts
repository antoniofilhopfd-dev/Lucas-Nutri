export interface Per100 { calories: number; protein: number; carbohydrate: number; fat: number; fiber: number }
export interface Totals { calories: number; protein: number; carbohydrate: number; fat: number; fiber: number }
export const ZERO: Totals = { calories: 0, protein: 0, carbohydrate: 0, fat: 0, fiber: 0 };
const KEYS = ["calories", "protein", "carbohydrate", "fat", "fiber"] as const;

/** quantidade × composição por 100 g/ml. Sem arredondamento intermediário. */
export function foodTotals(per100: Per100, quantity: number): Totals {
  if (!(quantity >= 0) || !Number.isFinite(quantity)) throw new Error("Quantidade inválida");
  const k = quantity / 100; const o = { ...ZERO };
  for (const key of KEYS) o[key] = per100[key] * k;
  return o;
}
export const sum = (a: Totals[]): Totals => a.reduce((acc, t) => { const o = { ...acc }; for (const k of KEYS) o[k] += t[k]; return o; }, { ...ZERO });
export const mealTotals = (foods: { per100: Per100; quantity: number }[]) => sum(foods.map((f) => foodTotals(f.per100, f.quantity)));
export const dayTotals = (meals: Totals[]) => sum(meals);
