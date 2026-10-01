/** Normaliza para E.164 (+55DDNNNNNNNNN) ou retorna null. */
export function toE164BR(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return /^[1-9]\d9\d{8}$/.test(d) || /^[1-9]\d[2-5]\d{7}$/.test(d) ? `+55${d}` : null;
}
/** Máscara de exibição: +55 (XX) XXXXX-XXXX */
export function maskPhoneBR(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("55")) d = d.slice(2);
  d = d.slice(0, 11);
  const a = d.slice(0, 2), rest = d.slice(2), cut = rest.length > 8 ? 5 : 4;
  if (!d) return "";
  return `+55 (${a}${a.length === 2 ? ")" : ""}${rest ? " " + rest.slice(0, cut) : ""}${rest.length > cut ? "-" + rest.slice(cut) : ""}`;
}
