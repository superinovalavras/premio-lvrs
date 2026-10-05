// Regras do cadastro de entidade indicadora — item 1 da especificação funcional
// (art. 2º-B da Lei 3.813/2011 e art. 8º do Regulamento). Usado no formulário e no servidor.
import { z } from "zod";
import { cpfValido, somenteDigitos } from "@/lib/voto";

export type IncisoId = "I_II" | "III" | "IV" | "V" | "VI" | "VII";

export type Documento = { id: string; nome: string; dica?: string };

export type Inciso = {
  id: IncisoId;
  rotulo: string;
  quem: string;
  documentos: Documento[];
  enderecoObrigatorio: boolean;
};

// Tabela do item 1.1. O ato de designação do representante é exigido de todos (item 1.4),
// por isso não se repete aqui.
export const INCISOS: Inciso[] = [
  {
    id: "I_II",
    rotulo: "I e II",
    quem: "Órgãos e entidades do Município",
    documentos: [],
    enderecoObrigatorio: false,
  },
  {
    id: "III",
    rotulo: "III",
    quem: "Aceleradoras que atuem com empresas de base tecnológica em Lavras",
    documentos: [
      { id: "cartao_cnpj", nome: "Cartão CNPJ" },
      { id: "contrato_estatuto", nome: "Contrato ou estatuto social" },
      { id: "comprovante_atuacao", nome: "Comprovante de atuação em Lavras" },
    ],
    enderecoObrigatorio: true,
  },
  {
    id: "IV",
    rotulo: "IV",
    quem: "Instituições de ensino superior estabelecidas no Município",
    documentos: [
      { id: "cartao_cnpj", nome: "Cartão CNPJ" },
      { id: "ato_credenciamento", nome: "Ato de credenciamento ou recredenciamento" },
      { id: "comprovante_endereco_unidade", nome: "Comprovante de endereço da unidade" },
    ],
    enderecoObrigatorio: true,
  },
  {
    id: "V",
    rotulo: "V",
    quem: "Associações, entidades de categoria, agentes de fomento e instituições de CT&I sediadas em Lavras",
    documentos: [
      { id: "cartao_cnpj", nome: "Cartão CNPJ" },
      { id: "estatuto", nome: "Estatuto social" },
      { id: "ata_diretoria", nome: "Ata da diretoria vigente" },
      { id: "comprovante_sede", nome: "Comprovante de sede em Lavras" },
    ],
    enderecoObrigatorio: true,
  },
  {
    id: "VI",
    rotulo: "VI",
    quem: "LAVRASTEC e incubadoras de base tecnológica instaladas no município",
    documentos: [
      { id: "ato_criacao_contrato", nome: "Ato de criação ou contrato" },
      { id: "comprovante_instalacao", nome: "Comprovante de instalação em Lavras" },
    ],
    enderecoObrigatorio: true,
  },
  {
    id: "VII",
    rotulo: "VII",
    quem: "Empresas de base tecnológica e empresas inovadoras estabelecidas em Lavras",
    documentos: [
      { id: "cartao_cnpj", nome: "Cartão CNPJ" },
      { id: "contrato_estatuto", nome: "Contrato ou estatuto social" },
      { id: "comprovante_endereco", nome: "Comprovante de endereço em Lavras" },
    ],
    enderecoObrigatorio: true,
  },
];

export const NOTA_INCISO_VI =
  "O inciso VI habilita o parque tecnológico e as incubadoras, e não as empresas nelas instaladas. A empresa incubada que quiser indicar deve pedir cadastro pelo inciso VII, em nome próprio.";

// Item 1.2 — pelo menos um, cada um com evidência (arquivo ou link). Nenhum é autodeclaratório.
export const CRITERIOS_VII: { id: string; nome: string; evidencia: string }[] = [
  {
    id: "base_tecnologica",
    nome: "Atividade econômica de base tecnológica",
    evidencia: "CNAE principal ou secundário compatível, no cartão CNPJ",
  },
  {
    id: "inovacao_5_anos",
    nome: "Produto, processo ou serviço novo ou significativamente melhorado, introduzido nos últimos 5 anos",
    evidencia: "Descrição objetiva, com página, catálogo, contrato ou material de divulgação que o comprove",
  },
  {
    id: "incubacao_aceleracao",
    nome: "Participação em programa de incubação, aceleração ou pré-aceleração",
    evidencia: "Declaração ou contrato com a incubadora, aceleradora ou programa",
  },
  {
    id: "propriedade_intelectual",
    nome: "Registro de propriedade intelectual",
    evidencia: "Patente, programa de computador, cultivar ou marca de produto inovador, com número de registro",
  },
  {
    id: "pdi_instituicao",
    nome: "Projeto de pesquisa, desenvolvimento ou inovação com instituição de ensino ou pesquisa",
    evidencia: "Convênio, contrato, termo de cooperação ou declaração da instituição",
  },
  {
    id: "fomento",
    nome: "Captação de recurso de fomento à inovação",
    evidencia: "Termo de outorga, contrato ou declaração de FAPEMIG, FINEP, BNDES, Sebrae ou equivalente",
  },
];

