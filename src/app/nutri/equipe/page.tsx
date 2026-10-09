import { notFound } from "next/navigation";
import { actorAtual } from "@/server/auth";
import { listarConvites, listarPendentes } from "@/server/convites";
import { Convidar } from "./Convidar";
import { Decidir } from "./Decidir";
import { Revogar } from "./Revogar";

export const dynamic = "force-dynamic";

export default async function Equipe() {
  const a = await actorAtual();
  if (a.papel !== "admin") notFound();
  const convites = await listarConvites(a), aguardando = await listarPendentes(a);
  const estado = (c: (typeof convites)[number]) => c.usado_em ? "aceito" : c.revogado_em ? "cancelado" : new Date(c.expira_em) < new Date() ? "expirado" : "pendente";
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Equipe e convites</h1>
      {aguardando.length > 0 && <section className="space-y-2"><h2 className="font-semibold">Cadastros aguardando aprovação</h2>
        <ul className="space-y-2">{aguardando.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-olive bg-white p-3">
          <div className="min-w-0"><div className="truncate font-medium">{p.nome}</div><div className="truncate text-xs text-graphite/60">{p.crn} · {p.email}</div></div><Decidir id={p.id} /></li>)}</ul></section>}
      <h2 className="font-semibold">Convidar por link</h2>
      <Convidar />
      <ul className="space-y-2">
        {convites.map((c) => <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-mist bg-white p-3">
          <div className="min-w-0"><div className="truncate font-medium">{c.nome}</div><div className="truncate text-xs text-graphite/60">{c.email} · {estado(c)}</div></div>
          {estado(c) === "pendente" && <Revogar id={c.id} />}
        </li>)}
      </ul>
    </div>
  );
}
