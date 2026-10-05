export type EstadoVotacao = "antes" | "aberta" | "encerrada";

// As datas vêm dos parâmetros do prêmio (editados no painel).
// NEXT_PUBLIC_VOTACAO_PREVIEW=1 destrava o formulário fora do prazo (só para testes;
// o servidor e o banco têm travas próprias).
export function estadoVotacao(abre: string, fecha: string, agora = new Date()): EstadoVotacao {
  if (process.env.NEXT_PUBLIC_VOTACAO_PREVIEW === "1") return "aberta";
  if (agora < new Date(abre)) return "antes";
  if (agora > new Date(fecha)) return "encerrada";
  return "aberta";
}
