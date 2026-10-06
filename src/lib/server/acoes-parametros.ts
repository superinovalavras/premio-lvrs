"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { auditar } from "./auditoria";
import { exigirAdmin, servico } from "./sessao";
import { deBrasilia } from "./parametros";

export type Resultado = { ok: true; msg?: string } | { ok: false; erro: string };

// Tudo o que o master salva aparece no site na hora.
function atualizarSite() {
  revalidatePath("/", "layout");
}

const txt = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);

// ───── Datas ─────

export async function salvarDatas(fd: FormData): Promise<Resultado> {
  const admin = await exigirAdmin();
  const sb = servico();

  const votAbre = deBrasilia(txt(fd, "votacao_abre"));
  const votFecha = deBrasilia(txt(fd, "votacao_fecha"), true);
  const indAbre = deBrasilia(txt(fd, "indicacoes_abrem"));
  const indFecha = deBrasilia(txt(fd, "indicacoes_fecham"), true);
  const gala = deBrasilia(txt(fd, "gala_em"));
  const local = txt(fd, "gala_local", 200) || null;

  if (!votAbre || !votFecha || !indAbre || !indFecha || !gala) return { ok: false, erro: "Preencha todas as datas." };
  if (votFecha <= votAbre) return { ok: false, erro: "A votação precisa encerrar depois de abrir." };
  if (indFecha <= indAbre) return { ok: false, erro: "O período de indicações precisa encerrar depois de abrir." };
  if (gala <= votFecha) return { ok: false, erro: "A gala precisa ser depois do encerramento da votação." };

  const { data: atual } = await sb.from("vote_window").select("opens_at, closes_at").maybeSingle();
  const { data: par } = await sb.from("parametros").select("*").maybeSingle();

  const r1 = await sb.from("vote_window").update({ opens_at: votAbre, closes_at: votFecha }).eq("id", true);
  const r2 = await sb
    .from("parametros")
    .update({ gala_em: gala, gala_local: local, indicacoes_abrem: indAbre, indicacoes_fecham: indFecha, atualizado_em: new Date().toISOString() })
    .eq("id", true);
  if (r1.error || r2.error) return { ok: false, erro: "Não foi possível salvar as datas." };

  await auditar(admin, "datas_alteradas", { tipo: "premio", id: "datas" }, {
    antes: { votacao: atual, gala: par?.gala_em, indicacoes: par && [par.indicacoes_abrem, par.indicacoes_fecham] },
    depois: { votacao: [votAbre, votFecha], gala, indicacoes: [indAbre, indFecha] },
  });
  atualizarSite();
  return { ok: true, msg: "Datas salvas. O site já mostra as novas datas." };
}

// ───── Cronograma ─────

type Etapa = { titulo: string; data: string; texto: string; destaque: boolean };

export async function salvarCronograma(etapas: Etapa[]): Promise<Resultado> {
  const admin = await exigirAdmin();
  const limpas = etapas
    .map((e) => ({
      titulo: String(e.titulo ?? "").trim().slice(0, 120),
      data_texto: String(e.data ?? "").trim().slice(0, 60),
      texto: String(e.texto ?? "").trim().slice(0, 400),
      destaque: !!e.destaque,
    }))
    .filter((e) => e.titulo);
  if (!limpas.length) return { ok: false, erro: "O cronograma precisa de pelo menos uma etapa." };
  if (limpas.some((e) => !e.data_texto)) return { ok: false, erro: "Toda etapa precisa de uma data (pode ser “A confirmar”)." };

  const sb = servico();
  const { error: e1 } = await sb.from("cronograma").delete().not("id", "is", null);
  if (e1) return { ok: false, erro: "Não foi possível salvar o cronograma." };
  const { error } = await sb.from("cronograma").insert(limpas.map((e, i) => ({ ...e, ordem: i + 1 })));
  if (error) return { ok: false, erro: "Não foi possível salvar o cronograma." };
  await auditar(admin, "cronograma_alterado", { tipo: "premio", id: "cronograma" }, { etapas: limpas.map((e) => e.titulo) });
  atualizarSite();
  return { ok: true, msg: "Cronograma salvo." };
}

// ───── Categorias ─────

export async function salvarCategoria(id: string, fd: FormData): Promise<Resultado> {
  const admin = await exigirAdmin();
  const nome = txt(fd, "nome", 120);
  const descricao = txt(fd, "descricao", 400);
  if (nome.length < 3) return { ok: false, erro: "Informe o nome da categoria." };
  const { error } = await servico()
    .from("categories")
    .update({ name: nome, description: descricao, destaque: fd.get("destaque") === "on" })
    .eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível salvar a categoria." };
  await auditar(admin, "categoria_alterada", { tipo: "categoria", id }, { nome });
  atualizarSite();
  return { ok: true, msg: "Categoria salva." };
}

