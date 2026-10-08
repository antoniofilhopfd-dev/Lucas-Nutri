/**
 * Núcleo de autenticação (sem dependência do Next; também usado pelos scripts). Estrutura do AF+.
 * - Nutricionista/admin: CRN (ou e-mail) + senha, guardada só como hash scrypt com sal próprio.
 * - Paciente: telefone + código de uso único (SMS/WhatsApp), guardado só como HMAC, 10 min, 5 tentativas.
 * - Sessão: token aleatório em cookie httpOnly; só o SHA-256 vai para o banco.
 */
import { createHash, createHmac, randomBytes, randomInt, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { consultar, executar, transacao, type Executor } from "./mysql";
import { validarSenha } from "@/lib/senha-regra";
import { toE164BR } from "@/lib/utils/phone";

export { REGRA_SENHA, validarSenha } from "@/lib/senha-regra";
export type Papel = "patient" | "nutritionist" | "admin";
export interface Usuario { id: string; nome: string; papel: Papel }

export const SESSAO_DIAS = 30;
export const CODIGO_MIN = 10;
const CODIGO_TENTATIVAS = 5;
const LIMITE_FALHAS_ID = 5, LIMITE_FALHAS_DIA = 10, LIMITE_FALHAS_IP = 20, JANELA_FALHAS_MIN = 15;

function segredo(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET não configurada (mínimo 32 caracteres)");
  return s;
}
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const novoToken = () => randomBytes(32).toString("base64url");
const hmac = (s: string) => createHmac("sha256", segredo()).update(s).digest("hex");
const emDias = (d: number) => new Date(Date.now() + d * 86_400_000);

export const normalizarCrn = (c: string) => c.trim().toUpperCase().replace(/\s+/g, " ");
export const normalizarEmail = (e: string) => e.trim().toLowerCase();
export const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 190;

/* ---------- senha (scrypt) ---------- */
const derivar = (senha: string, sal: Buffer) => new Promise<Buffer>((ok, erro) => scrypt(senha.normalize("NFKC"), sal, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? erro(e) : ok(k))));
export async function hashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  return `scrypt$${sal.toString("base64")}$${(await derivar(senha, sal)).toString("base64")}`;
}
const HASH_VAZIO = `scrypt$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(64).toString("base64")}`;
export async function confereSenha(guardado: string | null, senha: string): Promise<boolean> {
  const g = guardado ?? HASH_VAZIO; // compara mesmo sem usuário: o tempo não revela se ele existe
  const [, sal, h] = g.split("$");
  const esperado = Buffer.from(h ?? "", "base64"), recebido = await derivar(senha, Buffer.from(sal ?? "", "base64"));
  return guardado !== null && esperado.length === recebido.length && timingSafeEqual(esperado, recebido);
}

/* ---------- registro e limite de tentativas ---------- */
export async function registrar(acao: string, o: { usuarioId?: string | null; identificador?: string | null; detalhe?: string | null; ip?: string | null }) {
  try {
    await executar("INSERT INTO log_acessos (usuario_id, identificador, acao, detalhe, ip) VALUES (?,?,?,?,?)", [o.usuarioId ?? null, o.identificador?.slice(0, 190) ?? null, acao, o.detalhe?.slice(0, 255) ?? null, o.ip ?? null]);
  } catch (e) { console.error("falha ao registrar acesso", e); }
}
/** 5 falhas em 15 min bloqueiam o identificador; 10 em 24 h bloqueiam por 24 h; 20 por IP em 15 min. */
export async function bloqueadoPorFalhas(identificador: string, ip: string | null): Promise<boolean> {
  const conta = async (campo: "identificador" | "ip", valor: string, desde: Date) => {
    const [r] = await consultar<{ n: number }>(`SELECT COUNT(*) AS n FROM log_acessos WHERE acao='login_falhou' AND ${campo}=? AND criado_em>?`, [valor, desde]);
    return Number(r.n);
  };
  if ((await conta("identificador", identificador, new Date(Date.now() - JANELA_FALHAS_MIN * 60_000))) >= LIMITE_FALHAS_ID) return true;
  if ((await conta("identificador", identificador, new Date(Date.now() - 86_400_000))) >= LIMITE_FALHAS_DIA) return true;
  return ip ? (await conta("ip", ip, new Date(Date.now() - JANELA_FALHAS_MIN * 60_000))) >= LIMITE_FALHAS_IP : false;
}

