/**
 * Regras de acesso (substituem o RLS do Postgres). TODA leitura/escrita de dado clínico passa por aqui.
 * - patient: só o próprio. - nutritionist: só pacientes da sua carteira. - admin: global.
 * Escrita em consulta só com a consulta em rascunho (finalizada = imutável; mudanças por emenda).
 */
import type { Executor } from "./mysql";
import type { Papel } from "./auth-core";

export interface Actor { id: string; papel: Papel }
export class AcessoNegado extends Error { constructor(m = "Acesso negado.") { super(m); this.name = "AcessoNegado"; } }

export const ehEquipe = (a: Actor) => a.papel === "nutritionist" || a.papel === "admin";
export function exigirEquipe(a: Actor) { if (!ehEquipe(a)) throw new AcessoNegado(); }

export async function podeLerPaciente(q: Executor, a: Actor, patientId: string): Promise<boolean> {
  if (a.papel === "patient") return a.id === patientId;
  const [r] = await q.consultar("SELECT 1 AS ok FROM patients WHERE id=? AND (? = 'admin' OR nutritionist_id=?) LIMIT 1", [patientId, a.papel, a.id]);
  return !!r;
}
export async function exigirLerPaciente(q: Executor, a: Actor, patientId: string) { if (!(await podeLerPaciente(q, a, patientId))) throw new AcessoNegado(); }
/** Escrita do cadastro/prontuário do paciente: só equipe responsável (admin global). */
export async function exigirGerirPaciente(q: Executor, a: Actor, patientId: string) { exigirEquipe(a); await exigirLerPaciente(q, a, patientId); }

export interface ConsultaRow { id: string; patient_id: string; nutritionist_id: string; record_state: "draft" | "finalized" | "amended"; status: string; version: number }
/** Consulta onde a equipe responsável pode GRAVAR (rascunho). `travar` usa SELECT … FOR UPDATE dentro de transação. */
export async function exigirEscritaConsulta(q: Executor, a: Actor, consultationId: string, travar = false): Promise<ConsultaRow> {
  exigirEquipe(a);
  const [c] = await q.consultar<ConsultaRow>(`SELECT id, patient_id, nutritionist_id, record_state, status, version FROM consultations WHERE id=? ${travar ? "FOR UPDATE" : ""}`, [consultationId]);
  if (!c || (a.papel !== "admin" && c.nutritionist_id !== a.id) || c.record_state !== "draft") throw new AcessoNegado();
  return c;
}

export async function auditar(q: Executor, a: Actor | null, o: { patientId?: string | null; consultationId?: string | null; action: string; entity: string; entityId?: string | null; oldValue?: unknown; newValue?: unknown }) {
  await q.executar("INSERT INTO audit_logs (user_id, patient_id, consultation_id, action, entity, entity_id, old_value, new_value) VALUES (?,?,?,?,?,?,?,?)", [
    a?.id ?? null, o.patientId ?? null, o.consultationId ?? null, o.action, o.entity, o.entityId ?? null,
    o.oldValue === undefined ? null : JSON.stringify(o.oldValue), o.newValue === undefined ? null : JSON.stringify(o.newValue),
  ]);
}
