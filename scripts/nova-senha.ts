/** Redefine a senha de um profissional (e derruba as sessões). Uso: npm run auth:nova-senha -- email@exemplo.com */
import "dotenv/config";
import { definirSenha, normalizarEmail } from "../src/server/auth-core";
import { consultar, fecharBanco } from "../src/server/mysql";
import { lerSenhaNova } from "./senha-prompt";

async function main() {
  const email = normalizarEmail(process.argv[2] ?? "");
  const [u] = await consultar<{ id: string }>("SELECT id FROM usuarios WHERE email=? AND papel IN ('nutritionist','admin')", [email]);
  if (!u) throw new Error("Usuário não encontrado.");
  await definirSenha(u.id, await lerSenhaNova());
  console.log("Senha alterada. As sessões abertas foram encerradas.");
  await fecharBanco();
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
