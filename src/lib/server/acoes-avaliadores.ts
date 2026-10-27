"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditar } from "./auditoria";
import { exigirAdmin, servico } from "./sessao";
import { conselheirosPorNome, emitirLinkConselho } from "./conselho";

export type ResultadoConvite = { ok: true; msg: string; link?: string } | { ok: false; erro: string };

// Link pessoal do conselheiro: primeiro acesso ou senha nova, 30 dias (ver lib/server/conselho.ts).
const novoSchema = z.object({
  nome: z.string().trim().min(5, "Informe o nome completo.").max(160),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("E-mail inválido.").max(160)]),
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
  // O login é pelo nome: dois ativos com o mesmo nome não conseguiriam entrar.
  if ((await conselheirosPorNome(d.nome)).length) return { ok: false, erro: "Já existe um avaliador ativo com este nome. Diferencie (ex.: nome do meio)." };

  const { data: av, error } = await sb
    .from("avaliadores")
    .insert({
      nome: d.nome,
      email: d.email || null,
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
  const link = await emitirLinkConselho(av.id, admin.id);
  if (!link) return { ok: false, erro: "Avaliador cadastrado, mas o link falhou. Use “Gerar novo link”." };
  await auditar(admin, "avaliador_convidado", { tipo: "avaliador", id: av.id }, { email: d.email || null, papel: d.papel, teste: d.teste });
  revalidatePath("/admin/avaliadores");
  return { ok: true, msg: `Convite criado para ${d.nome}.`, link };
}

export async function gerarNovoLink(avaliadorId: string): Promise<ResultadoConvite> {
  const admin = await exigirAdmin();
  const { data: av } = await servico().from("avaliadores").select("nome, user_id").eq("id", avaliadorId).maybeSingle();
  if (!av) return { ok: false, erro: "Avaliador não encontrado." };
  const link = await emitirLinkConselho(avaliadorId, admin.id);
  if (!link) return { ok: false, erro: "Não foi possível gerar o link." };
  await auditar(admin, av.user_id ? "link_nova_senha" : "convite_reemitido", { tipo: "avaliador", id: avaliadorId });
  revalidatePath("/admin/avaliadores");
  return {
    ok: true,
    msg: av.user_id
      ? `Link para ${av.nome} criar uma senha nova (vale 30 dias). Os links anteriores deixaram de valer.`
      : `Novo link de primeiro acesso para ${av.nome}. O anterior deixou de valer.`,
    link,
  };
}

export async function alternarAvaliador(avaliadorId: string, ativo: boolean): Promise<ResultadoConvite> {
  const admin = await exigirAdmin();
  const { error } = await servico().from("avaliadores").update({ ativo }).eq("id", avaliadorId);
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  await auditar(admin, ativo ? "avaliador_reativado" : "avaliador_desativado", { tipo: "avaliador", id: avaliadorId });
  revalidatePath("/admin/avaliadores");
  return { ok: true, msg: ativo ? "Acesso reativado." : "Acesso desativado. As fichas já enviadas continuam valendo." };
}

// Dados do cadastro. O login usa um e-mail técnico (lib/server/conselho.ts), então nome e e-mail podem mudar
// sem mexer na conta: a pessoa passa a entrar com o nome novo e a mesma senha.
const edicaoSchema = novoSchema.omit({ teste: true });

export async function editarAvaliador(avaliadorId: string, fd: FormData): Promise<ResultadoConvite> {
  const admin = await exigirAdmin();
  const v = edicaoSchema.safeParse({
    nome: fd.get("nome") ?? "",
    email: fd.get("email") ?? "",
    papel: fd.get("papel") ?? "titular",
    instituicao: fd.get("instituicao") ?? "",
  });
  if (!v.success) return { ok: false, erro: v.error.issues[0].message };
  const d = v.data;
  if ((await conselheirosPorNome(d.nome)).some((a) => a.id !== avaliadorId)) {
    return { ok: false, erro: "Já existe outro avaliador ativo com este nome. Diferencie (ex.: nome do meio)." };
  }
  const { data: antes } = await servico().from("avaliadores").select("nome, email, papel, instituicao").eq("id", avaliadorId).maybeSingle();
  if (!antes) return { ok: false, erro: "Avaliador não encontrado." };
  const { error } = await servico()
    .from("avaliadores")
    .update({ nome: d.nome, email: d.email || null, papel: d.papel, instituicao: d.instituicao || null })
    .eq("id", avaliadorId);
  if (error) return { ok: false, erro: error.code === "23505" ? "Outro avaliador já usa este e-mail." : "Não foi possível salvar." };
  await auditar(admin, "avaliador_editado", { tipo: "avaliador", id: avaliadorId }, { antes });
  revalidatePath("/admin/avaliadores");
  const mudouNome = antes.nome !== d.nome;
  return { ok: true, msg: mudouNome ? `Salvo. ${d.nome} passa a entrar com o nome novo e a mesma senha.` : "Dados salvos." };
}

// Art. 8º, § 7º: liga o conselheiro à instituição que ele representa, para somar as cotas de indicação.
export async function vincularEntidade(avaliadorId: string, entidadeId: string | null): Promise<ResultadoConvite> {
  const admin = await exigirAdmin();
  const { error } = await servico().from("avaliadores").update({ entidade_id: entidadeId }).eq("id", avaliadorId);
  if (error) return { ok: false, erro: "Não foi possível salvar. A migração 0011 já rodou?" };
  await auditar(admin, "avaliador_vinculado", { tipo: "avaliador", id: avaliadorId }, { entidade: entidadeId });
  revalidatePath("/admin/avaliadores");
  return { ok: true, msg: entidadeId ? "Vinculado: as indicações dele e da instituição somam na mesma cota." : "Vínculo removido." };
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
