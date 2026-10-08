import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { patientSchema } from "@/features/patients/schema";
import { transacao, consultar } from "../mysql";
import { auditar, exigirEquipe, exigirGerirPaciente, exigirLerPaciente, type Actor, AcessoNegado } from "../authz";
import { emitirCodigo } from "../auth-core";
import { inserir, RegraNegocio } from "../sql";

export type NovoPaciente = z.output<typeof patientSchema>;

/** Cria o usuário (login por telefone) e o cadastro, na carteira do nutricionista. Admin informa o nutricionista. */
export async function criarPaciente(a: Actor, input: NovoPaciente, opts: { nutritionistId?: string } = {}): Promise<{ id: string }> {
  exigirEquipe(a);
  const nutriId = a.papel === "admin" ? opts.nutritionistId : a.id;
  if (!nutriId) throw new RegraNegocio("Informe o nutricionista responsável.");
  const id = randomUUID();
  try {
    await transacao(async (q) => {
      const [n] = await q.consultar("SELECT 1 AS ok FROM nutritionists WHERE id=?", [nutriId]);
      if (!n) throw new RegraNegocio("Nutricionista não encontrado.");
      await inserir(q, "usuarios", { id, papel: "patient", nome: input.full_name, telefone: input.phone, email: input.email || null });
      await inserir(q, "patients", {
        id, nutritionist_id: nutriId, birth_date: input.birth_date, biological_sex: input.biological_sex, preferred_name: input.preferred_name || null,
        gender_identity: input.gender_identity || null, sexual_orientation: input.sexual_orientation || null, ethnicity: input.ethnicity || null, occupation: input.occupation || null,
        phone: input.phone, email: input.email || null, practices_sports: input.practices_sports ? 1 : 0, modalities: input.modalities, primary_modality: input.primary_modality ?? null,
        weekly_frequency: input.weekly_frequency ?? null, primary_goal: input.primary_goal, secondary_goals: input.secondary_goals,
      });
      await auditar(q, a, { patientId: id, action: "insert", entity: "patients", entityId: id });
    });
  } catch (e) {
    if ((e as { code?: string }).code === "ER_DUP_ENTRY") throw new RegraNegocio("Já existe um paciente com este telefone.");
    throw e;
  }
  return { id };
}

export interface PacienteResumo { id: string; nome: string; preferred_name: string | null; primary_goal: string | null; active: number; created_at: Date }
export async function listarPacientes(a: Actor, limite = 50): Promise<PacienteResumo[]> {
  const base = "SELECT p.id, u.nome, p.preferred_name, p.primary_goal, p.active, p.created_at FROM patients p JOIN usuarios u ON u.id=p.id";
  const n = Math.min(Math.max(limite, 1), 200);
  if (a.papel === "patient") return consultar<PacienteResumo>(`${base} WHERE p.id=? LIMIT ${n}`, [a.id]);
  if (a.papel === "admin") return consultar<PacienteResumo>(`${base} ORDER BY p.created_at DESC LIMIT ${n}`);
  return consultar<PacienteResumo>(`${base} WHERE p.nutritionist_id=? ORDER BY p.created_at DESC LIMIT ${n}`, [a.id]);
}

export async function obterPaciente(a: Actor, patientId: string) {
  return transacao(async (q) => {
    await exigirLerPaciente(q, a, patientId);
    const [p] = await q.consultar<Record<string, unknown>>("SELECT p.*, u.nome FROM patients p JOIN usuarios u ON u.id=p.id WHERE p.id=?", [patientId]);
    if (!p) throw new AcessoNegado();
    return p;
  });
}

/** Dados de saúde: o paciente lê os próprios; equipe só da carteira. */
export async function lerDadosSaude(a: Actor, patientId: string) {
  return transacao(async (q) => {
    await exigirLerPaciente(q, a, patientId);
    const [r] = await q.consultar<Record<string, unknown>>("SELECT * FROM patient_health_data WHERE patient_id=?", [patientId]);
    return r ?? null;
  });
}

/** O nutricionista gera o código de acesso do paciente (para enviar por WhatsApp quando não há SMS). */
export async function emitirCodigoPaciente(a: Actor, patientId: string): Promise<string> {
  return transacao(async (q) => {
    await exigirGerirPaciente(q, a, patientId);
    const codigo = await emitirCodigo(q, patientId);
    await auditar(q, a, { patientId, action: "issue_code", entity: "codigos_acesso" });
    return codigo;
  });
}
