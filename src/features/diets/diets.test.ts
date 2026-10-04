import { describe, it, expect } from "vitest";
import { foodTotals, mealTotals, dayTotals } from "./nutrition";
import { canTransition, isEditable, visibleToPatient, newVersionFrom, supersedes } from "./lifecycle";
import { validateFoodRows } from "./food-import";

const arroz = { calories: 130, protein: 2.5, carbohydrate: 28, fat: 0.2, fiber: 1.6 }; // valores de teste, não de tabela oficial
const frango = { calories: 165, protein: 31, carbohydrate: 0, fat: 3.6, fiber: 0 };
describe("cálculo nutricional", () => {
  it("quantidade × composição por 100 g", () => { const t = foodTotals(frango, 150); expect(t.calories).toBeCloseTo(247.5, 10); expect(t.protein).toBeCloseTo(46.5, 10); });
  it("refeição e dia somam", () => {
    const m = mealTotals([{ per100: arroz, quantity: 200 }, { per100: frango, quantity: 100 }]);
    expect(m.calories).toBeCloseTo(425, 10); expect(m.protein).toBeCloseTo(36, 10);
    expect(dayTotals([m, m]).calories).toBeCloseTo(850, 10);
  });
  it("rejeita quantidade negativa", () => expect(() => foodTotals(arroz, -1)).toThrow());
});
describe("ciclo de vida da dieta", () => {
  it("fluxo rascunho → revisar → finalizar → publicar", () => {
    expect(canTransition("draft", "reviewed")).toBe(true); expect(canTransition("reviewed", "finalized")).toBe(true); expect(canTransition("finalized", "published")).toBe(true);
    expect(canTransition("draft", "published")).toBe(false); expect(canTransition("published", "draft")).toBe(false);
  });
  it("imutabilidade e visibilidade", () => {
    expect(isEditable("draft")).toBe(true); expect(isEditable("finalized")).toBe(false); expect(isEditable("published")).toBe(false);
    expect(visibleToPatient({ status: "draft" })).toBe(false); expect(visibleToPatient({ status: "published" })).toBe(true);
  });
  it("alteração gera nova versão e aposenta a anterior", () => {
    const v2 = newVersionFrom({ id: "d1", version: 1, status: "published" as const });
    expect(v2.version).toBe(2); expect(v2.status).toBe("draft"); expect(v2.parent_id).toBe("d1"); expect(supersedes("published")).toBe("superseded");
    expect(() => newVersionFrom({ id: "d", version: 1, status: "draft" as const })).toThrow();
  });
});
describe("importação de alimentos", () => {
  const row = { name: "Arroz (exemplo)", source: "Base X", source_version: "2026", license: "CC-BY 4.0", calories: 130, protein: 2.5, carbohydrate: 28, fat: 0.2, fiber: 1.6 };
  it("aceita linha completa", () => expect(validateFoodRows([row]).ok).toHaveLength(1));
  it("exige licença e fonte", () => { const r = validateFoodRows([{ ...row, license: "" }, { ...row, source: "" }]); expect(r.ok).toHaveLength(0); expect(r.errors).toHaveLength(2); });
  it("rejeita macros impossíveis", () => expect(validateFoodRows([{ ...row, protein: 60, carbohydrate: 60 }]).errors[0].message).toMatch(/100 g/));
});
import { parsePlanRows, parseCsv, parseTime, TEMPLATE_CSV } from "./plan-import";
describe("importação de plano alimentar", () => {
  it("lê colunas do plano, herda refeição/horário e numera opções", () => {
    const r = parsePlanRows(parseCsv(TEMPLATE_CSV.slice(1)));
    expect(r.errors).toEqual([]); expect(r.meals.map((m) => m.name)).toEqual(["Café da manhã · Opção 1", "Café da manhã · Opção 2", "Almoço · Opção 1"]);
    expect(r.meals[1].time).toBe("06:30");
  });
  it("aceita cabeçalho sem acento e horário do Excel", () => {
    const r = parsePlanRows([["refeicao", "horario", "opcao", "itens"], ["Ceia", 0.875, 1, "iogurte"]]);
    expect(r.meals[0].time).toBe("21:00"); expect(parseTime("6h30")).toBe("06:30"); expect(parseTime("25:00")).toBeNull();
  });
  it("aponta linha com erro", () => {
    expect(parsePlanRows([["Refeição", "Itens"], ["Ceia", ""]]).errors[0]).toMatchObject({ row: 2 });
    expect(parsePlanRows([["a", "b"]]).errors[0].message).toMatch(/Cabeçalho/);
  });
});
import { parseWorkbook } from "./plan-workbook";
describe("planilha com abas", () => {
  it("lê Plano, Alimentos e Metas", () => {
    const w = parseWorkbook([
      { name: "Plano", rows: [["Refeição", "Horário", "Opção", "Itens"], ["Ceia", "21:00", 1, "iogurte"]] },
      { name: "Alimentos", rows: [["Nome", "Fonte", "Versão", "Licença", "Unidade", "Calorias", "Proteína", "Carboidrato", "Gordura", "Sódio"], ["Arroz", "Tabela", "1", "Uso próprio", "g", 130, 2.5, 28, 0.2, null]] },
      { name: "Metas", rows: [["Meta", "Valor"], ["VET (kcal)", 2250], ["Água (L/dia)", 3]] },
    ]);
    expect(w.plan?.meals).toHaveLength(1); expect(w.foods?.errors).toEqual([]); expect(w.foods?.ok[0].fiber).toBe(0); expect(w.metas).toEqual({ vet: "2250", water: "3" });
  });
});
