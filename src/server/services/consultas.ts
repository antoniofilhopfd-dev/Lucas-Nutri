import { transacao, consultar } from "../mysql";
import { auditar, exigirEscritaConsulta, exigirEquipe, exigirGerirPaciente, type Actor, AcessoNegado } from "../authz";
import { inserir, RegraNegocio } from "../sql";

export interface NovaConsulta { patientId: string; consultationType: "initial" | "follow_up" | "reassessment" | "online"; scheduledAt?: Date }

export async function criarConsulta(a: Actor, i: NovaConsulta): Promise<{ id: string }> {
  exigirEquipe(a);
  return transacao(async (q) => {
    await exigirGerirPaciente(q, a, i.patientId); // o paciente precisa ser da carteira de quem cria
    const [p] = await q.consultar<{ nutritionist_id: string }>("SELECT nutritionist_id FROM patients WHERE id=?", [i.patientId]);
    const id = await inserir(q, "consultations", { patient_id: i.patientId, nutritionist_id: p.nutritionist_id, consultation_type: i.consultationType, scheduled_at: i.scheduledAt ?? null });
    await auditar(q, a, { patientId: i.patientId, consultationId: id, action: "insert", entity: "consultations", entityId: id });
    return { id };
  });
}

export async function listarConsultas(a: Actor, limite = 50) {
  const n = Math.min(Math.max(limite, 1), 200);
  const base = "SELECT c.id, c.patient_id, u.nome AS paciente, c.consultation_type, c.status, c.record_state, c.scheduled_at FROM consultations c JOIN usuarios u ON u.id=c.patient_id";
  if (a.papel === "patient") return consultar(`${base} WHERE c.patient_id=? ORDER BY c.scheduled_at DESC LIMIT ${n}`, [a.id]);
  if (a.papel === "admin") return consultar(`${base} ORDER BY c.scheduled_at DESC LIMIT ${n}`);
  return consultar(`${base} WHERE c.nutritionist_id=? ORDER BY c.scheduled_at DESC LIMIT ${n}`, [a.id]);
}

/** Finalizar: o registro fica preservado; depois só por emenda. */
export async function finalizarConsulta(a: Actor, id: string): Promise<void> {
  await transacao(async (q) => {
    const c = await exigirEscritaConsulta(q, a, id, true);
    const r = await q.executar("UPDATE consultations SET record_state='finalized', status='completed', completed_at=UTC_TIMESTAMP(), version=version+1 WHERE id=? AND record_state='draft'", [id]);
    if (r.affectedRows !== 1) throw new RegraNegocio("A consulta não pode ser finalizada.");
    await auditar(q, a, { patientId: c.patient_id, consultationId: id, action: "finalize", entity: "consultations", entityId: id, oldValue: { record_state: "draft" }, newValue: { record_state: "finalized" } });
  });
}

/** Emenda: guarda o valor original (snapshot), o motivo e quem alterou. */
export async function emendarConsulta(a: Actor, id: string, motivo: string, novasNotas: string): Promise<void> {
  exigirEquipe(a);
  if (motivo.trim().length < 5) throw new RegraNegocio("Informe o motivo da alteração (mín. 5 caracteres).");
  await transacao(async (q) => {
    const [c] = await q.consultar<Record<string, unknown> & { nutritionist_id: string; record_state: string; patient_id: string; version: number }>("SELECT * FROM consultations WHERE id=? FOR UPDATE", [id]);
    if (!c || (a.papel !== "admin" && c.nutritionist_id !== a.id) || !["finalized", "amended"].includes(c.record_state)) throw new AcessoNegado();
    await inserir(q, "consultation_amendments", { consultation_id: id, amended_by: a.id, reason: motivo.trim(), previous_version: c.version, previous_snapshot: c });
    await q.executar("UPDATE consultations SET clinical_notes=?, record_state='amended', version=version+1 WHERE id=?", [novasNotas, id]);
    await auditar(q, a, { patientId: c.patient_id, consultationId: id, action: "amend", entity: "consultations", entityId: id, oldValue: { clinical_notes: c.clinical_notes }, newValue: { clinical_notes: novasNotas, reason: motivo.trim() } });
  });
}
