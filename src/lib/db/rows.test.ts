import { describe, it, expect } from "vitest";
import columns from "./columns.generated.json";
import * as R from "./rows";

type Cols = Record<string, Record<string, { required: boolean }>>;
const C = columns as Cols;
/** Toda chave existe na tabela e toda coluna obrigatória (NOT NULL sem default) está presente. */
function conforms(table: string, row: Record<string, unknown>, opts: { omit?: string[] } = {}) {
  opts = { omit: ["id", ...(opts.omit ?? [])] }; // ids são gerados pelo app (inserir())
  const t = C[table]; if (!t) throw new Error(`tabela inexistente: ${table}`);
  const unknown = Object.keys(row).filter((k) => !(k in t));
  const missing = Object.entries(t).filter(([k, v]) => v.required && !(k in row) && !opts.omit?.includes(k)).map(([k]) => k);
  expect({ table, unknown, missing }).toEqual({ table, unknown: [], missing: [] });
}
const P = "11111111-1111-4111-8111-111111111111", CO = "22222222-2222-4222-8222-222222222222", A = "33333333-3333-4333-8333-333333333333";
const base = { patientId: P, consultationId: CO, assessmentDate: "2026-10-01", birthDate: "1990-03-02", weightKg: 66.9, heightCm: 168 };

describe("contrato linha ↔ schema", () => {
  it("avaliação e perímetros", () => {
    const i = { ...base, waistCm: 75.5, hipCm: 98, central: { neck: 32 }, pairs: { biceps_relaxed: { right: 32.1, left: 31.4 } } };
    conforms("anthropometric_assessments", R.buildAssessment(i));
    const circ = R.buildCircumferences(A, i); expect(circ.length).toBe(5);
    circ.forEach((r) => conforms("circumference_measurements", r));
    expect(R.buildAssessment(i).age_at_assessment).toBe(36);
    expect(circ.some((r) => r.site.includes("asymmetry"))).toBe(false);
  });
  it("energia e estratégia", () => {
    const e = R.buildEnergy(P, CO, A, { sex: "female", weightKg: 66.9, heightCm: 168, age: 36, equation: "mifflin", method: { type: "factor", level: "moderate" }, strategy: { type: "percent", value: -10 } }, { mode: "percent", pct: { protein: 30, carbohydrate: 45, fat: 25 } });
    conforms("energy_calculations", e.calc); conforms("caloric_strategies", e.strategy(A));
    expect(e.calc.method).toBe("factorial"); expect(e.strategy(A).vet_kcal).toBeCloseTo(e.strategy(A).get_kcal * 0.9, 6);
  });
  it("check-in, refeição e mensagem", () => {
    conforms("patient_checkins", R.buildCheckin(P, "2026-10-01", { waterMl: 2500, trained: true, modality: "Corrida", minutes: 40 }));
    conforms("patient_meal_logs", R.buildMealLog(P, "2026-10-01", { mealType: "lunch", before: "calm", after: "satisfied" }));
    conforms("messages", R.buildMessage(P, P, A, "oi"));
    expect(R.buildCheckin(P, "2026-10-01", { waterMl: 0, trained: false, modality: "x", minutes: 9 }).training_modality).toBeNull();
  });
  it("anamnese", () => {
    conforms("anamneses", R.buildAnamnesis(P, CO, { rawText: "x", extractor: "rule-based-ptbr" }));
    const items = R.buildAnamnesisItems(A, P, A, [{ id: "1", category: "sleep", field: "Dorme", value: "23:00", source: { kind: "text", snippet: "Dorme às 23h" }, status: "confirmed" }]);
    items.forEach((r) => conforms("anamnesis_items", r));
  });
  it("dieta", () => {
    conforms("diets", R.buildDiet(P, CO, A, { vetKcal: 1900 })); conforms("diet_meals", R.buildDietMeal(A, "Almoço", "12:30", 1)); conforms("diet_foods", R.buildDietFood(A, CO, 150, "1 filé"));
  });
  it("o schema gerado tem as tabelas esperadas", () => { for (const t of ["patients", "consultations", "diets", "community_posts", "messages", "body_photos"]) expect(C[t]).toBeTruthy(); });
});
