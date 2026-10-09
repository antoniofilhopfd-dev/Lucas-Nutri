import Link from "next/link";
import { usuarioAtual } from "@/server/auth";

const ITENS = [["Avaliação física", "/nutri/avaliacao"], ["Gasto energético", "/nutri/energia"], ["Fotometria", "/nutri/fotometria"], ["Anamnese", "/nutri/anamnese"], ["Clube BentoNutri", "/nutri/clube"]] as const;
export default async function Mais() {
  const admin = (await usuarioAtual())?.papel === "admin";
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Mais</h1>
      <ul className="space-y-2">{[...ITENS, ...(admin ? [["Equipe e convites", "/nutri/equipe"] as const] : [])].map(([t, h]) => <li key={h}><Link href={h} className="flex min-h-12 items-center rounded-xl border border-mist bg-white px-4">{t}</Link></li>)}</ul>
    </div>
  );
}
