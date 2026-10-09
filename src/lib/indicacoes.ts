// Regras do formulário de indicação — itens 2 e 3 da especificação funcional (Anexo II e arts. 6º a 10
// e 37 do Regulamento). Usado na tela (pendências) e no servidor (validação e travas).
import { cpfValido, idadeEm, somenteDigitos } from "@/lib/voto";
import { cnpjValido } from "@/lib/entidades";

export const LIMITE_POR_CATEGORIA = 2; // art. 8º, § 3º
export const LIMITE_TOTAL = 6; // art. 8º, § 5º
export const MAX_EVIDENCIAS = 10;
export const MAX_COMPROBATORIOS = 5;
export const MAX_EVIDENCIAS_VINCULO = 5;
export const JOVEM = { slug: "jovem-inovador", min: 15, max: 29 }; // art. 6º, tabela

export const PASSOS_INDICACAO = ["Indicado", "Vínculo com Lavras", "A realização", "Evidências", "Contato e conflitos", "Revisão e envio"];

export const TIPOS_INDICADO = [
  { id: "pf", rotulo: "Pessoa física" },
  { id: "conjunto", rotulo: "Conjunto de pessoas" },
  { id: "instituicao", rotulo: "Instituição" },
] as const;
export type TipoIndicado = (typeof TIPOS_INDICADO)[number]["id"];

export const CONDICOES_VINCULO = [
  { id: "I", texto: "Residência, sede, unidade ou atuação permanente em Lavras" },
  { id: "II", texto: "Realização implementada em Lavras, com beneficiários ou resultados locais comprovados" },
  { id: "III", texto: "Contribuição formal e documentada ao Ecossistema Municipal de Inovação no período de referência" },
] as const;

export const CONFLITOS = [
  { id: "indicador", pergunta: "Existe vínculo entre o indicador e o indicado?", dica: "Descreva a natureza e o grau." },
  { id: "conselho", pergunta: "Existe vínculo entre o indicado e algum membro do COCITIEIS?", dica: "Descreva e identifique o conselheiro." },
  {
    id: "relacao",
    pergunta: "Existe relação societária, profissional, hierárquica ou econômica entre o indicado e o indicador?",
    dica: "Descreva.",
  },
] as const;

// Anexo II — exibido na íntegra; o aceite fica registrado com data, hora, IP e representante.
export const DECLARACAO_INDICADOR =
  "Declaro que as informações apresentadas são verdadeiras segundo meu conhecimento, que a indicação foi feita de boa-fé e que informei os vínculos capazes de gerar conflito de interesse. Estou ciente de que o COCITIEIS poderá solicitar comprovações, reenquadrar a categoria ou considerar a indicação inelegível.";

export const LIMITES_TEXTO = { titulo: 120, resumo: 1000, problema: 1500, solucao: 2500, resultados: 2500, vinculo: 500 };

export type Integrante = { nome: string; cpf: string; nascimento: string };

export type IndicacaoRow = {
  id: string;
  entidade_id: string;
  status: "rascunho" | "enviada" | "desconsiderada";
  category_id: string | null;
  indicado_nome: string | null;
  indicado_tipo: TipoIndicado | null;
  indicado_documento: string | null;
  indicado_nascimento: string | null;
  integrantes: Integrante[];
  aspecto_distinto: string | null;
  vinculo_condicao: "I" | "II" | "III" | null;
  vinculo_descricao: string | null;
  titulo: string | null;
  resumo: string | null;
  problema: string | null;
  solucao: string | null;
  resultados: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  beneficiarios: string | null;
  beneficiarios_qtd: number | null;
  contato_nome: string | null;
  contato_email: string | null;
  contato_telefone: string | null;
  conflito_indicador: boolean | null;
  conflito_indicador_desc: string | null;
  conflito_conselho: boolean | null;
  conflito_conselho_desc: string | null;
  conflito_relacao: boolean | null;
  conflito_relacao_desc: string | null;
  submetido_em: string | null;
  versao: number;
  criado_em: string;
  atualizado_em: string;
};

