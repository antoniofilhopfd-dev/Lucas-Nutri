"use server";
import { withSession, fail } from "@/lib/actions/helpers";
import { buildDiet, buildDietMeal, buildDietFood } from "@/lib/db/rows";
import { canTransition, type DietStatus } from "./lifecycle";

export async function createDiet(patientId: string, consultationId: string, meals: { name: string; time: string | null; notes?: string; foods: { foodId: string; quantity: number; household?: string }[] }[], vetKcal?: number) {
  if (!meals.length) return { ok: false as const, message: "Adicione ao menos uma refeição." };
  return withSession(async (sb) => {
    const { data: last } = await sb.from("diets").select("id, version").eq("patient_id", patientId).order("version", { ascending: false }).limit(1).maybeSingle();
    const { data: d, error } = await sb.from("diets").insert(buildDiet(patientId, consultationId, { vetKcal, version: (last?.version ?? 0) + 1, parentId: last?.id })).select("id").single();
    if (error || !d) return fail(error, "createDiet");
    for (const [pos, m] of meals.entries()) {
      const { data: meal, error: e1 } = await sb.from("diet_meals").insert(buildDietMeal(d.id, m.name, m.time, pos, m.notes)).select("id").single();
      if (e1 || !meal) return fail(e1, "createDiet.meal");
      if (m.foods.length) { const { error: e2 } = await sb.from("diet_foods").insert(m.foods.map((f) => buildDietFood(meal.id, f.foodId, f.quantity, f.household))); if (e2) return fail(e2, "createDiet.foods"); }
    }
    return { ok: true as const, id: d.id as string };
  });
}
export async function advanceDiet(id: string, from: DietStatus, to: Exclude<DietStatus, "draft" | "superseded">) {
  if (!canTransition(from, to)) return { ok: false as const, message: "Transição não permitida." };
  return withSession(async (sb) => {
    const { error } = to === "published" ? await sb.rpc("publish_diet", { p_id: id }) : await sb.from("diets").update({ status: to }).eq("id", id);
    return error ? fail(error, "advanceDiet") : { ok: true as const };
  });
}
