import { NextResponse, type NextRequest } from "next/server";

/**
 * Porta de entrada: sem sessão (cookie) ninguém passa. Quem confere a sessão de verdade (banco) e o perfil são os layouts
 * e os serviços do servidor. Em modo demonstração ou sem banco configurado, as áreas reais ficam FECHADAS em produção.
 */
export function middleware(req: NextRequest) {
  const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.MYSQL_URL;
  if (demo) return process.env.NODE_ENV === "production" ? NextResponse.redirect(new URL("/demo", req.url)) : NextResponse.next();
  if (!req.cookies.get("bn_sessao")) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/nutri/:path*", "/paciente/:path*"] };
