export const ANGLES = ["front", "right_side", "left_side", "back"] as const;
export type Angle = (typeof ANGLES)[number];
export const ANGLE_LABEL: Record<Angle, string> = { front: "Frente", right_side: "Perfil direito", left_side: "Perfil esquerdo", back: "Costas" };
export const ALLOWED_MIME = ["image/webp", "image/jpeg"] as const;
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_EDGE_PX = 1600;
export const SIGNED_URL_TTL_S = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Caminho no bucket privado. A primeira pasta é o patient_id (usada pelas políticas de Storage). */
export function photoPath(patientId: string, assessmentId: string, angle: Angle, mime: (typeof ALLOWED_MIME)[number]) {
  if (!UUID.test(patientId) || !UUID.test(assessmentId)) throw new Error("Identificador inválido");
  return `${patientId}/${assessmentId}/${angle}.${mime === "image/webp" ? "webp" : "jpg"}`;
}
export function validateUpload(mime: string, size: number): string | null {
  if (!(ALLOWED_MIME as readonly string[]).includes(mime)) return "Formato não suportado. Use JPEG ou WebP.";
  if (size <= 0 || size > MAX_BYTES) return "Imagem muito grande. O limite é 5 MB.";
  return null;
}
/** Redimensiona mantendo proporção, sem ampliar. */
export function targetSize(w: number, h: number, maxEdge = MAX_EDGE_PX) {
  if (!(w > 0 && h > 0)) throw new Error("Dimensões inválidas");
  const k = Math.min(1, maxEdge / Math.max(w, h));
  return { width: Math.round(w * k), height: Math.round(h * k) };
}
