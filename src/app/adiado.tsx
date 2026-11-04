import Link from "next/link";
import { TelaDividida } from "@/components/area/tela-dividida";
import { btnPrim } from "@/components/area/ui";
import { AVISO_ADIAMENTO } from "@/lib/edicao";

// Páginas de votação e indicação enquanto a edição está adiada (ver src/lib/edicao.ts).
export function Adiado() {
  return (
    <TelaDividida
      selo={AVISO_ADIAMENTO.selo}
      titulo={
        <>
          Adiado para <span className="enfase">2027</span>
        </>
      }
      texto={AVISO_ADIAMENTO.texto}
    >
      <Link href="/" className={btnPrim}>
        Voltar ao site
      </Link>
    </TelaDividida>
  );
}
