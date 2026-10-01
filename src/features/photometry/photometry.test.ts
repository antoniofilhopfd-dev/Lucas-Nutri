import { describe, it, expect } from "vitest";
import { photoPath, validateUpload, targetSize, SIGNED_URL_TTL_S } from "./rules";
import { buildEvolutionPdf, diff } from "@/lib/reports/evolution";

const P = "11111111-1111-4111-8111-111111111111", A = "22222222-2222-4222-8222-222222222222";
describe("fotometria", () => {
  it("caminho começa pelo patient_id (base das políticas de Storage)", () => {
    expect(photoPath(P, A, "front", "image/webp")).toBe(`${P}/${A}/front.webp`);
    expect(photoPath(P, A, "back", "image/jpeg")).toBe(`${P}/${A}/back.jpg`);
  });
  it("rejeita identificadores que poderiam escapar da pasta", () => expect(() => photoPath("../x", A, "front", "image/webp")).toThrow());
  it("valida formato e tamanho", () => {
    expect(validateUpload("image/png", 100)).toMatch(/Formato/); expect(validateUpload("image/webp", 6 * 1024 * 1024)).toMatch(/grande/); expect(validateUpload("image/jpeg", 1000)).toBeNull();
  });
  it("resize não amplia e mantém proporção", () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 }); expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("URL assinada expira em minutos", () => expect(SIGNED_URL_TTL_S).toBeLessThanOrEqual(600));
});
describe("relatório de evolução", () => {
  it("diferença absoluta e percentual", () => { const d = diff({ label: "Peso", unit: "kg", initial: 68.4, followup: 66.9 }); expect(d.abs).toBeCloseTo(-1.5, 10); expect(d.pct).toBeCloseTo(-2.193, 2); });
  it("percentual indefinido quando inicial = 0", () => expect(diff({ label: "x", unit: "", initial: 0, followup: 1 }).pct).toBeNull());
  it("gera um PDF válido", async () => {
    const b = await buildEvolutionPdf({ patientName: "Marina Costa", initialDate: "11/08/2026", followupDate: "11/09/2026", nutritionist: "Lucas Bento", metrics: [{ label: "Peso", unit: "kg", initial: 68.4, followup: 66.9 }], methodology: ["IMC: OMS adultos v1.0"] });
    expect(new TextDecoder().decode(b.slice(0, 5))).toBe("%PDF-");
  });
});
