import "server-only";
import { servico } from "./sessao";
import { carregarParametros } from "./parametros";
import { MODO_TESTE } from "./ambiente";
import { CAMPOS_INDICACAO, type Contexto, type IndDocRow, type IndicacaoRow } from "@/lib/indicacoes";

export async function carregarIndicacao(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = servico();
  const { data: indicacao } = await sb.from("indicacoes").select(CAMPOS_INDICACAO).eq("id", id).maybeSingle<IndicacaoRow>();
  if (!indicacao) return null;
  const { data: docs } = await sb
    .from("indicacao_documentos")
    .select("id, tipo, nome_arquivo, tamanho, link, storage_path, enviado_em")
    .eq("indicacao_id", id)
    .order("enviado_em");
  return { indicacao, documentos: (docs ?? []) as IndDocRow[] };
}

export async function indicacoesDaEntidade(entidadeId: string) {
  const { data } = await servico()
    .from("indicacoes")
    .select(CAMPOS_INDICACAO)
    .eq("entidade_id", entidadeId)
    .order("criado_em")
    .returns<IndicacaoRow[]>();
  return data ?? [];
}

// Prazo de indicações (art. 8º-A, II), sempre pelo relógio do servidor.
export async function janelaIndicacoes(agora = new Date()) {
  const par = await carregarParametros();
  const abre = new Date(par.indicacoesAbrem);
  const fecha = new Date(par.indicacoesFecham);
  const estado: "antes" | "aberta" | "encerrada" = MODO_TESTE ? "aberta" : agora < abre ? "antes" : agora > fecha ? "encerrada" : "aberta";
  return { abre: par.indicacoesAbrem, fecha: par.indicacoesFecham, estado };
}

export async function contextoIndicacao(i: IndicacaoRow): Promise<Contexto> {
  const sb = servico();
  const [{ data: cat }, janela, { data: mesmos }] = await Promise.all([
    i.category_id ? sb.from("categories").select("slug").eq("id", i.category_id).maybeSingle() : Promise.resolve({ data: null }),
    janelaIndicacoes(),
    i.indicado_documento
      ? sb
          .from("indicacoes")
          .select("id, category_id")
          .eq("entidade_id", i.entidade_id)
          .eq("indicado_documento", i.indicado_documento)
          .neq("id", i.id)
          .neq("status", "desconsiderada")
      : Promise.resolve({ data: [] as { id: string; category_id: string | null }[] }),
  ]);
  return {
    categoriaSlug: (cat as { slug: string } | null)?.slug ?? null,
    fechamento: janela.fecha,
    mesmoIndicadoEmOutra: (mesmos ?? []).some((m) => m.category_id && m.category_id !== i.category_id),
  };
}
