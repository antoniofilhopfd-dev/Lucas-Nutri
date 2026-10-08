// Aplica as migrações pendentes. Uso: npm run mysql:migrar  (lê MYSQL_URL do ambiente ou do .env)
import "dotenv/config";
import mysql from "mysql2/promise";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const uri = process.env.MYSQL_URL;
if (!uri) { console.error("MYSQL_URL não configurada"); process.exit(1); }
const dir = join(process.cwd(), "db", "migrations");
const lista = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().map((nome) => ({ nome, sql: readFileSync(join(dir, nome), "utf8") }));
const conn = await mysql.createConnection({ uri, multipleStatements: true });
try {
  const [lock] = await conn.query("SELECT GET_LOCK('bentonutrisync_migrar', 60) AS ok");
  if (!lock[0]?.ok) throw new Error("outra atualização do banco está em andamento");
  await conn.query("CREATE TABLE IF NOT EXISTS _migracoes (nome VARCHAR(120) PRIMARY KEY, aplicada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const [rows] = await conn.query("SELECT nome FROM _migracoes");
  const feitas = new Set(rows.map((r) => String(r.nome)));
  for (const m of lista) { if (feitas.has(m.nome)) continue; await conn.query(m.sql); await conn.query("INSERT INTO _migracoes (nome) VALUES (?)", [m.nome]); console.log("aplicada:", m.nome); }
  await conn.query("SELECT RELEASE_LOCK('bentonutrisync_migrar')");
  console.log("migrações em dia");
} catch (e) { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; } finally { await conn.end(); }
