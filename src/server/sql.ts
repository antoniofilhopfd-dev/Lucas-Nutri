/** Inserção parametrizada a partir de uma linha (objeto coluna → valor). Gera o id (UUID) quando a tabela usa CHAR(36). */
import { randomUUID } from "node:crypto";
import type { Executor } from "./mysql";
import columns from "@/lib/db/columns.generated.json";

type Cols = Record<string, Record<string, { required: boolean }>>;
const C = columns as Cols;
const SEM_ID_UUID = new Set(["audit_logs", "log_acessos"]);          // chave AUTO_INCREMENT
const IDENT = /^[a-z][a-z0-9_]*$/;

const valor = (v: unknown) => (v === undefined ? null : v !== null && typeof v === "object" && !(v instanceof Date) && !Buffer.isBuffer(v) ? JSON.stringify(v) : v);

/** Tabela e colunas precisam existir no esquema (lista gerada do banco): nada vindo do usuário vira nome de coluna. */
export async function inserir(q: Executor, tabela: string, linha: Record<string, unknown>): Promise<string> {
  const t = C[tabela];
  if (!t || !IDENT.test(tabela)) throw new Error(`tabela desconhecida: ${tabela}`);
  const dados: Record<string, unknown> = { ...linha };
  const temId = "id" in t && !SEM_ID_UUID.has(tabela);
  if (temId && dados.id === undefined) dados.id = randomUUID();
  const cols = Object.keys(dados);
  for (const c of cols) if (!(c in t) || !IDENT.test(c)) throw new Error(`coluna desconhecida em ${tabela}: ${c}`);
  await q.executar(`INSERT INTO ${tabela} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")})`, cols.map((c) => valor(dados[c])));
  return String(dados.id ?? "");
}
export const hojeBR = (now = new Date()) => new Date(now.getTime() - 3 * 3600_000).toISOString().slice(0, 10);

/** INSERT … ON DUPLICATE KEY UPDATE para as colunas indicadas (ex.: um check-in por paciente/dia). */
export async function inserirOuAtualizar(q: Executor, tabela: string, linha: Record<string, unknown>, atualizar: string[]): Promise<void> {
  const t = C[tabela];
  if (!t || !IDENT.test(tabela)) throw new Error(`tabela desconhecida: ${tabela}`);
  const dados: Record<string, unknown> = { ...linha };
  if ("id" in t && dados.id === undefined) dados.id = randomUUID();
  const cols = Object.keys(dados);
  for (const c of [...cols, ...atualizar]) if (!(c in t) || !IDENT.test(c)) throw new Error(`coluna desconhecida em ${tabela}: ${c}`);
  await q.executar(`INSERT INTO ${tabela} (${cols.join(",")}) VALUES (${cols.map(() => "?").join(",")}) ON DUPLICATE KEY UPDATE ${atualizar.map((c) => `${c}=VALUES(${c})`).join(",")}`, cols.map((c) => valor(dados[c])));
}
export const dataISO = (v: Date | string): string => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10));
export class RegraNegocio extends Error { constructor(m: string) { super(m); this.name = "RegraNegocio"; } }
