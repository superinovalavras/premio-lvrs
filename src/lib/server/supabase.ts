import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

// Leitura pública (categorias e view public_finalists), respeitando RLS.
export function supabasePublico() {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, { auth: { persistSession: false } });
}

// Só para a rota de voto. Nunca importar em componente cliente.
export function supabaseServico() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
