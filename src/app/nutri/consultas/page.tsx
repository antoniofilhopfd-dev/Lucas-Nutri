import { exigirUsuario } from "@/server/auth";
import { listarConsultas } from "@/server/services/consultas";

export const dynamic = "force-dynamic";
const TYPE: Record<string, string> = { initial: "Inicial", follow_up: "Retorno", reassessment: "Reavaliação", online: "Online" };
export default async function Consultas() {
  const u = await exigirUsuario(["nutritionist", "admin"]);
  let data: Awaited<ReturnType<typeof listarConsultas>> = [], erro = false;
  try { data = await listarConsultas({ id: u.id, papel: u.papel }); } catch (e) { console.error("consultas", e); erro = true; }
  return (
    <section className="space-y-3"><h1 className="text-2xl font-semibold">Consultas</h1>
      {erro ? <p role="alert">Não foi possível carregar as consultas. Tente novamente.</p> : !data.length ? <p className="text-graphite/70">Nenhuma consulta ainda. Abra o prontuário de um paciente para agendar a primeira.</p> :
        <ul className="divide-y divide-mist rounded-xl border border-mist bg-white">{(data as any[]).map((c) => <li key={c.id} className="flex justify-between p-3"><span>{c.paciente} · {TYPE[c.consultation_type]}</span><span className="text-sm text-graphite/70">{c.status} · {c.record_state}</span></li>)}</ul>}
    </section>
  );
}
