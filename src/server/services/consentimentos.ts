import { transacao } from "../mysql";
import { auditar, exigirLerPaciente, type Actor, AcessoNegado } from "../authz";
import { inserir } from "../sql";
import type { Executor } from "../mysql";

export type TipoImagem = "clinical_use" | "public_use";
/** Consentimento vigente = aceito e não revogado. O clínico NUNCA autoriza publicação. */
export async function temConsentimentoImagem(q: Executor, patientId: string, tipo: TipoImagem): Promise<boolean> {
  const [r] = await q.consultar("SELECT 1 AS ok FROM image_consents WHERE patient_id=? AND consent_type=? AND accepted=1 AND revoked_at IS NULL LIMIT 1", [patientId, tipo]);
  return !!r;
}
/** O paciente (ou o administrador) registra o próprio aceite. Cada finalidade é separada e versionada. */
export async function aceitarImagem(a: Actor, patientId: string, tipo: TipoImagem, versao = "1.0"): Promise<void> {
  if (!(a.papel === "admin" || (a.papel === "patient" && a.id === patientId))) throw new AcessoNegado();
  await transacao(async (q) => {
    await inserir(q, "image_consents", { patient_id: patientId, consent_type: tipo, consent_version: versao, accepted: 1 });
    await auditar(q, a, { patientId, action: "consent", entity: "image_consents", newValue: { tipo, versao } });
  });
}
export async function revogarImagem(a: Actor, patientId: string, tipo: TipoImagem): Promise<void> {
  if (!(a.papel === "admin" || (a.papel === "patient" && a.id === patientId))) throw new AcessoNegado();
  await transacao(async (q) => {
    await q.executar("UPDATE image_consents SET revoked_at=UTC_TIMESTAMP() WHERE patient_id=? AND consent_type=? AND revoked_at IS NULL", [patientId, tipo]);
    await auditar(q, a, { patientId, action: "revoke", entity: "image_consents", newValue: { tipo } });
  });
}
export async function consentimentosDoPaciente(a: Actor, patientId: string) {
  return transacao(async (q) => { await exigirLerPaciente(q, a, patientId); return q.consultar("SELECT consent_type, consent_version, accepted_at, revoked_at FROM image_consents WHERE patient_id=? ORDER BY accepted_at DESC", [patientId]); });
}
