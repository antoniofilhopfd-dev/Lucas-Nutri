import { describe, it, expect } from "vitest";
import { ruleBasedExtractor } from "./rule-extractor";
import { getExtractor, registerExtractor, ExternalProcessingNotAllowed } from "./registry";
import { confirm, edit, reject, toPersist, pendingCount } from "@/features/anamnesis/review";

const TXT = "Dorme às 23h e acorda às 6h30. Acorda 2 vezes de noite. É alérgica a camarão. Bebe 2,5 litros de água. Tem refluxo ocasional após o jantar. Usa creatina 3 g por dia. Bristol 4.";
describe("extração de anamnese", () => {
  it("extrai campos com origem e tudo pendente", async () => {
    const r = await ruleBasedExtractor.extract(TXT, "text");
    const get = (f: string) => r.find((i) => i.field === f);
    expect(get("Dorme")?.value).toBe("23:00"); expect(get("Acorda")?.value).toBe("06:30");
    expect(get("Alergia")?.value).toBe("camarão"); expect(get("Escala de Bristol")?.value).toBe("Tipo 4");
    expect(get("Suplemento")?.value).toMatch(/^creatina/); expect(get("Refluxo/Azia")?.value).toMatch(/refluxo/);
    expect(r.every((i) => i.status === "pending" && i.source.snippet.length > 0)).toBe(true);
  });
  it("texto sem informação não inventa dados", async () => expect(await ruleBasedExtractor.extract("Paciente simpático e pontual.", "text")).toEqual([]));
});
describe("revisão humana", () => {
  it("só confirmados/editados são persistidos", async () => {
    const [a, b, c] = (await ruleBasedExtractor.extract(TXT, "audio")).slice(0, 3);
    const items = [confirm(a), edit(b, "22:30"), reject(c)];
    expect(toPersist(items).map((i) => i.status)).toEqual(["confirmed", "edited"]); expect(toPersist(items)[1].value).toBe("22:30");
    expect(pendingCount([a])).toBe(1);
  });
  it("edição vazia é rejeitada", async () => { const [a] = await ruleBasedExtractor.extract(TXT, "text"); expect(() => edit(a, "  ")).toThrow(); });
});
describe("provedores plugáveis", () => {
  it("padrão local não exige consentimento externo", () => expect(getExtractor().external).toBe(false));
  it("externo é bloqueado sem consentimento", () => {
    registerExtractor({ name: "cloud-x", external: true, extract: async () => [] });
    expect(() => getExtractor("cloud-x")).toThrow(ExternalProcessingNotAllowed); expect(getExtractor("cloud-x", { externalConsent: true }).name).toBe("cloud-x");
  });
});
