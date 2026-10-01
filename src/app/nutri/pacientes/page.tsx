import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function Pacientes() {
  const sb = await supabaseServer();
  // RLS limita automaticamente à carteira do nutricionista.
  const { data, error } = await sb.from("patients").select("id, preferred_name, primary_goal, active, profiles(full_name)").order("created_at", { ascending: false }).limit(50);
  return (
    <section>
      <div className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Pacientes</h1>
        <Link href="/nutri/pacientes/novo" className="rounded-lg bg-olive px-4 py-2 text-white">Novo paciente</Link></div>
      {error ? <p role="alert" className="mt-4">Não foi possível carregar os pacientes. Tente novamente.</p>
        : !data?.length ? <p className="mt-6 text-graphite/70">Nenhum paciente ainda. Cadastre o primeiro para iniciar um prontuário.</p>
        : <ul className="mt-4 divide-y divide-mist rounded-xl border border-mist bg-white">
            {data.map((p: any) => <li key={p.id} className="p-3">{p.profiles?.full_name ?? "—"}</li>)}</ul>}
    </section>
  );
}
