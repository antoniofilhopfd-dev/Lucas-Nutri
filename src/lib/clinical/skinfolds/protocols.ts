import { FormulaBlockedError, type FormulaMeta, type Sex } from "../types";

export const SITES = { chest: "Peitoral", axillary: "Axilar média", triceps: "Tríceps", subscapular: "Subescapular", abdominal: "Abdominal", suprailiac: "Supra-ilíaca", thigh: "Coxa", biceps: "Bíceps", calf: "Panturrilha", iliac_crest: "Crista ilíaca" } as const;
export type Site = keyof typeof SITES;
interface Coef { c0: number; c1: number; c2: number; c3: number } // Db = c0 + c1·S + c2·S² + c3·idade
export interface Protocol extends FormulaMeta { sites: Site[]; coef: Partial<Record<Sex, Coef>> | null }

const JP_REF = "Jackson AS, Pollock ML (1978) Br J Nutr 40:497-504; Jackson AS, Pollock ML, Ward A (1980) Med Sci Sports Exerc 12:175-182.";
const PENDING = { effective_date: "2026-10-01", status: "pending_review" as const };

export const PROTOCOLS: Record<string, Protocol> = {
  jp7: { id: "jp7", name: "Jackson & Pollock 7 dobras", author: "Jackson & Pollock", year: 1978, population: "Adultos", equation: "Db = c0 + c1·Σ7 + c2·Σ7² + c3·idade", reference: JP_REF, version: "1.0", ...PENDING,
    sites: ["chest", "axillary", "triceps", "subscapular", "abdominal", "suprailiac", "thigh"],
    coef: { male: { c0: 1.112, c1: -0.00043499, c2: 0.00000055, c3: -0.00028826 }, female: { c0: 1.097, c1: -0.00046971, c2: 0.00000056, c3: -0.00012828 } } },
  jp3: { id: "jp3", name: "Jackson & Pollock 3 dobras", author: "Jackson & Pollock", year: 1978, population: "Adultos", equation: "Db = c0 + c1·Σ3 + c2·Σ3² + c3·idade", reference: JP_REF, version: "1.0", ...PENDING,
    sites: ["chest", "abdominal", "thigh"], // masculino; feminino usa tríceps, supra-ilíaca e coxa (ver sitesFor)
    coef: { male: { c0: 1.10938, c1: -0.0008267, c2: 0.0000016, c3: -0.0002574 }, female: { c0: 1.0994921, c1: -0.0009929, c2: 0.0000023, c3: -0.0001392 } } },
  // Sem coeficientes até validação na referência original: nada é inferido.
  petroski4: { id: "petroski4", name: "Petroski 4 dobras", author: "Petroski", year: 1995, population: "Adultos brasileiros", equation: "—", reference: "Petroski EL (1995). Desenvolvimento e validação de equações generalizadas. Tese UFSM.", version: "0.0", ...PENDING, sites: ["subscapular", "triceps", "suprailiac", "calf"], coef: null },
  faulkner4: { id: "faulkner4", name: "Faulkner 4 dobras", author: "Faulkner", year: 1968, population: "Atletas", equation: "—", reference: "Faulkner JA (1968). Physiology of swimming and diving.", version: "0.0", ...PENDING, sites: ["triceps", "subscapular", "suprailiac", "abdominal"], coef: null },
  durnin4: { id: "durnin4", name: "Durnin & Womersley 4 dobras", author: "Durnin & Womersley", year: 1974, population: "Adultos 17-72 anos", equation: "—", reference: "Durnin JVGA, Womersley J (1974) Br J Nutr 32:77-97.", version: "0.0", ...PENDING, sites: ["biceps", "triceps", "subscapular", "suprailiac"], coef: null },
  guedes3: { id: "guedes3", name: "Guedes 3 dobras", author: "Guedes", year: 1994, population: "Adultos brasileiros", equation: "—", reference: "Guedes DP (1994). Composição corporal: princípios, técnicas e aplicações.", version: "0.0", ...PENDING, sites: ["triceps", "suprailiac", "abdominal"], coef: null },
};

export function sitesFor(p: Protocol, sex: Sex): Site[] {
  return p.id === "jp3" && sex === "female" ? ["triceps", "suprailiac", "thigh"] : p.sites;
}

export interface DensityResult { density: number; sum: number; protocol: string; formula_version: string; reference: string; inputs: Record<string, number>; age: number; sex: Sex }

/** Calcula Db. Bloqueia protocolos pending_review ou sem coeficientes. `registry` é injetável para testes. */
export function bodyDensity(protocolId: string, sex: Sex, age: number, folds: Partial<Record<Site, number>>, registry: Record<string, Protocol> = PROTOCOLS): DensityResult {
  const p = registry[protocolId];
  if (!p) throw new Error("Protocolo desconhecido");
  const coef = p.coef?.[sex];
  if (p.status !== "approved" || !coef) throw new FormulaBlockedError(p.id);
  const inputs: Record<string, number> = {};
  let sum = 0;
  for (const s of sitesFor(p, sex)) {
    const v = folds[s];
    if (v === undefined || !(v > 0)) throw new Error(`Dobra obrigatória ausente: ${SITES[s]}`);
    inputs[s] = v; sum += v;
  }
  const density = coef.c0 + coef.c1 * sum + coef.c2 * sum * sum + coef.c3 * age;
  return { density, sum, protocol: p.id, formula_version: p.version, reference: p.reference, inputs, age, sex };
}
