import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { modoDemo } from "@/server/auth";
import { semProfissionais } from "@/server/convites";
import { primeiroAcesso } from "@/features/auth/convite-actions";
import { FormSenha } from "@/components/FormSenha";

export const dynamic = "force-dynamic";

/** Só existe até o primeiro cadastro: depois disso, novos profissionais entram por convite. */
export default async function PrimeiroAcesso() {
  if (modoDemo() || !(await semProfissionais())) notFound();
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-6">
      <div className="flex justify-center"><Logo variant="full" className="h-32" /></div>
      <h1 className="text-center text-xl">Primeiro acesso</h1>
      <p className="text-center text-sm text-graphite/70">Cadastro do administrador do sistema. Depois dele, o Lucas e os demais entram por convite.</p>
      <FormSenha botao="Criar acesso" extras={[{ nome: "nome", rotulo: "Nome" }, { nome: "email", rotulo: "E-mail", tipo: "email", auto: "username" }]}
        enviar={async (senha, x) => { "use server"; return primeiroAcesso({ nome: x.nome ?? "", email: x.email ?? "", senha }); }} />
    </main>
  );
}
