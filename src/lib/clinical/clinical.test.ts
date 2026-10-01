import { describe, it, expect } from "vitest";
import { bmi, waistHipRatio, waistHeightRatio, asymmetry } from "./anthropometry/indices";
import { bodyFatPercent, fatMassKg, leanMassKg } from "./body-composition/fat";
import { bodyDensity, PROTOCOLS, sitesFor, type Protocol } from "./skinfolds/protocols";
import { FormulaBlockedError } from "./types";
import { classifyBmi } from "./classifications/bmi";
import { assess } from "./assess";

describe("índices", () => {
  it("IMC", () => expect(bmi(70, 175)).toBeCloseTo(22.857, 3));
  it("RCQ / RCEst", () => { expect(waistHipRatio(80, 100)).toBe(0.8); expect(waistHeightRatio(80, 160)).toBe(0.5); });
  it("assimetria |D-E|", () => expect(asymmetry(38.5, 37.8)).toBeCloseTo(0.7, 10));
  it("rejeita entradas inválidas", () => expect(() => bmi(0, 170)).toThrow());
  it("classificação OMS", () => { expect(classifyBmi(18.4)).toBe("Baixo peso"); expect(classifyBmi(25)).toBe("Sobrepeso"); expect(classifyBmi(40)).toBe("Obesidade grau III"); });
});
describe("%G e massas", () => {
  it("Siri e Brožek (Db 1,05)", () => { expect(bodyFatPercent(1.05, "siri")).toBeCloseTo(21.43, 1); expect(bodyFatPercent(1.05, "brozek")).toBeCloseTo(21.0, 1); });
  it("MG + MLG = peso", () => { const p = bodyFatPercent(1.06, "siri"); expect(fatMassKg(80, p) + leanMassKg(80, p)).toBeCloseTo(80, 10); });
  it("densidade implausível", () => expect(() => bodyFatPercent(2, "siri")).toThrow());
});
describe("protocolos", () => {
  const folds = { chest: 10, axillary: 10, triceps: 10, subscapular: 10, abdominal: 10, suprailiac: 10, thigh: 10 };
  it("jp7 e jp3 estão bloqueados até revisão científica", () => {
    expect(() => bodyDensity("jp7", "male", 30, folds)).toThrow(FormulaBlockedError);
    expect(() => bodyDensity("jp3", "male", 30, folds)).toThrow(FormulaBlockedError);
  });
  it("protocolos sem coeficientes nunca calculam", () => {
    for (const id of ["petroski4", "faulkner4", "durnin4", "guedes3"]) expect(() => bodyDensity(id, "male", 30, folds)).toThrow(FormulaBlockedError);
  });
  it("mecânica do motor com protocolo aprovado injetado", () => {
    const reg: Record<string, Protocol> = { t: { ...PROTOCOLS.jp7, id: "t", status: "approved", coef: { male: { c0: 1, c1: -0.001, c2: 0, c3: 0 } } } };
    const r = bodyDensity("t", "male", 30, folds, reg);
    expect(r.sum).toBe(70); expect(r.density).toBeCloseTo(0.93, 10); expect(r.inputs.chest).toBe(10);
  });
  it("exige todas as dobras do protocolo", () => {
    const reg: Record<string, Protocol> = { t: { ...PROTOCOLS.jp7, id: "t", status: "approved", coef: { male: { c0: 1, c1: 0, c2: 0, c3: 0 } } } };
    expect(() => bodyDensity("t", "male", 30, { chest: 10 }, reg)).toThrow(/ausente/);
  });
  it("jp3 feminino usa dobras distintas", () => expect(sitesFor(PROTOCOLS.jp3, "female")).toEqual(["triceps", "suprailiac", "thigh"]));
});
describe("assess", () => {
  it("monta resultado com fonte da classificação", () => {
    const r: any = assess({ weightKg: 70, heightCm: 175, waistCm: 80, hipCm: 100, pairs: { forearm: { right: 28, left: 27.5 } }, density: 1.05 });
    expect(r.bmi_class).toBe("Eutrofia"); expect(r.classification_source).toMatch(/OMS/); expect(r.asymmetry.forearm).toBeCloseTo(0.5, 10);
    expect(r.lean_mass_kg + r.fat_mass_kg).toBeCloseTo(70, 10);
  });
});
