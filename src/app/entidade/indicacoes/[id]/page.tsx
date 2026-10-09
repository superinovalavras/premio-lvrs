import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CabecalhoArea, ConteudoArea } from "@/components/area/cabecalho";
import { exigirUsuario, servico } from "@/lib/server/sessao";
import { carregarEntidadeDoUsuario } from "@/lib/server/entidades-dados";
import { carregarIndicacao, contextoIndicacao, janelaIndicacoes } from "@/lib/server/indicacoes-dados";
import { pendenciasIndicacao } from "@/lib/indicacoes";
import { dia, hora } from "@/lib/datas";
import { FormularioIndicacao } from "./formulario";

export const metadata: Metadata = { title: "Indicação · Prêmio Lavras de Inovação 2026" };

export default async function PaginaIndicacao({ params }: PageProps<"/entidade/indicacoes/[id]">) {
  const { id } = await params;
  const user = await exigirUsuario();
  const dados = await carregarEntidadeDoUsuario(user.id);
  if (!dados) redirect("/entidade");
  const r = await carregarIndicacao(id);
  if (!r || r.indicacao.entidade_id !== dados.entidade.id) notFound();

  const [ctx, janela, { data: cats }] = await Promise.all([
    contextoIndicacao(r.indicacao),
    janelaIndicacoes(),
    servico().from("categories").select("id, slug, name, type").order("sort_order"),
  ]);
  const aberta = janela.estado === "aberta" && dados.entidade.status === "deferido";
  const editavel = aberta && r.indicacao.status === "rascunho";
  const nome = dados.titular?.nome ?? (user.user_metadata?.nome as string) ?? user.email ?? "";

  return (
    <>
      <CabecalhoArea
        nome={nome}
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
