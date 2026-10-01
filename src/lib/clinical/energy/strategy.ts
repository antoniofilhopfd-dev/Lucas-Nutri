export type Strategy = { type: "maintenance" } | { type: "percent"; value: number } | { type: "absolute"; kcal: number };
/** percent: negativo = déficit (−10, −20, −30), positivo = superávit (+10, +15, +20). absolute: kcal ±. */
export function applyStrategy(get: number, s: Strategy) {
  const delta = s.type === "maintenance" ? 0 : s.type === "percent" ? get * (s.value / 100) : s.kcal;
  const vet = get + delta;
  if (!(vet > 0)) throw new Error("VET resultante inválido");
  return { get, delta, vet, strategy: s };
}
