"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { auditar } from "./auditoria";
import { enviarEmail, URL_SITE } from "./email";
import { ehAdmin, exigirUsuario, ipDaRequisicao, servico, userAgent } from "./sessao";
import { carregarEntidadeDoUsuario, emailsAdmins } from "./entidades-dados";
import {
  CRITERIOS_VII,
  DECLARACOES,
  INCISOS,
  NATUREZAS,
  calcularPendencias,
  cnpjValido,
  incisoPorId,
  podeEditar,
  tiposPermitidos,
} from "@/lib/entidades";
import { cpfValido, somenteDigitos } from "@/lib/voto";

export type Resultado = { ok: true; msg?: string } | { ok: false; erro: string; pendencias?: string[] };

const LIMITE = 10 * 1024 * 1024;
const MIMES = ["application/pdf", "image/png", "image/jpeg"];

const txt = (fd: FormData, k: string, max = 300) => String(fd.get(k) ?? "").trim().slice(0, max) || null;

async function minhaEntidadeEditavel() {
  const user = await exigirUsuario();
  const dados = await carregarEntidadeDoUsuario(user.id);
  if (!dados) throw new Error("Cadastro não encontrado.");
  if (!podeEditar(dados.entidade.status)) {
    return { user, dados, bloqueado: "O cadastro está em análise ou já foi decidido e não pode ser alterado." };
  }
  return { user, dados, bloqueado: null as string | null };
}

// ───── Passos do formulário ─────

export async function salvarEnquadramento(fd: FormData): Promise<Resultado> {
  const { user, dados, bloqueado } = await minhaEntidadeEditavel();
  if (bloqueado) return { ok: false, erro: bloqueado };

  const inciso = String(fd.get("inciso") ?? "");
  if (!INCISOS.some((i) => i.id === inciso)) return { ok: false, erro: "Escolha o enquadramento." };
  const criterios =
    inciso === "VII"
      ? fd.getAll("criterios").map(String).filter((c) => CRITERIOS_VII.some((x) => x.id === c))
      : [];

  const { error } = await servico()
    .from("entidades")
    .update({ inciso, criterios_vii: criterios, atualizado_em: new Date().toISOString() })
    .eq("id", dados.entidade.id);
  if (error) return { ok: false, erro: "Não foi possível salvar. Tente novamente." };
  await auditar(user, "entidade_enquadramento", { tipo: "entidade", id: dados.entidade.id }, { inciso, criterios });
  revalidatePath("/entidade", "layout");
  return { ok: true };
}

export async function salvarDados(fd: FormData): Promise<Resultado> {
  const { user, dados, bloqueado } = await minhaEntidadeEditavel();
  if (bloqueado) return { ok: false, erro: bloqueado };

  const cnpj = somenteDigitos(String(fd.get("cnpj") ?? ""));
  if (cnpj && !cnpjValido(cnpj)) return { ok: false, erro: "CNPJ inválido. Confira os números." };
  const natureza = txt(fd, "natureza_juridica");
  if (natureza && !NATUREZAS.includes(natureza)) return { ok: false, erro: "Natureza jurídica inválida." };
  const assento = String(fd.get("assento_cocitieis") ?? "");
  const data = txt(fd, "data_constituicao", 10);

  const { error } = await servico()
    .from("entidades")
    .update({
      razao_social: txt(fd, "razao_social", 200),
      nome_fantasia: txt(fd, "nome_fantasia", 200),
      cnpj: cnpj || null,
      unidade_municipal: txt(fd, "unidade_municipal", 200),
      natureza_juridica: natureza,
      endereco: txt(fd, "endereco"),
      data_constituicao: data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null,
      site: txt(fd, "site"),
      assento_cocitieis: assento === "sim" ? true : assento === "nao" ? false : null,
      conselheiro_nome: assento === "sim" ? txt(fd, "conselheiro_nome", 160) : null,
      atualizado_em: new Date().toISOString(),
    })
    .eq("id", dados.entidade.id);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        erro: "Este CNPJ já está cadastrado. Órgãos municipais que usam o CNPJ da Prefeitura devem informar a unidade.",
      };
    }
    return { ok: false, erro: "Não foi possível salvar. Tente novamente." };
  }
  await auditar(user, "entidade_dados", { tipo: "entidade", id: dados.entidade.id });
  revalidatePath("/entidade", "layout");
  return { ok: true };
}

function lerRepresentante(fd: FormData, prefixo: string) {
  return {
    nome: txt(fd, `${prefixo}_nome`, 160),
    cpf: somenteDigitos(String(fd.get(`${prefixo}_cpf`) ?? "")) || null,
    cargo: txt(fd, `${prefixo}_cargo`, 120),
    email: txt(fd, `${prefixo}_email`, 160)?.toLowerCase() ?? null,
    telefone: somenteDigitos(String(fd.get(`${prefixo}_telefone`) ?? "")) || null,
  };
}