export const CAMPOS_INDICACAO =
  "id, entidade_id, status, category_id, indicado_nome, indicado_tipo, indicado_documento, indicado_nascimento, integrantes, aspecto_distinto, vinculo_condicao, vinculo_descricao, titulo, resumo, problema, solucao, resultados, periodo_inicio, periodo_fim, beneficiarios, beneficiarios_qtd, contato_nome, contato_email, contato_telefone, conflito_indicador, conflito_indicador_desc, conflito_conselho, conflito_conselho_desc, conflito_relacao, conflito_relacao_desc, submetido_em, versao, criado_em, atualizado_em";

export type IndDocRow = {
  id: string;
  tipo: string;
  nome_arquivo: string | null;
  tamanho: number | null;
  link: string | null;
  storage_path: string | null;
  enviado_em: string;
};

// Pessoas físicas da indicação (o indicado PF ou cada integrante do conjunto).
export function pessoasDaIndicacao(i: Pick<IndicacaoRow, "indicado_tipo" | "indicado_nome" | "indicado_documento" | "indicado_nascimento" | "integrantes">) {
  if (i.indicado_tipo === "pf") {
    return [{ nome: i.indicado_nome ?? "", cpf: i.indicado_documento ?? "", nascimento: i.indicado_nascimento ?? "" }];
  }
  if (i.indicado_tipo === "conjunto") return i.integrantes ?? [];
  return [];
}

// Art. 37: menor de 18 anos na data da indicação exige o Anexo IV assinado pelo responsável.
export function menores(i: Parameters<typeof pessoasDaIndicacao>[0], hoje = new Date()) {
  return pessoasDaIndicacao(i).filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.nascimento) && idadeEm(p.nascimento, hoje) < 18);
}
export const tipoAnexoIV = (cpf: string) => `anexo_iv:${somenteDigitos(cpf)}`;

export type Pendencia = { passo: number; texto: string };
export type Contexto = {
  categoriaSlug: string | null;
  fechamento: string; // ISO do fim das indicações: a idade do Jovem Inovador é aferida nesta data
  mesmoIndicadoEmOutra: boolean; // a instituição já indicou o mesmo CPF/CNPJ em outra categoria
};

const vazio = (s: string | null | undefined) => !s || !s.trim();
const dataOk = (s: string | null | undefined) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

