export type ReviewStatus = "approved" | "pending_review";
export interface FormulaMeta {
  id: string; name: string; author: string; year: number | null; population: string;
  equation: string; reference: string; version: string; effective_date: string;
  status: ReviewStatus; // pending_review => REVISÃO CIENTÍFICA NECESSÁRIA: cálculo bloqueado
}
export class FormulaBlockedError extends Error {
  constructor(public formulaId: string) { super(`REVISÃO CIENTÍFICA NECESSÁRIA: ${formulaId}`); }
}
export type Sex = "male" | "female";
