// Conteúdo da página. Tudo que muda de edição para edição mora aqui.

// Horário de Brasília (UTC-3, sem horário de verão desde 2019).
export const VOTACAO_ABRE = new Date("2026-11-06T00:00:00-03:00");
export const VOTACAO_FECHA = new Date("2026-11-11T23:59:59-03:00");
// Horário da gala ainda não confirmado — 19h é provisório.
export const CERIMONIA = new Date("2026-11-17T19:00:00-03:00");

export type Eixo = {
  id: string;
  numero: number;
  nome: string;
  tema: string;
  texto: string;
};

export const EIXOS: Eixo[] = [
  {
    id: "territorio",
    numero: 1,
    nome: "Território",
    tema: "Origem e comunidade",
    texto:
      "Tudo começa no chão de Lavras: as pessoas, a história e a comunidade que fazem da cidade um lugar onde a inovação cria raiz.",
  },
  {
    id: "producao",
    numero: 2,
    nome: "Produção",
    tema: "Agro, pesquisa e conhecimento",
    texto:
      "Campo e laboratório lado a lado. A pesquisa que nasce aqui vira técnica, safra e conhecimento aplicado.",
  },
  {
    id: "alimento",
    numero: 3,
    nome: "Alimento",
    tema: "Qualidade, saúde e identidade",
    texto:
      "O que chega à mesa carrega qualidade, saúde e a identidade de um território que sabe produzir bem.",
  },
  {
    id: "tecnologia",
    numero: 4,
    nome: "Tecnologia",
    tema: "Startups, empresas e soluções",
    texto:
      "Startups e empresas que transformam desafios reais em soluções — do campo à cidade, do laboratório ao mercado.",
  },
  {
    id: "impacto",
    numero: 5,
    nome: "Impacto",
    tema: "Futuro e desenvolvimento",
    texto:
      "O resultado que importa: desenvolvimento que fica, gera oportunidade e projeta Lavras como Capital do Futuro do Alimento.",
  },
];

export const PUBLICOS = ["Startups", "Empresas", "Pessoas", "Pesquisadores", "Professores"];

export type TipoCategoria = "competitive" | "special" | "honorary";

export type Categoria = {
  slug: string;
  nome: string;
  tipo: TipoCategoria;
  resumo: string;
  votoPopular?: boolean;
  // tamanho no bento grid (colunas em telas grandes)
  destaque?: boolean;
};

export const CATEGORIAS: Categoria[] = [
  {
    slug: "empresa-inovadora",
    nome: "Empresa Inovadora",
    tipo: "competitive",
    resumo: "Empresas estabelecidas que fizeram da inovação parte do negócio e geraram resultado para Lavras.",
  },
  {
    slug: "startup-revelacao",
    nome: "Startup Revelação",
    tipo: "competitive",
    resumo: "Startups em ascensão, com solução validada e potencial de crescimento a partir do ecossistema local.",
  },
  {
    slug: "ciencia-que-vira-solucao",
    nome: "Ciência que Vira Solução",
    tipo: "competitive",
    resumo: "Pesquisa que saiu do laboratório e chegou ao mundo real como produto, serviço ou política.",
  },
  {
    slug: "agro-food-tech-do-ano",
    nome: "Agro e/ou Food e/ou Tech do Ano",
    tipo: "competitive",
    resumo:
      "A solução do ano na cadeia do futuro do alimento — do campo ao prato, passando pela tecnologia. A única categoria com voto popular.",
    votoPopular: true,
    destaque: true,
  },
  {
    slug: "gestao-publica",
    nome: "Inovação na Gestão Pública",
    tipo: "competitive",
    resumo: "Iniciativas que tornaram o serviço público mais eficiente, transparente e próximo do cidadão.",
  },
  {
    slug: "educacao-talentos",
    nome: "Educação e Talentos do Futuro",
    tipo: "competitive",
    resumo: "Projetos que formam as pessoas que vão construir a inovação de amanhã.",
  },
  {
    slug: "jovem-inovador",
    nome: "Jovem Inovador",
    tipo: "competitive",
    resumo: "Talentos de 15 a 29 anos que já estão transformando ideias em impacto.",
  },
  {
    slug: "conexao-do-ano",
    nome: "Conexão do Ano",
    tipo: "competitive",
    resumo: "A parceria que uniu universidade, empresa, governo ou sociedade e fez o ecossistema andar junto.",
  },
  {
    slug: "premio-lavras-lab",
    nome: "Prêmio Lavras Lab",
    tipo: "special",
    resumo: "Soluções desenvolvidas por servidores para a Prefeitura de Lavras — inovação feita por dentro.",
    destaque: true,
  },
  {
    slug: "alysson-paolinelli",
    nome: "Prêmio Alysson Paolinelli",
    tipo: "honorary",
    resumo: "Homenagem a uma trajetória de contribuição decisiva para a agricultura e a ciência do alimento.",
    destaque: true,
  },
  {
    slug: "personalidade-do-ano",
    nome: "Personalidade do Ano",
    tipo: "honorary",
    resumo: "Reconhecimento a quem, neste ano, mais projetou Lavras e seu ecossistema de inovação.",
  },
];

