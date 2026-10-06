import type { Metadata } from "next";
import { TopoAdmin } from "@/components/admin/ui";
import { Tutorial, type Topico } from "./tutorial";
import topicos from "./topicos.json";

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
      <Tutorial topicos={topicos as Topico[]} />
    </>
  );
}
