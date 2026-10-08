/**
 * Cria o primeiro acesso (uma vez, no servidor). A senha é pedida no terminal.
 *   npm run auth:criar-nutri -- "Lucas Bento" "CRN-6 00000" seu@email.com
 *   npm run auth:criar-nutri -- "Seu Nome" admin seu@email.com      (administrador, sem CRN)
 */
import "dotenv/config";
import { criarProfissional, emailValido, normalizarEmail } from "../src/server/auth-core";
import { aplicarMigracoes } from "../src/server/migrar";
import { lerSenhaNova } from "./senha-prompt";

async function main() {
  const [nome, crnOuAdmin, emailBruto] = process.argv.slice(2);
  const email = normalizarEmail(emailBruto ?? "");
  if (!nome || !crnOuAdmin || !emailValido(email)) throw new Error('Uso: npm run auth:criar-nutri -- "Nome" "CRN-6 00000" email@exemplo.com  (ou "admin" no lugar do CRN)');
  if (!process.env.MYSQL_URL) throw new Error("MYSQL_URL não configurada");
  await aplicarMigracoes(process.env.MYSQL_URL, undefined, console.log); // garante as tabelas
  const senha = await lerSenhaNova();
  const admin = crnOuAdmin.toLowerCase() === "admin";
  await criarProfissional({ nome, papel: admin ? "admin" : "nutritionist", crn: admin ? undefined : crnOuAdmin, email, senha });
  console.log(`Acesso criado para ${nome}. Entre em /login ${admin ? "com o e-mail" : "com o CRN (ou o e-mail)"} e a senha que você digitou.`);
  process.exit(0);
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
