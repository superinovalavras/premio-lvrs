// Regras do formulário de indicação — itens 2 e 3 da especificação funcional (Anexo II e arts. 6º a 10
// e 37 do Regulamento). Usado na tela (pendências) e no servidor (validação e travas).
import { cpfValido, idadeEm, somenteDigitos } from "@/lib/voto";
import { cnpjValido } from "@/lib/entidades";

export const LIMITE_POR_CATEGORIA = 2; // art. 8º, § 3º
export const LIMITE_TOTAL = 6; // art. 8º, § 5º
export const MAX_EVIDENCIAS = 10;
export const MAX_COMPROBATORIOS = 5;
export const MAX_EVIDENCIAS_VINCULO = 5;
export const JOVEM = { slug: "jovem-inovador", min: 18, max: 29 }; // art. 6º, tabela (v3: 18 a 29)
export const IDADE_MINIMA_INDICADO = 18; // art. 7º: pessoas físicas maiores de 18 anos

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
  {
    id: "conselho",
    pergunta: "Existe vínculo entre o indicado e algum membro do COCITIEIS?",
    dica: "Descreva e identifique o conselheiro.",
  },
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
  entidade_id: string | null;
  avaliador_id: string | null; // indicação feita por conselheiro (art. 8º, caput)
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
  "id, entidade_id, avaliador_id, status, category_id, indicado_nome, indicado_tipo, indicado_documento, indicado_nascimento, integrantes, aspecto_distinto, vinculo_condicao, vinculo_descricao, titulo, resumo, problema, solucao, resultados, periodo_inicio, periodo_fim, beneficiarios, beneficiarios_qtd, contato_nome, contato_email, contato_telefone, conflito_indicador, conflito_indicador_desc, conflito_conselho, conflito_conselho_desc, conflito_relacao, conflito_relacao_desc, submetido_em, versao, criado_em, atualizado_em";

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
export function pessoasDaIndicacao(
  i: Pick<IndicacaoRow, "indicado_tipo" | "indicado_nome" | "indicado_documento" | "indicado_nascimento" | "integrantes">,
) {
  if (i.indicado_tipo === "pf") {
    return [{ nome: i.indicado_nome ?? "", cpf: i.indicado_documento ?? "", nascimento: i.indicado_nascimento ?? "" }];
  }
  if (i.indicado_tipo === "conjunto") return i.integrantes ?? [];
  return [];
}

// Art. 7º: só pessoas físicas maiores de 18 anos podem ser indicadas, aferido no fim das indicações.
export function menores(i: Parameters<typeof pessoasDaIndicacao>[0], quando = new Date()) {
  return pessoasDaIndicacao(i).filter(
    (p) => /^\d{4}-\d{2}-\d{2}$/.test(p.nascimento) && idadeEm(p.nascimento, quando) < IDADE_MINIMA_INDICADO,
  );
}

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
// O que impede o envio. Desde 26/10/2026 só categoria e nome do indicado são obrigatórios (os demais campos
// ficaram opcionais para facilitar a indicação). Continuam valendo as regras do regulamento sobre o que for
// preenchido: CPF/CNPJ válidos, 18 anos ou mais (art. 7º) e a faixa de 18 a 29 anos no Jovem Inovador.
export function pendenciasIndicacao(i: IndicacaoRow, _docs: IndDocRow[], ctx: Contexto): Pendencia[] {
  const p: Pendencia[] = [];
  if (!i.category_id) p.push({ passo: 1, texto: "Escolher a categoria" });
  if (vazio(i.indicado_nome)) p.push({ passo: 1, texto: "Nome do indicado" });

  if (i.indicado_documento) {
    const d = i.indicado_documento;
    if (i.indicado_tipo === "pf" && !cpfValido(d)) p.push({ passo: 1, texto: "CPF do indicado inválido" });
    if (i.indicado_tipo === "instituicao" && !cnpjValido(d)) p.push({ passo: 1, texto: "CNPJ do indicado inválido" });
    if (i.indicado_tipo === "conjunto" && !(cpfValido(d) || cnpjValido(d))) p.push({ passo: 1, texto: "CPF ou CNPJ do conjunto inválido" });
  }
  if (i.indicado_tipo === "conjunto") {
    (i.integrantes ?? []).forEach((g, n) => {
      if (g.cpf && !cpfValido(g.cpf)) p.push({ passo: 1, texto: `Integrante ${n + 1}: CPF inválido` });
    });
  }
  if (ctx.categoriaSlug === JOVEM.slug) {
    if (i.indicado_tipo === "instituicao") p.push({ passo: 1, texto: "Jovem Inovador reconhece pessoas, não instituições" });
    for (const pessoa of pessoasDaIndicacao(i)) {
      if (!dataOk(pessoa.nascimento)) continue;
      const idade = idadeEm(pessoa.nascimento, new Date(ctx.fechamento));
      if (idade < JOVEM.min || idade > JOVEM.max) {
        p.push({
          passo: 1,
          texto: `${pessoa.nome || "Indicado"}: precisa ter de ${JOVEM.min} a ${JOVEM.max} anos no fim das indicações (tem ${idade})`,
        });
      }
    }
  }
  // Art. 7º: indicado pessoa física precisa ter 18 anos ou mais.
  for (const m of menores(i, new Date(ctx.fechamento))) {
    p.push({ passo: 1, texto: `${m.nome || "Indicado"}: só podem ser indicadas pessoas maiores de 18 anos (art. 7º)` });
  }
  if (dataOk(i.periodo_inicio) && dataOk(i.periodo_fim) && i.periodo_fim! < i.periodo_inicio!) {
    p.push({ passo: 3, texto: "O fim do período vem antes do início" });
  }
  return p;
}

// Tipos de arquivo/link aceitos nesta indicação (o servidor recusa qualquer outro).
export function tipoDocumentoValido(_i: IndicacaoRow, tipo: string) {
  return tipo === "evidencia" || tipo === "vinculo" || tipo === "comprobatorio";
}
export const maximoPorTipo = (tipo: string) =>
  tipo === "evidencia" ? MAX_EVIDENCIAS : tipo === "comprobatorio" ? MAX_COMPROBATORIOS : tipo === "vinculo" ? MAX_EVIDENCIAS_VINCULO : 1;
export const aceitaLink = (tipo: string) => tipo === "evidencia" || tipo === "vinculo";

export const STATUS_INDICACAO: Record<IndicacaoRow["status"], string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  desconsiderada: "Desconsiderada",
};
