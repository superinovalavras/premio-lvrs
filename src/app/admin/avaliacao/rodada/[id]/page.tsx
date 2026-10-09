import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CartaoAdmin, TopoAdmin } from "@/components/admin/ui";
import { carregarRodada } from "@/lib/server/avaliacao-dados";
import { apurarNotas, apurarVotacao, type SituacaoFicha } from "@/lib/server/apuracao";
import { MIN_AVALIACOES, estadoRodada, formatarNota, rotuloRodada } from "@/lib/avaliacao";
import { dia, hora } from "@/lib/datas";
import { paraBrasilia } from "@/lib/server/parametros";
import { cn } from "@/lib/utils";
import { AcoesLinha, AcoesRodada, Promover, SegundaRodada } from "./acoes";

export const metadata: Metadata = { title: "Rodada · Avaliação · Painel do Prêmio" };

const quando = (iso: string) => `${dia(iso)} às ${hora(iso)}`;
const n2 = (n: number | null | undefined) => (n === null || n === undefined ? "—" : formatarNota(n, 2));

const STATUS: Record<SituacaoFicha["status"], { rotulo: string; tom: string }> = {
  valida: { rotulo: "Enviada", tom: "bg-verde/35 text-[#8ff0bd]" },
  rascunho: { rotulo: "Rascunho", tom: "bg-amarelo/15 text-amarelo" },
  pendente: { rotulo: "Não começou", tom: "bg-white/10 text-white/75" },
  impedido: { rotulo: "Impedido", tom: "bg-white/10 text-white/75" },
  invalidada: { rotulo: "Invalidada", tom: "bg-vermelho/25 text-[#ff8a8f]" },
};

