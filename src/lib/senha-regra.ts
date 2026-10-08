/** Regra de senha, sem dependências do servidor (usada também nos formulários). */
export const SENHA_MIN = 8;
export const SENHA_MAX = 128;
export const REGRA_SENHA = "Mínimo de 8 caracteres, com pelo menos uma letra, um número e um símbolo (ex.: ! ? # @ $ %).";

/** Devolve o motivo da recusa, ou null se a senha serve. Símbolo = qualquer caractere que não seja letra, número ou espaço. */
export function validarSenha(s: string): string | null {
  if (s.length < SENHA_MIN) return `A senha precisa ter no mínimo ${SENHA_MIN} caracteres.`;
  if (s.length > SENHA_MAX) return `A senha pode ter no máximo ${SENHA_MAX} caracteres.`;
  if (/\s/.test(s)) return "A senha não pode ter espaços.";
  if (!/\p{L}/u.test(s)) return "A senha precisa ter pelo menos uma letra.";
  if (!/\p{N}/u.test(s)) return "A senha precisa ter pelo menos um número.";
  if (!/[^\p{L}\p{N}\s]/u.test(s)) return "A senha precisa ter pelo menos um símbolo (ex.: ! ? # @ $ %).";
  return null;
}
