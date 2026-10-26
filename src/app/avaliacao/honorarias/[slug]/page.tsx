import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CabecalhoArea, ConteudoArea } from "@/components/area/cabecalho";
import { Aviso, Cartao } from "@/components/area/ui";
import { exigirAvaliador, servico } from "@/lib/server/sessao";
import { janelaIndicacoes } from "@/lib/server/indicacoes-dados";
import { SELECT_PROPOSTA, type PropostaRow } from "@/lib/honorarias";
import { dia, hora } from "@/lib/datas";
import { HONORARIAS_COM_PROPOSTA, PROPOSTAS_HONORARIAS } from "@/lib/edicao";
import { FormularioProposta } from "./formulario";

export const metadata: Metadata = { title: "Proposta honorária · Prêmio Lavras de Inovação 2026" };

// Art. 13: cada conselheiro apresenta uma proposta fundamentada em cada categoria honorária.
export default async function PropostaHonoraria({ params }: PageProps<"/avaliacao/honorarias/[slug]">) {
  const { slug } = await params;
  if (!PROPOSTAS_HONORARIAS || !HONORARIAS_COM_PROPOSTA.includes(slug)) notFound();
  const { avaliador } = await exigirAvaliador();
  const sb = servico();
  const { data: cat } = await sb.from("categories").select("id, name, description, type").eq("slug", slug).maybeSingle();
  if (!cat || cat.type !== "honorary") notFound();
  const [janela, { data: proposta }] = await Promise.all([
    janelaIndicacoes(),
    sb.from("propostas_honorarias").select(SELECT_PROPOSTA).eq("avaliador_id", avaliador.id).eq("category_id", cat.id).maybeSingle<PropostaRow>(),
  ]);
  const editavel = janela.estado === "aberta" && !proposta?.finalist_id;

  return (
    <>
      <CabecalhoArea
        nome={avaliador.nome}
        area="Área do conselho"
        inicio="/avaliacao"
        selo="Proposta honorária"
        titulo={cat.name}
        texto={
          editavel
            ? `Uma proposta por conselheiro nesta categoria. Dá para editar até ${dia(janela.fecha)}, às ${hora(janela.fecha)}.`
            : janela.estado === "antes"
              ? `As propostas abrem em ${dia(janela.abre)}, à ${hora(janela.abre)}.`
              : "Somente leitura."
        }
      />
      <ConteudoArea>
        <Link href="/avaliacao" className="mb-6 inline-flex items-center gap-1.5 rounded-lg bg-papel px-3 py-2 text-sm font-semibold text-fundo shadow-sm">
          <ArrowLeft className="size-4" /> Área do conselho
        </Link>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Cartao>
            {proposta?.finalist_id && (
              <Aviso tom="ok" className="mb-5">
                A Secretaria incluiu esta proposta na votação nominal. Ela não muda mais.
              </Aviso>
            )}
            <FormularioProposta slug={slug} proposta={proposta} editavel={editavel} />
          </Cartao>
          <div className="grid content-start gap-4">
            <Cartao className="p-6">
              <h3 className="font-semibold">Como funciona</h3>
              <ul className="mt-2 space-y-2 text-sm font-light text-fundo/75">
                {cat.description && <li>· {cat.description}</li>}
                <li>· Sem nota: a proposta mostra trajetória, contribuição, vínculo com Lavras e relevância pública.</li>
                <li>· Havendo mais de uma proposta, o Conselho escolhe em votação nominal (art. 13).</li>
                <li>· Sem maioria simples na 1ª rodada, as duas mais votadas vão para a rodada final.</li>
                <li>· Empate na rodada final: decide o voto de minerva da Presidência.</li>
              </ul>
            </Cartao>
          </div>
        </div>
      </ConteudoArea>
    </>
  );
}
