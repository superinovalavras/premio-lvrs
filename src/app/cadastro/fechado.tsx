import Link from "next/link";
import { TelaDividida } from "@/components/area/tela-dividida";
import { Aviso, btnPrim } from "@/components/area/ui";
import { AVISO_INSTITUICOES } from "@/lib/edicao";

// Cadastro e "Como indicar" das instituições ficam fechados nesta edição (ver src/lib/edicao.ts).
export function Fechado() {
  return (
    <TelaDividida
      selo="Instituições indicadoras"
      titulo={
        <>
          Volta na próxima <span className="enfase">edição</span>
        </>
      }
      texto={AVISO_INSTITUICOES}
    >
      <Aviso>Quem já tem cadastro continua com o acesso guardado para a próxima edição.</Aviso>
      <Link href="/" className={`${btnPrim} mt-6`}>
        Voltar ao site
      </Link>
    </TelaDividida>
  );
}
