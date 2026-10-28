"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { auditar } from "./auditoria";
import { exigirAdmin, servico } from "./sessao";
import { carregarIndicacao } from "./indicacoes-dados";
import { somenteDigitos } from "@/lib/voto";
import { LIMITES_TEXTO, aceitaLink, maximoPorTipo, tipoDocumentoValido } from "@/lib/indicacoes";

// Correção da indicação pela Secretaria Executiva depois do prazo (esclarecimentos do art. 10).
// Quem indicou não edita mais; a Secretaria completa o que chegar, e cada mudança fica na auditoria com o valor anterior (art. 26).

export type Resultado = { ok: true; msg?: string } | { ok: false; erro: string };

const LIMITE_ARQUIVO = 10 * 1024 * 1024;
const MIMES = ["application/pdf", "image/png", "image/jpeg"];

async function indicacaoEnviada(id: string) {
  const r = await carregarIndicacao(id);
  if (!r || r.indicacao.status !== "enviada") return null;
  return r;
}

const pastaDe = (i: { entidade_id: string | null; avaliador_id: string | null }) =>
  i.avaliador_id ? `conselheiros/${i.avaliador_id}` : (i.entidade_id as string);

const atualizar = (id: string) => {
  revalidatePath("/admin/indicacoes", "layout");
  revalidatePath(`/admin/indicacoes/${id}`);
  revalidatePath("/admin/avaliacao", "layout");
  revalidatePath("/entidade", "layout");
  revalidatePath("/avaliacao", "layout");
};

const texto = (fd: FormData, k: string, max: number, rotulo: string) => {
  const v = String(fd.get(k) ?? "").trim();
  if (v.length > max) throw new Error(`${rotulo}: até ${max} caracteres.`);
  return v || null;
};
const data = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};

export async function editarIndicacaoSecretaria(id: string, fd: FormData): Promise<Resultado> {
  const admin = await exigirAdmin();
  const r = await indicacaoEnviada(id);
  if (!r) return { ok: false, erro: "Indicação não encontrada ou não enviada." };
  const i = r.indicacao;

  const campos: Record<string, unknown> = {};
  try {
    const email = String(fd.get("contato_email") ?? "").trim().toLowerCase();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: "E-mail do contato inválido." };
    const tel = somenteDigitos(String(fd.get("contato_telefone") ?? ""));
    if (tel && !/^\d{10,11}$/.test(tel)) return { ok: false, erro: "Telefone do contato inválido: use DDD + número." };
    const qtd = String(fd.get("beneficiarios_qtd") ?? "").replace(/\D/g, "");
    const cat = String(fd.get("category_id") ?? "");
    Object.assign(campos, {
      category_id: cat || i.category_id,
      indicado_nome: texto(fd, "indicado_nome", 200, "Nome do indicado"),
      ...(i.indicado_tipo === "pf" ? { indicado_nascimento: data(fd, "indicado_nascimento") } : {}),
      vinculo_descricao: texto(fd, "vinculo_descricao", LIMITES_TEXTO.vinculo, "Descrição do vínculo"),
      titulo: texto(fd, "titulo", LIMITES_TEXTO.titulo, "Título"),
      resumo: texto(fd, "resumo", LIMITES_TEXTO.resumo, "Resumo executivo"),
      problema: texto(fd, "problema", LIMITES_TEXTO.problema, "Problema ou oportunidade"),
      solucao: texto(fd, "solucao", LIMITES_TEXTO.solucao, "Solução ou contribuição"),
      resultados: texto(fd, "resultados", LIMITES_TEXTO.resultados, "Resultados e indicadores"),
      periodo_inicio: data(fd, "periodo_inicio"),
      periodo_fim: data(fd, "periodo_fim"),
      beneficiarios: texto(fd, "beneficiarios", 1000, "Beneficiários"),
      beneficiarios_qtd: qtd ? Math.min(Number(qtd), 2_000_000_000) : null,
      contato_nome: texto(fd, "contato_nome", 160, "Nome do contato"),
      contato_email: email.slice(0, 160) || null,
      contato_telefone: tel || null,
    });
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
  if (!campos.indicado_nome) return { ok: false, erro: "Informe o nome do indicado." };

  // Só o que mudou, com o valor anterior, para a trilha de auditoria.
  const antes = i as unknown as Record<string, unknown>;
  const mudou = Object.fromEntries(
    Object.entries(campos)
      .filter(([k, v]) => (antes[k] ?? null) !== (v ?? null))
      .map(([k, v]) => [k, { antes: antes[k] ?? null, depois: v ?? null }]),
  );
  if (!Object.keys(mudou).length) return { ok: true, msg: "Nada mudou." };

  const sb = servico();
  const { error } = await sb
    .from("indicacoes")
    .update(Object.fromEntries(Object.keys(mudou).map((k) => [k, campos[k]])))
    .eq("id", id)
    .eq("status", "enviada");
  if (error) return { ok: false, erro: "Não foi possível salvar. Tente novamente." };

  // Já é concorrente: nome, resumo e categoria acompanham a indicação.
  const { data: an } = await sb.from("indicacoes").select("finalist_id").eq("id", id).maybeSingle();
  if (an?.finalist_id && (mudou.indicado_nome || mudou.resumo || mudou.category_id)) {
    await sb
      .from("finalists")
      .update({
        name: String(campos.indicado_nome).slice(0, 160),
        summary: String(campos.resumo ?? "").slice(0, 600),
        category_id: campos.category_id,
      })
      .eq("id", an.finalist_id);
  }

  await auditar(admin, "indicacao_corrigida_secretaria", { tipo: "indicacao", id }, { campos: mudou });
  atualizar(id);
  return { ok: true, msg: `Salvo (${Object.keys(mudou).length} campo${Object.keys(mudou).length > 1 ? "s" : ""}).` };
}

