import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Aviso, Cartao } from "@/components/area/ui";
import { servico } from "@/lib/server/sessao";
import { enviadasNaCota, indicacoesDoDono, janelaIndicacoes, type DonoIndicacao } from "@/lib/server/indicacoes-dados";
import { LIMITE_POR_CATEGORIA, LIMITE_TOTAL, STATUS_INDICACAO } from "@/lib/indicacoes";
import { formatarData } from "@/lib/entidades";
import { dia, hora } from "@/lib/datas";
import { cn } from "@/lib/utils";
import { NovaIndicacao } from "./nova-indicacao";

// Lista de indicações de quem indica (instituição deferida ou conselheiro), com as cotas do art. 8º.
export async function PainelIndicacoes({ dono, base = "/entidade" }: { dono: DonoIndicacao; base?: "/entidade" | "/avaliacao" }) {
  const [lista, janela, { data: cats }, cota] = await Promise.all([
    indicacoesDoDono(dono),
    janelaIndicacoes(),
    servico().from("categories").select("id, name"),
    enviadasNaCota(dono),
  ]);
  const nomeCat = new Map((cats ?? []).map((c) => [c.id, c.name as string]));
  // Decisão preliminar (art. 10, § 2º), lida à parte para funcionar antes da migração 0011.
  const { data: analises } = await servico()
    .from("indicacoes")
    .select("id, analise")
    .in("id", lista.map((i) => i.id).concat("00000000-0000-0000-0000-000000000000"));
  const analise = new Map((analises ?? []).map((a) => [a.id as string, a.analise as "apta" | "inapta" | null]));
  // Art. 8º, § 7º: a cota pode ser conjunta (instituição com assento + seus conselheiros).
  const enviadas = cota.lista;
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
          {cota.conjunta && (
            <p className="mt-0.5 text-[13px] text-fundo/60">
              Cota somada com {"entidadeId" in dono ? "o seu representante no COCITIEIS" : "a instituição que você representa"} (art. 8º, §
              7º).
            </p>
          )}
        </div>
        {janela.estado === "aberta" && enviadas.length < LIMITE_TOTAL && (
          <NovaIndicacao origem={"entidadeId" in dono ? "entidade" : "conselheiro"} base={base} />
        )}
      </div>
      {janela.estado === "aberta" && enviadas.length < LIMITE_TOTAL && (
        <p className="mt-4 rounded-2xl bg-amarelo px-4 py-3 font-bold text-fundo">
          {enviadas.length
            ? `Restam ${LIMITE_TOTAL - enviadas.length} de ${LIMITE_TOTAL} indicações.`
            : `Só ${LIMITE_TOTAL} indicações no total.`}{" "}
          Escolha com atenção.
        </p>
      )}
      {janela.estado === "antes" && (
        <Aviso className="mt-4">
          O formulário abre em {dia(janela.abre)}, à {hora(janela.abre)}, e fica disponível até {dia(janela.fecha)}, às {hora(janela.fecha)}
          .
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
              <Link href={`${base}/indicacoes/${i.id}`} className="group flex items-center gap-4 py-3.5">
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
                    analise.get(i.id) === "inapta"
                      ? "bg-vermelho/10 text-vermelho"
                      : i.status === "enviada"
                        ? "bg-verde/10 text-verde"
                        : i.status === "rascunho"
                          ? "bg-amarelo/25 text-fundo"
                          : "bg-nevoa text-fundo/60",
                  )}
                >
                  {i.status === "rascunho" && i.submetido_em
                    ? "Em edição"
                    : i.status === "enviada" && analise.get(i.id)
                      ? analise.get(i.id) === "apta"
                        ? "Apta"
                        : "Inapta"
                      : STATUS_INDICACAO[i.status]}
                </span>
                <ChevronRight className="size-4 text-fundo/40 group-hover:text-fundo" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!lista.length && janela.estado === "aberta" && (
        <p className="mt-4 text-sm font-light text-fundo/70">Nenhuma indicação ainda. Cada uma precisa de evidências da realização.</p>
      )}
    </Cartao>
  );
}
