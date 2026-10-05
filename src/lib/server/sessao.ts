import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { supabaseServico } from "./supabase";

// Cliente com a sessão do usuário (cookies). Só serve para autenticar —
// leitura e escrita de dados passam pelo supabaseServico, depois da checagem de permissão.
export async function supabaseSessao() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Supabase não configurado.");
  const store = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Em Server Component não dá para gravar cookie; o proxy renova a sessão.
        }
      },
    },
  });
}

export function servico() {
  const sb = supabaseServico();
  if (!sb) throw new Error("Supabase (service_role) não configurado.");
  return sb;
}

export async function usuarioAtual(): Promise<User | null> {
  const sb = await supabaseSessao();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

export async function ehAdmin(userId: string) {
  const { data } = await servico().from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

// Senha provisória (pré-cadastro): troca obrigatória antes de qualquer ação; expira em 48h.
export function precisaTrocarSenha(u: User) {
  return u.app_metadata?.deve_trocar_senha === true;
}
export function senhaProvisoriaExpirada(u: User) {
  const exp = u.app_metadata?.provisoria_expira_em as string | undefined;
  return precisaTrocarSenha(u) && !!exp && new Date(exp) < new Date();
}

// Senha genérica do pré-cadastro (decisão do admin, 05/10/2026), sempre com troca obrigatória e validade de 48h.
export const SENHA_PROVISORIA = "123456";

export function credencialProvisoria() {
  return {
    password: SENHA_PROVISORIA,
    app_metadata: {
      deve_trocar_senha: true,
      provisoria_expira_em: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    },
  };
}

export async function exigirUsuario() {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  if (precisaTrocarSenha(u)) redirect("/trocar-senha");
  return u;
}

export async function exigirAdmin() {
  const u = await exigirUsuario();
  if (!(await ehAdmin(u.id))) redirect("/entidade");
  return u;
}

export async function ipDaRequisicao() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}

export async function userAgent() {
  return (await headers()).get("user-agent");
}
