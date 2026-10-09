/** Convite por link e primeiro acesso. Servidor-only. O token só existe no link; o banco guarda o SHA-256. */
import { randomUUID } from "node:crypto";
import { consultar, transacao } from "./mysql";
import { inserirProfissional, emailValido, normalizarEmail, normalizarCrn, novoToken, sha256 } from "./auth-core";
import { auditar, type Actor } from "./authz";
import { RegraNegocio } from "./sql";

export const CONVITE_DIAS = 7;
export interface Convite { id: string; nome: string; crn: string | null; email: string; papel: "nutritionist" | "admin"; expira_em: Date }

const hojeMais = (d: number) => new Date(Date.now() + d * 86_400_000);

/** Primeiro acesso: só existe enquanto não há nenhum profissional cadastrado; cria o administrador. */
export const semProfissionais = async () => Number((await consultar<{ n: number }>("SELECT COUNT(*) AS n FROM usuarios WHERE papel IN ('nutritionist','admin')"))[0]?.n ?? 0) === 0;

export async function criarPrimeiroAdmin(o: { nome: string; email: string; senha: string }): Promise<{ id: string }> {
  const email = normalizarEmail(o.email);
  if (o.nome.trim().length < 3) throw new RegraNegocio("Informe o nome.");
  if (!emailValido(email)) throw new RegraNegocio("E-mail inválido.");
  return transacao(async (q) => {
    const n = (await q.consultar<{ n: number }>("SELECT COUNT(*) AS n FROM usuarios WHERE papel IN ('nutritionist','admin') FOR UPDATE"))[0]?.n ?? 0;
    if (Number(n) > 0) throw new RegraNegocio("O primeiro acesso já foi feito.");
    try { return await inserirProfissional(q, { nome: o.nome.trim(), papel: "admin", email, senha: o.senha }); }
    catch (e) { throw e instanceof Error && !(e instanceof RegraNegocio) ? new RegraNegocio(e.message) : e; }
  });
}

/** Cria o convite e devolve o token (só desta vez). Apenas administrador. */
export async function criarConvite(a: Actor, o: { nome: string; email: string; crn?: string; papel: "nutritionist" | "admin" }): Promise<{ token: string; expira: Date }> {
  if (a.papel !== "admin") throw new RegraNegocio("Só o administrador pode convidar.");
  const email = normalizarEmail(o.email), nome = o.nome.trim(), crn = o.crn?.trim() ? normalizarCrn(o.crn) : null;
  if (nome.length < 3) throw new RegraNegocio("Informe o nome.");
  if (!emailValido(email)) throw new RegraNegocio("E-mail inválido.");
  if (o.papel === "nutritionist" && !crn) throw new RegraNegocio("Informe o CRN do nutricionista.");
  const token = novoToken(), id = randomUUID(), expira = hojeMais(CONVITE_DIAS);
  await transacao(async (q) => {
    const ja = await q.consultar("SELECT 1 FROM usuarios WHERE email=? OR (crn IS NOT NULL AND crn=?) LIMIT 1", [email, crn]);
    if (ja.length) throw new RegraNegocio("Já existe um cadastro com este e-mail ou CRN.");
    await q.executar("UPDATE convites SET revogado_em=NOW() WHERE email=? AND usado_em IS NULL AND revogado_em IS NULL", [email]); // um convite ativo por e-mail
    await q.executar("INSERT INTO convites (id, token_hash, papel, nome, crn, email, criado_por, expira_em) VALUES (?,?,?,?,?,?,?,?)", [id, sha256(token), o.papel, nome, crn, email, a.id, expira]);
    await auditar(q, a, { action: "convite_criado", entity: "convites", entityId: id, newValue: { email, papel: o.papel } });
  });
  return { token, expira };
}

export async function conviteValido(token: string): Promise<Convite | null> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(token)) return null;
  const r = await consultar<Convite>("SELECT id, nome, crn, email, papel, expira_em FROM convites WHERE token_hash=? AND usado_em IS NULL AND revogado_em IS NULL AND expira_em > NOW()", [sha256(token)]);
  return r[0] ?? null;
}

/** Aceita o convite: o profissional escolhe a senha. Uso único (UPDATE condicional dentro da transação). */
export async function aceitarConvite(token: string, senha: string): Promise<{ id: string }> {
  const c = await conviteValido(token);
  if (!c) throw new RegraNegocio("Convite inválido ou expirado. Peça um novo ao administrador.");
  return transacao(async (q) => {
    const r = await q.executar("UPDATE convites SET usado_em=NOW() WHERE id=? AND usado_em IS NULL AND revogado_em IS NULL AND expira_em > NOW()", [c.id]);
    if (r.affectedRows !== 1) throw new RegraNegocio("Convite inválido ou expirado. Peça um novo ao administrador.");
    try { return await inserirProfissional(q, { nome: c.nome, papel: c.papel, crn: c.crn ?? undefined, email: c.email, senha }); }
    catch (e) { throw e instanceof Error && !(e instanceof RegraNegocio) ? new RegraNegocio(e.message) : e; }
  });
}

export const listarConvites = async (a: Actor) => {
  if (a.papel !== "admin") throw new RegraNegocio("Só o administrador vê os convites.");
  return consultar<{ id: string; nome: string; email: string; papel: string; expira_em: Date; usado_em: Date | null; revogado_em: Date | null }>(
    "SELECT id, nome, email, papel, expira_em, usado_em, revogado_em FROM convites ORDER BY criado_em DESC LIMIT 50");
};
export async function revogarConvite(a: Actor, id: string) {
  if (a.papel !== "admin") throw new RegraNegocio("Só o administrador revoga convites.");
  await transacao(async (q) => {
    await q.executar("UPDATE convites SET revogado_em=NOW() WHERE id=? AND usado_em IS NULL AND revogado_em IS NULL", [id]);
    await auditar(q, a, { action: "convite_revogado", entity: "convites", entityId: id });
  });
}