export const NATUREZAS = [
  "Administração pública municipal",
  "Administração pública estadual ou federal",
  "Associação",
  "Fundação",
  "Cooperativa",
  "Sociedade empresária limitada",
  "Sociedade anônima",
  "Sociedade limitada unipessoal",
  "Empresário individual / MEI",
  "Instituição de ensino",
  "Outra",
];

// Item 1.5 — o texto aceito é gravado junto com data, hora e IP.
export const DECLARACOES: { id: string; texto: string }[] = [
  { id: "regulamento", texto: "Declaro ciência e concordância com o Regulamento do Prêmio Lavras de Inovação 2026." },
  {
    id: "impedimento",
    texto:
      "Declaro ciência das regras de impedimento do art. 23 do Regulamento e me comprometo a declará-lo quando incidir.",
  },
  { id: "veracidade", texto: "Declaro a veracidade das informações e dos documentos apresentados." },
  {
    id: "privacidade",
    texto: "Li e aceito o Aviso de Privacidade, na forma do art. 38, parágrafo único, do Regulamento.",
  },
];

export type StatusEntidade = "rascunho" | "em_analise" | "pendente_ajuste" | "deferido" | "indeferido";

export const STATUS: Record<StatusEntidade, { rotulo: string; explica: string }> = {
  rascunho: { rotulo: "Rascunho", explica: "Preencha e envie para análise. Você pode salvar e voltar." },
  em_analise: {
    rotulo: "Em análise",
    explica: "A Secretaria Executiva está analisando. A análise leva até 1 dia útil.",
  },
  pendente_ajuste: {
    rotulo: "Pendente de ajuste",
    explica: "A Secretaria pediu uma correção. Ajuste e reenvie.",
  },
  deferido: { rotulo: "Deferido", explica: "Cadastro aprovado. Você já pode indicar no período de indicações." },
  indeferido: { rotulo: "Indeferido", explica: "O cadastro não foi aprovado. Veja o motivo abaixo." },
};

export const DOC_ATO_TITULAR: Documento = {
  id: "ato_designacao_titular",
  nome: "Ato de designação do representante",
  dica: "Ofício ou carta assinada pelo dirigente da entidade",
};
export const DOC_ATO_SUPLENTE: Documento = {
  id: "ato_designacao_suplente",
  nome: "Ato de designação do suplente",
  dica: "Ofício ou carta assinada pelo dirigente da entidade",
};

export function incisoPorId(id: string | null | undefined) {
  return INCISOS.find((i) => i.id === id) ?? null;
}

// Lista completa do que precisa estar anexado para enviar.
export function documentosExigidos(inciso: IncisoId | null, temSuplente: boolean): Documento[] {
  const i = incisoPorId(inciso);
  const atoTitular =
    inciso === "I_II"
      ? { ...DOC_ATO_TITULAR, dica: "Assinado pelo titular da pasta" }
      : DOC_ATO_TITULAR;
  return [...(i?.documentos ?? []), atoTitular, ...(temSuplente ? [DOC_ATO_SUPLENTE] : [])];
}

