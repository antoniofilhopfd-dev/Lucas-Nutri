import { transacao } from "../mysql";
import { auditar, exigirEscritaConsulta, exigirEquipe, exigirLerPaciente, type Actor, AcessoNegado } from "../authz";
import { inserir, RegraNegocio } from "../sql";
import { buildDiet, buildDietMeal, buildDietFood } from "@/lib/db/rows";
import { canTransition, isEditable, type DietStatus } from "@/features/diets/lifecycle";
import type { Executor } from "../mysql";

export interface RefeicaoEntrada { name: string; time: string | null; foods: { foodId: string; quantity: number; household?: string }[] }

async function gravarRefeicoes(q: Executor, dietId: string, meals: RefeicaoEntrada[]) {
  for (const [pos, m] of meals.entries()) {
    const mealId = await inserir(q, "diet_meals", buildDietMeal(dietId, m.name, m.time, pos));
    for (const f of m.foods) {
      const [ok] = await q.consultar("SELECT 1 AS ok FROM food_database WHERE id=?", [f.foodId]);
      if (!ok) throw new RegraNegocio("Alimento não encontrado na base.");
      if (!(f.quantity >= 0)) throw new RegraNegocio("Quantidade inválida.");
      await inserir(q, "diet_foods", buildDietFood(mealId, f.foodId, f.quantity, f.household));
    }
  }
}

/** Nova dieta (ou nova versão): sempre nasce em rascunho, ligada à consulta e à versão anterior. */
export async function criarDieta(a: Actor, consultationId: string, o: { vetKcal?: number; notes?: string; meals: RefeicaoEntrada[] }): Promise<{ id: string; version: number }> {
  if (!o.meals.length) throw new RegraNegocio("Adicione ao menos uma refeição.");
  return transacao(async (q) => {
    const c = await exigirEscritaConsulta(q, a, consultationId, true);
    const [ult] = await q.consultar<{ id: string; version: number }>("SELECT id, version FROM diets WHERE patient_id=? ORDER BY version DESC LIMIT 1 FOR UPDATE", [c.patient_id]);
    const version = (ult?.version ?? 0) + 1;
    const id = await inserir(q, "diets", buildDiet(c.patient_id, c.id, a.id, { vetKcal: o.vetKcal, notes: o.notes, version, parentId: ult?.id }));
    await gravarRefeicoes(q, id, o.meals);
    await auditar(q, a, { patientId: c.patient_id, consultationId: c.id, action: "insert", entity: "diets", entityId: id, newValue: { version } });
    return { id, version };
  });
}

interface DietaRow { id: string; patient_id: string; status: DietStatus; version: number; nutritionist_id: string }
async function dietaDaEquipe(q: Executor, a: Actor, id: string): Promise<DietaRow> {
  exigirEquipe(a);
  const [d] = await q.consultar<DietaRow>("SELECT d.id, d.patient_id, d.status, d.version, p.nutritionist_id FROM diets d JOIN patients p ON p.id=d.patient_id WHERE d.id=? FOR UPDATE", [id]);
  if (!d || (a.papel !== "admin" && d.nutritionist_id !== a.id)) throw new AcessoNegado();
  return d;
}

/** Só rascunho/revisada pode ser editada; finalizada e publicada são imutáveis (nova versão para alterar). */
export async function atualizarDieta(a: Actor, dietId: string, o: { vetKcal?: number; notes?: string; meals: RefeicaoEntrada[] }): Promise<void> {
  await transacao(async (q) => {
    const d = await dietaDaEquipe(q, a, dietId);
    if (!isEditable(d.status)) throw new RegraNegocio(`A dieta está ${d.status === "published" ? "publicada" : "finalizada"} e não pode ser editada. Crie uma nova versão.`);
    await q.executar("DELETE FROM diet_meals WHERE diet_id=?", [dietId]); // os alimentos saem junto (ON DELETE CASCADE)
    await gravarRefeicoes(q, dietId, o.meals);
    await q.executar("UPDATE diets SET vet_kcal=?, notes=? WHERE id=?", [o.vetKcal ?? null, o.notes ?? null, dietId]);
    await auditar(q, a, { patientId: d.patient_id, action: "update", entity: "diets", entityId: dietId });
  });
}

/** rascunho → revisada → finalizada → publicada. Publicar aposenta a versão publicada anterior, na mesma transação. */
export async function avancarDieta(a: Actor, dietId: string, para: DietStatus): Promise<void> {
  await transacao(async (q) => {
    const d = await dietaDaEquipe(q, a, dietId);
    if (!canTransition(d.status, para)) throw new RegraNegocio(`Transição não permitida: ${d.status} → ${para}.`);
    if (para === "published") {
      await q.executar("UPDATE diets SET status='superseded' WHERE patient_id=? AND status='published'", [d.patient_id]);
      await q.executar("UPDATE diets SET status='published', published_at=UTC_TIMESTAMP() WHERE id=?", [dietId]);
    } else {
      await q.executar("UPDATE diets SET status=? WHERE id=?", [para, dietId]);
    }
    await auditar(q, a, { patientId: d.patient_id, action: para === "published" ? "publish" : "status", entity: "diets", entityId: dietId, oldValue: { status: d.status }, newValue: { status: para } });
  });
}

/** O paciente só enxerga a versão PUBLICADA; a equipe vê todas as versões da sua carteira. */
export async function lerDietas(a: Actor, patientId: string) {
  return transacao(async (q) => {
    await exigirLerPaciente(q, a, patientId);
    const filtro = a.papel === "patient" ? "AND status='published'" : "";
    const dietas = await q.consultar<{ id: string; version: number; status: string; vet_kcal: number | null; published_at: Date | null }>(
      `SELECT id, version, status, vet_kcal, published_at FROM diets WHERE patient_id=? ${filtro} ORDER BY version DESC`, [patientId]);
    const out = [];
    for (const d of dietas) {
      const meals = await q.consultar<{ id: string; name: string; meal_time: string | null }>("SELECT id, name, meal_time FROM diet_meals WHERE diet_id=? ORDER BY position", [d.id]);
      const completas = [];
      for (const m of meals) completas.push({ ...m, foods: await q.consultar("SELECT f.food_id, f.quantity, f.household_measure, a.name, a.calories, a.protein, a.carbohydrate, a.fat FROM diet_foods f JOIN food_database a ON a.id=f.food_id WHERE f.meal_id=?", [m.id]) });
      out.push({ ...d, meals: completas });
    }
    return out;
  });
}

/** Base de alimentos: só o administrador importa (fonte, versão e licença obrigatórias). */
export async function importarAlimentos(a: Actor, linhas: Record<string, unknown>[]): Promise<number> {
  if (a.papel !== "admin") throw new AcessoNegado();
  return transacao(async (q) => { for (const l of linhas) await inserir(q, "food_database", l); return linhas.length; });
}
