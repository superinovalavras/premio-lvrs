import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TelaDividida } from "@/components/area/tela-dividida";
import { FormCadastro } from "./form";
import { usuarioAtual } from "@/lib/server/sessao";

export const metadata: Metadata = { title: "Pedir cadastro · Prêmio Lavras de Inovação 2026" };

export default async function Cadastro() {
  if (await usuarioAtual()) redirect("/entidade");
  return (
    <TelaDividida
      selo="Cadastro de instituição indicadora"
      titulo={
        <>
          Sua instituição pode <span className="enfase">indicar</span>
        </>
      }
      texto="Órgãos públicos, instituições de ensino, aceleradoras, associações, incubadoras e empresas inovadoras de Lavras pedem cadastro aqui. A Secretaria Executiva analisa em até 1 dia útil."
    >
      <FormCadastro />
    </TelaDividida>
  );
}
