"use server";
import { comAtor } from "@/lib/actions/helpers";
import { salvarFoto } from "@/server/services/fotos";
import { ANGLES, type Angle } from "./rules";

/** Recebe a foto já comprimida (WebP/JPEG). O arquivo vai para o disco do servidor, fora da pasta pública. */
export async function uploadBodyPhoto(consultationId: string, angle: string, form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || !(ANGLES as readonly string[]).includes(angle)) return { ok: false as const, message: "Foto inválida." };
  if (file.type !== "image/webp" && file.type !== "image/jpeg") return { ok: false as const, message: "Formato não suportado. Use JPEG ou WebP." };
  return comAtor(async (a) => salvarFoto(a, consultationId, angle as Angle, Buffer.from(await file.arrayBuffer()), file.type as "image/webp"));
}
