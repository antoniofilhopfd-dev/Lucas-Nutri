import { describe, it, expect } from "vitest";
import { ageAt } from "@/lib/utils/age";
import { toE164BR, maskPhoneBR } from "@/lib/utils/phone";
import { patientSchema } from "./schema";
import { canMoveStatus, canFinalize, canAmend, isEditableInPlace, validateAmendReason } from "../consultations/state";

describe("ageAt", () => {
  it("usa a data da avaliação, não a atual", () => {
    expect(ageAt("1990-06-15", "2026-06-14")).toBe(35);
    expect(ageAt("1990-06-15", "2026-06-15")).toBe(36);
    expect(ageAt("1990-06-15", "2020-01-01")).toBe(29);
  });
  it("rejeita avaliação antes do nascimento", () => expect(() => ageAt("2000-01-01", "1999-12-31")).toThrow());
});
describe("telefone", () => {
  it("normaliza", () => { expect(toE164BR("(83) 99123-8792")).toBe("+5583991238792"); expect(toE164BR("+55 83 991238792")).toBe("+5583991238792"); });
  it("rejeita inválido", () => expect(toE164BR("123")).toBeNull());
  it("máscara", () => expect(maskPhoneBR("83991238792")).toBe("+55 (83) 99123-8792"));
});
describe("patientSchema", () => {
  const base = { full_name: "Marina Costa", birth_date: "1991-03-02", biological_sex: "female", phone: "83991238792", primary_goal: "recomposition" };
  it("aceita mínimo e normaliza telefone", () => { const r = patientSchema.parse(base); expect(r.phone).toBe("+5583991238792"); });
  it("exige sexo biológico", () => expect(patientSchema.safeParse({ ...base, biological_sex: undefined }).success).toBe(false));
  it("modalidade principal deve estar nas marcadas", () =>
    expect(patientSchema.safeParse({ ...base, modalities: ["Corrida"], primary_modality: "Natação" }).success).toBe(false));
  it("objetivo secundário não repete primário", () =>
    expect(patientSchema.safeParse({ ...base, secondary_goals: ["recomposition"] }).success).toBe(false));
  it("rejeita data futura", () => expect(patientSchema.safeParse({ ...base, birth_date: "2999-01-01" }).success).toBe(false));
});
describe("consulta", () => {
  it("transições", () => { expect(canMoveStatus("scheduled", "in_progress")).toBe(true); expect(canMoveStatus("completed", "scheduled")).toBe(false); });
  it("finalizada não edita no lugar, só emenda", () => {
    expect(isEditableInPlace("finalized")).toBe(false); expect(canAmend("finalized")).toBe(true); expect(canAmend("draft")).toBe(false);
    expect(canFinalize("draft", "in_progress")).toBe(true); expect(canFinalize("finalized", "in_progress")).toBe(false);
  });
  it("emenda exige motivo", () => { expect(validateAmendReason("ok")).not.toBeNull(); expect(validateAmendReason("erro de digitação")).toBeNull(); });
});