// ───── Uploads públicos (documentos e logos) ─────

const MIMES_DOC = ["application/pdf"];
const MIMES_IMG = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export async function prepararUploadPublico(pasta: "documentos" | "finalistas", nome: string, tamanho: number, mime: string) {
  await exigirAdmin();
  const aceitos = pasta === "documentos" ? MIMES_DOC : MIMES_IMG;
  if (!aceitos.includes(mime)) {
    return { ok: false as const, erro: pasta === "documentos" ? "Envie um PDF." : "Envie PNG, JPG, WEBP ou SVG." };
  }
  if (tamanho > 10 * 1024 * 1024) return { ok: false as const, erro: "O arquivo passa de 10 MB." };
  const seguro = nome.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
  const caminho = `${pasta}/${randomUUID()}-${seguro}`;
  const { data, error } = await servico().storage.from("publico").createSignedUploadUrl(caminho);
  if (error || !data) return { ok: false as const, erro: "Não foi possível preparar o envio." };
  return { ok: true as const, caminho, token: data.token };
}

async function apagarArquivoPublico(caminho: string | null | undefined) {
  if (caminho) await servico().storage.from("publico").remove([caminho]);
}

// ───── Documentos da transparência ─────

export async function salvarDocumento(
  id: string | null,
  dados: { titulo: string; descricao: string; caminho?: string | null; nome_arquivo?: string | null; tamanho?: number | null },
): Promise<Resultado> {
  const admin = await exigirAdmin();
  const titulo = dados.titulo.trim().slice(0, 160);
  if (titulo.length < 3) return { ok: false, erro: "Informe o título do documento." };
  if (dados.caminho && !dados.caminho.startsWith("documentos/")) return { ok: false, erro: "Arquivo inválido." };
  const sb = servico();
  const base = { titulo, descricao: dados.descricao.trim().slice(0, 300), atualizado_em: new Date().toISOString() };

  if (id) {
    const { data: antes } = await sb.from("documentos_publicos").select("storage_path").eq("id", id).maybeSingle();
    const novoArquivo = dados.caminho !== undefined;
    const { error } = await sb
      .from("documentos_publicos")
      .update(novoArquivo ? { ...base, storage_path: dados.caminho, nome_arquivo: dados.nome_arquivo, tamanho: dados.tamanho } : base)
      .eq("id", id);
    if (error) return { ok: false, erro: "Não foi possível salvar o documento." };
    // A versão anterior fica guardada (não apaga o arquivo antigo) — o histórico registra a troca.
    await auditar(admin, novoArquivo ? "documento_publicado" : "documento_editado", { tipo: "documento", id }, {
      titulo,
      arquivo: dados.nome_arquivo,
      anterior: novoArquivo ? antes?.storage_path : undefined,
    });
  } else {
    const { count } = await sb.from("documentos_publicos").select("id", { count: "exact", head: true });
    const { data, error } = await sb
      .from("documentos_publicos")
      .insert({ ...base, ordem: (count ?? 0) + 1, storage_path: dados.caminho ?? null, nome_arquivo: dados.nome_arquivo ?? null, tamanho: dados.tamanho ?? null })
      .select("id")
      .single();
    if (error || !data) return { ok: false, erro: "Não foi possível criar o documento." };
    await auditar(admin, "documento_criado", { tipo: "documento", id: data.id }, { titulo });
  }
  atualizarSite();
  return { ok: true, msg: "Documento salvo." };
}

export async function removerDocumentoPublico(id: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const sb = servico();
  const { data } = await sb.from("documentos_publicos").select("titulo").eq("id", id).maybeSingle();
  const { error } = await sb.from("documentos_publicos").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível remover." };
  await auditar(admin, "documento_removido", { tipo: "documento", id }, { titulo: data?.titulo });
  atualizarSite();
  return { ok: true, msg: "Documento removido do site." };
}

// ───── Finalistas ─────

