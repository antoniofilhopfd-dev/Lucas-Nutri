import { transacao } from "../mysql";
import { auditar, ehEquipe, exigirEquipe, type Actor, AcessoNegado } from "../authz";
import { inserir, RegraNegocio } from "../sql";
import { temConsentimentoImagem } from "./consentimentos";
import { isCommunityImagePath } from "@/features/community/rules";
import type { Executor } from "../mysql";

/** Cada nutricionista tem uma comunidade; o paciente participa da do seu nutricionista. */
async function comunidadeDe(q: Executor, a: Actor): Promise<string> {
  if (a.papel === "nutritionist") return a.id;
  if (a.papel === "patient") { const [p] = await q.consultar<{ n: string }>("SELECT nutritionist_id AS n FROM patients WHERE id=?", [a.id]); if (p) return p.n; }
  throw new AcessoNegado();
}

export async function publicar(a: Actor, p: { kind: string; body: string; imagePath?: string; communityId?: string }): Promise<{ id: string }> {
  if (!p.body.trim() || p.body.length > 2000) throw new RegraNegocio("Escreva algo (até 2.000 caracteres).");
  return transacao(async (q) => {
    const community = a.papel === "admin" ? p.communityId : await comunidadeDe(q, a);
    if (!community) throw new RegraNegocio("Informe a comunidade.");
    if (p.kind === "official" && !ehEquipe(a)) throw new AcessoNegado();
    if (p.imagePath) {
      if (!isCommunityImagePath(p.imagePath)) throw new RegraNegocio("Fotos clínicas não podem ser publicadas na comunidade.");
      if (a.papel === "patient" && !(await temConsentimentoImagem(q, a.id, "public_use"))) throw new RegraNegocio("Para publicar fotos, autorize o uso público de imagem.");
    }
    const id = await inserir(q, "community_posts", { community_id: community, author_id: a.id, kind: p.kind, body: p.body.trim(), image_path: p.imagePath ?? null });
    await auditar(q, a, { action: "insert", entity: "community_posts", entityId: id });
    return { id };
  });
}

/** Feed: o paciente vê as publicações visíveis da sua comunidade (e as próprias); a equipe vê todas as da sua. Só nome preferencial/primeiro nome. */
export async function feed(a: Actor, limite = 30) {
  return transacao(async (q) => {
    const community = a.papel === "admin" ? null : await comunidadeDe(q, a);
    const filtroStatus = ehEquipe(a) ? "p.status <> 'deleted'" : "(p.status='visible' OR p.author_id=?) AND p.status <> 'deleted'";
    const params: unknown[] = [];
    let where = filtroStatus;
    if (!ehEquipe(a)) params.push(a.id);
    if (community) { where = `p.community_id=? AND ${where}`; params.unshift(community); }
    return q.consultar(
      `SELECT p.id, p.kind, p.body, p.image_path, p.featured, p.status, p.created_at, p.author_id,
         COALESCE(NULLIF(TRIM(pt.preferred_name), ''), SUBSTRING_INDEX(u.nome, ' ', 1)) AS author_name,
         (SELECT COUNT(*) FROM community_likes l WHERE l.post_id=p.id) AS likes,
         (SELECT COUNT(*) FROM community_comments c WHERE c.post_id=p.id AND c.status='visible') AS comments
       FROM community_posts p JOIN usuarios u ON u.id=p.author_id LEFT JOIN patients pt ON pt.id=p.author_id
       WHERE ${where} ORDER BY p.featured DESC, p.created_at DESC LIMIT ?`, [...params, Math.min(limite, 100)]);
  });
}

/** Moderação: só a equipe da comunidade (ou admin) oculta, exclui e destaca. O autor pode excluir a própria. */
export async function moderar(a: Actor, postId: string, acao: "hide" | "show" | "delete" | "feature" | "unfeature"): Promise<void> {
  await transacao(async (q) => {
    const [p] = await q.consultar<{ community_id: string; author_id: string }>("SELECT community_id, author_id FROM community_posts WHERE id=? FOR UPDATE", [postId]);
    if (!p) throw new AcessoNegado();
    const dono = a.papel === "admin" || (a.papel === "nutritionist" && p.community_id === a.id);
    const autor = a.id === p.author_id;
    if (!dono && !(autor && acao === "delete")) throw new AcessoNegado();
    const set = { hide: "status='hidden'", show: "status='visible'", delete: "status='deleted'", feature: "featured=1", unfeature: "featured=0" }[acao];
    await q.executar(`UPDATE community_posts SET ${set} WHERE id=?`, [postId]);
    await auditar(q, a, { action: `moderate_${acao}`, entity: "community_posts", entityId: postId });
  });
}

async function postVisivelDaMinhaComunidade(q: Executor, a: Actor, postId: string): Promise<void> {
  const community = a.papel === "admin" ? null : await comunidadeDe(q, a);
  const [p] = await q.consultar<{ community_id: string; status: string }>("SELECT community_id, status FROM community_posts WHERE id=?", [postId]);
  if (!p || p.status !== "visible" || (community && p.community_id !== community)) throw new AcessoNegado();
}
export async function curtir(a: Actor, postId: string): Promise<void> {
  await transacao(async (q) => { await postVisivelDaMinhaComunidade(q, a, postId); await q.executar("INSERT IGNORE INTO community_likes (post_id, user_id) VALUES (?,?)", [postId, a.id]); });
}
export async function comentar(a: Actor, postId: string, texto: string): Promise<void> {
  if (!texto.trim() || texto.length > 1000) throw new RegraNegocio("Escreva um comentário (até 1.000 caracteres).");
  await transacao(async (q) => { await postVisivelDaMinhaComunidade(q, a, postId); await inserir(q, "community_comments", { post_id: postId, author_id: a.id, body: texto.trim() }); });
}
export async function criarDesafio(a: Actor, d: { title: string; description?: string; startsOn: string; endsOn: string }): Promise<{ id: string }> {
  exigirEquipe(a);
  if (a.papel !== "nutritionist") throw new AcessoNegado();
  if (!d.title.trim()) throw new RegraNegocio("Informe o título.");
  if (d.endsOn < d.startsOn) throw new RegraNegocio("O fim deve ser depois do início.");
  return transacao(async (q) => ({ id: await inserir(q, "community_challenges", { nutritionist_id: a.id, title: d.title.trim(), description: d.description ?? null, starts_on: d.startsOn, ends_on: d.endsOn }) }));
}
