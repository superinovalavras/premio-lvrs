"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "./auditoria";
import { enviarEmail } from "./email";
import { exigirAdmin, servico } from "./sessao";
import { CAMPOS_ANALISE, mensagemDecisao, mensagemReconsideracao, type Analise } from "@/lib/elegibilidade";

export type Resultado = { ok: true; msg?: string; mensagem?: string } | { ok: false; erro: string };

const MIGRACAO = "Não foi possível salvar. A migração 0011 já rodou?";

async function carregar(id: string) {
  const sb = servico();
  const { data: ind } = await sb
    .from("indicacoes")
    .select("id, status, indicado_nome, category_id, entidade_id, avaliador_id, contato_email, resumo")
    .eq("id", id)
    .maybeSingle();
  if (!ind || ind.status !== "enviada") return null;
  const { data: an, error } = await sb.from("indicacoes").select(CAMPOS_ANALISE).eq("id", id).maybeSingle<Analise>();
  if (error) return { ind, an: null, erro: MIGRACAO };
  const { data: cat } = await sb.from("categories").select("name").eq("id", ind.category_id!).maybeSingle();
  return { ind, an, categoria: (cat?.name as string) ?? "", erro: null };
}

// E-mail de quem indicou: o titular da instituição ou o próprio conselheiro.
async function emailDoIndicador(ind: { entidade_id: string | null; avaliador_id: string | null }) {
  const sb = servico();
  if (ind.avaliador_id) {
    const { data } = await sb.from("avaliadores").select("email").eq("id", ind.avaliador_id).maybeSingle();
    return (data?.email as string) ?? null;
  }
  const { data } = await sb.from("representantes").select("email").eq("entidade_id", ind.entidade_id).eq("papel", "titular").maybeSingle();
  return (data?.email as string) ?? null;
}

async function comunicar(ind: { entidade_id: string | null; avaliador_id: string | null; contato_email: string | null }, assunto: string, texto: string) {
  const para = [...new Set([await emailDoIndicador(ind), ind.contato_email].filter(Boolean) as string[])];
  let enviados = 0;
  for (const p of para) {
    const r = await enviarEmail({
      para: p,
      assunto,
      tipo: "elegibilidade",
      entidadeId: ind.entidade_id,
      titulo: assunto,
      paragrafos: texto.split("\n").filter(Boolean),
    });
    if (r.ok) enviados++;
  }
  return { para, enviados };
}

const atualizar = (id: string) => {
  revalidatePath("/admin/indicacoes", "layout");
  revalidatePath(`/admin/indicacoes/${id}`);
  revalidatePath("/entidade", "layout");
  revalidatePath("/avaliacao", "layout");
};

// Art. 10 e 8º-A, III: decisão preliminar. Só grava; o e-mail sai quando a Secretaria mandar (comunicarDecisao).
export async function registrarAnalise(id: string, decisao: "apta" | "inapta", motivo: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const c = await carregar(id);
  if (!c) return { ok: false, erro: "Indicação não encontrada ou não enviada." };
  if (c.erro) return { ok: false, erro: c.erro };
  if (c.an?.finalist_id) return { ok: false, erro: "Esta indicação já é concorrente: a análise não muda mais." };
  const m = motivo.trim().slice(0, 1500);
  if (decisao === "inapta" && m.length < 10) return { ok: false, erro: "Explique o motivo da inaptidão (vai na mensagem ao indicador)." };
  const { error } = await servico()
    .from("indicacoes")
    .update({ analise: decisao, analise_motivo: m || null, analisada_em: new Date().toISOString(), analisada_por: admin.id, comunicada_em: null })
    .eq("id", id);
  if (error) return { ok: false, erro: MIGRACAO };
  await auditar(admin, "indicacao_analisada", { tipo: "indicacao", id }, { decisao, motivo: m || null });
  atualizar(id);
  return { ok: true, msg: `Registrada como ${decisao}. Nenhum e-mail foi enviado.` };
}

// Envio manual da decisão (preliminar ou da reconsideração) ao indicador e ao indicado.
export async function comunicarDecisao(id: string, qual: "analise" | "reconsideracao"): Promise<Resultado> {
  const admin = await exigirAdmin();
  const c = await carregar(id);
  if (!c) return { ok: false, erro: "Indicação não encontrada." };
  if (c.erro || !c.an) return { ok: false, erro: c.erro ?? MIGRACAO };
  const an = c.an;
  const base = { indicado: c.ind.indicado_nome ?? "", categoria: c.categoria ?? "" };
  let assunto: string, mensagem: string;
  if (qual === "analise") {
    if (!an.analise) return { ok: false, erro: "Registre a decisão antes." };
    assunto = "Prêmio Lavras de Inovação — decisão preliminar da indicação";
    mensagem = mensagemDecisao({ ...base, apta: an.analise === "apta", motivo: an.analise_motivo });
  } else {
    if (!an.reconsideracao_decisao) return { ok: false, erro: "O pedido ainda não foi decidido." };
    assunto = "Prêmio Lavras de Inovação — pedido de reconsideração";
    mensagem = mensagemReconsideracao({ ...base, deferida: an.reconsideracao_decisao === "deferida", motivo: an.reconsideracao_motivo });
  }
  const { para, enviados } = await comunicar(c.ind, assunto, mensagem);
  if (!para.length) return { ok: false, erro: "Não há e-mail do indicador nem do indicado. Copie a mensagem e envie por outro canal." };
  if (qual === "analise" && enviados) await servico().from("indicacoes").update({ comunicada_em: new Date().toISOString() }).eq("id", id);
  await auditar(admin, qual === "analise" ? "decisao_comunicada" : "reconsideracao_comunicada", { tipo: "indicacao", id }, { para, enviados });
  atualizar(id);
  if (!enviados) return { ok: false, erro: "O e-mail não saiu (envio automático não configurado ou falhou). Copie a mensagem e envie à mão." };
  return { ok: true, msg: `E-mail enviado para ${para.join(" e ")}${enviados < para.length ? ` (${para.length - enviados} falhou)` : ""}.` };
}

