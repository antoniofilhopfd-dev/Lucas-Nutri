import { transacao } from "../mysql";
import { auditar, exigirEscritaConsulta, exigirGerirPaciente, type Actor } from "../authz";
import { inserir, RegraNegocio } from "../sql";
import { buildAnamnesis, buildAnamnesisItems } from "@/lib/db/rows";
import type { ExtractedItem } from "@/lib/ai/types";

/** Guarda o relato e o provedor que processou. Nenhum dado clínico é criado aqui: as propostas só viram dado depois da revisão. */
export async function registrarAnamnese(a: Actor, consultationId: string, o: { rawText: string; extractor: string; stt?: string }): Promise<{ id: string }> {
  return transacao(async (q) => {
    const c = await exigirEscritaConsulta(q, a, consultationId, true);
    const id = await inserir(q, "anamneses", buildAnamnesis(c.patient_id, c.id, o));
    await auditar(q, a, { patientId: c.patient_id, consultationId: c.id, action: "insert", entity: "anamneses", entityId: id });
    return { id };
  });
}

/** Grava a decisão do nutricionista item a item. Itens pendentes não são aceitos. */
export async function decidirItens(a: Actor, anamnesisId: string, items: ExtractedItem[]): Promise<void> {
  if (items.some((i) => i.status === "pending")) throw new RegraNegocio("Ainda há itens sem decisão.");
  await transacao(async (q) => {
    const [an] = await q.consultar<{ consultation_id: string; patient_id: string }>("SELECT consultation_id, patient_id FROM anamneses WHERE id=?", [anamnesisId]);
    const c = an ? await exigirEscritaConsulta(q, a, an.consultation_id, true) : null;
    if (!an || !c) throw new RegraNegocio("Anamnese não encontrada.");
    for (const row of buildAnamnesisItems(anamnesisId, an.patient_id, a.id, items)) await inserir(q, "anamnesis_items", row);
    await auditar(q, a, { patientId: an.patient_id, consultationId: an.consultation_id, action: "review", entity: "anamnesis_items", entityId: anamnesisId, newValue: { itens: items.length } });
  });
}

/** Dado clínico = somente confirmado/editado. O paciente não lê a anamnese. */
export async function lerAnamneseConfirmada(a: Actor, patientId: string) {
  return transacao(async (q) => {
    await exigirGerirPaciente(q, a, patientId);
    return q.consultar("SELECT category, field, value, status, decided_at FROM anamnesis_items WHERE patient_id=? AND status IN ('confirmed','edited') ORDER BY created_at", [patientId]);
  });
}
