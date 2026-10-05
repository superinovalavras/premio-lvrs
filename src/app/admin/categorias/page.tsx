import type { Metadata } from "next";
import { TopoAdmin } from "@/components/admin/ui";
import { carregarParametros } from "@/lib/server/parametros";
import { Categorias } from "./categorias";

export const metadata: Metadata = { title: "Categorias · Painel do Prêmio" };

export default async function PaginaCategorias() {
  const { categorias } = await carregarParametros();
  return (
    <>
      <TopoAdmin
        selo="Prêmio"
        titulo={
          <>
            As 11 <span className="enfase">categorias</span>
          </>
        }
        sub="Nome e descrição como aparecem no site. O tipo e qual categoria tem voto popular seguem o regulamento e não mudam por aqui."
      />
      <Categorias lista={categorias.filter((c) => c.id).map((c) => ({ ...c, id: c.id! }))} />
    </>
  );
}
