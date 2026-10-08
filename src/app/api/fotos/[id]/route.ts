import { NextResponse } from "next/server";
import { actorAtual } from "@/server/auth";
import { lerFoto } from "@/server/services/fotos";
import { AcessoNegado } from "@/server/authz";

export const dynamic = "force-dynamic";
/** Foto clínica: só abre para quem pode ver o paciente (sessão + carteira). Nunca é pública nem fica em cache. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { bytes, mime } = await lerFoto(await actorAtual(), id);
    return new NextResponse(new Uint8Array(bytes), { headers: { "content-type": mime, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch (e) {
    if (e instanceof AcessoNegado) return new NextResponse("Não encontrada.", { status: 404 }); // 404 igual para "não existe" e "sem acesso"
    console.error("foto", e);
    return new NextResponse("Não foi possível abrir a foto.", { status: 500 });
  }
}
