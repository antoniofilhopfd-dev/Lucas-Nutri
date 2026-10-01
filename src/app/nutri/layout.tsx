import Link from "next/link";
import { Logo } from "@/components/Logo";
const NAV = [["Dashboard", "/nutri"], ["Pacientes", "/nutri/pacientes"], ["Consultas", "/nutri/consultas"], ["Avaliação", "/nutri/avaliacao"], ["Energia", "/nutri/energia"], ["Fotometria", "/nutri/fotometria"]] as const;
export default function NutriLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 p-4 md:grid-cols-[200px_1fr]">
      <nav aria-label="Menu" className="flex gap-1 overflow-x-auto md:flex-col">
        <Link href="/nutri" className="mb-2 hidden md:block"><Logo /></Link>
        {NAV.map(([t, h]) => <Link key={h} href={h} className="rounded-lg px-3 py-2 text-graphite/70 hover:bg-mint/40">{t}</Link>)}
      </nav>
      <main>{children}</main>
    </div>
  );
}
