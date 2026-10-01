export const ACTIVITY_FACTORS = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, extreme: 1.9 } as const;
export type ActivityLevel = keyof typeof ACTIVITY_FACTORS;
export const DEFAULT_TEF = 0.1; // 10%, configurável e armazenado no cálculo

/** Método fatorial: GET = TMB × FA (o FA já engloba os componentes; TEF não é somado de novo). */
export function totalByFactor(tmb: number, level: ActivityLevel | number) {
  const fa = typeof level === "number" ? level : ACTIVITY_FACTORS[level];
  if (!(fa >= 1)) throw new Error("Fator de atividade inválido");
  return { get: tmb * fa, method: "factorial", activity_factor: fa, methodology: "GET = TMB × FA (TEF incluído no fator)" };
}

export interface Activity { modality: string; met: number; durationMin: number; sessionsPerWeek: number }
/** Gasto de exercício: kcal/sessão = MET × peso(kg) × horas. Valores de MET são informados pelo nutricionista. */
export function exerciseKcalPerDay(weightKg: number, acts: Activity[]) {
  if (!(weightKg > 0)) throw new Error("Peso inválido");
  let week = 0;
  for (const a of acts) {
    if (!(a.met > 0) || !(a.durationMin > 0) || a.sessionsPerWeek < 0 || a.sessionsPerWeek > 14) throw new Error(`Atividade inválida: ${a.modality}`);
    week += a.met * weightKg * (a.durationMin / 60) * a.sessionsPerWeek;
  }
  return { weekly: week, daily: week / 7 };
}

/** Método detalhado (separado do fatorial; nunca combinar sem informar):
 *  GET = TMB + exercício diário + TEF, com TEF = tef × (TMB + exercício diário). */
export function totalDetailed(tmb: number, exerciseDaily: number, tef = DEFAULT_TEF) {
  if (tef < 0 || tef > 0.3) throw new Error("TEF fora do intervalo aceito (0–30%)");
  const base = tmb + exerciseDaily;
  const tefKcal = base * tef;
  return { get: base + tefKcal, method: "detailed", tef, tef_kcal: tefKcal, exercise_daily: exerciseDaily,
    methodology: "GET = TMB + exercício (MET) + TEF; TEF = % × (TMB + exercício). Não inclui fator de atividade." };
}
