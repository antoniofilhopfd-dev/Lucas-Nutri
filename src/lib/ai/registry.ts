import type { AnamnesisExtractor, SpeechToText } from "./types";
import { ruleBasedExtractor } from "./rule-extractor";

const extractors: Record<string, AnamnesisExtractor> = { [ruleBasedExtractor.name]: ruleBasedExtractor };
const stt: Record<string, SpeechToText> = {};
export const registerExtractor = (e: AnamnesisExtractor) => { extractors[e.name] = e; };
export const registerStt = (s: SpeechToText) => { stt[s.name] = s; };

export class ExternalProcessingNotAllowed extends Error { constructor() { super("Processamento externo exige consentimento do paciente"); } }

/** Provedor externo só é liberado com consentimento explícito de tratamento de dados para esse fim. */
export function getExtractor(name = process.env.AI_EXTRACTOR ?? ruleBasedExtractor.name, opts: { externalConsent: boolean } = { externalConsent: false }) {
  const e = extractors[name]; if (!e) throw new Error(`Extrator desconhecido: ${name}`);
  if (e.external && !opts.externalConsent) throw new ExternalProcessingNotAllowed();
  return e;
}
export function getStt(name = process.env.AI_STT, opts: { externalConsent: boolean } = { externalConsent: false }) {
  const s = name ? stt[name] : undefined; if (!s) return null; // sem provedor: UI mantém só texto
  if (s.external && !opts.externalConsent) throw new ExternalProcessingNotAllowed();
  return s;
}
