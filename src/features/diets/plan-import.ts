/** Importação de plano alimentar por planilha. Colunas: Refeição, Horário, Opção, Itens (como no plano em PDF do nutricionista). */
export const PLAN_COLUMNS = ["Refeição", "Horário", "Opção", "Itens"] as const;
export type PlanMeal = { name: string; time: string | null; notes: string; foods: [] };
export type PlanParse = { meals: PlanMeal[]; errors: { row: number; message: string }[] };

const norm = (s: unknown) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const ALIASES: Record<(typeof PLAN_COLUMNS)[number], string[]> = {
  "Refeição": ["refeicao", "refeicoes"], "Horário": ["horario", "hora"], "Opção": ["opcao", "opc"], "Itens": ["itens", "item", "descricao", "prato", "alimentos"],
};
const cell = (v: unknown) => (v === null || v === undefined ? "" : v instanceof Date ? `${String(v.getHours()).padStart(2, "0")}:${String(v.getMinutes()).padStart(2, "0")}` : String(v).trim());

/** "6:30", "06:30", "06h30", "6h" e fração de dia do Excel (0.2708) → "HH:MM". */
export function parseTime(v: unknown): string | null {
  if (v instanceof Date) return cell(v);
  if (typeof v === "number" && v >= 0 && v < 1) { const m = Math.round(v * 1440); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }
  const m = /^(\d{1,2})\s*(?::|h)\s*(\d{2})?\s*(?:h|min)?$/i.exec(String(v ?? "").trim());
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2] ?? 0);
  return h < 24 && mi < 60 ? `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}` : null;
}

/** Cada opção vira uma refeição do rascunho ("Café da manhã · Opção 1"), com os itens no campo de observações. */
export function parsePlanRows(rows: unknown[][]): PlanParse {
  const errors: PlanParse["errors"] = [];
  const hi = rows.findIndex((r) => r.some((c) => ALIASES["Refeição"].includes(norm(c))));
  if (hi < 0) return { meals: [], errors: [{ row: 1, message: `Cabeçalho não encontrado. Use as colunas: ${PLAN_COLUMNS.join(", ")}.` }] };
  const idx = {} as Record<(typeof PLAN_COLUMNS)[number], number>;
  for (const c of PLAN_COLUMNS) idx[c] = rows[hi].findIndex((h) => ALIASES[c].includes(norm(h)));
  const missing = PLAN_COLUMNS.filter((c) => idx[c] < 0 && c !== "Horário" && c !== "Opção");
  if (missing.length) return { meals: [], errors: [{ row: hi + 1, message: `Coluna ausente: ${missing.join(", ")}.` }] };

  const meals: PlanMeal[] = []; let meal = "", time: string | null = null, auto = 0;
  rows.slice(hi + 1).forEach((r, i) => {
    const row = hi + i + 2;
    if (r.every((c) => cell(c) === "")) return;
    const m = idx["Refeição"] >= 0 ? cell(r[idx["Refeição"]]) : "";
    if (m) { meal = m; auto = 0; time = null; }          // célula mesclada/vazia herda a refeição de cima
    const rawT = idx["Horário"] >= 0 ? r[idx["Horário"]] : ""; 
    if (cell(rawT) !== "") { const t = parseTime(rawT); if (!t) { errors.push({ row, message: `Horário inválido: "${cell(rawT)}"` }); return; } time = t; }
    const items = cell(r[idx["Itens"]]);
    if (!meal) { errors.push({ row, message: "Linha sem refeição." }); return; }
    if (!items) { errors.push({ row, message: "Itens em branco." }); return; }
    const opt = idx["Opção"] >= 0 ? cell(r[idx["Opção"]]) : ""; auto += 1;
    const label = opt ? (/^\d+$/.test(opt) ? `Opção ${opt}` : opt) : `Opção ${auto}`;
    meals.push({ name: `${meal} · ${label}`, time, notes: items, foods: [] });
  });
  if (!meals.length && !errors.length) errors.push({ row: hi + 2, message: "Nenhuma linha de dados." });
  return { meals, errors };
}

export function parseCsv(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0] ?? ""; const sep = (first.match(/;/g)?.length ?? 0) > (first.match(/,/g)?.length ?? 0) ? ";" : ",";
  const out: string[][] = []; let row: string[] = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (ch === '"') q = false; else f += ch; }
    else if (ch === '"') q = true; else if (ch === sep) { row.push(f); f = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(f); out.push(row); row = []; f = ""; }
    else f += ch;
  }
  if (f || row.length) { row.push(f); out.push(row); }
  return out;
}

export const TEMPLATE_CSV = "﻿" + [PLAN_COLUMNS.join(";"), "Café da manhã;06:30;1;1 maçã média (100g) + 2 ovos mexidos + café sem açúcar", ";;2;1 maçã média (100g) + 60g goma de tapioca + 2 ovos", "Almoço;11:45;1;150g arroz + 100g feijão + 150g peito de frango"].join("\r\n");
