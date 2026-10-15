import Link from "next/link";
import { CheckCircle2, ChevronRight, CircleDashed } from "lucide-react";
import { Cartao } from "@/components/area/ui";
import { servico } from "@/lib/server/sessao";
import { janelaIndicacoes } from "@/lib/server/indicacoes-dados";
import { formatarData } from "@/lib/entidades";

// Art. 13: uma proposta por conselheiro em cada categoria honorária, no mesmo prazo das indicações.
export async function PainelHonorarias({ avaliadorId }: { avaliadorId: string }) {
  const sb = servico();
  const [{ data: cats }, { data: propostas }, janela] = await Promise.all([
    sb.from("categories").select("id, slug, name").eq("type", "honorary").order("sort_order"),
    sb.from("propostas_honorarias").select("category_id, indicado_nome, atualizada_em, finalist_id").eq("avaliador_id", avaliadorId),
    janelaIndicacoes(),
  ]);
  const minha = new Map((propostas ?? []).map((p) => [p.category_id, p]));

  return (
    <Cartao>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fundo/55">Honorárias</p>
      <h2 className="text-xl font-semibold">Sua proposta em cada categoria</h2>
      <p className="mt-1 text-sm font-light text-fundo/70">
        Uma proposta por categoria, sem nota. O Conselho escolhe em votação nominal (art. 13).
      </p>
      <ul className="mt-4 divide-y divide-fundo/10 border-t border-fundo/10">
        {(cats ?? []).map((c) => {
          const p = minha.get(c.id);
          const aberta = janela.estado === "aberta";
          return (
            <li key={c.id}>
              <Link href={`/avaliacao/honorarias/${c.slug}`} className="group flex items-center gap-4 py-3.5">
                {p ? <CheckCircle2 className="size-5 shrink-0 text-verde" /> : <CircleDashed className="size-5 shrink-0 text-fundo/40" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="truncate text-sm text-fundo/60">
                    {p
                      ? `${p.indicado_nome} · ${p.finalist_id ? "na votação" : `enviada em ${formatarData(p.atualizada_em)}`}`
                      : aberta
                        ? "Sem proposta ainda"
                        : "Sem proposta"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-verde">{p ? "Ver" : aberta ? "Propor" : ""}</span>
                <ChevronRight className="size-4 text-fundo/40 group-hover:text-fundo" />
              </Link>
            </li>
          );
        })}
      </ul>
    </Cartao>
  );
}
