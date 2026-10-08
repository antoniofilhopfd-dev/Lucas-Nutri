import Link from "next/link";
import { Logo } from "@/components/Logo";
import { exigirUsuario } from "@/server/auth";
import { logout } from "@/features/auth/actions";

const NAV = [["Dashboard", "/nutri"], ["Pacientes", "/nutri/pacientes"], ["Consultas", "/nutri/consultas"], ["Avaliação", "/nutri/avaliacao"], ["Energia", "/nutri/energia"], ["Fotometria", "/nutri/fotometria"], ["Anamnese", "/nutri/anamnese"], ["Dietas", "/nutri/dietas"], ["Clube", "/nutri/clube"]] as const;
export default async function NutriLayout({ children }: { children: React.ReactNode }) {
  const u = await exigirUsuario(["nutritionist", "admin"]);
  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[200px_1fr]">
      <nav aria-label="Menu" className="flex gap-1 overflow-x-auto md:flex-col">
        <Link href="/nutri" className="mb-2 hidden md:block"><Logo /></Link>
        {NAV.map(([t, h]) => <Link key={h} href={h} className="whitespace-nowrap rounded-lg px-3 py-2 text-graphite/70 hover:bg-mint/40">{t}</Link>)}
        <form action={logout} className="md:mt-4"><span className="hidden px-3 text-xs text-graphite/60 md:block">{u.nome}</span><button className="rounded-lg px-3 py-2 text-left text-graphite/70 hover:bg-mint/40">Sair</button></form>
      </nav>
      <main>{children}</main>
    </div>
  );
}
