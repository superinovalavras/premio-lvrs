import type { Topico } from "@/components/tutorial-visual";
import { PROPOSTAS_HONORARIAS } from "@/lib/edicao";
import topicos from "./como-avaliar.json";

// Passo a passo do conselheiro. Os tópicos das propostas honorárias ficam guardados e só aparecem quando forem religadas.
const SO_HONORARIAS = ["propor", "honoraria"];
export const topicosConselho = (topicos as Topico[]).filter((t) => PROPOSTAS_HONORARIAS || !SO_HONORARIAS.includes(t.id));
