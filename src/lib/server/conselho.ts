import "server-only";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { hashToken } from "./convites";
import { servico } from "./sessao";

// Acesso do conselheiro pelo nome completo (decisão de 16/10/2026). O login do Supabase exige e-mail,
// então cada conselheiro tem uma conta com e-mail técnico interno; o e-mail real (opcional) serve só
// para recuperar a senha. O link pessoal (/conselho/<token>) cria a primeira senha ou uma nova.

export const VALIDADE_LINK_DIAS = 30;

// "Rodolfo  Rosa Alvarenga" = "rodolfo rosa alvarenga" = "RODOLFO ROSA ALVARENGA": sem acento, caixa ou espaço extra.
export const normalizarNome = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const emailTecnico = (avaliadorId: string) => `conselheiro-${avaliadorId}@conselho.premio.invalid`;

// Conselheiros ativos com este nome. Mais de um = homônimo: o login recusa e pede contato com a Secretaria.
export async function conselheirosPorNome(nome: string) {
  const alvo = normalizarNome(nome);
  if (alvo.length < 5) return [];
  const { data } = await servico().from("avaliadores").select("id, nome, email, user_id, ativo, is_test").eq("ativo", true);
  return (data ?? []).filter((a) => normalizarNome(a.nome) === alvo);
}

// O link usa o endereço por onde a ação foi chamada: funciona no site oficial, no deploy de teste e em localhost.
export async function origem() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? "https://premio.lvrs.com.br";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Gera um token novo. Só o hash fica no banco. Quando a Secretaria gera (revogar), os anteriores param de valer;
// no "esqueci a senha" da página pública, não: senão qualquer um anularia o link de um conselheiro pelo nome.
export async function emitirLinkConselho(avaliadorId: string, criadoPor: string | null, revogar = true, dias = VALIDADE_LINK_DIAS) {
  const sb = servico();
  if (revogar) {
    await sb
      .from("convites_avaliador")
      .update({ revogado_em: new Date().toISOString() })
      .eq("avaliador_id", avaliadorId)
      .is("usado_em", null)
      .is("revogado_em", null);
  }
  const token = randomBytes(32).toString("base64url");
  const { error } = await sb.from("convites_avaliador").insert({
    avaliador_id: avaliadorId,
    token_hash: hashToken(token),
    expira_em: new Date(Date.now() + dias * 86_400_000).toISOString(),
    criado_por: criadoPor,
  });
  if (error) return null;
  return `${await origem()}/conselho/${token}`;
}
