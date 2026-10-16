import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CabecalhoArea, ConteudoArea } from "@/components/area/cabecalho";
import { Cartao } from "@/components/area/ui";
import { exigirAvaliador } from "@/lib/server/sessao";
import { FormPerfil } from "./form";

export const metadata: Metadata = { title: "Meu perfil · Prêmio Lavras de Inovação 2026" };

export default async function PerfilConselho() {
  const { avaliador } = await exigirAvaliador();
  return (
    <>
      <CabecalhoArea
        nome={avaliador.nome}
        area="Área do conselho"
        inicio="/avaliacao"
        selo="Meu perfil"
        titulo={
          <>
            Seus <span className="enfase">dados</span>
          </>
        }
        texto="O nome completo é o seu login. O e-mail recebe o link quando você esquece a senha."
      />
      <ConteudoArea>
        <Link href="/avaliacao" className="mb-6 inline-flex items-center gap-1.5 rounded-lg bg-papel px-3 py-2 text-sm font-semibold text-fundo shadow-sm">
          <ArrowLeft className="size-4" /> Área do conselho
        </Link>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Cartao>
            <FormPerfil nome={avaliador.nome} email={avaliador.email ?? ""} />
          </Cartao>
          <Cartao className="p-6">
            <h3 className="font-semibold">No Conselho</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <div>
                <dt className="text-fundo/60">Assento</dt>
                <dd className="font-medium">{avaliador.papel === "suplente" ? "Suplente" : "Titular"}</dd>
              </div>
              <div>
                <dt className="text-fundo/60">Instituição</dt>
                <dd className="font-medium">{avaliador.instituicao ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-4 text-[13px] font-light text-fundo/65">Assento e instituição são definidos pela Secretaria do Prêmio.</p>
          </Cartao>
        </div>
      </ConteudoArea>
    </>
  );
}
