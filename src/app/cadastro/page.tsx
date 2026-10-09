import { notFound } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { modoDemo } from "@/server/auth";
import { Cadastro } from "./Form";

export default function Page() {
  if (modoDemo()) notFound();
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-6">
      <div className="flex justify-center"><Logo variant="full" className="h-32" /></div>
      <h1 className="text-center text-xl">Criar conta de nutricionista</h1>
      <Cadastro />
      <p className="text-center text-sm"><Link className="underline" href="/login">Já tenho conta</Link></p>
    </main>
  );
}
