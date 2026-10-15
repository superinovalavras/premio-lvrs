"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "./auditoria";
import { enviarEmail, URL_SITE } from "./email";
import { emailsAdmins } from "./entidades-dados";
import { janelaIndicacoes } from "./indicacoes-dados";
import { avaliadorDoUsuario, exigirAdmin, exigirUsuario, servico } from "./sessao";
import { CAMPOS_PROPOSTA } from "@/lib/honorarias";
import { dia, hora } from "@/lib/datas";

export type Resultado = { ok: true; msg?: string } | { ok: false; erro: string };

// Proposta honorária (art. 13 e Anexo I): cada conselheiro apresenta uma por categoria honorária,
// dentro do prazo de indicações. Pode editar até o fim do prazo.
export async function salvarPropostaHonoraria(slug: string, fd: FormData): Promise<Resultado> {
  const user = await exigirUsuario();
  const av = await avaliadorDoUsuario(user.id);
  if (!av?.ativo) return { ok: false, erro: "Só conselheiros apresentam propostas honorárias (art. 13)." };
  const janela = await janelaIndicacoes();
  if (janela.estado === "antes") return { ok: false, erro: `As propostas abrem em ${dia(janela.abre)}, à ${hora(janela.abre)}.` };
  if (janela.estado === "encerrada") return { ok: false, erro: "O prazo de propostas terminou." };

  const sb = servico();
  const { data: cat } = await sb.from("categories").select("id, name, type").eq("slug", slug).maybeSingle();
  if (!cat || cat.type !== "honorary") return { ok: false, erro: "Categoria inválida." };

  const tipo = String(fd.get("indicado_tipo") ?? "");
  if (!["pf", "instituicao"].includes(tipo)) return { ok: false, erro: "Diga se é pessoa ou instituição." };
  const campos: Record<string, string | null> = {};
  for (const c of CAMPOS_PROPOSTA) {
    const v = String(fd.get(c.id) ?? "").trim();
    if (c.obrigatorio && v.length < 2) return { ok: false, erro: `Preencha: ${c.rotulo}.` };
    if (v.length > c.max) return { ok: false, erro: `${c.rotulo}: até ${c.max} caracteres.` };
    campos[c.id] = v || null;
  }
  if (campos.link && !/^https?:\/\/\S+$/i.test(campos.link)) return { ok: false, erro: "O link precisa começar com http:// ou https://." };

  const { data: antes } = await sb
    .from("propostas_honorarias")
    .select("id, finalist_id")
    .eq("avaliador_id", av.id)
    .eq("category_id", cat.id)
    .maybeSingle();
  if (antes?.finalist_id) return { ok: false, erro: "A Secretaria já incluiu esta proposta na votação: ela não muda mais." };

  const agora = new Date().toISOString();
  const { error } = await sb.from("propostas_honorarias").upsert(
    { avaliador_id: av.id, category_id: cat.id, indicado_tipo: tipo, ...campos, atualizada_em: agora, is_test: av.is_test },
    { onConflict: "avaliador_id,category_id" },
  );
  if (error) return { ok: false, erro: "Não foi possível salvar a proposta." };
  await auditar(user, antes ? "proposta_honoraria_editada" : "proposta_honoraria_enviada", { tipo: "categoria", id: cat.id }, { indicado: campos.indicado_nome });

  if (!antes) {
    for (const para of await emailsAdmins()) {
      await enviarEmail({
        para,
        assunto: `Proposta honorária: ${campos.indicado_nome} (${cat.name})`,
        tipo: "alerta_proposta_honoraria",
        titulo: "Nova proposta honorária",
        paragrafos: [`${av.nome} propôs ${campos.indicado_nome} para o ${cat.name}.`],
        botao: { texto: "Ver as propostas", url: `${URL_SITE}/admin/avaliacao/${slug}` },
      });
    }
  }
  revalidatePath("/avaliacao", "layout");
  revalidatePath("/admin/avaliacao", "layout");
  return { ok: true, msg: antes ? "Proposta atualizada." : "Proposta enviada." };
}

// A Secretaria leva a proposta para a votação nominal: ela vira concorrente ("indicado") da categoria.
export async function incluirPropostaNaVotacao(propostaId: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const sb = servico();
  const { data: p } = await sb
    .from("propostas_honorarias")
    .select("id, category_id, indicado_nome, justificativa, link, finalist_id, is_test")
    .eq("id", propostaId)
    .maybeSingle();
  if (!p) return { ok: false, erro: "Proposta não encontrada." };
  if (p.finalist_id) return { ok: false, erro: "Esta proposta já está na votação." };
  const { data: f, error } = await sb
    .from("finalists")
    .insert({
      category_id: p.category_id,
      name: p.indicado_nome.slice(0, 160),
      summary: p.justificativa.slice(0, 600),
      etapa: "indicado",
      material_link: p.link,
      is_test: p.is_test,
      sort_order: 0,
    })
    .select("id")
    .single();
  if (error || !f) return { ok: false, erro: "Não foi possível incluir na votação." };
  await sb.from("propostas_honorarias").update({ finalist_id: f.id }).eq("id", p.id);
  await auditar(admin, "proposta_honoraria_incluida", { tipo: "finalista", id: f.id }, { proposta: p.id, nome: p.indicado_nome });
  revalidatePath("/admin/avaliacao", "layout");
  revalidatePath("/avaliacao", "layout");
  return { ok: true, msg: "Incluída como concorrente. Abra a rodada de votação nominal quando todas chegarem." };
}
