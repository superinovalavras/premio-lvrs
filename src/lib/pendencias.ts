// Aviso de pendências mostrado no painel ao entrar (09/10/2026). Só informativo: nada é salvo.
// Ao resolver um item, tire-o da lista; com as duas listas vazias, o aviso some.
// Trocar AVISO_VERSAO faz o aviso reaparecer para quem já fechou.

export const AVISO_VERSAO = "2026-10-15";

export type Pendencia = { titulo: string; regulamento: string; site: string; decidir: string };

// Revisado em 15/10/2026 com o Regulamento aprovado (Resolução COCITIEIS nº 03, de 6/10/2026).
// Resolvidos: idade do voto popular fica em 18 (decisão do Ramon, 15/10, apesar do art. 19, § 1º dizer 16),
// regulamento publicado em Documentos, até três finalistas, descrição da Agro/Food/Tech, cronograma do art. 8º-A, peso 80/20, conselheiro indica, propostas honorárias pelo site, voto de minerva, e-mail
// de privacidade, horário e local da cerimônia.
export const PENDENCIAS_REGULAMENTO: Pendencia[] = [
  {
    titulo: "Aviso de privacidade",
    regulamento: "Precisa trazer canal de direitos, dados coletados e prazo de retenção (art. 38, parágrafo único).",
    site: "Já traz o e-mail superinovalavras@gmail.com e os dados dos conselheiros; segue marcado “versão em revisão”.",
    decidir: "A Secretaria aprova o texto de premio.lvrs.com.br/privacidade como final?",
  },
  {
    titulo: "Nome “Prêmio Alysson Paolinelli”",
    regulamento: "O uso do nome depende de confirmação jurídica (art. 44, parágrafo único).",
    site: "Já usa o nome.",
    decidir: "A Procuradoria já confirmou?",
  },
];

export const PENDENCIAS_TECNICAS: string[] = [
  "Convidar os conselheiros e suplentes em Avaliação do Conselho → Avaliadores: é por esse acesso que eles indicam até o fim do prazo.",
  "E-mails automáticos (deferimento e indeferimento de cadastro) ainda não saem: falta configurar o envio.",
];