export async function linkSecretaria(id: string, tipo: string, link: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const r = await indicacaoEnviada(id);
  if (!r) return { ok: false, erro: "Indicação não encontrada." };
  if (!aceitaLink(tipo)) return { ok: false, erro: "Este item aceita só arquivo." };
  if (r.documentos.filter((d) => d.tipo === tipo).length >= maximoPorTipo(tipo)) return { ok: false, erro: `Máximo de ${maximoPorTipo(tipo)} itens.` };
  let url: URL;
  try {
    url = new URL(link.trim());
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    return { ok: false, erro: "Link inválido. Use um endereço completo, começando com https://" };
  }
  const { error } = await servico().from("indicacao_documentos").insert({ indicacao_id: id, tipo, link: url.toString() });
  if (error) return { ok: false, erro: "Não foi possível salvar o link." };
  await auditar(admin, "indicacao_link_secretaria", { tipo: "indicacao", id }, { tipo, link: url.toString() });
  atualizar(id);
  return { ok: true, msg: "Link incluído." };
}

export async function prepararUploadSecretaria(id: string, tipo: string, nome: string, tamanho: number, mime: string) {
  await exigirAdmin();
  const r = await indicacaoEnviada(id);
  if (!r) return { ok: false as const, erro: "Indicação não encontrada." };
  if (!tipoDocumentoValido(r.indicacao, tipo)) return { ok: false as const, erro: "Arquivo não previsto nesta indicação." };
  if (tamanho > LIMITE_ARQUIVO) return { ok: false as const, erro: "O arquivo passa de 10 MB." };
  if (!MIMES.includes(mime)) return { ok: false as const, erro: "Envie PDF, PNG ou JPG." };
  if (r.documentos.filter((d) => d.tipo === tipo).length >= maximoPorTipo(tipo)) return { ok: false as const, erro: `Máximo de ${maximoPorTipo(tipo)} itens.` };
  const seguro = nome.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
  const caminho = `${pastaDe(r.indicacao)}/indicacoes/${id}/${tipo}/${randomUUID()}-${seguro}`;
  const { data: u, error } = await servico().storage.from("entidades").createSignedUploadUrl(caminho);
  if (error || !u) return { ok: false as const, erro: "Não foi possível preparar o envio." };
  return { ok: true as const, caminho, token: u.token };
}

export async function confirmarUploadSecretaria(id: string, tipo: string, caminho: string, nome: string, tamanho: number): Promise<Resultado> {
  const admin = await exigirAdmin();
  const r = await indicacaoEnviada(id);
  if (!r) return { ok: false, erro: "Indicação não encontrada." };
  if (!caminho.startsWith(`${pastaDe(r.indicacao)}/indicacoes/${id}/`) || !tipoDocumentoValido(r.indicacao, tipo)) return { ok: false, erro: "Envio inválido." };
  const { error } = await servico()
    .from("indicacao_documentos")
    .insert({ indicacao_id: id, tipo, storage_path: caminho, nome_arquivo: nome.slice(0, 200), tamanho });
  if (error) return { ok: false, erro: "Não foi possível registrar o arquivo." };
  await auditar(admin, "indicacao_arquivo_secretaria", { tipo: "indicacao", id }, { tipo, nome, tamanho });
  atualizar(id);
  return { ok: true, msg: "Arquivo incluído." };
}

// Retira o item da indicação. O arquivo fica no Storage, para o processo (art. 26).
export async function removerDocSecretaria(id: string, docId: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const r = await indicacaoEnviada(id);
  if (!r) return { ok: false, erro: "Indicação não encontrada." };
  const d = r.documentos.find((x) => x.id === docId);
  if (!d) return { ok: false, erro: "Item não encontrado." };
  const { error } = await servico().from("indicacao_documentos").delete().eq("id", docId);
  if (error) return { ok: false, erro: "Não foi possível remover." };
  await auditar(admin, "indicacao_item_removido_secretaria", { tipo: "indicacao", id }, { tipo: d.tipo, link: d.link, arquivo: d.storage_path });
  atualizar(id);
  return { ok: true, msg: "Item removido." };
}
