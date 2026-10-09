import { notFound } from "next/navigation";
import { actorAtual } from "@/server/auth";
import { listarConvites } from "@/server/convites";
import { Convidar } from "./Convidar";
import { Revogar } from "./Revogar";

export const dynamic = "force-dynamic";

export default async function Equipe() {
  const a = await actorAtual();
  if (a.papel !== "admin") notFound();
  const convites = await listarConvites(a);
  const estado = (c: (typeof convites)[number]) => c.usado_em ? "aceito" : c.revogado_em ? "cancelado" : new Date(c.expira_em) < new Date() ? "expirado" : "pendente";
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Equipe e convites</h1>
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
