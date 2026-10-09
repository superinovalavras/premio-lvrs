// Regras da avaliação pelo COCITIEIS — Regulamento, arts. 11, 13, 15 a 23 e Anexos I e III.
// Usado nas telas (feedback imediato) e no servidor (validação e apuração).

export type Criterio = { id: string; nome: string; peso: number; guia: string };
export type Matriz = { id: "geral" | "startup" | "agro" | "lab"; nome: string; criterios: Criterio[]; desempate: string[] };

const GERAL: Criterio[] = [
  {
    id: "inovador",
    nome: "Caráter inovador",
    peso: 20,
    guia: "Há novidade ou aperfeiçoamento relevante em relação ao contexto local ou ao setor? Comparação com práticas anteriores, diferencial, originalidade.",
  },
  {
    id: "impacto",
    nome: "Impacto e resultados",
    peso: 25,
    guia: "Existem resultados, benefícios, alcance ou transformação demonstráveis? Indicadores, usuários, economia, receita, alcance, benefícios públicos.",
  },
  {
    id: "relevancia",
    nome: "Relevância para Lavras",
    peso: 15,
    guia: "A iniciativa contribui de modo claro para o território e seu ecossistema? Beneficiários locais, empregos, serviços, fortalecimento do ecossistema.",
  },
  {
    id: "execucao",
    nome: "Qualidade da execução",
    peso: 15,
    guia: "A solução foi implementada com coerência, método e capacidade de entrega? Método, governança, protótipo, adoção, validação.",
  },
  {
    id: "continuidade",
    nome: "Continuidade e escala",
    peso: 15,
    guia: "Há potencial de permanência, replicação, crescimento ou disseminação? Sustentação, replicação, próximos passos.",
  },
  {
    id: "responsabilidade",
    nome: "Responsabilidade e conexão",
    peso: 10,
    guia: "A iniciativa considera colaboração, inclusão, ética e efeitos sociais e ambientais?",
  },
];

// Art. 17-A: mesmos critérios, pesos do estágio inicial.
const PESOS_STARTUP: Record<string, number> = {
  inovador: 20,
  impacto: 15,
  relevancia: 15,
  execucao: 10,
  continuidade: 30,
  responsabilidade: 10,
};

export const MATRIZES: Record<Matriz["id"], Matriz> = {
  geral: { id: "geral", nome: "Matriz geral (art. 16)", criterios: GERAL, desempate: ["impacto", "inovador", "relevancia"] },
  startup: {
    id: "startup",
    nome: "Startup Revelação (art. 17-A)",
    criterios: GERAL.map((c) => ({ ...c, peso: PESOS_STARTUP[c.id] })),
    desempate: ["impacto", "inovador", "relevancia"],
  },
  agro: {
    id: "agro",
    nome: "Agro e/ou Food e/ou Tech do Ano (Anexo I)",
    criterios: [
      { id: "inovacao_aplicada", nome: "Inovação aplicada", peso: 20, guia: "Novidade ou aperfeiçoamento tecnológico, científico, de processo ou modelo." },
      {
        id: "impacto_cadeia",
        nome: "Impacto na cadeia do alimento",
        peso: 25,
        guia: "Produção, processamento, qualidade, saúde, nutrição, segurança, distribuição ou consumo.",
      },
      { id: "evidencias", nome: "Evidências e validação", peso: 20, guia: "Resultados, testes, adoção, indicadores, usuários ou mercado." },
      {
        id: "escala",
        nome: "Escala e sustentabilidade",
        peso: 20,
        guia: "Viabilidade, crescimento, circularidade, eficiência e responsabilidade ambiental.",
      },
      { id: "contribuicao", nome: "Contribuição a Lavras", peso: 15, guia: "Vínculo territorial e fortalecimento da Capital do Futuro do Alimento." },
    ],
    // Art. 21, II: maior Nota Técnica, depois Impacto na Cadeia do Alimento e Inovação Aplicada.
    desempate: ["__tecnica", "impacto_cadeia", "inovacao_aplicada"],
  },
  lab: {
    id: "lab",
    nome: "Prêmio Lavras Lab (art. 18)",
    criterios: [
      { id: "relevancia_problema", nome: "Relevância do problema", peso: 25, guia: "Importância do problema real e clareza do diagnóstico." },
      { id: "viabilidade", nome: "Viabilidade de implementação", peso: 20, guia: "Condições técnicas, administrativas, financeiras e operacionais." },
      { id: "usuario", nome: "Orientação ao usuário", peso: 15, guia: "Compreensão das necessidades de cidadãos ou servidores." },
      { id: "inovador", nome: "Caráter inovador", peso: 15, guia: "Novidade, melhoria ou recombinação adequada ao contexto municipal." },
      { id: "impacto_mensuracao", nome: "Impacto e mensuração", peso: 15, guia: "Benefícios esperados e indicadores para acompanhar resultados." },
      { id: "implementacao", nome: "Implementação e equipe", peso: 10, guia: "Plano de ação, responsabilidades, riscos e colaboração do grupo." },
    ],
    desempate: ["relevancia_problema", "viabilidade", "impacto_mensuracao"],
  },
};

