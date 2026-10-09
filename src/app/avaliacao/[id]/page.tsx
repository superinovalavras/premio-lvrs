import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CabecalhoArea, ConteudoArea } from "@/components/area/cabecalho";
import { Aviso, Cartao } from "@/components/area/ui";
import { exigirAvaliador, servico } from "@/lib/server/sessao";
import { carregarRodada } from "@/lib/server/avaliacao-dados";
import { HIPOTESES_IMPEDIMENTO, estadoRodada, rotuloRodada } from "@/lib/avaliacao";
import { dia, hora } from "@/lib/datas";
import { Declaracao } from "./declaracao";
import { Ficha, type ValorNota } from "./ficha";
import { Votacao } from "./voto";

export const metadata: Metadata = { title: "Avaliar · Prêmio Lavras de Inovação 2026" };

const quando = (iso: string) => `${dia(iso)}, às ${hora(iso)}`;

export default async function RodadaAvaliador({ params }: PageProps<"/avaliacao/[id]">) {
  const { id } = await params;
  const { avaliador } = await exigirAvaliador();
  const dados = await carregarRodada(id);
  if (!dados || dados.rodada.is_test !== avaliador.is_test) notFound();
  const { rodada, categoria, matriz, candidatos } = dados;
  const estado = estadoRodada(rodada);
  const sb = servico();

  const [{ data: decl }, { data: ficha }, { data: voto }] = await Promise.all([
    sb
      .from("declaracoes_avaliador")
      .select("impedido, hipotese, motivo, origem, declarado_em")
      .eq("avaliador_id", avaliador.id)
      .eq("category_id", categoria.id)
      .eq("is_test", rodada.is_test)
      .maybeSingle(),
    sb.from("fichas").select("id, status, enviada_em, invalidada_motivo").eq("rodada_id", rodada.id).eq("avaliador_id", avaliador.id).maybeSingle(),
    sb.from("votos_honorarios").select("finalist_id, votado_em, invalidado_em, invalidado_motivo").eq("rodada_id", rodada.id).eq("avaliador_id", avaliador.id).maybeSingle(),
  ]);
  const { data: notas } = ficha
    ? await sb.from("fichas_notas").select("finalist_id, criterio, nota, comentario").eq("ficha_id", ficha.id)
    : { data: [] };
  const iniciais: Record<string, ValorNota> = {};
  for (const n of notas ?? []) {
    iniciais[`${n.finalist_id}|${n.criterio}`] = { nota: String(n.nota).replace(".", ","), comentario: n.comentario ?? "" };
  }

  const lista = candidatos.map((c) => ({ id: c.id, nome: c.name, resumo: c.summary, temMaterial: !!(c.material_path || c.material_link) }));
  const hipotese = HIPOTESES_IMPEDIMENTO.find((h) => h.id === decl?.hipotese);

  let corpo: React.ReactNode;
  if (estado === "agendada") {
    corpo = <Aviso>Esta rodada abre em {quando(rodada.abre_em)}.</Aviso>;
  } else if (decl?.impedido) {
    corpo = (
      <Aviso tom="info">
        <b className="font-semibold">Você está impedido nesta categoria</b>
        {decl.origem === "secretaria" ? " (registrado pela Secretaria do Prêmio)" : ""}. {hipotese ? hipotese.texto : ""}{" "}
        {decl.motivo ? `Motivo: ${decl.motivo}` : ""} Por isso não avalia nem vota aqui (art. 23).
      </Aviso>
    );
  } else if (!decl) {
    corpo =
      estado === "aberta" ? (
        <Declaracao rodadaId={rodada.id} candidatos={lista} />
      ) : (
        <Aviso>Rodada encerrada sem a sua participação.</Aviso>
      );
  } else if (!matriz) {
    corpo = (
      <Votacao
        rodadaId={rodada.id}
        candidatos={lista}
        turno={rodada.turno}
        aberta={estado === "aberta"}
        registrado={voto ? { escolha: voto.finalist_id ?? "abster", em: voto.votado_em, invalidado: voto.invalidado_motivo ?? (voto.invalidado_em ? "sem motivo" : null) } : null}
      />
    );
  } else {
    corpo = (
      <Ficha
        rodadaId={rodada.id}
        matriz={matriz}
        candidatos={lista}
        iniciais={iniciais}
        editavel={estado === "aberta" && (!ficha || ficha.status === "rascunho")}
        situacao={
          ficha?.status === "enviada"
            ? `Ficha enviada em ${quando(ficha.enviada_em!)}. Ela não pode mais ser alterada.`
            : ficha?.status === "invalidada"
              ? `Ficha invalidada pela Secretaria${ficha.invalidada_motivo ? `: ${ficha.invalidada_motivo}` : "."}`
              : estado === "encerrada"
                ? "Rodada encerrada. Fichas não enviadas não contam."
                : null
        }
      />
    );
  }

  return (
    <>
      <CabecalhoArea
        nome={avaliador.nome}
        area="Área do conselho"
        inicio="/avaliacao"
        selo={`${rotuloRodada(rodada)}${rodada.is_test ? " · teste" : ""}`}
        titulo={categoria.name}
        texto={
          <>
            {matriz ? matriz.nome : "Votação nominal (art. 13)"} · {candidatos.length}{" "}
            {candidatos.length === 1 ? "concorrente" : "concorrentes"}
            {estado === "aberta" && <> · aberta até {quando(rodada.fecha_em)}</>}
          </>
        }
      />
      <ConteudoArea>
        <Link href="/avaliacao" className="mb-4 inline-flex items-center gap-1.5 rounded-lg bg-papel px-3 py-2 text-sm font-semibold text-fundo shadow-sm">
          <ArrowLeft className="size-4" /> Todas as rodadas
        </Link>
        {corpo}
        {decl && !decl.impedido && estado === "aberta" && (
          <Cartao className="mt-6 p-5">
            <Declaracao rodadaId={rodada.id} candidatos={lista} soImpedimento />
          </Cartao>
        )}
      </ConteudoArea>
    </>
  );
}
