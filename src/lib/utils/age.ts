/** Idade completa em `onDate` (data da avaliação), nunca a idade atual. Datas ISO yyyy-mm-dd. */
export function ageAt(birthDate: string, onDate: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = onDate.split("-").map(Number);
  if (![by, bm, bd, y, m, d].every(Number.isFinite)) throw new Error("Data inválida");
  if (onDate < birthDate) throw new Error("Avaliação anterior ao nascimento");
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}
