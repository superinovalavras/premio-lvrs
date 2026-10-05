import type { Metadata } from "next";
import { TopoAdmin } from "@/components/admin/ui";
import { Importador } from "./importador";

export const metadata: Metadata = { title: "Importar planilha · Painel do Prêmio" };

export default function Importar() {
  return (
    <>
      <TopoAdmin
        selo="Indicadores · Importar"
        titulo={
          <>
            Importar <span className="enfase">planilha</span>
          </>
        }
        sub="Pré-cadastre várias instituições de uma vez. Nada é gravado antes de você conferir."
      />
      <Importador />
    </>
  );
}
