// Gera src/lib/db/columns.generated.json a partir do banco migrado (MYSQL_URL). Usado pelo teste de contrato linha ↔ esquema.
import "dotenv/config";
import mysql from "mysql2/promise";
import { writeFileSync } from "node:fs";
const conn = await mysql.createConnection({ uri: process.env.MYSQL_URL });
const [rows] = await conn.query(`SELECT TABLE_NAME t, COLUMN_NAME c, IS_NULLABLE n, COLUMN_DEFAULT d, EXTRA e FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME NOT IN ('_migracoes') ORDER BY TABLE_NAME, ORDINAL_POSITION`);
const out = {};
for (const r of rows) {
  const e = String(r.e).toLowerCase();
  (out[r.t] ??= {})[r.c] = { required: r.n === "NO" && r.d === null && !e.includes("auto_increment") && !e.includes("generated") };
}
writeFileSync("src/lib/db/columns.generated.json", JSON.stringify(out, null, 2) + "\n");
console.log(`ok: ${Object.keys(out).length} tabelas`);
await conn.end();
