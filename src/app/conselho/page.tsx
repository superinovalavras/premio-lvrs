import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TelaDividida } from "@/components/area/tela-dividida";
import { avaliadorDoUsuario, usuarioAtual } from "@/lib/server/sessao";
import { FormEntrarConselho } from "./forms";

export const metadata: Metadata = {
  title: "Conselho · Prêmio Lavras de Inovação 2026",
  robots: { index: false, follow: false },
};

// Entrada dos conselheiros pelo nome completo. Não aparece em menu nenhum: chega-se pelo link do WhatsApp.
export default async function Conselho() {
  const u = await usuarioAtual();
  if (u && (await avaliadorDoUsuario(u.id))?.ativo) redirect("/avaliacao");
  return (
    <TelaDividida
      selo="Conselho avaliador"
      titulo={
        <>
          Área do <span className="enfase">Conselho</span>
        </>
      }
      texto="Indicações, propostas honorárias e avaliação do COCITIEIS no Prêmio Lavras de Inovação 2026."
    >
      <FormEntrarConselho />
    </TelaDividida>
  );
}
