export type DietStatus = "draft" | "reviewed" | "finalized" | "published" | "superseded";
const NEXT: Record<DietStatus, DietStatus[]> = { draft: ["reviewed"], reviewed: ["draft", "finalized"], finalized: ["published"], published: ["superseded"], superseded: [] };
export const canTransition = (a: DietStatus, b: DietStatus) => NEXT[a].includes(b);
/** Só rascunho/revisada pode ser editada; finalizada e publicada são imutáveis. */
export const isEditable = (s: DietStatus) => s === "draft" || s === "reviewed";
/** O paciente enxerga apenas a versão publicada vigente. */
export const visibleToPatient = (d: { status: DietStatus }) => d.status === "published";
/** Alterar dieta publicada gera nova versão (rascunho) que aponta para a anterior. */
export function newVersionFrom<T extends { id: string; version: number; status: DietStatus }>(d: T): Omit<T, "id"> & { parent_id: string } {
  if (d.status !== "published" && d.status !== "finalized") throw new Error("Só dietas finalizadas ou publicadas geram nova versão");
  const { id, ...rest } = d; return { ...rest, version: d.version + 1, status: "draft", parent_id: id };
}
/** Publicar a nova versão aposenta a anterior (uma única publicada por paciente). */
export const supersedes = (prev: DietStatus) => (prev === "published" ? ("superseded" as const) : prev);
