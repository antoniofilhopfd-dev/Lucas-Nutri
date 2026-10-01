export type Category = "sleep" | "nutrition" | "gastro" | "health";
export interface ExtractedItem {
  id: string; category: Category; field: string; value: string;
  source: { kind: "text" | "audio"; snippet: string };
  confidence?: number;                       // 0..1, quando o provedor informar
  status: "pending" | "confirmed" | "edited" | "rejected";
}
/** Provedores são plugáveis. `external` = envia dados para fora do sistema. */
export interface SpeechToText { name: string; external: boolean; transcribe(audio: Blob, lang: string): Promise<string> }
export interface AnamnesisExtractor { name: string; external: boolean; extract(text: string, source: "text" | "audio"): Promise<ExtractedItem[]> }
