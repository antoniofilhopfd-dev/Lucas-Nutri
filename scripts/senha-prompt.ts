/** Pede a senha no terminal sem mostrar o que é digitado (ou usa BN_SENHA, para automação). */
import { validarSenha } from "../src/lib/senha-regra";

function perguntarOculto(texto: string): Promise<string> {
  return new Promise((ok, erro) => {
    const entrada = process.stdin;
    if (!entrada.isTTY || typeof entrada.setRawMode !== "function") { erro(new Error("Não há terminal interativo. Defina a senha na variável BN_SENHA e rode de novo.")); return; }
    process.stdout.write(texto);
    let digitado = "";
    const fim = () => { entrada.setRawMode(false); entrada.pause(); entrada.removeListener("data", aoReceber); process.stdout.write("\n"); };
    const aoReceber = (dados: Buffer) => {
      for (const c of dados.toString("utf8")) {
        if (c === "\r" || c === "\n") { fim(); ok(digitado); return; }
        if (c === "\u0003") { fim(); erro(new Error("Cancelado.")); return; }
        if (c === "\u007f" || c === "\b") digitado = digitado.slice(0, -1); else if (c >= " ") digitado += c;
      }
    };
    entrada.setRawMode(true); entrada.resume(); entrada.on("data", aoReceber);
  });
}
export async function lerSenhaNova(): Promise<string> {
  const env = process.env.BN_SENHA;
  if (env) { const e = validarSenha(env); if (e) throw new Error(e); return env; }
  const a = await perguntarOculto("Nova senha (mín. 8, com letra, número e símbolo; não aparece na tela): ");
  const e = validarSenha(a); if (e) throw new Error(e);
  if (a !== (await perguntarOculto("Repita a senha: "))) throw new Error("As duas senhas não são iguais.");
  return a;
}
