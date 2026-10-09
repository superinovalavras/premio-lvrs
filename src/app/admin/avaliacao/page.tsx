import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CartaoAdmin, TopoAdmin } from "@/components/admin/ui";
import { servico } from "@/lib/server/sessao";
import { CAMPOS_RODADA, type Rodada } from "@/lib/server/avaliacao-dados";
import { estadoRodada, matrizDaCategoria, rotuloRodada } from "@/lib/avaliacao";
import { TIPO_LABEL, type TipoCategoria } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Avaliação · Painel do Prêmio" };

const TOM = {
  agendada: "bg-white/10 text-white/75",
  aberta: "bg-amarelo/15 text-amarelo",
  encerrada: "bg-verde/35 text-[#8ff0bd]",
};

export default async function PaginaAvaliacao() {
  const sb = servico();
  const [{ data: cats }, { data: concorrentes, error }, { data: rodadas }, { count: avaliadores }] = await Promise.all([
    sb.from("categories").select("id, slug, name, type").order("sort_order"),
    sb.from("finalists").select("category_id, etapa, is_test"),
    sb.from("rodadas").select(CAMPOS_RODADA).order("criado_em").returns<Rodada[]>(),
    sb.from("avaliadores").select("id", { count: "exact", head: true }).eq("ativo", true).eq("is_test", false),
  ]);

  return (
    <>
      <TopoAdmin
        selo="Avaliação do Conselho"
        titulo={
          <>
            Categorias e <span className="enfase">rodadas</span>
          </>
        }
        sub="Cadastre os concorrentes de cada categoria e abra as rodadas. Com mais de 3 indicações aptas, há pré-seleção (art. 11); depois, a avaliação final dos finalistas (art. 15). As honorárias são decididas por votação nominal (art. 13)."
      />
      {error ? (
        <p className="rounded-2xl border border-amarelo/60 bg-amarelo/10 px-4 py-3 text-sm">
          <b className="font-semibold text-amarelo">Falta rodar a migração 0008.</b> Abra o SQL Editor do Supabase e rode o arquivo
          supabase/migrations/0008_avaliacao_conselho.sql.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-white/70">
            {avaliadores ?? 0} avaliadores oficiais ativos.{" "}
            {(avaliadores ?? 0) < 5 && <span className="text-amarelo">Cada categoria precisa de pelo menos 5 avaliações válidas (art. 15, § 4º).</span>}{" "}
            <Link href="/admin/avaliadores" className="font-semibold text-amarelo underline underline-offset-4">
              Gerenciar avaliadores
            </Link>
          </p>
          <div className="grid gap-3">
            {(cats ?? []).map((c) => {
              const lista = (concorrentes ?? []).filter((f) => f.category_id === c.id && !f.is_test);
              const indicados = lista.filter((f) => f.etapa === "indicado").length;
              const finalistas = lista.filter((f) => f.etapa === "finalista").length;
              const rs = (rodadas ?? []).filter((r) => r.category_id === c.id);
              const matriz = matrizDaCategoria(c.slug, c.type);
              return (
                <Link key={c.id} href={`/admin/avaliacao/${c.slug}`} className="group block">
                  <CartaoAdmin className="flex flex-wrap items-center gap-4 transition group-hover:border-amarelo/60">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">
                        {TIPO_LABEL[c.type as TipoCategoria]} · {matriz ? matriz.nome : "Votação nominal (art. 13)"}
                      </p>
                      <h3 className="mt-0.5 font-semibold">{c.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]">
                        <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-white/75">
                          {c.type === "honorary" ? `${lista.length} proposta(s)` : `${indicados} indicado(s) · ${finalistas} finalista(s)`}
                        </span>
                        {rs.map((r) => (
                          <span key={r.id} className={cn("rounded-lg px-2.5 py-0.5", TOM[estadoRodada(r)])}>
                            {rotuloRodada(r)}
                            {r.is_test ? " (teste)" : ""} · {estadoRodada(r)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="size-5 text-white/50 group-hover:text-amarelo" />
                  </CartaoAdmin>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