// Art. 10, §§ 2º e 3º: o pedido chega pelo canal oficial; a Secretaria registra e o COCITIEIS decide.
export async function registrarReconsideracao(id: string, pedido: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const c = await carregar(id);
  if (!c) return { ok: false, erro: "Indicação não encontrada." };
  if (c.erro) return { ok: false, erro: c.erro };
  if (c.an?.analise !== "inapta") return { ok: false, erro: "Só indicação inapta tem pedido de reconsideração." };
  if (c.an.reconsideracao_decisao) return { ok: false, erro: "O pedido já foi decidido." };
  const p = pedido.trim().slice(0, 4000);
  if (p.length < 10) return { ok: false, erro: "Cole o pedido como chegou." };
  const { error } = await servico().from("indicacoes").update({ reconsideracao: p, reconsideracao_em: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, erro: MIGRACAO };
  await auditar(admin, "reconsideracao_registrada", { tipo: "indicacao", id });
  atualizar(id);
  return { ok: true, msg: "Pedido registrado. A lista de finalistas não sai antes da decisão (art. 10, § 3º)." };
}

export async function decidirReconsideracao(id: string, decisao: "deferida" | "indeferida", fundamento: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const c = await carregar(id);
  if (!c) return { ok: false, erro: "Indicação não encontrada." };
  if (c.erro) return { ok: false, erro: c.erro };
  if (!c.an?.reconsideracao) return { ok: false, erro: "Registre o pedido antes." };
  if (c.an.reconsideracao_decisao) return { ok: false, erro: "O pedido já foi decidido." };
  const f = fundamento.trim().slice(0, 1500);
  if (f.length < 10) return { ok: false, erro: "Escreva o fundamento da decisão." };
  const { error } = await servico()
    .from("indicacoes")
    .update({
      reconsideracao_decisao: decisao,
      reconsideracao_motivo: f,
      reconsideracao_decidida_em: new Date().toISOString(),
      ...(decisao === "deferida" ? { analise: "apta" } : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, erro: MIGRACAO };
  await auditar(admin, "reconsideracao_decidida", { tipo: "indicacao", id }, { decisao });
  atualizar(id);
  return { ok: true, msg: `${decisao === "deferida" ? "Deferido: a indicação passou a apta." : "Indeferido."} Nenhum e-mail foi enviado.` };
}

// Indicação apta vira concorrente ("indicado") da categoria, pronta para a pré-seleção ou para a avaliação.
export async function incluirComoConcorrente(id: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const c = await carregar(id);
  if (!c) return { ok: false, erro: "Indicação não encontrada." };
  if (c.erro) return { ok: false, erro: c.erro };
  if (c.an?.analise !== "apta") return { ok: false, erro: "Só indicação apta vira concorrente." };
  if (c.an.finalist_id) return { ok: false, erro: "Já é concorrente." };
  const sb = servico();
  const [{ data: link }, { data: av }] = await Promise.all([
    sb.from("indicacao_documentos").select("link").eq("indicacao_id", id).eq("tipo", "evidencia").not("link", "is", null).limit(1).maybeSingle(),
    c.ind.avaliador_id ? sb.from("avaliadores").select("is_test").eq("id", c.ind.avaliador_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const { data: f, error } = await sb
    .from("finalists")
    .insert({
      category_id: c.ind.category_id,
      name: (c.ind.indicado_nome ?? "").slice(0, 160),
      summary: (c.ind.resumo ?? "").slice(0, 600),
      etapa: "indicado",
      material_link: (link?.link as string | undefined) ?? null,
      is_test: !!av?.is_test,
      sort_order: 0,
    })
    .select("id")
    .single();
  if (error || !f) return { ok: false, erro: "Não foi possível criar o concorrente." };
  await sb.from("indicacoes").update({ finalist_id: f.id }).eq("id", id);
  await auditar(admin, "indicacao_virou_concorrente", { tipo: "finalista", id: f.id }, { indicacao: id });
  atualizar(id);
  revalidatePath("/admin/avaliacao", "layout");
  return { ok: true, msg: "Incluída como concorrente da categoria. O material completo segue na ficha da indicação." };
}
