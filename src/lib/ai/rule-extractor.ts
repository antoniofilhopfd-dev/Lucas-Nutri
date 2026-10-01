import type { AnamnesisExtractor, ExtractedItem, Category } from "./types";

type Rule = { category: Category; field: string; re: RegExp; fmt: (m: RegExpMatchArray) => string };
const hhmm = (h: string, m?: string) => `${h.padStart(2, "0")}:${(m ?? "00").padStart(2, "0")}`;
const T = "(\\d{1,2})\\s*(?:h|:)?\\s*(\\d{2})?";
const RULES: Rule[] = [
  { category: "sleep", field: "Dorme", re: new RegExp(`dorm\\w*\\s+(?:por volta d?as?|às|as)?\\s*${T}`, "i"), fmt: (m) => hhmm(m[1], m[2]) },
  { category: "sleep", field: "Acorda", re: new RegExp(`acord\\w*\\s+(?:por volta d?as?|às|as)?\\s*${T}`, "i"), fmt: (m) => hhmm(m[1], m[2]) },
  { category: "sleep", field: "Despertares", re: /acorda\w*\s+(\d+|uma|duas|três)\s+vez(?:es)?\s+(?:de|à|a)\s+noite/i, fmt: (m) => m[1] },
  { category: "nutrition", field: "Alergia", re: /al[ée]rgic[oa]\s+a\s+([^.,;]+)/i, fmt: (m) => m[1].trim() },
  { category: "nutrition", field: "Intolerância", re: /intoler\w+\s+(?:a|à)\s+([^.,;]+)/i, fmt: (m) => m[1].trim() },
  { category: "nutrition", field: "Água", re: /(\d+(?:[.,]\d+)?)\s*(?:l|litros?)\s+de\s+[áa]gua|bebe\s+(\d+(?:[.,]\d+)?)\s*(?:l|litros?)/i, fmt: (m) => `${m[1] ?? m[2]} L/dia` },
  { category: "nutrition", field: "Álcool", re: /\b(bebe\s+álcool[^.,;]*|consome\s+álcool[^.,;]*|não\s+bebe\s+álcool)/i, fmt: (m) => m[1].trim() },
  { category: "nutrition", field: "Tabagismo", re: /\b(fuma[^.,;]*|não\s+fuma|ex-?fumante)/i, fmt: (m) => m[1].trim() },
  { category: "gastro", field: "Refluxo/Azia", re: /\b(refluxo|azia)([^.,;]*)/i, fmt: (m) => (m[1] + m[2]).trim() },
  { category: "gastro", field: "Gases/Distensão", re: /\b(gases|distens[ãa]o|estufamento)([^.,;]*)/i, fmt: (m) => (m[1] + m[2]).trim() },
  { category: "gastro", field: "Escala de Bristol", re: /bristol\s*(?:tipo\s*)?([1-7])/i, fmt: (m) => `Tipo ${m[1]}` },
  { category: "health", field: "Suplemento", re: /(?:usa|toma|suplementa)\s+((?:creatina|whey|ômega\s*3|vitamina\s+\w+|cafeína|multivitam[ií]nico)[^.;]*)/i, fmt: (m) => m[1].trim() },
  { category: "health", field: "Medicamento", re: /(?:usa|toma)\s+(?:medicamento\s+)?((?:losartana|metformina|levotiroxina|omeprazol|sertralina|fluoxetina)[^.;]*)/i, fmt: (m) => m[1].trim() },
  { category: "health", field: "Condição relatada", re: /(?:tem|diagn[óo]stico de|portador[a]? de)\s+(diabetes[^.,;]*|hipertens[ãa]o[^.,;]*|hipotireoidismo|colesterol alto|ansiedade|gastrite)/i, fmt: (m) => m[1].trim() },
];

/** Extrator local e determinístico. Nenhum dado sai do sistema. Todo item volta "pending". */
export const ruleBasedExtractor: AnamnesisExtractor = {
  name: "rule-based-ptbr", external: false,
  async extract(text, source) {
    const out: ExtractedItem[] = [];
    const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
    for (const s of sentences) for (const r of RULES) {
      const m = s.match(r.re); if (!m) continue;
      out.push({ id: `${r.field}-${out.length}`, category: r.category, field: r.field, value: r.fmt(m), source: { kind: source, snippet: s.trim() }, status: "pending" });
    }
    return out;
  },
};
