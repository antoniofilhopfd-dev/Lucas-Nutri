/** Pool único do MySQL/MariaDB (MYSQL_URL). Servidor-only. Padrão do AF+: o app aplica as migrações que faltam ao subir. */
import mysql, { type Pool, type PoolConnection, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";
import { aplicarMigracoes } from "./migrar";

const g = globalThis as unknown as { bnMysql?: Pool; bnMigrado?: Promise<void> };

function pronto(): Promise<void> {
  if (process.env.MIGRAR_AUTOMATICO === "false") return Promise.resolve();
  if (!g.bnMigrado) {
    const uri = process.env.MYSQL_URL;
    if (!uri) return Promise.resolve();
    g.bnMigrado = aplicarMigracoes(uri, undefined, (m) => console.log(`[banco] ${m}`)).then(
      () => undefined,
      (e) => {
        console.error("[banco] não consegui atualizar o banco:", e instanceof Error ? e.message : e);
        setTimeout(() => (g.bnMigrado = undefined), 60_000).unref();
      },
    );
  }
  return g.bnMigrado;
}

function pool(): Pool {
  if (!g.bnMysql) {
    const uri = process.env.MYSQL_URL;
    if (!uri) throw new Error("MYSQL_URL não configurada");
    g.bnMysql = mysql.createPool({ uri, connectionLimit: 5, dateStrings: false, timezone: "Z", decimalNumbers: true });
    g.bnMysql.on("connection", (c) => void c.query("SET time_zone = '+00:00'")); // CURRENT_TIMESTAMP também em UTC
  }
  return g.bnMysql;
}

export async function consultar<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  await pronto();
  const [rows] = await pool().query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}
export async function executar(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  await pronto();
  const [res] = await pool().query<ResultSetHeader>(sql, params);
  return res;
}

/** Consulta/execução sobre o pool ou sobre uma conexão de transação. */
export interface Executor {
  consultar<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  executar(sql: string, params?: unknown[]): Promise<ResultSetHeader>;
}
const sobre = (c: Pool | PoolConnection, esperar: () => Promise<void> = () => Promise.resolve()): Executor => ({
  async consultar<T>(sql: string, params: unknown[] = []) { await esperar(); const [rows] = await c.query<RowDataPacket[]>(sql, params); return rows as unknown as T[]; },
  async executar(sql: string, params: unknown[] = []) { await esperar(); const [res] = await c.query<ResultSetHeader>(sql, params); return res; },
});
export const bancoDireto = (): Executor => sobre(pool(), pronto);

/** Roda `fn` numa transação: tudo grava junto ou nada grava. */
export async function transacao<T>(fn: (q: Executor) => Promise<T>): Promise<T> {
  await pronto();
  const conn = await pool().getConnection();
  try {
    await conn.beginTransaction();
    const r = await fn(sobre(conn));
    await conn.commit();
    return r;
  } catch (e) {
    await conn.rollback().catch(() => undefined);
    throw e;
  } finally {
    conn.release();
  }
}
export async function fecharBanco() { if (g.bnMysql) { await g.bnMysql.end(); g.bnMysql = undefined; } }