export const TIPO_LABEL: Record<TipoCategoria, string> = {
  competitive: "Competitiva",
  special: "Especial",
  honorary: "Honorária",
};

export type Etapa = {
  titulo: string;
  data: string; // exibição
  texto: string;
  destaque?: boolean;
};

// Só as duas datas em destaque estão confirmadas. As demais: preencher com o regulamento.
export const CRONOGRAMA: Etapa[] = [
  {
    titulo: "Cadastro das instituições indicadoras",
    data: "Aberto até 23/10/2026",
    texto: "Instituições de Lavras pedem habilitação para indicar. A Secretaria Executiva analisa em até 1 dia útil.",
  },
  {
    titulo: "Indicações",
    data: "12 a 23/10/2026",
    texto: "Instituições habilitadas indicam até 2 nomes por categoria e 6 no total.",
    destaque: true,
  },
  { titulo: "Avaliação técnica", data: "A confirmar", texto: "O COCITIEIS avalia as indicações e define os finalistas." },
  { titulo: "Divulgação dos finalistas", data: "A confirmar", texto: "Os três finalistas de cada categoria são anunciados." },
  {
    titulo: "Votação Popular",
    data: "06 a 11/11/2026",
    texto: "Aberta apenas para a categoria Agro e/ou Food e/ou Tech do Ano. Um voto por CPF.",
    destaque: true,
  },
  {
    titulo: "Cerimônia de Entrega",
    data: "17/11/2026",
    texto: "Noite de gala em que os vencedores são revelados. Nenhum resultado é divulgado antes.",
    destaque: true,
  },
];

export type Documento = {
  titulo: string;
  descricao: string;
  // null enquanto o PDF não é publicado em /public/docs
  href: string | null;
};

export const DOCUMENTOS: Documento[] = [
  {
    titulo: "Regulamento Oficial",
    descricao: "Regras, categorias, critérios de avaliação e composição da nota final.",
    href: null, // "/docs/regulamento-premio-lavras-2026.pdf"
  },
  {
    titulo: "Anexo IV — Termo para menores de 18 anos",
    descricao: "Autorização do responsável legal para participantes menores de idade.",
    href: null, // "/docs/anexo-iv-termo-menores.pdf"
  },
];

export type Finalista = {
  id: string;
  nome: string;
  resumo: string;
  imagem: string | null;
};

// Usado enquanto o Supabase não está configurado ou os finalistas não foram cadastrados.
export const FINALISTAS_EXEMPLO: Finalista[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    nome: "Finalista 1",
    resumo: "Os finalistas serão divulgados após a avaliação técnica do COCITIEIS.",
    imagem: null,
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    nome: "Finalista 2",
    resumo: "Os finalistas serão divulgados após a avaliação técnica do COCITIEIS.",
    imagem: null,
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    nome: "Finalista 3",
    resumo: "Os finalistas serão divulgados após a avaliação técnica do COCITIEIS.",
    imagem: null,
  },
];
