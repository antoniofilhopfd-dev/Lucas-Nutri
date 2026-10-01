import { describe, it, expect } from "vitest";
import { bmr } from "./energy/bmr";
import { totalByFactor, exerciseKcalPerDay, totalDetailed, ACTIVITY_FACTORS } from "./energy/expenditure";
import { applyStrategy } from "./energy/strategy";
import { macrosByPercent, macrosByGramsPerKg } from "./macronutrients/macros";
import { calculateEnergy } from "./energy/calculate";
import { FormulaBlockedError } from "./types";

describe("TMB", () => {
  it("Mifflin masculino/feminino", () => {
    expect(bmr("mifflin", { sex: "male", weightKg: 80, heightCm: 180, age: 30 }).kcal).toBeCloseTo(1780, 6);
    expect(bmr("mifflin", { sex: "female", weightKg: 60, heightCm: 165, age: 30 }).kcal).toBeCloseTo(1320.25, 6);
  });
  it("Harris-Benedict revisada", () => {
    expect(bmr("harris_benedict_revised", { sex: "male", weightKg: 80, heightCm: 180, age: 30 }).kcal).toBeCloseTo(88.362 + 1071.76 + 863.82 - 170.31, 6);
    expect(bmr("harris_benedict_revised", { sex: "female", weightKg: 60, heightCm: 165, age: 30 }).kcal).toBeCloseTo(447.593 + 554.82 + 511.17 - 129.9, 6);
  });
  it("Katch e Cunningham exigem MLG", () => {
    expect(bmr("katch_mcardle", { sex: "male", leanMassKg: 60 }).kcal).toBeCloseTo(1666, 6);
    expect(bmr("cunningham", { sex: "male", leanMassKg: 60 }).kcal).toBe(1820);
    expect(() => bmr("katch_mcardle", { sex: "male", weightKg: 80 })).toThrow(/Massa livre/);
  });
  it("FAO/OMS bloqueada", () => expect(() => bmr("fao_who", { sex: "male", weightKg: 70, age: 30 })).toThrow(FormulaBlockedError));
});
describe("GET", () => {
  it("fatores de atividade", () => { expect(ACTIVITY_FACTORS.sedentary).toBe(1.2); expect(ACTIVITY_FACTORS.extreme).toBe(1.9); });
  it("TMB × FA", () => expect(totalByFactor(1780, "moderate").get).toBeCloseTo(2759, 6));
  it("MET: kcal = MET × kg × h", () => {
    const r = exerciseKcalPerDay(80, [{ modality: "Corrida", met: 10, durationMin: 60, sessionsPerWeek: 3 }]);
    expect(r.weekly).toBe(2400); expect(r.daily).toBeCloseTo(342.857, 3);
  });
  it("detalhado informa a metodologia e TEF configurável", () => {
    const r = totalDetailed(1700, 300, 0.1); expect(r.get).toBeCloseTo(2200, 6); expect(r.tef_kcal).toBeCloseTo(200, 6); expect(r.methodology).toMatch(/TEF/);
    expect(() => totalDetailed(1700, 300, 0.9)).toThrow();
  });
});
describe("estratégia", () => {
  it("déficit, superávit, absoluto, manutenção", () => {
    expect(applyStrategy(2000, { type: "percent", value: -20 }).vet).toBe(1600);
    expect(applyStrategy(2000, { type: "percent", value: 15 }).vet).toBe(2300);
    expect(applyStrategy(2000, { type: "absolute", kcal: -300 }).vet).toBe(1700);
    expect(applyStrategy(2000, { type: "maintenance" }).vet).toBe(2000);
  });
  it("rejeita VET inválido", () => expect(() => applyStrategy(500, { type: "absolute", kcal: -600 })).toThrow());
});
describe("macros", () => {
  it("percentual coerente com VET", () => { const m = macrosByPercent(2000, { protein: 30, carbohydrate: 45, fat: 25 }); expect(m.protein_g).toBeCloseTo(150, 6); expect(m.coherent).toBe(true); });
  it("percentuais devem somar 100", () => expect(() => macrosByPercent(2000, { protein: 30, carbohydrate: 30, fat: 30 })).toThrow());
  it("g/kg com carboidrato restante", () => {
    const m = macrosByGramsPerKg(2000, 80, { protein: 2, fat: 1 }); expect(m.protein_g).toBe(160); expect(m.fat_g).toBe(80);
    expect(m.carbohydrate_g).toBeCloseTo((2000 - 640 - 720) / 4, 6); expect(m.coherent).toBe(true);
  });
  it("g/kg que excede o VET", () => expect(() => macrosByGramsPerKg(1000, 80, { protein: 3, fat: 2 })).toThrow(/excedem/));
});
describe("calculateEnergy", () => {
  it("reconstrói o cálculo completo", () => {
    const r = calculateEnergy({ sex: "male", weightKg: 80, heightCm: 180, age: 30, equation: "mifflin", method: { type: "factor", level: "moderate" }, strategy: { type: "percent", value: -10 } });
    expect(r.outputs.tmb).toBe(1780); expect(r.outputs.get).toBeCloseTo(2759, 6); expect(r.outputs.vet).toBeCloseTo(2483.1, 6); expect(r.outputs.equation_version).toBe("1.0");
  });
});
