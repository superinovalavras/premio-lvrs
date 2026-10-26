import type { Metadata } from "next";
import { TopoAdmin } from "@/components/admin/ui";
import { Tutorial, type Topico } from "@/components/tutorial-visual";
import topicos from "./topicos.json";
import { INDICACAO_POR_INSTITUICAO, PROPOSTAS_HONORARIAS, VOTACAO_HONORARIA_NO_SITE } from "@/lib/edicao";

// Tópicos das instituições indicadoras: guardados, aparecem de novo quando a indicação por instituições voltar.
const SO_INSTITUICOES = ["instituicoes", "pre", "vincular-conselheiro", "teste-cadastro"];
// Propostas honorárias pelo site: guardadas, aparecem de novo quando forem religadas.
const SO_HONORARIAS = ["propostas-honorarias"];
const SO_VOTACAO_HONORARIA = ["minerva"];
const visiveis = (topicos as Topico[]).filter(
  (t) =>
    (INDICACAO_POR_INSTITUICAO || !SO_INSTITUICOES.includes(t.id)) &&
    (PROPOSTAS_HONORARIAS || !SO_HONORARIAS.includes(t.id)) &&
    (VOTACAO_HONORARIA_NO_SITE || !SO_VOTACAO_HONORARIA.includes(t.id)),
);

export const metadata: Metadata = { title: "Tutorial · Painel do Prêmio" };

// Prints gerados a partir do painel real (script de captura fora do repositório).
export default function PaginaTutorial() {
  return (
    <>
      <TopoAdmin
        selo="Ajuda"
        titulo={
          <>
            Como <span className="enfase">usar</span>
          </>
        }
      />
      <Tutorial topicos={visiveis} />
    </>
  );
}