export function cnpjValido(valor: string) {
  const c = somenteDigitos(valor);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = base.split("").reduce((s, d, i) => s + Number(d) * pesos[i], 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(c.slice(0, 12)) === Number(c[12]) && dv(c.slice(0, 13)) === Number(c[13]);
}

export function mascaraCnpj(v: string) {
  const d = somenteDigitos(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function formatarCnpj(d: string | null | undefined) {
  return d ? mascaraCnpj(d) : "";
}

// ───── Esquemas por passo (validação no envio para análise) ─────

const opcional = z.string().trim().max(300).optional().or(z.literal(""));

export const dadosEntidadeSchema = z
  .object({
    inciso: z.enum(["I_II", "III", "IV", "V", "VI", "VII"], { message: "Escolha o enquadramento." }),
    razao_social: z.string().trim().min(3, "Informe a razão social ou denominação.").max(200),
    nome_fantasia: opcional,
    cnpj: z.string().refine(cnpjValido, "CNPJ inválido."),
    unidade_municipal: opcional,
    natureza_juridica: z.string().min(1, "Escolha a natureza jurídica."),
    endereco: z.string().trim().max(300).optional().or(z.literal("")),
    data_constituicao: z.string().optional().or(z.literal("")),
    site: opcional,
    assento_cocitieis: z.enum(["sim", "nao"], { message: "Informe se a entidade tem assento no COCITIEIS." }),
    conselheiro_nome: opcional,
  })
  .superRefine((v, ctx) => {
    const i = incisoPorId(v.inciso);
    if (i?.enderecoObrigatorio && !v.endereco?.trim()) {
      ctx.addIssue({ code: "custom", path: ["endereco"], message: "Informe o endereço completo em Lavras." });
    }
    if (v.assento_cocitieis === "sim" && !v.conselheiro_nome?.trim()) {
      ctx.addIssue({ code: "custom", path: ["conselheiro_nome"], message: "Informe o conselheiro da entidade." });
    }
  });

export const representanteSchema = z.object({
  nome: z.string().trim().min(5, "Informe o nome completo.").max(160),
  cpf: z.string().refine(cpfValido, "CPF inválido."),
  cargo: z.string().trim().min(2, "Informe o cargo ou função.").max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(160),
  telefone: z
    .string()
    .transform(somenteDigitos)
    .refine((v) => /^\d{10,11}$/.test(v), "Telefone inválido — use DDD + número."),
});

export type Pendencia = { passo: number; texto: string };

// ───── O que falta para enviar (mesma regra na tela e no servidor) ─────

export type EntidadeRow = {
  id: string;
  status: StatusEntidade;
  inciso: IncisoId | null;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  unidade_municipal: string | null;
  natureza_juridica: string | null;
  endereco: string | null;
  data_constituicao: string | null;
  site: string | null;
  assento_cocitieis: boolean | null;
  conselheiro_nome: string | null;
  criterios_vii: string[];
  pre_cadastrado: boolean;
  submetido_em: string | null;
  decidido_em: string | null;
  motivo: string | null;
  criado_em: string;
};

export type RepresentanteRow = {
  papel: "titular" | "suplente";
  nome: string | null;
  cpf: string | null;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
};

export type DocumentoRow = {
  id: string;
  tipo: string;
  nome_arquivo: string | null;
  tamanho: number | null;
  link: string | null;
  storage_path: string | null;
  enviado_em: string;
};

export const tipoCriterio = (id: string) => `criterio:${id}`;

export function calcularPendencias(
  e: EntidadeRow,
  reps: RepresentanteRow[],
  docs: DocumentoRow[],
): Pendencia[] {
  const p: Pendencia[] = [];
  const tem = (tipo: string) => docs.some((d) => d.tipo === tipo);

  if (!e.inciso) p.push({ passo: 1, texto: "Escolher o enquadramento no art. 2º-B" });
  if (e.inciso === "VII") {
    if (!e.criterios_vii.length) p.push({ passo: 1, texto: "Marcar pelo menos um critério do inciso VII" });
    for (const c of e.criterios_vii) {
      const crit = CRITERIOS_VII.find((x) => x.id === c);
      if (crit && !tem(tipoCriterio(c))) p.push({ passo: 4, texto: `Evidência do critério: ${crit.nome}` });
    }
  }

  const dados = dadosEntidadeSchema.safeParse({
    inciso: e.inciso ?? undefined,
    razao_social: e.razao_social ?? "",
    nome_fantasia: e.nome_fantasia ?? "",
    cnpj: e.cnpj ?? "",
    unidade_municipal: e.unidade_municipal ?? "",
    natureza_juridica: e.natureza_juridica ?? "",
    endereco: e.endereco ?? "",
    data_constituicao: e.data_constituicao ?? "",
    site: e.site ?? "",
    assento_cocitieis: e.assento_cocitieis === null ? undefined : e.assento_cocitieis ? "sim" : "nao",
    conselheiro_nome: e.conselheiro_nome ?? "",
  });
  if (!dados.success) {
    for (const i of dados.error.issues) if (i.path[0] !== "inciso") p.push({ passo: 2, texto: i.message });
  }

  const titular = reps.find((r) => r.papel === "titular");
  const rt = representanteSchema.safeParse({ ...titular });
  if (!rt.success) p.push({ passo: 3, texto: `Representante: ${rt.error.issues[0].message}` });
  const suplente = reps.find((r) => r.papel === "suplente");
  if (suplente) {
    const rs = representanteSchema.safeParse({ ...suplente });
    if (!rs.success) p.push({ passo: 3, texto: `Suplente: ${rs.error.issues[0].message}` });
  }

  for (const d of documentosExigidos(e.inciso, !!suplente)) {
    if (!tem(d.id)) p.push({ passo: 4, texto: d.nome });
  }
  return p;
}

// Tipos de documento que esta entidade pode anexar (o servidor recusa qualquer outro).
export function tiposPermitidos(e: Pick<EntidadeRow, "inciso" | "criterios_vii">, temSuplente: boolean) {
  return new Set([
    ...documentosExigidos(e.inciso, temSuplente).map((d) => d.id),
    ...(e.inciso === "VII" ? e.criterios_vii.map(tipoCriterio) : []),
  ]);
}

export const podeEditar = (s: StatusEntidade) => s === "rascunho" || s === "pendente_ajuste";

export function formatarData(iso: string | null | undefined, comHora = true) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    ...(comHora ? { timeStyle: "short" } : {}),
  }).format(new Date(iso));
}
