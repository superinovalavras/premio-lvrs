// Análise de elegibilidade das indicações (art. 10 e art. 8º-A, III e IV do Regulamento final).
// Colunas da migração 0011, lidas à parte para não quebrar as telas antes de ela rodar.

export type Analise = {
  id: string;
  analise: "apta" | "inapta" | null;
  analise_motivo: string | null;
  analisada_em: string | null;
  comunicada_em: string | null;
  reconsideracao: string | null;
  reconsideracao_em: string | null;
  reconsideracao_decisao: "deferida" | "indeferida" | null;
  reconsideracao_motivo: string | null;
  reconsideracao_decidida_em: string | null;
  finalist_id: string | null;
};

export const CAMPOS_ANALISE =
  "id, analise, analise_motivo, analisada_em, comunicada_em, reconsideracao, reconsideracao_em, reconsideracao_decisao, reconsideracao_motivo, reconsideracao_decidida_em, finalist_id";

export const CANAL_OFICIAL = "superinovalavras@gmail.com";

// Texto da decisão preliminar para indicador e indicado (art. 10, § 2º). Também serve para copiar e enviar à mão.
export function mensagemDecisao(d: { indicado: string; categoria: string; apta: boolean; motivo: string | null }) {
  const base = `Prêmio Lavras de Inovação 2026 — decisão preliminar de elegibilidade.\n\nIndicação: ${d.indicado}, na categoria ${d.categoria}.\n`;
  if (d.apta) {
    return `${base}Resultado: APTA. A indicação segue para a etapa de avaliação do COCITIEIS. Antes de qualquer divulgação do nome, a Secretaria Executiva entra em contato com o indicado (art. 10, § 1º).`;
  }
  return `${base}Resultado: INAPTA.\nMotivo: ${d.motivo ?? ""}\n\nCabe pedido de reconsideração por erro material ou descumprimento objetivo do Regulamento, em até dois dias úteis, pelo e-mail ${CANAL_OFICIAL} (art. 10, § 2º).`;
}

export function mensagemReconsideracao(d: { indicado: string; categoria: string; deferida: boolean; motivo: string | null }) {
  return `Prêmio Lavras de Inovação 2026 — pedido de reconsideração.\n\nIndicação: ${d.indicado}, na categoria ${d.categoria}.\nDecisão: ${d.deferida ? "DEFERIDO. A indicação passa a ser considerada apta." : "INDEFERIDO. A indicação continua inapta."}${d.motivo ? `\nFundamento: ${d.motivo}` : ""}`;
}
