/** Aplica, em ordem, as migrações que ainda não rodaram (tabela _migracoes), com bloqueio no próprio MySQL (GET_LOCK). */
import mysql, { type RowDataPacket } from "mysql2/promise";
import { MIGRACOES } from "./migracoes-sql";

export async function aplicarMigracoes(uri: string, lista: { nome: string; sql: string }[] = MIGRACOES, log: (m: string) => void = () => undefined): Promise<string[]> {
  const conn = await mysql.createConnection({ uri, multipleStatements: true });
  const aplicadas: string[] = [];
  try {
    const [lock] = await conn.query<RowDataPacket[]>("SELECT GET_LOCK('bentonutrisync_migrar', 60) AS ok");
    if (!lock[0]?.ok) throw new Error("outra atualização do banco está em andamento");
    try {
      await conn.query("CREATE TABLE IF NOT EXISTS _migracoes (nome VARCHAR(120) PRIMARY KEY, aplicada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)");
      const [rows] = await conn.query<RowDataPacket[]>("SELECT nome FROM _migracoes");
      const feitas = new Set(rows.map((r) => String(r.nome)));
      for (const m of lista) {
        if (feitas.has(m.nome)) continue;
        await conn.query(m.sql);
        await conn.query("INSERT INTO _migracoes (nome) VALUES (?)", [m.nome]);
        aplicadas.push(m.nome);
        log(`aplicada: ${m.nome}`);
      }
    } finally {
      await conn.query("SELECT RELEASE_LOCK('bentonutrisync_migrar')");
    }
  } finally {
    await conn.end();
  }
  return aplicadas;
}
