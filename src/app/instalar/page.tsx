import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { instaladoAinda } from "./actions";
import { Form } from "./Form";

export const dynamic = "force-dynamic";

export default async function Instalar() {
  if (!process.env.SETUP_TOKEN || !process.env.MYSQL_URL) notFound();
  if (await instaladoAinda()) notFound();
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-5 p-6">
      <div className="flex justify-center"><Logo variant="full" className="h-32" /></div>
      <h1 className="text-center text-xl">Primeiro acesso</h1>
      <Form />
    </main>
  );
}
