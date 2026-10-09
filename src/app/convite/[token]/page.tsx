import { Logo } from "@/components/Logo";
import { FormSenha } from "@/components/FormSenha";
import { modoDemo } from "@/server/auth";
import { conviteValido } from "@/server/convites";
import { aceitar } from "@/features/auth/convite-actions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Convite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = modoDemo() ? null : await conviteValido(token);
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-6">
      <div className="flex justify-center"><Logo variant="full" className="h-32" /></div>
      {!c ? <p role="alert" className="text-center">Este convite não é mais válido. Peça um novo ao administrador.</p> : <>
        <h1 className="text-center text-xl">Bem-vindo(a), {c.nome}</h1>
        <p className="text-center text-sm text-graphite/70">{c.crn ? `CRN ${c.crn} · ` : ""}{c.email}</p>
        <FormSenha botao="Entrar" enviar={async (senha) => { "use server"; return aceitar(token, senha); }} />
      </>}
    </main>
  );
}
