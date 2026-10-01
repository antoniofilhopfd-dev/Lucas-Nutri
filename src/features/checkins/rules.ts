export const WATER_BLOCK_ML = 500;
export const MEAL_TYPES = ["breakfast", "lunch", "afternoon_snack", "dinner", "supper"] as const;
export type MealType = (typeof MEAL_TYPES)[number];
export const MEAL_LABEL: Record<MealType, string> = { breakfast: "Café da manhã", lunch: "Almoço", afternoon_snack: "Lanche da tarde", dinner: "Jantar", supper: "Ceia" };
export const FEELINGS_BEFORE = ["anxious", "very_hungry", "calm", "stressed", "not_hungry", "other"] as const;
export const FEELINGS_AFTER = ["satisfied", "bloated", "guilty", "energized", "still_hungry", "other"] as const;
export const FEELING_LABEL: Record<string, string> = { anxious: "Ansioso", very_hungry: "Muita fome", calm: "Tranquilo", stressed: "Estressado", not_hungry: "Sem fome", satisfied: "Satisfeito", bloated: "Estufado", guilty: "Culpado", energized: "Energizado", still_hungry: "Ainda com fome", other: "Outro" };

export const addWater = (current: number, goal: number) => Math.min(current + WATER_BLOCK_ML, Math.max(goal, current));
export const removeWater = (current: number) => Math.max(0, current - WATER_BLOCK_ML);
export function waterProgress(current: number, goal: number) {
  if (!(goal > 0) || goal % WATER_BLOCK_ML !== 0) throw new Error("Meta deve ser múltiplo de 500 ml");
  return { blocks: goal / WATER_BLOCK_ML, filled: Math.floor(current / WATER_BLOCK_ML), done: current >= goal };
}
export interface Training { trained: boolean; modality?: string; durationMin?: number }
export function validateTraining(t: Training): string | null {
  if (!t.trained) return null;
  if (!t.modality?.trim()) return "Informe a modalidade";
  if (!(t.durationMin && t.durationMin > 0 && t.durationMin <= 600)) return "Informe a duração em minutos";
  return null;
}

/** Adesão do dia = refeições registradas ÷ refeições planejadas na dieta publicada (0–1). */
export const dayAdherence = (logged: number, planned: number) => (planned > 0 ? Math.min(1, logged / planned) : 0);
/** Adesão semanal = média das adesões diárias dos dias do período. */
export const weeklyAdherence = (days: number[]) => (days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0);
/** Paciente sem nenhum registro há mais de 48 h. */
export function noRecordOver48h(lastRecordAt: Date | null, now = new Date()) {
  return lastRecordAt === null || now.getTime() - lastRecordAt.getTime() > 48 * 3600 * 1000;
}
/** Paciente só registra o dia corrente (fuso de Brasília), sem reescrever o passado. */
export const isToday = (isoDate: string, now = new Date()) => isoDate === new Date(now.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
