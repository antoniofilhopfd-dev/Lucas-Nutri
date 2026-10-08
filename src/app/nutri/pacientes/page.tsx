import Link from "next/link";
import { exigirUsuario } from "@/server/auth";
import { listarPacientes } from "@/server/services/pacientes";

export const dynamic = "force-dynamic";
export default async function Pacientes() {
  const u = await exigirUsuario(["nutritionist", "admin"]);
  let lista: Awaited<ReturnType<typeof listarPacientes>> = [], erro = false;
  try { lista = await listarPacientes({ id: u.id, papel: u.papel }); } catch (e) { console.error("pacientes", e); erro = true; }
  return (
    <section>
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Pacientes</h1>
        <Link href="/nutri/pacientes/novo" className="rounded-lg bg-olive px-4 py-2 text-white">Novo paciente</Link></div>
      {erro ? <p role="alert" className="mt-4">Não foi possível carregar os pacientes. Tente novamente.</p>
        : !lista.length ? <p className="mt-6 text-graphite/70">Nenhum paciente ainda. Cadastre o primeiro para iniciar um prontuário.</p>
        : <ul className="mt-4 divide-y divide-mist rounded-xl border border-mist bg-white">{lista.map((p) => <li key={p.id}><Link href={`/nutri/pacientes/${p.id}`} className="block p-3 hover:bg-mist/40">{p.nome}</Link></li>)}</ul>}
    </section>
  );
}
