import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CartaoAdmin, TopoAdmin } from "@/components/admin/ui";
import { servico } from "@/lib/server/sessao";
import { janelaIndicacoes } from "@/lib/server/indicacoes-dados";
import { CAMPOS_INDICACAO, menores, type IndicacaoRow } from "@/lib/indicacoes";
import { formatarData } from "@/lib/entidades";
import { dia, hora } from "@/lib/datas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Indicações · Painel do Prêmio" };

export default async function PaginaIndicacoes() {
  const sb = servico();
  const [{ data: lista, error }, { data: cats }, { data: ents }, { data: avs }, janela] = await Promise.all([
    sb.from("indicacoes").select(CAMPOS_INDICACAO).neq("status", "rascunho").order("submetido_em").returns<IndicacaoRow[]>(),
    sb.from("categories").select("id, name, type").order("sort_order"),
    sb.from("entidades").select("id, razao_social"),
    sb.from("avaliadores").select("id, nome"),
    janelaIndicacoes(),
  ]);
  const { count: emEdicao } = await sb.from("indicacoes").select("id", { count: "exact", head: true }).eq("status", "rascunho");
  // Análise de elegibilidade (migração 0011): lida à parte, para a lista funcionar antes da migração.
  const { data: analises } = await sb.from("indicacoes").select("id, analise, reconsideracao, reconsideracao_decisao, finalist_id").neq("status", "rascunho");
  const analise = new Map((analises ?? []).map((a) => [a.id as string, a]));
  const nomeEnt = new Map((ents ?? []).map((e) => [e.id, e.razao_social as string | null]));
  const nomeAv = new Map((avs ?? []).map((a) => [a.id, a.nome as string]));
  const indicador = (i: IndicacaoRow) =>
    i.avaliador_id ? `Conselheiro: ${nomeAv.get(i.avaliador_id) ?? "—"}` : (nomeEnt.get(i.entidade_id ?? "") ?? "Instituição");
  const enviadas = (lista ?? []).filter((i) => i.status === "enviada");

  // Gatilho 3.2: mesmo indicado (CPF/CNPJ) em mais de uma categoria.
  const porDoc = new Map<string, Set<string>>();
  for (const i of enviadas) {
    if (!i.indicado_documento || !i.category_id) continue;
    porDoc.set(i.indicado_documento, (porDoc.get(i.indicado_documento) ?? new Set()).add(i.category_id));
  }
  const repetido = (i: IndicacaoRow) => !!i.indicado_documento && (porDoc.get(i.indicado_documento)?.size ?? 0) > 1;
  const conflito = (i: IndicacaoRow) => !!(i.conflito_indicador || i.conflito_conselho || i.conflito_relacao);

  return (
    <>
      <TopoAdmin
        selo="Indicadores"
        titulo={<span className="enfase">Indicações</span>}
        sub={
          <>
            Indicações enviadas pelas instituições, na ordem de chegada (carimbo do servidor). Prazo: {dia(janela.abre)}, {hora(janela.abre)}, a{" "}
            {dia(janela.fecha)}, {hora(janela.fecha)} · <b className="font-semibold text-white">{janela.estado === "aberta" ? "aberto" : janela.estado === "antes" ? "ainda não abriu" : "encerrado"}</b>.
          </>
        }
      />
      {error ? (
        <p className="rounded-2xl border border-amarelo/60 bg-amarelo/10 px-4 py-3 text-sm">
          <b className="font-semibold text-amarelo">Falta rodar a migração 0009.</b> Abra o SQL Editor do Supabase e rode o arquivo
          supabase/migrations/0009_indicacoes.sql.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-white/70">
            {enviadas.length} enviadas{emEdicao ? ` · ${emEdicao} em rascunho ou em edição (não contam até serem enviadas)` : ""}
          </p>
          <div className="grid gap-5">
            {(cats ?? []).map((c) => {
              const daCat = enviadas.filter((i) => i.category_id === c.id);
              return (
                <CartaoAdmin key={c.id}>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="flex-1 font-semibold">{c.name}</h2>
                    <span
                      className={cn(
                        "rounded-lg px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
                        c.type === "honorary"
                          ? "bg-white/10 text-white/75"
                          : daCat.length > 3
                            ? "bg-amarelo/15 text-amarelo"
                            : daCat.length < 3
                              ? "bg-vermelho/25 text-[#ff8a8f]"
                              : "bg-verde/35 text-[#8ff0bd]",
                      )}
                    >
                      {daCat.length} {daCat.length === 1 ? "indicação" : "indicações"}
                      {c.type !== "honorary" && daCat.length > 3 && " · pré-seleção (art. 11)"}
                      {c.type !== "honorary" && daCat.length < 3 && " · menos de 3"}
                    </span>
                  </div>
                  {daCat.length > 0 && (
                    <ul className="mt-3 divide-y divide-white/10">
                      {daCat.map((i) => (
                        <li key={i.id}>
                          <Link href={`/admin/indicacoes/${i.id}`} className="group flex flex-wrap items-center gap-3 py-2.5">
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium">{i.indicado_nome}</p>
                              <p className="truncate text-[13px] text-white/60">
                                {indicador(i)} · {formatarData(i.submetido_em)}
                                {i.versao > 1 && ` · versão ${i.versao}`}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]">
                              {(() => {
                                const a = analise.get(i.id);
                                if (!a || i.status !== "enviada") return null;
                                if (a.finalist_id) return <span className="rounded-lg bg-verde/35 px-2 py-0.5 text-[#8ff0bd]">Concorrente</span>;
                                if (a.reconsideracao && !a.reconsideracao_decisao) return <span className="rounded-lg bg-amarelo/15 px-2 py-0.5 text-amarelo">Reconsideração</span>;
                                if (a.analise === "apta") return <span className="rounded-lg bg-verde/35 px-2 py-0.5 text-[#8ff0bd]">Apta</span>;
                                if (a.analise === "inapta") return <span className="rounded-lg bg-vermelho/25 px-2 py-0.5 text-[#ff8a8f]">Inapta</span>;
                                return <span className="rounded-lg bg-white/10 px-2 py-0.5 text-white/75">A analisar</span>;
                              })()}
                              {conflito(i) && <span className="rounded-lg bg-amarelo/15 px-2 py-0.5 text-amarelo">Conflito declarado</span>}
                              {repetido(i) && <span className="rounded-lg bg-amarelo/15 px-2 py-0.5 text-amarelo">Em 2+ categorias</span>}
                              {menores(i).length > 0 && <span className="rounded-lg bg-vermelho/25 px-2 py-0.5 text-[#ff8a8f]">Menor de 18 (art. 7º)</span>}
                            </div>
                            <ChevronRight className="size-4 text-white/40 group-hover:text-amarelo" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CartaoAdmin>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
