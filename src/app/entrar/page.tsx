import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TelaDividida } from "@/components/area/tela-dividida";
import { FormEntrar } from "./form";
import { ehAdmin, usuarioAtual } from "@/lib/server/sessao";

export const metadata: Metadata = { title: "Entrar · Prêmio Lavras de Inovação 2026" };

export default async function Entrar() {
  const u = await usuarioAtual();
  if (u) redirect((await ehAdmin(u.id)) ? "/admin" : "/entidade");

  return (
    <TelaDividida
      selo="Área restrita"
      titulo={
        <>
          Prêmio Lavras de <span className="enfase">Inovação</span>
        </>
      }
      texto="Acesso das instituições indicadoras e da Secretaria Executiva do Prêmio."
    >
      <FormEntrar />
    </TelaDividida>
  );
}
