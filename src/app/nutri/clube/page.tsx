import { supabaseServer } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Clube() {
  const sb = await supabaseServer();
  const { data, error } = await sb.from("community_feed").select("id, kind, body, author_name, likes, comments, featured").order("created_at", { ascending: false }).limit(30);
  return (
    <section className="space-y-3"><h1 className="text-2xl font-semibold">BentoNutriClub</h1>
      {error ? <p role="alert">Não foi possível carregar o feed. Tente novamente.</p> : !data?.length ? <p className="text-graphite/70">Ainda não há publicações. Publique conteúdo oficial ou crie um desafio para começar.</p>
        : data.map((p) => <article key={p.id} className="rounded-xl border border-mist bg-white p-4"><b>{p.author_name}</b>{p.featured && " ★"}<p>{p.body}</p><small>{p.likes} curtidas · {p.comments} comentários</small></article>)}
    </section>
  );
}