// Honorárias não têm matriz: votação nominal (art. 13).
export function matrizDaCategoria(slug: string, tipo: string): Matriz | null {
  if (tipo === "honorary") return null;
  if (slug === "startup-revelacao") return MATRIZES.startup;
  if (slug === "agro-food-tech-do-ano") return MATRIZES.agro;
  if (slug === "premio-lavras-lab") return MATRIZES.lab;
  return MATRIZES.geral;
}

// Anexo I — escala comum de pontuação.
export const ESCALA = [
  { nota: "0", texto: "Ausência de evidência ou total inadequação ao critério." },
  { nota: "2,5", texto: "Atendimento fraco, com evidência insuficiente e lacunas relevantes." },
  { nota: "5,0", texto: "Atendimento parcial, com evidências básicas e resultados limitados." },
  { nota: "7,5", texto: "Atendimento consistente, com boas evidências e resultados relevantes." },
  { nota: "10,0", texto: "Atendimento excepcional, com evidências robustas, impacto destacado e referência para o contexto." },
];

export const MIN_AVALIACOES = 5; // art. 15, § 4º
export const NOTA_PRE_SELECAO = 60; // art. 11
export const NOTA_VITORIA = 70; // art. 20
export const VAGAS_FINALISTAS = 3; // art. 11

// "7,5" ou "7.5" → 7.5; null se não for nota válida (0 a 10, uma casa decimal).
export function lerNota(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (!/^\d{1,2}(\.\d)?$/.test(t)) return null;
  const n = Number(t);
  return n >= 0 && n <= 10 ? n : null;
}

export const formatarNota = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");

// Anexo I: comentário sucinto para notas inferiores a 4,0 ou superiores a 9,0.
export const exigeComentario = (n: number) => n < 4 || n > 9;

// Art. 15, § 2º: soma das notas × peso ÷ 10 → escala de 0 a 100.
export function notaIndividual(matriz: Matriz, notas: Record<string, number>) {
  const soma = matriz.criterios.reduce((s, c) => s + (notas[c.id] ?? 0) * c.peso, 0);
  return Math.round((soma / 10) * 100) / 100;
}

export const TIPO_RODADA: Record<string, string> = {
  pre_selecao: "Pré-seleção",
  final: "Avaliação final",
  honoraria: "Votação nominal",
};

export function rotuloRodada(r: { tipo: string; turno: number }) {
  return r.tipo === "honoraria" ? `Votação nominal · ${r.turno}ª rodada` : TIPO_RODADA[r.tipo];
}

export type EstadoRodada = "agendada" | "aberta" | "encerrada";
export function estadoRodada(r: { abre_em: string; fecha_em: string; encerrada_em: string | null }, agora = new Date()): EstadoRodada {
  if (r.encerrada_em || agora > new Date(r.fecha_em)) return "encerrada";
  if (agora < new Date(r.abre_em)) return "agendada";
  return "aberta";
}

// Art. 23, § 1º e § 2º.
export const HIPOTESES_IMPEDIMENTO = [
  { id: "I", texto: "Sou indicado(a) ou integro equipe, projeto ou instituição concorrente." },
  { id: "II", texto: "Tenho relação profissional, societária, hierárquica ou econômica capaz de afetar minha imparcialidade." },
  { id: "III", texto: "Sou cônjuge, companheiro(a) ou parente, até o terceiro grau, de pessoa indicada." },
  { id: "IV", texto: "Existe outra circunstância objetiva que pode comprometer a confiança pública na avaliação." },
  { id: "indicou", texto: "Apresentei indicação nesta categoria (art. 23, § 2º)." },
];

// Anexo III — Declaração de impedimento e confidencialidade, aceita no primeiro acesso.
export const DECLARACAO_ANEXO_III = [
  "examinarei a lista de indicados e finalistas das categorias sob minha responsabilidade;",
  "informarei imediatamente qualquer vínculo, interesse ou circunstância que possa comprometer ou aparentar comprometer minha imparcialidade;",
  "não participarei da indicação, discussão, avaliação ou votação nas hipóteses de impedimento previstas no Regulamento;",
  "utilizarei os documentos e dados recebidos exclusivamente para a avaliação;",
  "não compartilharei notas individuais, informações pessoais ou conteúdo não público, ressalvadas as obrigações legais de transparência e acesso à informação; e",
  "não aceitarei vantagem, presente, promessa ou influência relacionada ao resultado do Prêmio.",
];

export const TEXTO_ANEXO_III =
  "Declaro, como membro ou avaliador designado pelo COCITIEIS, que: " +
  DECLARACAO_ANEXO_III.map((t, i) => `${["I", "II", "III", "IV", "V", "VI"][i]} — ${t}`).join(" ");

export const TEXTO_PRIVACIDADE_AVALIADOR =
  "Li o Aviso de Privacidade. Meu nome, e-mail, declarações e notas são registrados para o processo administrativo do Prêmio (art. 26 do Regulamento).";