// O que falta para enviar (mesma regra na tela e no servidor). As travas que dependem do banco
// (prazo, limites, autoindicação, habilitação) ficam no servidor.
export function pendenciasIndicacao(i: IndicacaoRow, docs: IndDocRow[], ctx: Contexto, hoje = new Date()): Pendencia[] {
  const p: Pendencia[] = [];
  const conta = (tipo: string) => docs.filter((d) => d.tipo === tipo).length;

  // 1. Indicado
  if (!i.category_id) p.push({ passo: 1, texto: "Escolher a categoria" });
  if (vazio(i.indicado_nome)) p.push({ passo: 1, texto: "Nome do indicado" });
  if (!i.indicado_tipo) p.push({ passo: 1, texto: "Tipo do indicado" });
  if (i.indicado_tipo === "pf") {
    if (!cpfValido(i.indicado_documento ?? "")) p.push({ passo: 1, texto: "CPF do indicado" });
    if (!dataOk(i.indicado_nascimento)) p.push({ passo: 1, texto: "Data de nascimento do indicado" });
  }
  if (i.indicado_tipo === "instituicao" && !cnpjValido(i.indicado_documento ?? "")) p.push({ passo: 1, texto: "CNPJ do indicado" });
  if (i.indicado_tipo === "conjunto") {
    const doc = i.indicado_documento ?? "";
    if (doc && !(cpfValido(doc) || cnpjValido(doc))) p.push({ passo: 1, texto: "CPF ou CNPJ do conjunto inválido" });
    if ((i.integrantes ?? []).length < 2) p.push({ passo: 1, texto: "Pelo menos dois integrantes do conjunto" });
    (i.integrantes ?? []).forEach((g, n) => {
      if (vazio(g.nome) || !cpfValido(g.cpf) || !dataOk(g.nascimento)) {
        p.push({ passo: 1, texto: `Integrante ${n + 1}: nome, CPF e data de nascimento` });
      }
    });
  }
  if (ctx.categoriaSlug === JOVEM.slug) {
    if (i.indicado_tipo === "instituicao") p.push({ passo: 1, texto: "Jovem Inovador reconhece pessoas, não instituições" });
    for (const pessoa of pessoasDaIndicacao(i)) {
      if (!dataOk(pessoa.nascimento)) continue;
      const idade = idadeEm(pessoa.nascimento, new Date(ctx.fechamento));
      if (idade < JOVEM.min || idade > JOVEM.max) {
        p.push({ passo: 1, texto: `${pessoa.nome || "Indicado"}: precisa ter de 15 a 29 anos no fim das indicações (tem ${idade})` });
      }
    }
  }
  if (ctx.mesmoIndicadoEmOutra && (i.aspecto_distinto ?? "").trim().length < 20) {
    p.push({ passo: 1, texto: "Aspecto distinto desta indicação (o mesmo indicado está em outra categoria)" });
  }

  // 2. Vínculo
  if (!i.vinculo_condicao) p.push({ passo: 2, texto: "Condição de vínculo com Lavras" });
  if ((i.vinculo_descricao ?? "").trim().length < 10) p.push({ passo: 2, texto: "Descrição do vínculo" });
  if (!conta("vinculo")) p.push({ passo: 4, texto: "Evidência do vínculo (arquivo ou link)" });

  // 3. Realização
  if (vazio(i.titulo)) p.push({ passo: 3, texto: "Título da realização" });
  if (vazio(i.resumo)) p.push({ passo: 3, texto: "Resumo executivo" });
  if (vazio(i.problema)) p.push({ passo: 3, texto: "Problema ou oportunidade" });
  if (vazio(i.solucao)) p.push({ passo: 3, texto: "Solução ou contribuição" });
  if (vazio(i.resultados)) p.push({ passo: 3, texto: "Resultados e indicadores" });
  if (!dataOk(i.periodo_inicio) || !dataOk(i.periodo_fim)) p.push({ passo: 3, texto: "Período de realização (início e fim)" });
  else if (i.periodo_fim! < i.periodo_inicio!) p.push({ passo: 3, texto: "O fim do período vem antes do início" });
  if (vazio(i.beneficiarios) || i.beneficiarios_qtd === null) p.push({ passo: 3, texto: "Beneficiários: quem e quantos" });

  // 4. Evidências e Anexo IV
  if (!conta("evidencia")) p.push({ passo: 4, texto: "Pelo menos uma evidência (link ou arquivo)" });
  for (const m of menores(i, hoje)) {
    if (!conta(tipoAnexoIV(m.cpf))) p.push({ passo: 4, texto: `Anexo IV assinado pelo responsável de ${m.nome || "menor de 18 anos"}` });
  }

  // 5. Contato e conflitos
  if (vazio(i.contato_nome) || vazio(i.contato_email) || vazio(i.contato_telefone)) {
    p.push({ passo: 5, texto: "Contato do indicado: nome, e-mail e telefone" });
  }
  for (const c of CONFLITOS) {
    const resp = i[`conflito_${c.id}` as const];
    if (resp === null) p.push({ passo: 5, texto: `Responder: ${c.pergunta}` });
    else if (resp && vazio(i[`conflito_${c.id}_desc` as const])) p.push({ passo: 5, texto: `Descrever: ${c.pergunta}` });
  }
  return p;
}

// Tipos de arquivo/link aceitos nesta indicação (o servidor recusa qualquer outro).
export function tipoDocumentoValido(i: IndicacaoRow, tipo: string, hoje = new Date()) {
  if (tipo === "evidencia" || tipo === "vinculo" || tipo === "comprobatorio") return true;
  return menores(i, hoje).some((m) => tipoAnexoIV(m.cpf) === tipo);
}
export const maximoPorTipo = (tipo: string) =>
  tipo === "evidencia" ? MAX_EVIDENCIAS : tipo === "comprobatorio" ? MAX_COMPROBATORIOS : tipo === "vinculo" ? MAX_EVIDENCIAS_VINCULO : 1;
export const aceitaLink = (tipo: string) => tipo === "evidencia" || tipo === "vinculo";

export const STATUS_INDICACAO: Record<IndicacaoRow["status"], string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  desconsiderada: "Desconsiderada",
};
