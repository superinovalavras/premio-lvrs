"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { auditar } from "./auditoria";
import { enviarEmail, URL_SITE } from "./email";
import { ehAdmin, exigirUsuario, ipDaRequisicao, servico, userAgent } from "./sessao";
import { carregarEntidadeDoUsuario, emailsAdmins } from "./entidades-dados";
import { carregarIndicacao, contextoIndicacao, janelaIndicacoes } from "./indicacoes-dados";
import { dia, hora } from "@/lib/datas";
import { cnpjValido } from "@/lib/entidades";
import { cpfValido, somenteDigitos } from "@/lib/voto";
import {
  CONFLITOS,
  DECLARACAO_INDICADOR,
  LIMITE_POR_CATEGORIA,
  LIMITE_TOTAL,
  LIMITES_TEXTO,
  aceitaLink,
  maximoPorTipo,
  pendenciasIndicacao,
  pessoasDaIndicacao,
  tipoDocumentoValido,
  type Integrante,
} from "@/lib/indicacoes";

export type Resultado = { ok: true; msg?: string; id?: string } | { ok: false; erro: string; pendencias?: string[] };

const LIMITE_ARQUIVO = 10 * 1024 * 1024;
const MIMES = ["application/pdf", "image/png", "image/jpeg"];

// Instituição deferida, dentro do prazo (art. 8º, caput, e art. 8º-A, II).
async function minhaEntidadeHabilitada() {
  const user = await exigirUsuario();
  const dados = await carregarEntidadeDoUsuario(user.id);
  if (!dados) return { erro: "Cadastro não encontrado." } as const;
  if (dados.entidade.status !== "deferido") return { erro: "Só instituições com cadastro deferido podem indicar (art. 8º)." } as const;
  const janela = await janelaIndicacoes();
  if (janela.estado === "antes") return { erro: `As indicações abrem em ${dia(janela.abre)}, à ${hora(janela.abre)}.` } as const;
  if (janela.estado === "encerrada") return { erro: "O prazo de indicações terminou." } as const;
  return { user, dados, janela } as const;
}

async function minhaIndicacao(id: string, exigeRascunho = true) {
  const c = await minhaEntidadeHabilitada();
  if (c.erro !== undefined) return { erro: c.erro } as const;
  const r = await carregarIndicacao(id);
  if (!r || r.indicacao.entidade_id !== c.dados.entidade.id) return { erro: "Indicação não encontrada." } as const;
  if (exigeRascunho && r.indicacao.status !== "rascunho") {
    return { erro: "Esta indicação já foi enviada. Use “Editar” para reabrir." } as const;
  }
  return { ...c, ...r } as const;
}

