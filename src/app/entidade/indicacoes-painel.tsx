import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Aviso, Cartao } from "@/components/area/ui";
import { servico } from "@/lib/server/sessao";
import { indicacoesDaEntidade, janelaIndicacoes } from "@/lib/server/indicacoes-dados";
import { LIMITE_POR_CATEGORIA, LIMITE_TOTAL, STATUS_INDICACAO } from "@/lib/indicacoes";
import { formatarData } from "@/lib/entidades";
import { dia, hora } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { NovaIndicacao } from "./nova-indicacao";

// Lista de indicações da instituição deferida, com as cotas do art. 8º.
export async function PainelIndicacoes({ entidadeId }: { entidadeId: string }) {
  const [lista, janela, { data: cats }] = await Promise.all([
    indicacoesDaEntidade(entidadeId),
    janelaIndicacoes(),
    servico().from("categories").select("id, name"),
  ]);
  const nomeCat = new Map((cats ?? []).map((c) => [c.id, c.name as string]));
  const enviadas = lista.filter((i) => i.status === "enviada");
  const porCategoria = new Map<string, number>();
  for (const i of enviadas) if (i.category_id) porCategoria.set(i.category_id, (porCategoria.get(i.category_id) ?? 0) + 1);
  const cheias = [...porCategoria.entries()].filter(([, n]) => n >= LIMITE_POR_CATEGORIA).map(([id]) => nomeCat.get(id));

  return (
    <Cartao className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fundo/55">Indicações</p>
          <h2 className="text-xl font-semibold">
            {enviadas.length} de {LIMITE_TOTAL} enviadas
          </h2>
        </div>
        {janela.estado === "aberta" && enviadas.length < LIMITE_TOTAL && <NovaIndicacao />}
      </div>
      {janela.estado === "antes" && (
        <Aviso className="mt-4">
          O formulário abre em {dia(janela.abre)}, à {hora(janela.abre)}, e fica disponível até {dia(janela.fecha)}, às {hora(janela.fecha)}.
        </Aviso>
      )}
      {janela.estado === "encerrada" && <Aviso className="mt-4">O prazo de indicações terminou em {dia(janela.fecha)}.</Aviso>}
      {!!cheias.length && (
        <p className="mt-3 text-sm text-fundo/65">
          Categorias com o limite de {LIMITE_POR_CATEGORIA} atingido: {cheias.join(", ")}.
        </p>
      )}

      {lista.length > 0 && (
        <ul className="mt-5 divide-y divide-fundo/10 border-t border-fundo/10">
          {lista.map((i) => (
            <li key={i.id}>
              <Link href={`/entidade/indicacoes/${i.id}`} className="group flex items-center gap-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.indicado_nome || "Indicação sem nome"}</p>
                  <p className="truncate text-sm text-fundo/60">
                    {i.category_id ? nomeCat.get(i.category_id) : "Categoria a escolher"}
                    {i.submetido_em && ` · enviada em ${formatarData(i.submetido_em)}`}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-semibold",
                    i.status === "enviada" ? "bg-verde/10 text-verde" : i.status === "rascunho" ? "bg-amarelo/25 text-fundo" : "bg-nevoa text-fundo/60",
                  )}
                >
                  {i.status === "rascunho" && i.submetido_em ? "Em edição" : STATUS_INDICACAO[i.status]}
                </span>
                <ChevronRight className="size-4 text-fundo/40 group-hover:text-fundo" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!lista.length && janela.estado === "aberta" && (
        <p className="mt-4 text-sm font-light text-fundo/70">Nenhuma indicação ainda. Até 2 por categoria e 6 no total, com evidências da realização.</p>
      )}
    </Cartao>
  );
}
