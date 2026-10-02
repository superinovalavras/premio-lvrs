import "server-only";

// Ambiente de teste: só num deploy de Preview da Vercel com VOTACAO_TESTE=1.
// Abre o voto fora do prazo e troca os finalistas oficiais pelos de teste (is_test).
// Em produção é sempre false, mesmo que a variável vaze para lá.
export const MODO_TESTE = process.env.VERCEL_ENV === "preview" && process.env.VOTACAO_TESTE === "1";