export default async function RodadaAdmin({ params }: PageProps<"/admin/avaliacao/rodada/[id]">) {
  const { id } = await params;
  const dados = await carregarRodada(id);
  if (!dados) notFound();
  const { rodada, categoria, matriz, candidatos } = dados;
  const estado = estadoRodada(rodada);
  const encerrada = estado === "encerrada";
  const slug = categoria.slug;

  const notas = matriz ? await apurarNotas(dados) : null;
  const votacao = matriz ? null : await apurarVotacao(dados);

  const participacao = notas
    ? notas.situacoes.map((s) => ({ id: s.avaliadorId, nome: s.nome, status: s.status, detalhe: s.detalhe }))
    : votacao!.nominal.map((v) => ({
        id: v.avaliadorId,
        nome: v.nome,
        status: (v.escolha === "Impedido" ? "impedido" : v.escolha.startsWith("Invalidado") ? "invalidada" : v.votou ? "valida" : "pendente") as SituacaoFicha["status"],
        detalhe: encerrada && v.votou ? `Voto: ${v.escolha}` : undefined,
      }));
  const enviaram = participacao.filter((p) => p.status === "valida").length;

  return (
    <>
      <Link href={`/admin/avaliacao/${slug}`} className="mb-3 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-amarelo">
        <ArrowLeft className="size-4" /> {categoria.name}
      </Link>
      <TopoAdmin
        selo={`${rotuloRodada(rodada)}${rodada.is_test ? " · teste" : ""}`}
        titulo={categoria.name}
        sub={
          <>
            {quando(rodada.abre_em)} a {quando(rodada.encerrada_em ?? rodada.fecha_em)} ·{" "}
            <b className={cn("font-semibold", estado === "aberta" ? "text-amarelo" : "text-white")}>
              {estado === "aberta" ? "aberta" : estado === "agendada" ? "agendada" : "encerrada"}
            </b>{" "}
            · {matriz ? matriz.nome : "votação nominal (art. 13)"}
          </>
        }
        acoes={<AcoesRodada id={rodada.id} slug={slug} estado={estado} teste={rodada.is_test} manual={!!rodada.encerrada_em} fecha={paraBrasilia(rodada.fecha_em)} />}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="grid content-start gap-6">
          {!encerrada ? (
            <CartaoAdmin>
              <h2 className="font-semibold">Resultado</h2>
              <p className="mt-1 text-sm text-white/70">
                O resultado aparece aqui quando a rodada encerrar, no prazo ou pelo botão “Encerrar agora”. Até lá ninguém vê notas
                nem parciais.
              </p>
            </CartaoAdmin>
          ) : notas ? (
            <CartaoAdmin className="overflow-x-auto">
              <h2 className="font-semibold">Apuração</h2>
              <p className="mt-1 text-sm text-white/70">
                {notas.validas} avaliações válidas
                {!notas.suficiente && (
                  <span className="text-[#ff8a8f]">
                    {" "}
                    · abaixo do mínimo de {MIN_AVALIACOES}: avaliação suspensa (art. 15, § 4º). Convoque suplentes e abra nova rodada.
                  </span>
                )}
                {notas.trava && <span className="text-amarelo"> · trava dos 10 pontos aplicada (art. 19, § 9º)</span>}
              </p>
              <table className="mt-4 w-full min-w-[640px] text-sm">
                <thead className="text-left text-[11px] uppercase tracking-[0.12em] text-white/55">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Concorrente</th>
                    <th className="py-2 pr-3 text-right">Técnica</th>
                    {notas.popular && <th className="py-2 pr-3 text-right">Votos</th>}
                    {notas.popular && <th className="py-2 pr-3 text-right">Popular</th>}
                    {notas.popular && <th className="py-2 pr-3 text-right">Final</th>}
                    <th className="py-2">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {notas.linhas.map((l) => (
                    <tr key={l.id} className={cn("border-b border-white/10 last:border-0", l.destaque && "bg-verde/15")}>
                      <td className="py-2.5 pr-3 font-semibold">{l.posicao}º</td>
                      <td className="py-2.5 pr-3 font-medium">{l.nome}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{n2(l.tecnica)}</td>
                      {notas.popular && <td className="py-2.5 pr-3 text-right tabular-nums">{l.votos}</td>}
                      {notas.popular && <td className="py-2.5 pr-3 text-right tabular-nums">{n2(l.popular)}</td>}
                      {notas.popular && <td className="py-2.5 pr-3 text-right font-semibold tabular-nums">{n2(l.final)}</td>}
                      <td className={cn("py-2.5 text-[13px]", l.destaque ? "text-[#8ff0bd]" : l.empate ? "text-amarelo" : "text-white/70")}>{l.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <details className="mt-5 text-sm">
                <summary className="cursor-pointer font-semibold text-white/85">Médias por critério (base do desempate, art. 21)</summary>
                <table className="mt-3 w-full min-w-[640px]">
                  <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-white/55">
                    <tr className="border-b border-white/10">
                      <th className="py-2 pr-3">Concorrente</th>
                      {matriz!.criterios.map((c) => (
                        <th key={c.id} className="py-2 pr-3 text-right" title={c.nome}>
                          {c.nome.split(" ")[0]} ({c.peso})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {notas.linhas.map((l) => (
                      <tr key={l.id} className="border-b border-white/10 last:border-0">
                        <td className="py-2 pr-3">{l.nome}</td>
                        {matriz!.criterios.map((c) => (
                          <td key={c.id} className="py-2 pr-3 text-right tabular-nums">
                            {n2(l.porCriterio[c.id])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>

              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold text-white/85">Notas individuais (para a ata, art. 22)</summary>
                <table className="mt-3 w-full min-w-[640px]">
                  <thead className="text-left text-[11px] uppercase tracking-[0.1em] text-white/55">
                    <tr className="border-b border-white/10">
                      <th className="py-2 pr-3">Avaliador</th>
                      {notas.linhas.map((l) => (
                        <th key={l.id} className="py-2 pr-3 text-right">
                          {l.nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(notas.linhas[0]?.individuais ?? []).map((ind, i) => (
                      <tr key={i} className="border-b border-white/10 last:border-0">
                        <td className="py-2 pr-3">{ind.avaliador}</td>
                        {notas.linhas.map((l) => (
                          <td key={l.id} className="py-2 pr-3 text-right tabular-nums">
                            {n2(l.individuais[i]?.nota)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>

              {rodada.tipo === "pre_selecao" && notas.suficiente && <Promover id={rodada.id} />}
            </CartaoAdmin>
          ) : (
            <CartaoAdmin>
              <h2 className="font-semibold">Apuração</h2>
              <p className="mt-1 text-sm text-white/70">
                {votacao!.validos} votos válidos · {votacao!.abstencoes} abstenção(ões)
              </p>
              <ul className="mt-4 grid gap-2">
                {votacao!.linhas.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5">
                    <span className="flex-1 font-medium">{l.nome}</span>
                    <span className="font-semibold tabular-nums">{l.votos}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl border border-white/15 px-4 py-3 text-sm">
                {votacao!.resultado.tipo === "vencedor" && (
                  <>
                    <b className="text-[#8ff0bd]">{votacao!.linhas.find((l) => l.id === (votacao!.resultado as { id: string }).id)?.nome}</b>{" "}
                    {rodada.turno === 1 ? "tem maioria simples dos votos válidos." : "é o mais votado na 2ª rodada."}
                  </>
                )}
                {votacao!.resultado.tipo === "segunda_rodada" && (
                  <>
                    Ninguém alcançou maioria simples. As duas propostas mais votadas seguem para a 2ª rodada (art. 13).
                    {votacao!.resultado.empateNaVaga && <span className="text-amarelo"> Há empate na segunda vaga: decida em plenário quais seguem.</span>}
                  </>
                )}
                {votacao!.resultado.tipo === "empate" && <span className="text-amarelo">Empate na 2ª rodada: decisão do plenário.</span>}
                {votacao!.resultado.tipo === "sem_votos" && "Nenhum voto válido."}
              </p>
              {votacao!.resultado.tipo === "segunda_rodada" && (
                <SegundaRodada id={rodada.id} candidatos={candidatos.map((c) => ({ id: c.id, nome: c.name }))} sugeridos={votacao!.resultado.ids} />
              )}
            </CartaoAdmin>
          )}

          <CartaoAdmin>
            <h2 className="font-semibold">Concorrentes desta rodada</h2>
            <ul className="mt-3 grid gap-1.5 text-sm">
              {candidatos.map((c) => (
                <li key={c.id} className="text-white/80">
                  · {c.name}
                </li>
              ))}
            </ul>
          </CartaoAdmin>
        </div>

        <CartaoAdmin className="content-start">
          <h2 className="font-semibold">Participação</h2>
          <p className="mt-1 text-sm text-white/70">
            {enviaram} de {participacao.length} {matriz ? "fichas enviadas" : "votos registrados"}
          </p>
          <ul className="mt-4 grid gap-3">
            {participacao.map((p) => (
              <li key={p.id} className="rounded-xl bg-white/5 px-3.5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium">{p.nome}</span>
                  <span className={cn("rounded-lg px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]", STATUS[p.status].tom)}>
                    {STATUS[p.status].rotulo}
                  </span>
                </div>
                {p.detalhe && <p className="mt-1 text-[12.5px] text-white/60">{p.detalhe}</p>}
                {p.status !== "impedido" && <AcoesLinha rodadaId={rodada.id} avaliadorId={p.id} nome={p.nome} podeInvalidar={p.status === "valida" || p.status === "rascunho"} />}
              </li>
            ))}
            {!participacao.length && <li className="text-sm text-white/60">Nenhum avaliador {rodada.is_test ? "de teste" : ""} cadastrado.</li>}
          </ul>
        </CartaoAdmin>
      </div>
    </>
  );
}