const texto = (fd: FormData, k: string, max: number, rotulo: string) => {
  const v = String(fd.get(k) ?? "").trim();
  if (v.length > max) throw new Error(`${rotulo}: até ${max} caracteres.`);
  return v || null;
};
const data = (fd: FormData, k: string) => {
  const v = String(fd.get(k) ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
};
const simNao = (fd: FormData, k: string) => (fd.get(k) === "sim" ? true : fd.get(k) === "nao" ? false : null);

// ───── Criar, salvar passos, excluir ─────

export async function novaIndicacao(): Promise<Resultado> {
  const c = await minhaEntidadeHabilitada();
  if (c.erro !== undefined) return { ok: false, erro: c.erro };
  const sb = servico();
  const { count } = await sb
    .from("indicacoes")
    .select("id", { count: "exact", head: true })
    .eq("entidade_id", c.dados.entidade.id)
    .eq("status", "rascunho");
  if ((count ?? 0) >= 12) return { ok: false, erro: "Há muitos rascunhos abertos. Envie ou exclua algum antes de começar outro." };
  const { data: nova, error } = await sb
    .from("indicacoes")
    .insert({ entidade_id: c.dados.entidade.id, criado_por: c.user.id })
    .select("id")
    .single();
  if (error || !nova) return { ok: false, erro: "Não foi possível começar a indicação." };
  await auditar(c.user, "indicacao_criada", { tipo: "indicacao", id: nova.id }, { entidade: c.dados.entidade.id });
  revalidatePath("/entidade", "layout");
  return { ok: true, id: nova.id };
}

export async function salvarPassoIndicacao(id: string, passo: number, fd: FormData): Promise<Resultado> {
  const c = await minhaIndicacao(id);
  if (c.erro !== undefined) return { ok: false, erro: c.erro };
  const campos: Record<string, unknown> = {};

  try {
    if (passo === 1) {
      const cat = String(fd.get("category_id") ?? "");
      if (cat) {
        const { data: existe } = await servico().from("categories").select("id").eq("id", cat).maybeSingle();
        if (!existe) return { ok: false, erro: "Categoria inválida." };
      }
      const tipo = String(fd.get("indicado_tipo") ?? "");
      if (tipo && !["pf", "conjunto", "instituicao"].includes(tipo)) return { ok: false, erro: "Tipo inválido." };
      const doc = somenteDigitos(String(fd.get("indicado_documento") ?? ""));
      if (doc) {
        if (tipo === "pf" && !cpfValido(doc)) return { ok: false, erro: "CPF do indicado inválido." };
        if (tipo === "instituicao" && !cnpjValido(doc)) return { ok: false, erro: "CNPJ do indicado inválido." };
        if (tipo === "conjunto" && !(cpfValido(doc) || cnpjValido(doc))) return { ok: false, erro: "CPF ou CNPJ do conjunto inválido." };
      }
      let integrantes: Integrante[] = [];
      if (tipo === "conjunto") {
        try {
          const bruto = JSON.parse(String(fd.get("integrantes") ?? "[]")) as Integrante[];
          integrantes = bruto.slice(0, 30).map((g) => ({
            nome: String(g.nome ?? "").trim().slice(0, 160),
            cpf: somenteDigitos(String(g.cpf ?? "")).slice(0, 11),
            nascimento: /^\d{4}-\d{2}-\d{2}$/.test(String(g.nascimento ?? "")) ? String(g.nascimento) : "",
          }));
        } catch {
          return { ok: false, erro: "Lista de integrantes inválida." };
        }
      }
      Object.assign(campos, {
        category_id: cat || null,
        indicado_nome: texto(fd, "indicado_nome", 200, "Nome do indicado"),
        indicado_tipo: tipo || null,
        indicado_documento: doc || null,
        indicado_nascimento: tipo === "pf" ? data(fd, "indicado_nascimento") : null,
        integrantes,
        aspecto_distinto: texto(fd, "aspecto_distinto", 1000, "Aspecto distinto"),
      });
    } else if (passo === 2) {
      const cond = String(fd.get("vinculo_condicao") ?? "");
      Object.assign(campos, {
        vinculo_condicao: ["I", "II", "III"].includes(cond) ? cond : null,
        vinculo_descricao: texto(fd, "vinculo_descricao", LIMITES_TEXTO.vinculo, "Descrição do vínculo"),
      });
    } else if (passo === 3) {
      const qtd = String(fd.get("beneficiarios_qtd") ?? "").replace(/\D/g, "");
      Object.assign(campos, {
        titulo: texto(fd, "titulo", LIMITES_TEXTO.titulo, "Título"),
        resumo: texto(fd, "resumo", LIMITES_TEXTO.resumo, "Resumo executivo"),
        problema: texto(fd, "problema", LIMITES_TEXTO.problema, "Problema ou oportunidade"),
        solucao: texto(fd, "solucao", LIMITES_TEXTO.solucao, "Solução ou contribuição"),
        resultados: texto(fd, "resultados", LIMITES_TEXTO.resultados, "Resultados e indicadores"),
        periodo_inicio: data(fd, "periodo_inicio"),
        periodo_fim: data(fd, "periodo_fim"),
        beneficiarios: texto(fd, "beneficiarios", 1000, "Beneficiários"),
        beneficiarios_qtd: qtd ? Math.min(Number(qtd), 2_000_000_000) : null,
      });
    } else if (passo === 5) {
      const email = String(fd.get("contato_email") ?? "").trim().toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: "E-mail do contato inválido." };
      const tel = somenteDigitos(String(fd.get("contato_telefone") ?? ""));
      if (tel && !/^\d{10,11}$/.test(tel)) return { ok: false, erro: "Telefone do contato inválido: use DDD + número." };
      Object.assign(campos, {
        contato_nome: texto(fd, "contato_nome", 160, "Nome do contato"),
        contato_email: email.slice(0, 160) || null,
        contato_telefone: tel || null,
      });
      for (const k of CONFLITOS) {
        const resp = simNao(fd, `conflito_${k.id}`);
        campos[`conflito_${k.id}`] = resp;
        campos[`conflito_${k.id}_desc`] = resp ? texto(fd, `conflito_${k.id}_desc`, 1000, "Descrição") : null;
      }
    } else {
      return { ok: false, erro: "Passo inválido." };
    }
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }

  const { error } = await servico()
    .from("indicacoes")
    .update({ ...campos, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "rascunho");
  if (error) return { ok: false, erro: "Não foi possível salvar. Tente novamente." };
  await auditar(c.user, "indicacao_editada", { tipo: "indicacao", id }, { passo });
  revalidatePath("/entidade", "layout");
  return { ok: true };
}

export async function excluirIndicacao(id: string): Promise<Resultado> {
  const c = await minhaIndicacao(id);
  if (c.erro !== undefined) return { ok: false, erro: c.erro };
  // Indicação que já foi enviada uma vez fica no histórico (spec 3.3: nunca apagar).
  if (c.indicacao.submetido_em) return { ok: false, erro: "Esta indicação já foi enviada uma vez e fica no histórico." };
  const caminhos = c.documentos.map((d) => d.storage_path).filter(Boolean) as string[];
  if (caminhos.length) await servico().storage.from("entidades").remove(caminhos);
  const { error } = await servico().from("indicacoes").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível excluir." };
  await auditar(c.user, "indicacao_excluida", { tipo: "indicacao", id }, { indicado: c.indicacao.indicado_nome });
  revalidatePath("/entidade", "layout");
  return { ok: true };
}

// ───── Arquivos e links ─────
// O arquivo vai direto do navegador para o Storage com URL assinada; o servidor decide o caminho.

export async function prepararUploadIndicacao(id: string, tipo: string, nome: string, tamanho: number, mime: string) {
  const c = await minhaIndicacao(id);
  if (c.erro !== undefined) return { ok: false as const, erro: c.erro };
  if (!tipoDocumentoValido(c.indicacao, tipo)) return { ok: false as const, erro: "Arquivo não previsto nesta indicação." };
  if (tamanho > LIMITE_ARQUIVO) return { ok: false as const, erro: "O arquivo passa de 10 MB." };
  if (!MIMES.includes(mime)) return { ok: false as const, erro: "Envie PDF, PNG ou JPG." };
  const max = maximoPorTipo(tipo);
  if (max > 1 && c.documentos.filter((d) => d.tipo === tipo).length >= max) return { ok: false as const, erro: `Máximo de ${max} itens.` };
  const seguro = nome.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
  const caminho = `${c.dados.entidade.id}/indicacoes/${id}/${tipo.replace(":", "-")}/${randomUUID()}-${seguro}`;
  const { data: u, error } = await servico().storage.from("entidades").createSignedUploadUrl(caminho);
  if (error || !u) return { ok: false as const, erro: "Não foi possível preparar o envio." };
  return { ok: true as const, caminho, token: u.token };
}

export async function confirmarUploadIndicacao(id: string, tipo: string, caminho: string, nome: string, tamanho: number): Promise<Resultado> {
  const c = await minhaIndicacao(id);
  if (c.erro !== undefined) return { ok: false, erro: c.erro };
  if (!caminho.startsWith(`${c.dados.entidade.id}/indicacoes/${id}/`)) return { ok: false, erro: "Envio inválido." };
  if (!tipoDocumentoValido(c.indicacao, tipo)) return { ok: false, erro: "Arquivo inválido." };
  // Tipos de um item só (Anexo IV): o novo substitui o anterior.
  const anteriores = maximoPorTipo(tipo) === 1 ? c.documentos.filter((d) => d.tipo === tipo) : [];
  const { error } = await servico()
    .from("indicacao_documentos")
    .insert({ indicacao_id: id, tipo, storage_path: caminho, nome_arquivo: nome.slice(0, 200), tamanho });
  if (error) return { ok: false, erro: "Não foi possível registrar o arquivo." };
  if (anteriores.length) await removerDocs(anteriores.map((d) => d.id));
  await auditar(c.user, "indicacao_arquivo", { tipo: "indicacao", id }, { tipo, nome, tamanho });
  revalidatePath("/entidade", "layout");
  return { ok: true };
}

export async function salvarLinkIndicacao(id: string, tipo: string, link: string): Promise<Resultado> {
  const c = await minhaIndicacao(id);
  if (c.erro !== undefined) return { ok: false, erro: c.erro };
  if (!aceitaLink(tipo)) return { ok: false, erro: "Este item aceita só arquivo." };
  if (c.documentos.filter((d) => d.tipo === tipo).length >= maximoPorTipo(tipo)) return { ok: false, erro: `Máximo de ${maximoPorTipo(tipo)} itens.` };
  let url: URL;
  try {
    url = new URL(link.trim());
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    return { ok: false, erro: "Link inválido. Use um endereço completo, começando com https://" };
  }
  const { error } = await servico().from("indicacao_documentos").insert({ indicacao_id: id, tipo, link: url.toString() });
  if (error) return { ok: false, erro: "Não foi possível salvar o link." };
  await auditar(c.user, "indicacao_link", { tipo: "indicacao", id }, { tipo, link: url.toString() });
  revalidatePath("/entidade", "layout");
  return { ok: true };
}

export async function removerDocIndicacao(id: string, docId: string): Promise<Resultado> {
  const c = await minhaIndicacao(id);
  if (c.erro !== undefined) return { ok: false, erro: c.erro };
  if (!c.documentos.some((d) => d.id === docId)) return { ok: false, erro: "Item não encontrado." };
  await removerDocs([docId]);
  await auditar(c.user, "indicacao_item_removido", { tipo: "indicacao", id }, { documento: docId });
  revalidatePath("/entidade", "layout");
  return { ok: true };
}

async function removerDocs(ids: string[]) {
  const sb = servico();
  const { data: docs } = await sb.from("indicacao_documentos").select("storage_path").in("id", ids);
  const caminhos = (docs ?? []).map((d) => d.storage_path).filter(Boolean) as string[];
  if (caminhos.length) await sb.storage.from("entidades").remove(caminhos);
  await sb.from("indicacao_documentos").delete().in("id", ids);
}

// Link temporário (5 min): dona da indicação ou Secretaria. Vale também fora do prazo, só para ler.
export async function abrirDocIndicacao(docId: string) {
  const user = await exigirUsuario();
  const sb = servico();
  const { data: doc } = await sb.from("indicacao_documentos").select("storage_path, link, indicacao_id").eq("id", docId).maybeSingle();
  if (!doc) return { ok: false as const, erro: "Arquivo não encontrado." };
  const { data: ind } = await sb.from("indicacoes").select("entidade_id").eq("id", doc.indicacao_id).maybeSingle();
  const { data: ent } = ind ? await sb.from("entidades").select("user_id").eq("id", ind.entidade_id).maybeSingle() : { data: null };
  if (ent?.user_id !== user.id && !(await ehAdmin(user.id))) return { ok: false as const, erro: "Sem permissão." };
  if (doc.link) return { ok: true as const, url: doc.link };
  const { data: s } = await sb.storage.from("entidades").createSignedUrl(doc.storage_path!, 300);
  return s ? { ok: true as const, url: s.signedUrl } : { ok: false as const, erro: "Arquivo indisponível." };
}

// ───── Envio (com as travas do item 3.1) ─────

export async function enviarIndicacao(id: string, fd: FormData): Promise<Resultado> {
  const c = await minhaIndicacao(id);
  if (c.erro !== undefined) return { ok: false, erro: c.erro };
  if (fd.get("declaracao") !== "on") return { ok: false, erro: "Marque a declaração do indicador para enviar." };
  const { indicacao: ind, documentos, dados, user } = c;

  const ctx = await contextoIndicacao(ind);
  const pend = pendenciasIndicacao(ind, documentos, ctx);
  if (pend.length) return { ok: false, erro: "Ainda faltam itens para enviar.", pendencias: pend.map((p) => p.texto) };

  // Autoindicação (art. 8º, § 2º): CPF/CNPJ do indicado igual ao do indicador ou do representante.
  // Órgão municipal que usa o CNPJ da Prefeitura não é comparado por CNPJ (todos os órgãos o compartilham).
  const proibidos = new Set(
    [dados.titular?.cpf, dados.suplente?.cpf, dados.entidade.unidade_municipal ? null : dados.entidade.cnpj].filter(Boolean) as string[],
  );
  const docsIndicado = [ind.indicado_documento, ...pessoasDaIndicacao(ind).map((p) => p.cpf)].filter(Boolean) as string[];
  if (docsIndicado.some((d) => proibidos.has(d))) {
    return { ok: false, erro: "Autoindicação não é admitida: o CPF ou CNPJ do indicado coincide com o da instituição ou do seu representante (art. 8º, § 2º)." };
  }

  // Limites (art. 8º, §§ 3º e 5º): contam as indicações já enviadas, na ordem de chegada.
  const sb = servico();
  const { data: enviadas } = await sb
    .from("indicacoes")
    .select("id, category_id")
    .eq("entidade_id", dados.entidade.id)
    .eq("status", "enviada")
    .neq("id", id);
  const outras = enviadas ?? [];
  if (outras.length >= LIMITE_TOTAL) return { ok: false, erro: `A instituição já enviou ${LIMITE_TOTAL} indicações, o máximo da edição (art. 8º, § 5º).` };
  if (outras.filter((o) => o.category_id === ind.category_id).length >= LIMITE_POR_CATEGORIA) {
    return { ok: false, erro: `A instituição já enviou ${LIMITE_POR_CATEGORIA} indicações nesta categoria, o máximo permitido (art. 8º, § 3º).` };
  }

  const agora = new Date().toISOString();
  const versao = ind.versao + 1;
  const { error } = await sb
    .from("indicacoes")
    .update({ status: "enviada", submetido_em: ind.submetido_em ?? agora, versao, atualizado_em: agora })
    .eq("id", id)
    .eq("status", "rascunho");
  if (error) return { ok: false, erro: "Não foi possível enviar. Tente novamente." };

  const ip = await ipDaRequisicao();
  await sb.from("indicacao_versoes").insert({
    indicacao_id: id,
    versao,
    dados: { ...ind, status: "enviada", versao, documentos: documentos.map(({ tipo, nome_arquivo, link, enviado_em }) => ({ tipo, nome_arquivo, link, enviado_em })) },
    autor_id: user.id,
    ip,
  });
  await sb.from("aceites").insert({
    entidade_id: dados.entidade.id,
    user_id: user.id,
    declaracao: `indicacao:${id}`,
    texto: DECLARACAO_INDICADOR,
    ip,
    user_agent: await userAgent(),
  });
  await auditar(user, versao > 1 ? "indicacao_reenviada" : "indicacao_enviada", { tipo: "indicacao", id }, { versao, categoria: ind.category_id });

  const { data: cat } = await sb.from("categories").select("name").eq("id", ind.category_id!).maybeSingle();
  const instituicao = dados.entidade.razao_social ?? "Instituição";
  for (const para of await emailsAdmins()) {
    await enviarEmail({
      para,
      assunto: `${versao > 1 ? "Indicação reenviada" : "Nova indicação"}: ${ind.indicado_nome} (${cat?.name ?? "categoria"})`,
      tipo: "alerta_indicacao",
      entidadeId: dados.entidade.id,
      titulo: versao > 1 ? "Indicação reenviada após edição" : "Nova indicação recebida",
      paragrafos: [`${instituicao} indicou ${ind.indicado_nome} na categoria ${cat?.name ?? ""}.`],
      botao: { texto: "Ver a indicação", url: `${URL_SITE}/admin/indicacoes/${id}` },
    });
  }
  if (dados.titular?.email) {
    await enviarEmail({
      para: dados.titular.email,
      assunto: "Recebemos a sua indicação",
      tipo: "confirmacao_indicacao",
      entidadeId: dados.entidade.id,
      titulo: "Indicação recebida",
      paragrafos: [
        `A indicação de ${ind.indicado_nome} na categoria ${cat?.name ?? ""} foi registrada em ${dia(agora)}, às ${hora(agora)}.`,
        "A Secretaria Executiva analisa completude e elegibilidade de 26 a 28/10 e comunica a decisão preliminar.",
      ],
      botao: { texto: "Acompanhar", url: `${URL_SITE}/entidade` },
    });
  }
  revalidatePath("/entidade", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

// Reabre uma indicação enviada para edição. A ordem de chegada continua a do primeiro envio (spec 3.3).
export async function reabrirIndicacao(id: string): Promise<Resultado> {
  const c = await minhaIndicacao(id, false);
  if (c.erro !== undefined) return { ok: false, erro: c.erro };
  if (c.indicacao.status !== "enviada") return { ok: false, erro: "Só indicações enviadas podem ser reabertas." };
  const { error } = await servico()
    .from("indicacoes")
    .update({ status: "rascunho", atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "enviada");
  if (error) return { ok: false, erro: "Não foi possível reabrir." };
  await auditar(c.user, "indicacao_reaberta", { tipo: "indicacao", id }, { versao: c.indicacao.versao });
  revalidatePath("/entidade", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
