// Embute db/migrations em src/server/migracoes-sql.ts: o app publicado na Hostinger não leva a pasta db/,
// então aplica sozinho, ao subir, as migrações que faltam. Roda antes do build (prebuild).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const dir = join(process.cwd(), "db", "migrations");
const itens = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()
  .map((nome) => `  { nome: ${JSON.stringify(nome)}, sql: ${JSON.stringify(readFileSync(join(dir, nome), "utf8"))} },`);
writeFileSync(join(process.cwd(), "src", "server", "migracoes-sql.ts"),
`/* GERADO por scripts/embutir-migracoes.mjs a partir de db/migrations — não edite à mão. */
export const MIGRACOES: { nome: string; sql: string }[] = [
${itens.join("\n")}
];
`);
console.log(`migrações embutidas: ${itens.length}`);
