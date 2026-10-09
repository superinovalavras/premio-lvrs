import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Só renova a sessão do Supabase (cookies) nas áreas com login.
// A autorização de verdade acontece em cada página e em cada Server Action.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return response;

  const sb = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (lista, cabecalhos) => {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(cabecalhos ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  await sb.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/entrar", "/cadastro", "/trocar-senha", "/sair", "/entidade/:path*", "/admin/:path*", "/avaliacao/:path*", "/convite/:path*"],
};
