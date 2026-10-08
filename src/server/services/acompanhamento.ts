import { transacao } from "../mysql";
import { auditar, exigirLerPaciente, type Actor, AcessoNegado } from "../authz";
import { inserir, inserirOuAtualizar, hojeBR, RegraNegocio } from "../sql";
import { buildCheckin, buildMealLog, buildMessage } from "@/lib/db/rows";
import { validateTraining } from "@/features/checkins/rules";

const soPaciente = (a: Actor) => { if (a.papel !== "patient") throw new AcessoNegado(); };

/** O paciente escreve apenas o PRÓPRIO dia de hoje (fuso de Brasília); o passado não é reescrito. */
export async function salvarCheckin(a: Actor, c: { waterMl: number; goalMl?: number; trained?: boolean; modality?: string; minutes?: number }, hoje = hojeBR()): Promise<void> {
  soPaciente(a);
  if (c.waterMl < 0 || c.waterMl % 500 !== 0) throw new RegraNegocio("A água é registrada em blocos de 500 ml.");
  const erro = validateTraining({ trained: !!c.trained, modality: c.modality, durationMin: c.minutes });
  if (erro) throw new RegraNegocio(erro);
  await transacao(async (q) => {
    await inserirOuAtualizar(q, "patient_checkins", buildCheckin(a.id, hoje, c), ["water_ml", "water_goal_ml", "trained", "training_modality", "training_minutes"]);
  });
}

export async function registrarRefeicao(a: Actor, m: { mealType: string; photoPath?: string; before?: string; after?: string }, hoje = hojeBR()): Promise<{ id: string }> {
  soPaciente(a);
  return transacao(async (q) => ({ id: await inserir(q, "patient_meal_logs", buildMealLog(a.id, hoje, m)) }));
}

export async function listarCheckins(a: Actor, patientId: string, dias = 14) {
  return transacao(async (q) => {
    await exigirLerPaciente(q, a, patientId);
    return q.consultar("SELECT checkin_date, water_ml, water_goal_ml, trained, training_modality, training_minutes FROM patient_checkins WHERE patient_id=? ORDER BY checkin_date DESC LIMIT ?", [patientId, Math.min(dias, 90)]);
  });
}
export async function listarRefeicoes(a: Actor, patientId: string, dias = 14) {
  return transacao(async (q) => {
    await exigirLerPaciente(q, a, patientId);
    return q.consultar("SELECT id, log_date, meal_type, feeling_before, feeling_after, logged_at FROM patient_meal_logs WHERE patient_id=? ORDER BY logged_at DESC LIMIT ?", [patientId, Math.min(dias * 6, 500)]);
  });
}

/* ---------- mensagens: só paciente ↔ nutricionista responsável ---------- */
export async function enviarMensagem(a: Actor, patientId: string, texto: string): Promise<void> {
  if (!texto.trim() || texto.length > 4000) throw new RegraNegocio("Escreva uma mensagem (até 4.000 caracteres).");
  await transacao(async (q) => {
    const [p] = await q.consultar<{ id: string; nutritionist_id: string }>("SELECT id, nutritionist_id FROM patients WHERE id=?", [patientId]);
    if (!p) throw new AcessoNegado();
    let receiver: string;
    if (a.papel === "patient") { if (a.id !== p.id) throw new AcessoNegado(); receiver = p.nutritionist_id; }
    else if (a.papel === "nutritionist") { if (a.id !== p.nutritionist_id) throw new AcessoNegado(); receiver = p.id; }
    else receiver = p.id; // admin
    await inserir(q, "messages", buildMessage(patientId, a.id, receiver, texto.trim()));
  });
}
export async function lerMensagens(a: Actor, patientId: string) {
  return transacao(async (q) => {
    await exigirLerPaciente(q, a, patientId);
    return q.consultar("SELECT id, sender_id, receiver_id, kind, body, sent_at, read_at FROM messages WHERE patient_id=? ORDER BY sent_at", [patientId]);
  });
}
/** Só o destinatário marca como lida. */
export async function marcarLidas(a: Actor, ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  return transacao(async (q) => {
    const res = await q.executar(`UPDATE messages SET read_at=UTC_TIMESTAMP() WHERE receiver_id=? AND read_at IS NULL AND id IN (${ids.map(() => "?").join(",")})`, [a.id, ...ids]);
    return res.affectedRows;
  });
}
