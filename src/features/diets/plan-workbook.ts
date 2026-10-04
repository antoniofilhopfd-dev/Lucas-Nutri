import { parsePlanRows, type PlanParse } from "./plan-import";
import { validateFoodRows } from "./food-import";

export type Sheets = { name: string; rows: unknown[][] }[];
export type Metas = { vet: string; protein: string; carb: string; fat: string; water: string };
export type Workbook = { plan: PlanParse | null; foods: ReturnType<typeof validateFoodRows> | null; metas: Partial<Metas> | null };

const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const find = (sheets: Sheets, ...names: string[]) => sheets.find((s) => names.includes(norm(s.name)));
const FOOD_KEYS: Record<string, string> = { nome: "name", fonte: "source", versao: "source_version", licenca: "license", unidade: "serving_unit", calorias: "calories", proteina: "protein", carboidrato: "carbohydrate", gordura: "fat", sodio: "sodium" };

/** Lê o arquivo inteiro: abas Plano, Alimentos e Metas (todas opcionais). Sem aba "Plano", usa a primeira aba como plano. */
export function parseWorkbook(sheets: Sheets): Workbook {
  const plan = find(sheets, "plano") ?? (sheets.length === 1 || !find(sheets, "alimentos", "metas") ? sheets[0] : undefined);
  const fs = find(sheets, "alimentos"), ms = find(sheets, "metas");
  let foods: Workbook["foods"] = null;
  if (fs && fs.rows.length > 1) {
    const keys = fs.rows[0].map((h) => FOOD_KEYS[norm(h)]);
    const rows = fs.rows.slice(1).filter((r) => r.some((c) => c !== null && c !== "")).map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]]).filter(([k, v]) => k && v !== null && v !== "")));
    foods = validateFoodRows(rows);
  }
  let metas: Workbook["metas"] = null;
  if (ms) {
    metas = {};
    for (const r of ms.rows.slice(1)) {
      const k = norm(r[0]), v = r[1] === null || r[1] === undefined ? "" : String(r[1]);
      if (k.startsWith("vet")) metas.vet = v; else if (k.startsWith("prote")) metas.protein = v; else if (k.startsWith("carbo")) metas.carb = v; else if (k.startsWith("lip") || k.startsWith("gord")) metas.fat = v; else if (k.startsWith("agua")) metas.water = v;
    }
  }
  return { plan: plan ? parsePlanRows(plan.rows) : null, foods, metas };
}
