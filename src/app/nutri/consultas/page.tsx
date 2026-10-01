import { supabaseServer } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
const TYPE: Record<string, string> = { initial: "Inicial", follow_up: "Retorno", reassessment: "Reavaliação", online: "Online" };
export default async function Consultas() {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("consultations").select("id, consultation_type, status, record_state, scheduled_at, patients(profiles(full_name))").order("scheduled_at", { ascending: false, nullsFirst: false }).limit(50);
  return (
    <section className="space-y-3"><h1 className="text-2xl font-semibold">Consultas</h1>
      {error ? <p role="alert">Não foi possível carregar as consultas. Tente novamente.</p> : !data?.length ? <p className="text-graphite/70">Nenhuma consulta ainda. Abra o prontuário de um paciente para agendar a primeira.</p> :
        <ul className="divide-y divide-mist rounded-xl border border-mist bg-white">{data.map((c: any) => <li key={c.id} className="flex justify-between p-3"><span>{c.patients?.profiles?.full_name ?? "—"} · {TYPE[c.consultation_type]}</span><span className="text-sm text-graphite/70">{c.status} · {c.record_state}</span></li>)}</ul>}
    </section>
  );
}
