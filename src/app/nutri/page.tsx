import { exigirUsuario } from "@/server/auth";
import { painel } from "@/server/services/painel";

export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const u = await exigirUsuario(["nutritionist", "admin"]);
  const n = await painel({ id: u.id, papel: u.papel });
  const cards = [["Pacientes ativos", n.pacientesAtivos], ["Check-ins hoje", n.checkinsHoje], ["Sem registro há mais de 48 h", n.semRegistro48h], ["Consultas hoje", n.consultasHoje]] as const;
  return (
    <section className="space-y-4"><h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([t, v]) => <div key={t} className="rounded-xl border border-mist bg-white p-4"><div className="text-xs uppercase tracking-wide text-graphite/60">{t}</div><div className="mt-1 text-3xl font-extrabold tabular-nums">{v}</div></div>)}</div>
      {n.pacientesAtivos === 0 && <p className="text-graphite/70">Nenhum paciente ainda. Cadastre o primeiro em Pacientes para começar.</p>}
    </section>
  );
}