export async function salvarRepresentantes(fd: FormData): Promise<Resultado> {
  const { user, dados, bloqueado } = await minhaEntidadeEditavel();
  if (bloqueado) return { ok: false, erro: bloqueado };

  const titular = lerRepresentante(fd, "titular");
  if (titular.cpf && !cpfValido(titular.cpf)) return { ok: false, erro: "CPF do representante inválido." };
  // O e-mail do titular é o login: não muda por aqui.
  titular.email = dados.titular?.email ?? titular.email;

  const sb = servico();
  const agora = new Date().toISOString();
  const { error } = await sb
    .from("representantes")
    .upsert({ entidade_id: dados.entidade.id, papel: "titular", ...titular, atualizado_em: agora }, {
      onConflict: "entidade_id,papel",
    });
  if (error) return { ok: false, erro: "Não foi possível salvar. Tente novamente." };

  if (fd.get("tem_suplente") === "on") {
    const sup = lerRepresentante(fd, "suplente");
    if (sup.cpf && !cpfValido(sup.cpf)) return { ok: false, erro: "CPF do suplente inválido." };
    await sb
      .from("representantes")
      .upsert({ entidade_id: dados.entidade.id, papel: "suplente", ...sup, atualizado_em: agora }, {
        onConflict: "entidade_id,papel",
      });
  } else {
    await sb.from("representantes").delete().eq("entidade_id", dados.entidade.id).eq("papel", "suplente");
    const atos = dados.documentos.filter((d) => d.tipo === "ato_designacao_suplente");
    if (atos.length) await removerArquivos(atos.map((d) => d.id));
  }
  await auditar(user, "entidade_representantes", { tipo: "entidade", id: dados.entidade.id });
  revalidatePath("/entidade", "layout");
  return { ok: true };
}

// ───── Documentos ─────
// O arquivo vai direto do navegador para o Storage com uma URL assinada (Server Actions têm limite
// de tamanho de corpo). O servidor decide o caminho e confere o tipo antes de liberar.

export async function prepararUpload(tipo: string, nome: string, tamanho: number, mime: string) {
  const { dados, bloqueado } = await minhaEntidadeEditavel();
  if (bloqueado) return { ok: false as const, erro: bloqueado };
  if (!tiposPermitidos(dados.entidade, !!dados.suplente).has(tipo)) {
    return { ok: false as const, erro: "Documento não previsto para o seu enquadramento." };
  }
  if (tamanho > LIMITE) return { ok: false as const, erro: "O arquivo passa de 10 MB." };
  if (!MIMES.includes(mime)) return { ok: false as const, erro: "Envie PDF, PNG ou JPG." };

  const seguro = nome.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
  const caminho = `${dados.entidade.id}/${tipo.replace(":", "-")}/${randomUUID()}-${seguro}`;
  const { data, error } = await servico().storage.from("entidades").createSignedUploadUrl(caminho);
  if (error || !data) return { ok: false as const, erro: "Não foi possível preparar o envio." };
  return { ok: true as const, caminho, token: data.token };
}

export async function confirmarUpload(tipo: string, caminho: string, nome: string, tamanho: number): Promise<Resultado> {
  const { user, dados, bloqueado } = await minhaEntidadeEditavel();
  if (bloqueado) return { ok: false, erro: bloqueado };
  if (!caminho.startsWith(`${dados.entidade.id}/`)) return { ok: false, erro: "Envio inválido." };
  if (!tiposPermitidos(dados.entidade, !!dados.suplente).has(tipo)) return { ok: false, erro: "Documento inválido." };

  const anteriores = dados.documentos.filter((d) => d.tipo === tipo).map((d) => d.id);
  const { error } = await servico()
    .from("entidade_documentos")
    .insert({ entidade_id: dados.entidade.id, tipo, storage_path: caminho, nome_arquivo: nome.slice(0, 200), tamanho });
  if (error) return { ok: false, erro: "Não foi possível registrar o arquivo." };
  if (anteriores.length) await removerArquivos(anteriores);
  await auditar(user, "documento_enviado", { tipo: "entidade", id: dados.entidade.id }, { tipo, nome, tamanho });
  revalidatePath("/entidade", "layout");
  return { ok: true };
}

export async function salvarLink(tipo: string, link: string): Promise<Resultado> {
  const { user, dados, bloqueado } = await minhaEntidadeEditavel();
  if (bloqueado) return { ok: false, erro: bloqueado };
  if (!tipo.startsWith("criterio:") || !tiposPermitidos(dados.entidade, !!dados.suplente).has(tipo)) {
    return { ok: false, erro: "Link não previsto para este item." };
  }
  let url: URL;
  try {
    url = new URL(link.trim());
    if (!/^https?:$/.test(url.protocol)) throw new Error();
  } catch {
    return { ok: false, erro: "Link inválido. Use um endereço completo, começando com https://" };
  }
  const anteriores = dados.documentos.filter((d) => d.tipo === tipo).map((d) => d.id);
  const { error } = await servico()
    .from("entidade_documentos")
    .insert({ entidade_id: dados.entidade.id, tipo, link: url.toString() });
  if (error) return { ok: false, erro: "Não foi possível salvar o link." };
  if (anteriores.length) await removerArquivos(anteriores);
  await auditar(user, "link_evidencia", { tipo: "entidade", id: dados.entidade.id }, { tipo, link: url.toString() });
  revalidatePath("/entidade", "layout");
  return { ok: true };
}

