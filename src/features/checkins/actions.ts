"use server";
import { z } from "zod";
import { withSession, fail } from "@/lib/actions/helpers";
import { buildCheckin, buildMealLog } from "@/lib/db/rows";
import { validateTraining, MEAL_TYPES } from "./rules";

const checkinSchema = z.object({ waterMl: z.number().int().min(0).max(10000).refine((n) => n % 500 === 0, "Múltiplo de 500 ml"), trained: z.boolean().optional(), modality: z.string().optional(), minutes: z.number().int().positive().max(600).optional() });
/** Um registro por paciente/dia (upsert). O banco recusa datas diferentes de hoje. */
export async function saveCheckin(raw: unknown) {
  const p = checkinSchema.safeParse(raw); if (!p.success) return { ok: false as const, message: "Revise os valores." };
  const tErr = validateTraining({ trained: !!p.data.trained, modality: p.data.modality, durationMin: p.data.minutes }); if (tErr) return { ok: false as const, message: tErr };
  return withSession(async (sb, uid) => {
    const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
    const { error } = await sb.from("patient_checkins").upsert(buildCheckin(uid, today, p.data), { onConflict: "patient_id,checkin_date" });
    return error ? fail(error, "saveCheckin") : { ok: true as const };
  });
}
const mealSchema = z.object({ mealType: z.enum(MEAL_TYPES), photoPath: z.string().optional(), before: z.string().optional(), after: z.string().optional() });
export async function saveMealLog(raw: unknown) {
  const p = mealSchema.safeParse(raw); if (!p.success) return { ok: false as const, message: "Revise os valores." };
  return withSession(async (sb, uid) => {
    const { error } = await sb.from("patient_meal_logs").insert(buildMealLog(uid, p.data));
    return error ? fail(error, "saveMealLog") : { ok: true as const };
  });
}
