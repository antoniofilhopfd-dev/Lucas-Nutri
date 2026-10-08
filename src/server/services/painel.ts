import { consultar } from "../mysql";
import { exigirEquipe, type Actor } from "../authz";
import { hojeBR } from "../sql";

/** Números do painel do nutricionista (somente a carteira dele; admin vê tudo). */
export async function painel(a: Actor) {
  exigirEquipe(a);
  const esc = a.papel === "admin" ? { w: "1=1", p: [] as unknown[] } : { w: "p.nutritionist_id=?", p: [a.id] };
  const hoje = hojeBR();
  const [ativos] = await consultar<{ n: number }>(`SELECT COUNT(*) AS n FROM patients p WHERE p.active=1 AND ${esc.w}`, esc.p);
  const [checkins] = await consultar<{ n: number }>(`SELECT COUNT(*) AS n FROM patient_checkins c JOIN patients p ON p.id=c.patient_id WHERE c.checkin_date=? AND ${esc.w}`, [hoje, ...esc.p]);
  const [semRegistro] = await consultar<{ n: number }>(
    `SELECT COUNT(*) AS n FROM patients p WHERE p.active=1 AND ${esc.w} AND GREATEST(
        COALESCE((SELECT MAX(updated_at) FROM patient_checkins WHERE patient_id=p.id), '1970-01-01'),
        COALESCE((SELECT MAX(logged_at) FROM patient_meal_logs WHERE patient_id=p.id), '1970-01-01')) < (UTC_TIMESTAMP() - INTERVAL 48 HOUR)`, esc.p);
  const [consultasHoje] = await consultar<{ n: number }>(
    `SELECT COUNT(*) AS n FROM consultations c JOIN patients p ON p.id=c.patient_id WHERE DATE(c.scheduled_at - INTERVAL 3 HOUR)=? AND c.status IN ('scheduled','in_progress') AND ${esc.w}`, [hoje, ...esc.p]);
  return { pacientesAtivos: Number(ativos.n), checkinsHoje: Number(checkins.n), semRegistro48h: Number(semRegistro.n), consultasHoje: Number(consultasHoje.n) };
}
