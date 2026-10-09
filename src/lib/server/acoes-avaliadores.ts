"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { auditar } from "./auditoria";
import { credencialProvisoria, exigirAdmin, servico } from "./sessao";
import { hashToken } from "./convites";

export type ResultadoConvite = { ok: true; msg: string; link?: string } | { ok: false; erro: string };

const VALIDADE_DIAS = 7;

// O link usa o endereço por onde o painel foi aberto: funciona no site oficial, no deploy de teste e em localhost.
async function origem() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL ?? "https://premio.lvrs.com.br";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Gera um token novo e revoga os anteriores ainda válidos. Só o hash fica no banco:
// o link aparece uma única vez, para a Secretaria copiar e mandar.
async function emitirConvite(avaliadorId: string, adminId: string) {
  const sb = servico();
  await sb
    .from("convites_avaliador")
    .update({ revogado_em: new Date().toISOString() })
    .eq("avaliador_id", avaliadorId)
    .is("usado_em", null)
    .is("revogado_em", null);
  const token = randomBytes(32).toString("base64url");
  const { error } = await sb.from("convites_avaliador").insert({
    avaliador_id: avaliadorId,
    token_hash: hashToken(token),
    expira_em: new Date(Date.now() + VALIDADE_DIAS * 86_400_000).toISOString(),
    criado_por: adminId,
  });
  if (error) return null;
  return `${await origem()}/convite/${token}`;
}

const novoSchema = z.object({
  nome: z.string().trim().min(5, "Informe o nome completo.").max(160),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(160),
  papel: z.enum(["titular", "suplente"]),
  instituicao: z.string().trim().max(200),
  teste: z.boolean(),
});

export async function convidarAvaliador(fd: FormData): Promise<ResultadoConvite> {
  const admin = await exigirAdmin();
  const v = novoSchema.safeParse({
    nome: fd.get("nome") ?? "",
    email: fd.get("email") ?? "",
    papel: fd.get("papel") ?? "titular",
    instituicao: fd.get("instituicao") ?? "",
    teste: fd.get("teste") === "on",
  });
  if (!v.success) return { ok: false, erro: v.error.issues[0].message };
  const d = v.data;
  const sb = servico();

  const { data: av, error } = await sb
    .from("avaliadores")
    .insert({
      nome: d.nome,
      email: d.email,
      papel: d.papel,
      instituicao: d.instituicao || null,
      is_test: d.teste,
      criado_por: admin.id,
    })
    .select("id")
    .single();
  if (error || !av) {
    return { ok: false, erro: error?.code === "23505" ? "Já existe um avaliador com este e-mail." : "Não foi possível cadastrar." };
  }
  const link = await emitirConvite(av.id, admin.id);
  if (!link) return { ok: false, erro: "Avaliador cadastrado, mas o link falhou. Use “Gerar novo link”." };
  await auditar(admin, "avaliador_convidado", { tipo: "avaliador", id: av.id }, { email: d.email, papel: d.papel, teste: d.teste });
  revalidatePath("/admin/avaliadores");
  return { ok: true, msg: `Convite criado para ${d.nome}.`, link };
}

export async function gerarNovoLink(avaliadorId: string): Promise<ResultadoConvite> {
  const admin = await exigirAdmin();
  const { data: av } = await servico().from("avaliadores").select("nome, user_id").eq("id", avaliadorId).maybeSingle();
  if (!av) return { ok: false, erro: "Avaliador não encontrado." };
  if (av.user_id) return { ok: false, erro: "Este avaliador já criou o acesso. Para senha esquecida, use “Nova senha provisória”." };
  const link = await emitirConvite(avaliadorId, admin.id);
  if (!link) return { ok: false, erro: "Não foi possível gerar o link." };
  await auditar(admin, "convite_reemitido", { tipo: "avaliador", id: avaliadorId });
  revalidatePath("/admin/avaliadores");
  return { ok: true, msg: `Novo link para ${av.nome}. O anterior deixou de valer.`, link };
}

export async function alternarAvaliador(avaliadorId: string, ativo: boolean): Promise<ResultadoConvite> {
  const admin = await exigirAdmin();
  const { error } = await servico().from("avaliadores").update({ ativo }).eq("id", avaliadorId);
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  await auditar(admin, ativo ? "avaliador_reativado" : "avaliador_desativado", { tipo: "avaliador", id: avaliadorId });
  revalidatePath("/admin/avaliadores");
  return { ok: true, msg: ativo ? "Acesso reativado." : "Acesso desativado. As fichas já enviadas continuam valendo." };
}

// Senha provisória (123456, 48h), igual à das instituições.
export async function senhaProvisoriaAvaliador(avaliadorId: string): Promise<ResultadoConvite> {
  const admin = await exigirAdmin();
  const { data: av } = await servico().from("avaliadores").select("user_id").eq("id", avaliadorId).maybeSingle();
  if (!av?.user_id) return { ok: false, erro: "Este avaliador ainda não criou o acesso: gere um novo link." };
  const { error } = await servico().auth.admin.updateUserById(av.user_id, credencialProvisoria());
  if (error) return { ok: false, erro: "Não foi possível redefinir a senha." };
  await auditar(admin, "senha_redefinida", { tipo: "avaliador", id: avaliadorId });
  return { ok: true, msg: "Senha provisória 123456 ativa por 48 horas. Avise o avaliador." };
}

// Só some quem nunca avaliou; quem já tem ficha ou voto fica no histórico (desative em vez de excluir).
export async function excluirAvaliador(avaliadorId: string): Promise<ResultadoConvite> {
  const admin = await exigirAdmin();
  const sb = servico();
  const [{ count: f }, { count: v }] = await Promise.all([
    sb.from("fichas").select("id", { count: "exact", head: true }).eq("avaliador_id", avaliadorId).neq("status", "rascunho"),
    sb.from("votos_honorarios").select("rodada_id", { count: "exact", head: true }).eq("avaliador_id", avaliadorId),
  ]);
  if ((f ?? 0) + (v ?? 0) > 0) return { ok: false, erro: "Este avaliador já avaliou. Desative o acesso em vez de excluir." };
  const { data: av } = await sb.from("avaliadores").select("nome, email").eq("id", avaliadorId).maybeSingle();
  const { error } = await sb.from("avaliadores").delete().eq("id", avaliadorId);
  if (error) return { ok: false, erro: "Não foi possível excluir." };
  // A conta de login não é apagada: a pessoa pode ser também admin ou representante de instituição.
  await auditar(admin, "avaliador_excluido", { tipo: "avaliador", id: avaliadorId }, { nome: av?.nome, email: av?.email });
  revalidatePath("/admin/avaliadores");
  return { ok: true, msg: "Avaliador excluído." };
}
