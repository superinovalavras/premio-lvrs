import type { Metadata } from "next";
import { TopoAdmin } from "@/components/admin/ui";
import { carregarParametros } from "@/lib/server/parametros";
import { Documentos } from "./documentos";

export const metadata: Metadata = { title: "Documentos · Painel do Prêmio" };

export default async function PaginaDocumentos() {
  const { documentos } = await carregarParametros();
  return (
    <>
      <TopoAdmin
        selo="Prêmio"
        titulo={<span className="enfase">Documentos</span>}
        sub="Os PDFs da Central de Transparência. Sem arquivo, o site mostra “Em breve”; ao enviar, vira botão de download na hora. Cada troca fica no histórico."
      />
      <Documentos lista={documentos.filter((d) => d.id).map((d) => ({ ...d, id: d.id! }))} />
    </>
  );
}
