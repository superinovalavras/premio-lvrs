import type { Metadata } from "next";
import { TopoAdmin } from "@/components/admin/ui";
import { FormPreCadastro } from "./form";

export const metadata: Metadata = { title: "Pré-cadastrar · Painel do Prêmio" };

export default function NovaEntidade() {
  return (
    <>
      <TopoAdmin
        selo="Indicadores"
        titulo={
          <>
            Pré-cadastrar <span className="enfase">instituição</span>
          </>
        }
        sub="Cria o acesso do representante com a senha provisória 123456 (vale 48 horas, troca obrigatória no primeiro acesso). A instituição completa o cadastro e a Secretaria defere como qualquer outra."
      />
      <FormPreCadastro />
    </>
  );
}
