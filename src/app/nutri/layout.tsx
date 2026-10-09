import Link from "next/link";
import { Logo } from "@/components/Logo";
import { exigirUsuario } from "@/server/auth";
import { logout } from "@/features/auth/actions";

const ABAS = [["Início", "/nutri"], ["Pacientes", "/nutri/pacientes"], ["Consultas", "/nutri/consultas"], ["Dietas", "/nutri/dietas"], ["Mais", "/nutri/mais"]] as const;
export default async function NutriLayout({ children }: { children: React.ReactNode }) {
  const u = await exigirUsuario(["nutritionist", "admin"]);
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-mist bg-paper/95 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
        <Link href="/nutri" aria-label="Início"><Logo className="h-9" /></Link>
        <form action={logout} className="flex items-center gap-3"><span className="max-w-[140px] truncate text-xs text-graphite/60">{u.nome}</span><button className="min-h-11 rounded-lg px-2 text-sm text-graphite/70">Sair</button></form>
      </header>
      <main className="flex-1 p-4 pb-24">{children}</main>
      <nav aria-label="Menu" className="fixed bottom-0 left-1/2 z-10 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-mist bg-paper pb-[env(safe-area-inset-bottom)]">
        {ABAS.map(([t, h]) => <Link key={h} href={h} className="flex min-h-14 items-center justify-center text-xs text-graphite/80 active:bg-mint/40">{t}</Link>)}
      </nav>
    </div>
  );
}
