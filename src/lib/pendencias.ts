// Aviso de pendências mostrado no painel ao entrar (09/10/2026). Só informativo: nada é salvo.
// Ao resolver um item, tire-o da lista; com as duas listas vazias, o aviso some.
// Trocar AVISO_VERSAO faz o aviso reaparecer para quem já fechou.

export const AVISO_VERSAO = "2026-10-09";

export type Pendencia = { titulo: string; regulamento: string; site: string; decidir: string };

export const PENDENCIAS_REGULAMENTO: Pendencia[] = [
  {
    titulo: "Idade mínima no voto popular",
    regulamento: "16 anos ou mais (art. 19, § 1º).",
    site: "Exige 18 anos.",
    decidir: "16 ou 18 anos? Se for 18, o regulamento precisa ser corrigido.",
  },
  {
    titulo: "Peso do voto popular",
    regulamento:
      "O art. 19 fala em 80% técnica e 20% popular, mas o título da matriz Agro/Food/Tech no Anexo I diz “70% da nota final”, e a providência nº 3 fala em 70/30.",
    site: "Calcula 80/20.",
    decidir: "Corrigir o Anexo I (80/20) ou mudar para 70/30?",
  },
  {
    titulo: "Versão do regulamento",
    regulamento: "O PDF recebido está marcado como “Minuta técnica para discussão”. O art. 8º-A, I manda publicar até 09/10.",
    site: "Mostra o regulamento como “Em breve”.",
    decidir: "É a versão final para publicar? Revisar também o art. 28, que tem parágrafos e um “Parágrafo único” ao mesmo tempo.",
  },
  {
    titulo: "Conselheiro pode indicar?",
    regulamento:
      "Indicam os membros do COCITIEIS e as instituições do art. 2º-B; as indicações do conselheiro somam na cota da instituição (art. 8º, § 7º).",
    site: "Só instituições habilitadas indicam.",
    decidir: "O conselheiro indica em nome próprio, pela instituição que representa ou não indica nesta edição?",
  },
  {
    titulo: "Propostas das categorias honorárias",
    regulamento: "Cada membro pode apresentar uma proposta fundamentada; havendo mais de uma, há votação nominal (art. 13).",
    site: "A Secretaria cadastra as propostas no painel, e a votação acontece no sistema.",
    decidir: "As propostas chegam pelo formulário de indicação, enviadas por cada conselheiro ou entregues à Secretaria?",
  },
  {
    titulo: "Empate na 2ª rodada das honorárias",
    regulamento: "Não prevê o que fazer.",
    site: "Aponta o empate e devolve a decisão ao plenário.",
    decidir: "O plenário decide, faz-se nova rodada ou vale outra regra?",
  },
  {
    titulo: "Quantos finalistas por categoria",
    regulamento: "Até três, só com 60 pontos ou mais; um único finalista não vence automaticamente (arts. 11 e 12, § 3º).",
    site: "Diz “Os três finalistas de cada categoria são anunciados”.",
    decidir: "Trocar para “até três finalistas”?",
  },
  {
    titulo: "Descrição da Agro e/ou Food e/ou Tech",
    regulamento: "Vale agronegócio, alimentos ou tecnologia, isolados ou juntos (art. 6º, § 4º).",
    site: "Diz “do campo ao prato, passando pela tecnologia”, o que sugere que precisa ser da cadeia do alimento.",
    decidir: "Usar “Iniciativas do agronegócio, da cadeia de alimentos ou de tecnologia, isoladas ou combinadas”?",
  },
  {
    titulo: "Cronograma no site",
    regulamento:
      "Todas as datas estão no art. 8º-A: análise 26–28/10, reconsideração e pré-seleção 29/10–03/11, finalistas até 04/11, avaliação técnica 06–12/11, homologação até 13/11.",
    site: "Mostra “Avaliação técnica · A confirmar · O COCITIEIS avalia as indicações e define os finalistas”.",
    decidir: "Atualizar o cronograma com as datas do art. 8º-A?",
  },
  {
    titulo: "Aviso de privacidade",
    regulamento: "Precisa trazer canal de direitos, dados coletados e prazo de retenção (art. 38, parágrafo único).",
    site: "Só traz o endereço físico, sem e-mail; está marcado “versão em revisão” e não cita os avaliadores.",
    decidir: "Qual e-mail recebe os pedidos de dados? O texto pode ser aprovado como final?",
  },
  {
    titulo: "Nome “Prêmio Alysson Paolinelli”",
    regulamento: "O uso do nome depende de confirmação jurídica (art. 44, parágrafo único).",
    site: "Já usa o nome.",
    decidir: "A Procuradoria já confirmou?",
  },
  {
    titulo: "Horário e local da cerimônia",
    regulamento: "17/11/2026 (art. 8º-A, XI), sem horário.",
    site: "19h, provisório, sem local.",
    decidir: "Qual o horário e o local?",
  },
];

export const PENDENCIAS_TECNICAS: string[] = [
  "Datas de teste no ar: o site mostra a cerimônia em 08/10 e a votação encerrada. Corrigir em Datas e cronograma: indicações de 12/10, 0h, a 23/10, 23h59; votação popular de 06/11, 0h, a 11/11, 23h59; cerimônia em 17/11.",
  "Formulário de indicação: as indicações abrem em 12/10, e o formulário ainda não existe.",
  "E-mails automáticos (deferimento e indeferimento de cadastro) ainda não saem: falta configurar o envio.",
  "Avaliadores: convidar os conselheiros e suplentes em Avaliação do Conselho → Avaliadores.",
];
