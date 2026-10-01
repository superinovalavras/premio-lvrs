import { VOTACAO_ABRE, VOTACAO_FECHA } from "@/lib/data";

export type EstadoVotacao = "antes" | "aberta" | "encerrada";

// NEXT_PUBLIC_VOTACAO_PREVIEW=1 destrava o formulário fora do prazo (só para testes locais;
// o servidor tem trava própria em VOTACAO_FORCAR_ABERTA e no banco).
export function estadoVotacao(agora = new Date()): EstadoVotacao {
  if (process.env.NEXT_PUBLIC_VOTACAO_PREVIEW === "1") return "aberta";
  if (agora < VOTACAO_ABRE) return "antes";
  if (agora > VOTACAO_FECHA) return "encerrada";
  return "aberta";
}
