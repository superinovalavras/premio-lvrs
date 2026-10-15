// Proposta das categorias honorárias (art. 13 e Anexo I do Regulamento): sem ranking numérico; a proposta
// apresenta trajetória, contribuição, vínculo com Lavras, relevância pública e justificativa.
export type CampoProposta = { id: string; rotulo: string; dica?: string; max: number; linhas: number; obrigatorio: boolean };

export const CAMPOS_PROPOSTA: CampoProposta[] = [
  { id: "indicado_nome", rotulo: "Nome do indicado", max: 160, linhas: 1, obrigatorio: true },
  { id: "trajetoria", rotulo: "Trajetória", dica: "Quem é e o que construiu ao longo do tempo.", max: 2000, linhas: 4, obrigatorio: true },
  { id: "contribuicao", rotulo: "Contribuição", dica: "O que fez de concreto pela inovação, pela ciência ou pelo território.", max: 2000, linhas: 4, obrigatorio: true },
  { id: "vinculo", rotulo: "Vínculo com Lavras", max: 1000, linhas: 3, obrigatorio: true },
  { id: "relevancia", rotulo: "Relevância pública", dica: "Quem se beneficia e por que isso importa.", max: 1500, linhas: 3, obrigatorio: true },
  { id: "justificativa", rotulo: "Por que merece o reconhecimento", dica: "É o texto que os conselheiros leem antes de votar.", max: 600, linhas: 3, obrigatorio: true },
  { id: "contato", rotulo: "Contato do indicado (telefone ou e-mail)", dica: "Para a Secretaria comunicar antes de divulgar o nome (art. 10, § 1º).", max: 200, linhas: 1, obrigatorio: false },
  { id: "link", rotulo: "Link com mais informações (opcional)", max: 500, linhas: 1, obrigatorio: false },
];

export type PropostaRow = {
  id: string;
  avaliador_id: string;
  category_id: string;
  indicado_tipo: "pf" | "instituicao";
  indicado_nome: string;
  trajetoria: string;
  contribuicao: string;
  vinculo: string;
  relevancia: string;
  justificativa: string;
  contato: string | null;
  link: string | null;
  enviada_em: string;
  atualizada_em: string;
  finalist_id: string | null;
};

export const SELECT_PROPOSTA =
  "id, avaliador_id, category_id, indicado_tipo, indicado_nome, trajetoria, contribuicao, vinculo, relevancia, justificativa, contato, link, enviada_em, atualizada_em, finalist_id";
