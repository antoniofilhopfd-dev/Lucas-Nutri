import { exigirUsuario } from "@/server/auth";
import { feed } from "@/server/services/comunidade";

export const dynamic = "force-dynamic";
export default async function Clube() {
  const u = await exigirUsuario(["nutritionist", "admin"]);
  let data: any[] = [], erro = false;
  try { data = (await feed({ id: u.id, papel: u.papel })) as any[]; } catch (e) { console.error("clube", e); erro = true; }
  return (
    <section className="space-y-3"><h1 className="text-2xl font-semibold">BentoNutriClub</h1>
      {erro ? <p role="alert">Não foi possível carregar o feed. Tente novamente.</p> : !data.length ? <p className="text-graphite/70">Ainda não há publicações. Publique conteúdo oficial ou crie um desafio para começar.</p>
        : data.map((p) => <article key={p.id} className="rounded-xl border border-mist bg-white p-4"><b>{p.author_name}</b>{p.featured ? " ★" : ""}<p>{p.body}</p><small>{p.likes} curtidas · {p.comments} comentários</small></article>)}
    </section>
  );
}
