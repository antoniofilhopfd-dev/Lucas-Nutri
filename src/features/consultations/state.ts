export type Status = "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";
export type RecordState = "draft" | "finalized" | "amended";

const STATUS: Record<Status, Status[]> = {
  scheduled: ["in_progress", "cancelled", "no_show"],
  in_progress: ["completed", "cancelled"],
  completed: [], cancelled: [], no_show: [],
};
export const canMoveStatus = (a: Status, b: Status) => STATUS[a].includes(b);

/** Registro finalizado só muda via emenda auditada (preserva o original). */
export const isEditableInPlace = (s: RecordState) => s === "draft";
export const canFinalize = (s: RecordState, status: Status) => s === "draft" && status === "in_progress";
export const canAmend = (s: RecordState) => s === "finalized" || s === "amended";
export function validateAmendReason(reason: string) {
  return reason.trim().length >= 5 ? null : "Informe o motivo da alteração (mín. 5 caracteres)";
}
