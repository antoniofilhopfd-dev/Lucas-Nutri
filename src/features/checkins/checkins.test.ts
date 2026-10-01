import { describe, it, expect } from "vitest";
import { addWater, removeWater, waterProgress, validateTraining, dayAdherence, weeklyAdherence, noRecordOver48h, isToday } from "./rules";
import { canMessage, messageSchema, feedbackSchema, unreadFor } from "../messaging/rules";

describe("água", () => {
  it("blocos de 500 ml até a meta", () => { expect(addWater(2500, 3000)).toBe(3000); expect(addWater(3000, 3000)).toBe(3000); expect(removeWater(200)).toBe(0); });
  it("progresso 6/6", () => { expect(waterProgress(3000, 3000)).toEqual({ blocks: 6, filled: 6, done: true }); expect(waterProgress(2500, 3000).filled).toBe(5); });
  it("meta inválida", () => expect(() => waterProgress(0, 1200)).toThrow());
});
describe("treino", () => {
  it("não treinou é válido", () => expect(validateTraining({ trained: false })).toBeNull());
  it("treinou exige modalidade e duração", () => { expect(validateTraining({ trained: true })).toMatch(/modalidade/); expect(validateTraining({ trained: true, modality: "Corrida" })).toMatch(/duração/); expect(validateTraining({ trained: true, modality: "Corrida", durationMin: 45 })).toBeNull(); });
});
describe("adesão", () => {
  it("dia e semana", () => { expect(dayAdherence(4, 5)).toBe(0.8); expect(dayAdherence(7, 5)).toBe(1); expect(dayAdherence(1, 0)).toBe(0); expect(weeklyAdherence([1, 0.5, 0])).toBeCloseTo(0.5, 10); expect(weeklyAdherence([])).toBe(0); });
  it("sem registro há mais de 48 h", () => {
    const now = new Date("2026-10-10T12:00:00Z");
    expect(noRecordOver48h(new Date("2026-10-08T11:00:00Z"), now)).toBe(true); expect(noRecordOver48h(new Date("2026-10-08T13:00:00Z"), now)).toBe(false); expect(noRecordOver48h(null, now)).toBe(true);
  });
  it("só o dia corrente (UTC-3)", () => { const now = new Date("2026-10-10T01:00:00Z"); expect(isToday("2026-10-09", now)).toBe(true); expect(isToday("2026-10-10", now)).toBe(false); });
});
describe("mensagens", () => {
  const nut = { id: "n1", role: "nutritionist" }, pat = { id: "p1", role: "patient", nutritionistId: "n1" }, other = { id: "p2", role: "patient", nutritionistId: "n2" };
  it("somente paciente ↔ seu nutricionista", () => { expect(canMessage(pat, nut)).toBe(true); expect(canMessage(nut, pat)).toBe(true); expect(canMessage(other, nut)).toBe(false); expect(canMessage(pat, other)).toBe(false); });
  it("valida mensagem e feedback", () => {
    expect(messageSchema.safeParse({ kind: "text", body: "  " }).success).toBe(false); expect(messageSchema.safeParse({ kind: "audio", audio_path: "a/b", duration_s: 20 }).success).toBe(true);
    expect(feedbackSchema.safeParse({ kind: "badge", badge: "good_choice" }).success).toBe(true); expect(feedbackSchema.safeParse({ kind: "badge", badge: "x" }).success).toBe(false);
  });
  it("não lidas", () => expect(unreadFor([{ receiver_id: "p1", read_at: null }, { receiver_id: "p1", read_at: "x" }, { receiver_id: "n1", read_at: null }], "p1")).toBe(1));
});