export async function salvarFinalista(
  id: string | null,
  dados: {
    nome: string;
    resumo: string;
    nota: string;
    teste: boolean;
    ordem: number;
    logo?: string | null; // caminho no bucket público; undefined = não mexe
  },
): Promise<Resultado> {
  const admin = await exigirAdmin();
  const sb = servico();
  const nome = dados.nome.trim().slice(0, 120);
  const resumo = dados.resumo.trim().slice(0, 400);
  if (nome.length < 2) return { ok: false, erro: "Informe o nome do finalista." };
  if (resumo.length < 10) return { ok: false, erro: "Escreva um resumo da solução." };
  let nota: number | null = null;
  if (dados.nota.trim()) {
    nota = Number(dados.nota.replace(",", "."));
    if (!Number.isFinite(nota) || nota < 0 || nota > 100) return { ok: false, erro: "A nota técnica vai de 0 a 100." };
    nota = Math.round(nota * 100) / 100;
  }
  if (dados.logo && !dados.logo.startsWith("finalistas/")) return { ok: false, erro: "Logo inválida." };

  const { data: cat } = await sb.from("categories").select("id").eq("has_popular_vote", true).single();
  if (!cat) return { ok: false, erro: "Categoria da votação popular não encontrada." };

  const campos: Record<string, unknown> = {
    name: nome,
    summary: resumo,
    technical_score: nota,
    is_test: dados.teste,
    sort_order: dados.ordem,
  };
  if (dados.logo !== undefined) campos.image_url = dados.logo ? urlLogo(dados.logo) : null;

  if (id) {
    const { data: antes } = await sb.from("finalists").select("name, technical_score, image_url").eq("id", id).maybeSingle();
    const { error } = await sb.from("finalists").update(campos).eq("id", id);
    if (error) return { ok: false, erro: "Não foi possível salvar o finalista." };
    if (dados.logo !== undefined && antes?.image_url?.includes("/publico/finalistas/")) {
      await apagarArquivoPublico(antes.image_url.split("/publico/")[1]);
    }
    await auditar(admin, "finalista_editado", { tipo: "finalista", id }, {
      nome,
      ...(antes && antes.technical_score !== nota ? { nota_antes: antes.technical_score, nota_depois: nota } : {}),
    });
  } else {
    const { data, error } = await sb.from("finalists").insert({ ...campos, category_id: cat.id }).select("id").single();
    if (error || !data) return { ok: false, erro: "Não foi possível cadastrar o finalista." };
    await auditar(admin, "finalista_cadastrado", { tipo: "finalista", id: data.id }, { nome, teste: dados.teste });
  }
  atualizarSite();
  return { ok: true, msg: "Finalista salvo." };
}

export async function removerFinalista(id: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const sb = servico();
  const { count } = await sb.from("votes").select("id", { count: "exact", head: true }).eq("finalist_id", id);
  const { data: f } = await sb.from("finalists").select("name, is_test, image_url").eq("id", id).maybeSingle();
  if (!f) return { ok: false, erro: "Finalista não encontrado." };
  if ((count ?? 0) > 0 && !f.is_test) {
    return { ok: false, erro: "Este finalista já recebeu votos e não pode ser removido." };
  }
  if (f.is_test) await sb.from("votes").delete().eq("finalist_id", id);
  const { error } = await sb.from("finalists").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível remover." };
  if (f.image_url?.includes("/publico/finalistas/")) await apagarArquivoPublico(f.image_url.split("/publico/")[1]);
  await auditar(admin, "finalista_removido", { tipo: "finalista", id }, { nome: f.name, teste: f.is_test });
  atualizarSite();
  return { ok: true, msg: "Finalista removido." };
}

function urlLogo(caminho: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/publico/${caminho}`;
}

// Votos dados no ensaio (finalistas de teste). Precisam sumir antes da votação oficial:
// o CPF que votou no teste ficaria bloqueado para votar de verdade.
export async function apagarVotosTeste(): Promise<Resultado> {
  const admin = await exigirAdmin();
  const sb = servico();
  const { data: testes } = await sb.from("finalists").select("id").eq("is_test", true);
  const ids = (testes ?? []).map((f) => f.id);
  if (!ids.length) return { ok: true, msg: "Não há finalistas de teste." };
  const { count } = await sb.from("votes").select("id", { count: "exact", head: true }).in("finalist_id", ids);
  const { error } = await sb.from("votes").delete().in("finalist_id", ids);
  if (error) return { ok: false, erro: "Não foi possível apagar os votos de teste." };
  await auditar(admin, "votos_teste_apagados", { tipo: "premio", id: "votacao" }, { quantidade: count ?? 0 });
  return { ok: true, msg: `${count ?? 0} voto(s) de teste apagado(s).` };
}

// Apaga todos os votos (para testar a votação antes da data oficial). Exige digitar ZERAR.
export async function zerarVotacao(confirmacao: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  if (confirmacao.trim().toUpperCase() !== "ZERAR") return { ok: false, erro: "Digite ZERAR para confirmar." };
  const sb = servico();
  const { count } = await sb.from("votes").select("id", { count: "exact", head: true });
  const { error } = await sb.from("votes").delete().not("id", "is", null);
  if (error) return { ok: false, erro: "Não foi possível zerar a votação." };
  await auditar(admin, "votacao_zerada", { tipo: "premio", id: "votacao" }, { votos_apagados: count ?? 0 });
  return { ok: true, msg: `${count ?? 0} voto(s) apagado(s). A votação está zerada.` };
}
