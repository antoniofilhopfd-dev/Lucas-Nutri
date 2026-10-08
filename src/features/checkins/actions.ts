"use server";
import { z } from "zod";
import { comAtor } from "@/lib/actions/helpers";
import { salvarCheckin, registrarRefeicao } from "@/server/services/acompanhamento";
import { MEAL_TYPES } from "./rules";

const checkinSchema = z.object({ waterMl: z.number().int().min(0).max(10000), trained: z.boolean().optional(), modality: z.string().max(40).optional(), minutes: z.number().int().positive().max(600).optional() });
export async function saveCheckin(raw: unknown) {
  const p = checkinSchema.safeParse(raw);
  if (!p.success) return { ok: false as const, message: "Revise os valores." };
  return comAtor(async (a) => { await salvarCheckin(a, p.data); return {}; });
}
const mealSchema = z.object({ mealType: z.enum(MEAL_TYPES), before: z.string().optional(), after: z.string().optional() });
export async function saveMealLog(raw: unknown) {
  const p = mealSchema.safeParse(raw);
  if (!p.success) return { ok: false as const, message: "Revise os valores." };
  return comAtor((a) => registrarRefeicao(a, p.data));
}