/* ---------- profissionais: CRN/e-mail + senha ---------- */
export async function autenticarProfissional(identificador: string, senha: string): Promise<Usuario | null> {
  const crn = normalizarCrn(identificador), email = normalizarEmail(identificador);
  const [u] = await consultar<Usuario & { senha_hash: string | null; ativo: number }>(
    "SELECT id, nome, papel, senha_hash, ativo FROM usuarios WHERE papel IN ('nutritionist','admin') AND (crn=? OR email=?) LIMIT 1", [crn, email]);
  const ok = await confereSenha(u?.senha_hash ?? null, senha);
  if (!u || !ok || !u.ativo) return null;
  return { id: u.id, nome: u.nome, papel: u.papel };
}
export async function criarProfissional(o: { nome: string; papel: "nutritionist" | "admin"; crn?: string; email?: string; senha: string }): Promise<{ id: string }> {
  const erro = validarSenha(o.senha); if (erro) throw new Error(erro);
  if (o.papel === "nutritionist" && !o.crn) throw new Error("Informe o CRN.");
  const id = randomUUID(), hash = await hashSenha(o.senha);
  await transacao(async (q) => {
    await q.executar("INSERT INTO usuarios (id, papel, nome, email, crn, senha_hash) VALUES (?,?,?,?,?,?)", [id, o.papel, o.nome, o.email ? normalizarEmail(o.email) : null, o.crn ? normalizarCrn(o.crn) : null, hash]);
    if (o.papel === "nutritionist") await q.executar("INSERT INTO nutritionists (id, crn) VALUES (?,?)", [id, normalizarCrn(o.crn!)]);
  });
  return { id };
}
export async function definirSenha(usuarioId: string, senha: string): Promise<void> {
  const erro = validarSenha(senha); if (erro) throw new Error(erro);
  await executar("UPDATE usuarios SET senha_hash=? WHERE id=?", [await hashSenha(senha), usuarioId]);
  await executar("DELETE FROM sessoes WHERE usuario_id=?", [usuarioId]); // derruba as sessões abertas
}

/* ---------- pacientes: telefone + código de uso único ---------- */
const codigoHash = (usuarioId: string, codigo: string) => hmac(`codigo|${usuarioId}|${codigo}`);
/** Gera um código de 6 dígitos (válido por CODIGO_MIN min) e invalida os anteriores. Devolve o código em claro, uma única vez. */
export async function emitirCodigo(q: Executor, usuarioId: string): Promise<string> {
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await q.executar("UPDATE codigos_acesso SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND usado_em IS NULL", [usuarioId]);
  await q.executar("INSERT INTO codigos_acesso (id, usuario_id, codigo_hash, expira_em) VALUES (?,?,?,?)", [randomUUID(), usuarioId, codigoHash(usuarioId, codigo), new Date(Date.now() + CODIGO_MIN * 60_000)]);
  return codigo;
}
export async function pacientePorTelefone(telefone: string): Promise<{ id: string } | null> {
  const e164 = toE164BR(telefone); if (!e164) return null;
  const [u] = await consultar<{ id: string }>("SELECT id FROM usuarios WHERE papel='patient' AND telefone=? AND ativo=1", [e164]);
  return u ?? null;
}
/** Valida o código; no máximo 5 tentativas por código; uso único (atualização atômica). */
export async function entrarComCodigo(telefone: string, codigo: string): Promise<Usuario | null> {
  const u0 = await pacientePorTelefone(telefone); if (!u0) return null;
  const [c] = await consultar<{ id: string; codigo_hash: string; tentativas: number }>(
    "SELECT id, codigo_hash, tentativas FROM codigos_acesso WHERE usuario_id=? AND usado_em IS NULL AND expira_em>UTC_TIMESTAMP() ORDER BY criado_em DESC LIMIT 1", [u0.id]);
  if (!c || c.tentativas >= CODIGO_TENTATIVAS) return null;
  const esperado = Buffer.from(c.codigo_hash, "hex"), recebido = Buffer.from(codigoHash(u0.id, codigo.replace(/\D/g, "")), "hex");
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) {
    await executar("UPDATE codigos_acesso SET tentativas=tentativas+1 WHERE id=?", [c.id]);
    return null;
  }
  const r = await executar("UPDATE codigos_acesso SET usado_em=UTC_TIMESTAMP() WHERE id=? AND usado_em IS NULL", [c.id]);
  if (r.affectedRows !== 1) return null;
  const [u] = await consultar<Usuario>("SELECT id, nome, papel FROM usuarios WHERE id=?", [u0.id]);
  return u ?? null;
}

/* ---------- sessões ---------- */
export async function criarSessaoDb(usuarioId: string, ip: string | null, agente: string | null) {
  const token = novoToken(), expira = emDias(SESSAO_DIAS);
  await executar("DELETE FROM sessoes WHERE expira_em < UTC_TIMESTAMP()");
  await executar("INSERT INTO sessoes (token_hash, usuario_id, expira_em, ip, agente) VALUES (?,?,?,?,?)", [sha256(token), usuarioId, expira, ip, agente?.slice(0, 255) ?? null]);
  return { token, expira };
}
export async function usuarioDaSessao(token: string | undefined): Promise<Usuario | null> {
  if (!token) return null;
  const [u] = await consultar<Usuario>(
    `SELECT u.id, u.nome, u.papel FROM sessoes s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.expira_em>UTC_TIMESTAMP() AND u.ativo=1`, [sha256(token)]);
  return u ?? null;
}
export const encerrarSessaoDb = (token: string) => executar("DELETE FROM sessoes WHERE token_hash=?", [sha256(token)]);