export async function removerDocumento(id: string): Promise<Resultado> {
  const { user, dados, bloqueado } = await minhaEntidadeEditavel();
  if (bloqueado) return { ok: false, erro: bloqueado };
  if (!dados.documentos.some((d) => d.id === id)) return { ok: false, erro: "Documento não encontrado." };
  await removerArquivos([id]);
  await auditar(user, "documento_removido", { tipo: "entidade", id: dados.entidade.id }, { documento: id });
  revalidatePath("/entidade", "layout");
  return { ok: true };
}

async function removerArquivos(ids: string[]) {
  const sb = servico();
  const { data } = await sb.from("entidade_documentos").select("storage_path").in("id", ids);
  const caminhos = (data ?? []).map((d) => d.storage_path).filter(Boolean) as string[];
  if (caminhos.length) await sb.storage.from("entidades").remove(caminhos);
  await sb.from("entidade_documentos").delete().in("id", ids);
}

// Link temporário (5 min) para abrir um documento: dono da entidade ou Secretaria.
export async function abrirDocumento(id: string) {
  const user = await exigirUsuario();
  const sb = servico();
  const { data: doc } = await sb
    .from("entidade_documentos")
    .select("storage_path, link, entidade_id, entidades(user_id)")
    .eq("id", id)
    .maybeSingle();
  if (!doc) return { ok: false as const, erro: "Documento não encontrado." };
  const dono = (doc.entidades as unknown as { user_id: string } | null)?.user_id === user.id;
  if (!dono && !(await ehAdmin(user.id))) return { ok: false as const, erro: "Sem permissão." };
  if (doc.link) return { ok: true as const, url: doc.link };
  const { data } = await sb.storage.from("entidades").createSignedUrl(doc.storage_path!, 300);
  return data ? { ok: true as const, url: data.signedUrl } : { ok: false as const, erro: "Arquivo indisponível." };
}

// ───── Envio para análise ─────

export async function enviarParaAnalise(fd: FormData): Promise<Resultado> {
  const { user, dados, bloqueado } = await minhaEntidadeEditavel();
  if (bloqueado) return { ok: false, erro: bloqueado };

  const faltam = DECLARACOES.filter((d) => fd.get(`decl_${d.id}`) !== "on");
  if (faltam.length) return { ok: false, erro: "Marque as quatro declarações para enviar." };

  const pend = calcularPendencias(dados.entidade, dados.representantes, dados.documentos);
  if (pend.length) {
    return { ok: false, erro: "Ainda faltam itens para enviar.", pendencias: pend.map((p) => p.texto) };
  }

  const sb = servico();
  const ip = await ipDaRequisicao();
  const ua = await userAgent();
  await sb.from("aceites").insert(
    DECLARACOES.map((d) => ({
      entidade_id: dados.entidade.id,
      user_id: user.id,
      declaracao: d.id,
      texto: d.texto,
      ip,
      user_agent: ua,
    })),
  );

  const reenvio = dados.entidade.status === "pendente_ajuste";
  const agora = new Date().toISOString();
  const { error } = await sb
    .from("entidades")
    .update({
      status: "em_analise",
      submetido_em: dados.entidade.submetido_em ?? agora,
      atualizado_em: agora,
    })
    .eq("id", dados.entidade.id);
  if (error) return { ok: false, erro: "Não foi possível enviar. Tente novamente." };
  await auditar(user, reenvio ? "entidade_reenviada" : "entidade_submetida", { tipo: "entidade", id: dados.entidade.id });

  const nome = dados.entidade.razao_social ?? "Entidade";
  const inciso = incisoPorId(dados.entidade.inciso)?.rotulo;
  for (const para of await emailsAdmins()) {
    await enviarEmail({
      para,
      assunto: `${reenvio ? "Cadastro reenviado" : "Novo cadastro"} para análise: ${nome}`,
      tipo: "alerta_secretaria",
      entidadeId: dados.entidade.id,
      titulo: `${reenvio ? "Cadastro reenviado após ajuste" : "Novo pedido de cadastro"}`,
      paragrafos: [`${nome} (inciso ${inciso}) enviou o cadastro para análise.`, "Compromisso público: análise em até 1 dia útil."],
      botao: { texto: "Analisar cadastro", url: `${URL_SITE}/admin/entidades/${dados.entidade.id}` },
    });
  }
  if (dados.titular?.email) {
    await enviarEmail({
      para: dados.titular.email,
      assunto: "Recebemos o seu pedido de cadastro",
      tipo: "confirmacao_envio",
      entidadeId: dados.entidade.id,
      titulo: "Pedido de cadastro recebido",
      paragrafos: [
        `O cadastro de ${nome} foi enviado para análise da Secretaria Executiva do Prêmio.`,
        "A análise leva até 1 dia útil. Você recebe um e-mail com a decisão.",
      ],
      botao: { texto: "Acompanhar", url: `${URL_SITE}/entidade` },
    });
  }
  revalidatePath("/entidade", "layout");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
