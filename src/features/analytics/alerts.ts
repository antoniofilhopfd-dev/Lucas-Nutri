export type Severity = "info" | "warning" | "critical";
export interface Alert { patientId: string; code: string; severity: Severity; message: string }
export interface PatientSnapshot { id: string; name: string; lastRecordAt: Date | null; adherence7d: number | null; previousAdherence7d?: number | null; nextReturn?: Date | null }

/** Regras simples e explicáveis; nenhuma conclusão clínica automática. */
export function buildAlerts(p: PatientSnapshot, now = new Date()): Alert[] {
  const out: Alert[] = [];
  const hours = p.lastRecordAt ? (now.getTime() - p.lastRecordAt.getTime()) / 3.6e6 : Infinity;
  if (hours > 96) out.push({ patientId: p.id, code: "no_record_96h", severity: "critical", message: `${p.name} está sem registros há mais de 4 dias.` });
  else if (hours > 48) out.push({ patientId: p.id, code: "no_record_48h", severity: "warning", message: `${p.name} está sem registros há mais de 48 h.` });
  if (p.adherence7d !== null && p.adherence7d < 50) out.push({ patientId: p.id, code: "low_adherence", severity: "warning", message: `Adesão semanal de ${p.name} abaixo de 50%.` });
  if (p.adherence7d != null && p.previousAdherence7d != null && p.previousAdherence7d - p.adherence7d >= 25) out.push({ patientId: p.id, code: "adherence_drop", severity: "info", message: `Adesão de ${p.name} caiu ${Math.round(p.previousAdherence7d - p.adherence7d)} pontos.` });
  if (p.nextReturn && p.nextReturn.getTime() < now.getTime() - 24 * 3.6e6) out.push({ patientId: p.id, code: "overdue_return", severity: "info", message: `Retorno de ${p.name} está atrasado.` });
  return out;
}
const RANK: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
export const sortAlerts = (a: Alert[]) => [...a].sort((x, y) => RANK[x.severity] - RANK[y.severity]);
