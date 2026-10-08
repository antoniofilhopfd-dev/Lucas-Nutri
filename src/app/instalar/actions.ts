"use server";
import { timingSafeEqual } from "node:crypto";
import { consultar } from "@/server/mysql";
import { criarProfissional, emailValido } from "@/server/auth-core";

/** Instalação de uso único: só funciona com SETUP_TOKEN definido e enquanto não existir nenhum profissional cadastrado. */
export async function instaladoAinda(): Promise<boolean> {
  const r = await consultar<{ n: number }>("SELECT COUNT(*) AS n FROM usuarios WHERE papel IN ('nutritionist','admin')");
  return Number(r[0]?.n ?? 0) > 0;
}

const igual = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export async function instalar(f: { codigo: string; nome: string; crn: string; email: string; senha: string }): Promise<{ ok: boolean; message?: string }> {
  const esperado = process.env.SETUP_TOKEN;
  if (!esperado || !process.env.MYSQL_URL) return { ok: false, message: "Instalação não disponível." };
  if (await instaladoAinda()) return { ok: false, message: "Instalação não disponível." };
  if (!igual(f.codigo.trim(), esperado)) return { ok: false, message: "Código de instalação incorreto." };
  const nome = f.nome.trim(), email = f.email.trim();
  if (nome.length < 3) return { ok: false, message: "Informe o nome." };
  if (!f.crn.trim()) return { ok: false, message: "Informe o CRN." };
  if (!emailValido(email.toLowerCase())) return { ok: false, message: "E-mail inválido." };
  try { await criarProfissional({ nome, papel: "nutritionist", crn: f.crn, email, senha: f.senha }); }
  catch (e) { return { ok: false, message: e instanceof Error ? e.message : "Não foi possível criar o acesso." }; }
  return { ok: true };
}
