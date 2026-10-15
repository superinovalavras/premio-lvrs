import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CabecalhoArea, ConteudoArea } from "@/components/area/cabecalho";
import { exigirAvaliador, servico } from "@/lib/server/sessao";
import { carregarIndicacao, contextoIndicacao, janelaIndicacoes } from "@/lib/server/indicacoes-dados";
import { pendenciasIndicacao } from "@/lib/indicacoes";
import { dia, hora } from "@/lib/datas";
import { FormularioIndicacao } from "@/app/entidade/indicacoes/[id]/formulario";

export const metadata: Metadata = { title: "Indicação · Prêmio Lavras de Inovação 2026" };

// Indicação feita pelo conselheiro (art. 8º, caput). Mesmo formulário das instituições.
export default async function IndicacaoConselheiro({ params }: PageProps<"/avaliacao/indicacoes/[id]">) {
  const { id } = await params;
  const { avaliador } = await exigirAvaliador();
  const r = await carregarIndicacao(id);
  if (!r || r.indicacao.avaliador_id !== avaliador.id) notFound();

  const [ctx, janela, { data: cats }] = await Promise.all([
    contextoIndicacao(r.indicacao),
    janelaIndicacoes(),
    servico().from("categories").select("id, slug, name, type").eq("type", "competitive").order("sort_order"),
  ]);
  const aberta = janela.estado === "aberta";
  const editavel = aberta && r.indicacao.status === "rascunho";

  return (
    <>
      <CabecalhoArea
        nome={avaliador.nome}
        area="Área do conselho"
        inicio="/avaliacao"
        selo="Indicação 2026"
        titulo={
          r.indicacao.indicado_nome ? (
            r.indicacao.indicado_nome
          ) : (
            <>
              Nova <span className="enfase">indicação</span>
            </>
          )
        }
        texto={
          editavel
            ? `Cada passo é salvo ao continuar: dá para parar e voltar depois. Prazo até ${dia(janela.fecha)}, às ${hora(janela.fecha)}.`
            : r.indicacao.status === "enviada"
              ? "Indicação enviada. Ela fica registrada na ordem de chegada."
              : "Fora do prazo de indicações: só leitura."
        }
      />
      <ConteudoArea>
        <FormularioIndicacao
          indicacao={r.indicacao}
          documentos={r.documentos}
          pendencias={pendenciasIndicacao(r.indicacao, r.documentos, ctx)}
          mesmoIndicadoEmOutra={ctx.mesmoIndicadoEmOutra}
          categorias={(cats ?? []).map((c) => ({ id: c.id, nome: c.name, slug: c.slug }))}
          fechamento={janela.fecha}
          editavel={editavel}
          podeReabrir={aberta && r.indicacao.status === "enviada"}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          supabaseAnon={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
        />
      </ConteudoArea>
    </>
  );
}
