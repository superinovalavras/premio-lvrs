import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { CartaoAdmin, TopoAdmin } from "@/components/admin/ui";
import { servico } from "@/lib/server/sessao";
import { CAMPOS_CONCORRENTE, CAMPOS_RODADA, type Concorrente, type Rodada } from "@/lib/server/avaliacao-dados";
import { estadoRodada, matrizDaCategoria, rotuloRodada } from "@/lib/avaliacao";
import { dia, hora } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { Concorrentes } from "./concorrentes";
import { NovaRodada } from "./nova-rodada";

export const metadata: Metadata = { title: "Categoria · Avaliação · Painel do Prêmio" };

const quando = (iso: string) => `${dia(iso).slice(0, 5)} ${hora(iso)}`;
const TOM = { agendada: "bg-white/10 text-white/75", aberta: "bg-amarelo/15 text-amarelo", encerrada: "bg-verde/35 text-[#8ff0bd]" };

export default async function CategoriaAvaliacao({ params }: PageProps<"/admin/avaliacao/[slug]">) {
  const { slug } = await params;
  const sb = servico();
  const { data: cat } = await sb.from("categories").select("id, slug, name, type, has_popular_vote").eq("slug", slug).maybeSingle();
  if (!cat) notFound();
  const [{ data: lista }, { data: rodadas }] = await Promise.all([
    sb.from("finalists").select(CAMPOS_CONCORRENTE).eq("category_id", cat.id).order("is_test").order("etapa").order("sort_order").returns<Concorrente[]>(),
    sb.from("rodadas").select(CAMPOS_RODADA).eq("category_id", cat.id).order("criado_em", { ascending: false }).returns<Rodada[]>(),
  ]);
  const matriz = matrizDaCategoria(cat.slug, cat.type);
  const honoraria = cat.type === "honorary";
  const oficiais = (lista ?? []).filter((f) => !f.is_test);
  const indicados = oficiais.filter((f) => f.etapa === "indicado").length;

  return (
    <>
      <Link href="/admin/avaliacao" className="mb-3 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-amarelo">
        <ArrowLeft className="size-4" /> Todas as categorias
      </Link>
      <TopoAdmin
        selo={matriz ? matriz.nome : "Votação nominal (art. 13)"}
        titulo={cat.name}
        sub={
          honoraria
            ? "Cadastre as propostas fundamentadas apresentadas pelos membros. Havendo mais de uma, a escolha é por votação nominal: vence quem tiver maioria simples dos votos válidos; senão, as duas mais votadas vão para a 2ª rodada."
            : `Cadastre as indicações aptas como “Indicado”. Com mais de 3, abra a pré-seleção: os 3 maiores resultados com 60 ou mais viram finalistas. Com 3 ou menos, cadastre direto como “Finalista”.${cat.has_popular_vote ? " Os finalistas desta categoria também aparecem na votação popular do site." : ""}`
        }
      />

      {matriz && (
        <CartaoAdmin className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-white/60">Critérios e pesos</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {matriz.criterios.map((c) => (
              <span key={c.id} className="rounded-lg bg-white/10 px-2.5 py-1">
                {c.nome} <b className="text-amarelo">{c.peso}</b>
              </span>
            ))}
          </div>
          {indicados > 3 && !(rodadas ?? []).some((r) => r.tipo === "pre_selecao" && !r.is_test) && (
            <p className="mt-3 text-sm text-amarelo">{indicados} indicados oficiais: esta categoria precisa de pré-seleção (art. 11).</p>
          )}
        </CartaoAdmin>
      )}

      <h2 className="mb-3 text-lg font-semibold">Rodadas</h2>
      <div className="mb-3 grid gap-3">
        {(rodadas ?? []).map((r) => {
          const e = estadoRodada(r);
          return (
            <Link key={r.id} href={`/admin/avaliacao/rodada/${r.id}`} className="group block">
              <CartaoAdmin className={cn("flex flex-wrap items-center gap-4 transition group-hover:border-amarelo/60", r.is_test && "border-dashed")}>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">
                    {rotuloRodada(r)} {r.is_test && <span className="ml-1 rounded-md bg-amarelo px-1.5 py-0.5 text-[11px] text-fundo">TESTE</span>}
                  </h3>
                  <p className="mt-0.5 text-sm text-white/70">
                    {quando(r.abre_em)} a {quando(r.encerrada_em ?? r.fecha_em)} · {r.candidatos.length} concorrente(s)
                  </p>
                </div>
                <span className={cn("rounded-lg px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em]", TOM[e])}>{e}</span>
                <ChevronRight className="size-5 text-white/50 group-hover:text-amarelo" />
              </CartaoAdmin>
            </Link>
          );
        })}
        {!rodadas?.length && <p className="text-sm text-white/60">Nenhuma rodada ainda.</p>}
      </div>
      <NovaRodada categoriaId={cat.id} honoraria={honoraria} />

      <h2 className="mb-3 mt-10 text-lg font-semibold">{honoraria ? "Propostas" : "Concorrentes"}</h2>
      <Concorrentes
        categoriaId={cat.id}
        honoraria={honoraria}
        lista={(lista ?? []).map((f) => ({
          id: f.id,
          nome: f.name,
          resumo: f.summary,
          etapa: f.etapa,
          teste: f.is_test,
          ordem: f.sort_order,
          link: f.material_link ?? "",
          materialNome: f.material_nome,
        }))}
      />
    </>
  );
}
