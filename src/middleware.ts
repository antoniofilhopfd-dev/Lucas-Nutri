import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
// Protege /nutri e /paciente: sem sessão → 401 redirect; papel errado → /acesso-negado.
export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Sem Supabase configurado (ou em modo demonstração) as áreas protegidas ficam FECHADAS em produção.
  if (!url || !key || process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return process.env.NODE_ENV === "production" ? NextResponse.redirect(new URL("/demo", req.url)) : NextResponse.next();
  }
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(url, key, { cookies: {
    getAll: () => req.cookies.getAll(),
    setAll: (c) => { res = NextResponse.next({ request: req }); c.forEach(({ name, value, options }) => res.cookies.set(name, value, options)); },
  } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const role = user.app_metadata?.role;
  const p = req.nextUrl.pathname;
  const ok = p.startsWith("/nutri") ? role === "nutritionist" || role === "admin" : role === "patient";
  return ok ? res : NextResponse.redirect(new URL("/acesso-negado", req.url));
}
export const config = { matcher: ["/nutri/:path*", "/paciente/:path*"] };
