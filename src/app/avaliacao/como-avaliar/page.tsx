import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CabecalhoArea, ConteudoArea } from "@/components/area/cabecalho";
import { Tutorial, type Topico } from "@/components/tutorial-visual";
import { exigirAvaliador } from "@/lib/server/sessao";
import topicos from "@/lib/tutoriais/como-avaliar.json";

export const metadata: Metadata = { title: "Como participar · Prêmio Lavras de Inovação 2026" };

export default async function ComoAvaliar() {
  const { avaliador } = await exigirAvaliador();
  return (
    <>
      <CabecalhoArea
        nome={avaliador.nome}
        area="Área do conselho"
        inicio="/avaliacao"
        selo="Ajuda"
        titulo={
          <>
            Como <span className="enfase">participar</span>
          </>
        }
      />
      <ConteudoArea>
        <Link href="/avaliacao" className="mb-6 inline-flex items-center gap-1.5 rounded-lg bg-papel px-3 py-2 text-sm font-semibold text-fundo shadow-sm">
          <ArrowLeft className="size-4" /> Área do conselho
        </Link>
        <Tutorial topicos={topicos as Topico[]} claro />
      </ConteudoArea>
    </>
  );
}
