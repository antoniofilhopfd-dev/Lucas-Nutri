import { targetSize } from "./rules";
/** Cliente: resize + compressão (WebP, com JPEG de reserva) antes do upload. */
export async function compressImage(file: File, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = targetSize(bmp.width, bmp.height);
  const c = document.createElement("canvas"); c.width = width; c.height = height;
  c.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  const toBlob = (t: string) => new Promise<Blob | null>((r) => c.toBlob(r, t, quality));
  const webp = await toBlob("image/webp");
  const out = webp && webp.type === "image/webp" ? webp : await toBlob("image/jpeg");
  if (!out) throw new Error("Falha ao comprimir a imagem");
  return out;
}
