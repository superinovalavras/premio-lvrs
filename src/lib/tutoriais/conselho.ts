import type { Topico } from "@/components/tutorial-visual";
import { PROPOSTAS_HONORARIAS, VOTACAO_HONORARIA_NO_SITE } from "@/lib/edicao";
import topicos from "./como-avaliar.json";

// Passo a passo do conselheiro: "propor" aparece com as propostas honorárias; "honoraria" (votar pelo site), só com a votação nominal ligada.
export const topicosConselho = (topicos as Topico[]).filter(
  (t) => (t.id !== "propor" || PROPOSTAS_HONORARIAS) && (t.id !== "honoraria" || VOTACAO_HONORARIA_NO_SITE),
);
