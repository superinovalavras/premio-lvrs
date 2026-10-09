import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, CircleDashed, Clock, Lock, PenLine, XCircle } from "lucide-react";
import { CabecalhoArea, ConteudoArea } from "@/components/area/cabecalho";
import { Aviso, Cartao, btnPrim, btnSec } from "@/components/area/ui";
import { exigirAvaliador, servico } from "@/lib/server/sessao";
import { CAMPOS_RODADA, type Rodada } from "@/lib/server/avaliacao-dados";
import { ESCALA, estadoRodada, rotuloRodada } from "@/lib/avaliacao";
import { dia, hora } from "@/lib/datas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Avaliação do Conselho · Prêmio Lavras de Inovação 2026" };

type Situacao = { rotulo: string; tom: "ok" | "pendente" | "alerta" | "neutro"; icone: typeof CheckCircle2 };

const prazo = (iso: string) => `${dia(iso).slice(0, 5)}, ${hora(iso)}`;

export default async function PainelAvaliador() {
  const { avaliador } = await exigirAvaliador();
  const sb = servico();
  const [{ data: rodadas }, { data: cats }, { data: decl }, { data: fichas }, { data: votos }] = await Promise.all([
    sb.from("rodadas").select(CAMPOS_RODADA).eq("is_test", avaliador.is_test).returns<Rodada[]>(),
    sb.from("categories").select("id, name, sort_order"),
    sb.from("declaracoes_avaliador").select("category_id, impedido").eq("avaliador_id", avaliador.id).eq("is_test", avaliador.is_test),
    sb.from("fichas").select("rodada_id, status, enviada_em").eq("avaliador_id", avaliador.id),
    sb.from("votos_honorarios").select("rodada_id, votado_em, invalidado_em").eq("avaliador_id", avaliador.id),
  ]);
  const nomeCat = new Map((cats ?? []).map((c) => [c.id, c.name as string]));
  const ordemCat = new Map((cats ?? []).map((c) => [c.id, c.sort_order as number]));
  const impedido = new Set((decl ?? []).filter((d) => d.impedido).map((d) => d.category_id));

  function situacao(r: Rodada): Situacao {
    if (impedido.has(r.category_id)) return { rotulo: "Impedido nesta categoria", tom: "neutro", icone: XCircle };
    if (r.tipo === "honoraria") {
      const v = (votos ?? []).find((x) => x.rodada_id === r.id);
      if (v?.invalidado_em) return { rotulo: "Voto invalidado", tom: "alerta", icone: XCircle };
      if (v) return { rotulo: `Voto registrado em ${prazo(v.votado_em)}`, tom: "ok", icone: CheckCircle2 };
    } else {
      const f = (fichas ?? []).find((x) => x.rodada_id === r.id);
      if (f?.status === "enviada") return { rotulo: `Ficha enviada em ${prazo(f.enviada_em!)}`, tom: "ok", icone: CheckCircle2 };
      if (f?.status === "invalidada") return { rotulo: "Ficha invalidada", tom: "alerta", icone: XCircle };
      if (f?.status === "rascunho") return { rotulo: "Rascunho salvo — falta enviar", tom: "pendente", icone: PenLine };
    }
    return { rotulo: "Pendente", tom: "pendente", icone: CircleDashed };
  }

  const lista = (rodadas ?? []).sort(
    (a, b) => +new Date(a.fecha_em) - +new Date(b.fecha_em) || (ordemCat.get(a.category_id) ?? 0) - (ordemCat.get(b.category_id) ?? 0),
  );
  const abertas = lista.filter((r) => estadoRodada(r) === "aberta");
  const agendadas = lista.filter((r) => estadoRodada(r) === "agendada");
  const encerradas = lista.filter((r) => estadoRodada(r) === "encerrada").reverse();
  const pendentes = abertas.filter((r) => situacao(r).tom === "pendente").length;

  const card = (r: Rodada) => {
    const st = situacao(r);
    const estado = estadoRodada(r);
    const Icone = st.icone;
    const chamar = estado === "aberta" && st.tom === "pendente";
    return (
      <Cartao key={r.id} className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-verde">
            {rotuloRodada(r)}
            {r.is_test && <span className="ml-2 rounded-md bg-amarelo px-1.5 py-0.5 text-fundo">Teste</span>}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{nomeCat.get(r.category_id)}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-fundo/70">
            <Clock className="size-4" />
            {estado === "agendada"
              ? `Abre ${prazo(r.abre_em)}`
              : estado === "aberta"
                ? `Até ${prazo(r.fecha_em)}`
                : `Encerrada ${prazo(r.encerrada_em ?? r.fecha_em)}`}
          </p>
          <p
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold",
              st.tom === "ok" && "bg-verde/10 text-verde",
              st.tom === "pendente" && "bg-amarelo/25 text-fundo",
              st.tom === "alerta" && "bg-vermelho/10 text-vermelho",
              st.tom === "neutro" && "bg-nevoa text-fundo/70",
            )}
          >
            <Icone className="size-3.5" /> {st.rotulo}
          </p>
        </div>
        {estado === "agendada" ? (
          <span className="flex items-center gap-1.5 text-sm text-fundo/55">
            <Lock className="size-4" /> Ainda fechada
          </span>
        ) : (
          <Link href={`/avaliacao/${r.id}`} className={chamar ? btnPrim : btnSec}>
            {chamar ? "Avaliar" : "Ver"}
          </Link>
        )}
      </Cartao>
    );
  };

  return (
    <>
      <CabecalhoArea
        nome={avaliador.nome}
        area="Área do conselho"
        inicio="/avaliacao"
        selo={avaliador.is_test ? "Avaliador de teste" : "COCITIEIS · Avaliação 2026"}
        titulo={
          <>
            Sua <span className="enfase">avaliação</span>
          </>
        }
        texto={
          abertas.length
            ? pendentes
              ? `Você tem ${pendentes} ${pendentes === 1 ? "rodada pendente" : "rodadas pendentes"}. Cada ficha só conta depois de enviada.`
              : "Tudo enviado nas rodadas abertas. Obrigado!"
            : "Nenhuma rodada aberta agora. Quando a Secretaria abrir uma, ela aparece aqui."
        }
      />
      <ConteudoArea>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid content-start gap-4">
            {!lista.length && (
              <Cartao>
                <p className="font-light text-fundo/75">
                  Ainda não há rodadas. Pelo cronograma, a pré-seleção vai de 29/10 a 03/11 e a avaliação dos finalistas, de
                  06 a 12/11.
                </p>
              </Cartao>
            )}
            {abertas.map(card)}
            {!!agendadas.length && <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-fundo/60">Próximas</h2>}
            {agendadas.map(card)}
            {!!encerradas.length && <h2 className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-fundo/60">Encerradas</h2>}
            {encerradas.map(card)}
          </div>

          <div className="grid content-start gap-4">
            <Cartao className="p-6">
              <h3 className="font-semibold">Como funciona</h3>
              <ul className="mt-2 space-y-2 text-sm font-light text-fundo/75">
                <li>· Antes de cada categoria, você declara se tem impedimento (art. 23).</li>
                <li>· Nota de 0 a 10 em cada critério, com até uma casa decimal. Todos os concorrentes, todos os critérios.</li>
                <li>· Nota abaixo de 4,0 ou acima de 9,0 pede um comentário curto.</li>
                <li>· Você pode salvar e voltar. Depois de enviada, a ficha não muda mais.</li>
                <li>· Ninguém vê as notas dos outros conselheiros nem resultados parciais.</li>
              </ul>
            </Cartao>
            <Cartao className="p-6">
              <h3 className="font-semibold">Escala de pontuação</h3>
              <dl className="mt-2 space-y-2 text-sm">
                {ESCALA.map((e) => (
                  <div key={e.nota} className="grid grid-cols-[44px_1fr] gap-2">
                    <dt className="font-semibold text-verde">{e.nota}</dt>
                    <dd className="font-light text-fundo/75">{e.texto}</dd>
                  </div>
                ))}
              </dl>
            </Cartao>
            {avaliador.is_test && <Aviso tom="alerta">Conta de teste: você só vê rodadas de teste.</Aviso>}
          </div>
        </div>
      </ConteudoArea>
    </>
  );
}
