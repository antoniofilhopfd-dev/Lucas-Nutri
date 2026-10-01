import { goHome, logout } from "@/features/auth/actions";
export default function AcessoNegado() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Acesso não permitido</h1>
      <p className="text-graphite/70">Esta área não está disponível para o seu perfil.</p>
      <form action={goHome}><button className="min-h-11 w-full rounded-lg bg-olive text-white">Voltar para o início</button></form>
      <form action={logout}><button className="text-sm underline">Sair</button></form>
    </main>
  );
}
