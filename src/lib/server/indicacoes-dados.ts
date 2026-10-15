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

// Quem indica: uma instituição habilitada ou um conselheiro (art. 8º, caput).
export type DonoIndicacao = { entidadeId: string } | { avaliadorId: string };
export const filtroDono = (d: DonoIndicacao) =>
  "entidadeId" in d ? (["entidade_id", d.entidadeId] as const) : (["avaliador_id", d.avaliadorId] as const);
export const donoDaIndicacao = (i: Pick<IndicacaoRow, "entidade_id" | "avaliador_id">): DonoIndicacao =>
  i.avaliador_id ? { avaliadorId: i.avaliador_id } : { entidadeId: i.entidade_id! };

export async function indicacoesDoDono(dono: DonoIndicacao) {
  const [campo, valor] = filtroDono(dono);
  const { data } = await servico()
    .from("indicacoes")
    .select(CAMPOS_INDICACAO)
    .eq(campo, valor)
    .order("criado_em")
    .returns<IndicacaoRow[]>();
  return data ?? [];
}

// Indicações enviadas que contam na cota de quem indica (art. 8º, §§ 3º, 5º e 7º): as da instituição com
// assento e as dos conselheiros que a representam somam juntas. Sem vínculo, cada um tem a sua.
// Se a migração 0011 ainda não rodou, a coluna avaliadores.entidade_id falta e vale a cota individual.
export async function enviadasNaCota(dono: DonoIndicacao) {
  const sb = servico();
  let entidadeId = "entidadeId" in dono ? dono.entidadeId : null;
  if (!entidadeId && "avaliadorId" in dono) {
    const { data, error } = await sb.from("avaliadores").select("entidade_id").eq("id", dono.avaliadorId).maybeSingle();
    if (!error) entidadeId = (data?.entidade_id as string | null) ?? null;
  }
  const avaliadores = new Set<string>("avaliadorId" in dono ? [dono.avaliadorId] : []);
  if (entidadeId) {
    const { data, error } = await sb.from("avaliadores").select("id").eq("entidade_id", entidadeId);
    if (!error) for (const a of data ?? []) avaliadores.add(a.id);
  }
  const filtros = [entidadeId && `entidade_id.eq.${entidadeId}`, avaliadores.size && `avaliador_id.in.(${[...avaliadores].join(",")})`].filter(Boolean);
  const { data } = await sb.from("indicacoes").select("id, category_id").eq("status", "enviada").or(filtros.join(","));
  const conjunta = avaliadores.size + (entidadeId ? 1 : 0) > 1;
  return { lista: (data ?? []) as { id: string; category_id: string | null }[], conjunta };
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
  const [campo, valor] = filtroDono(donoDaIndicacao(i));
  const [{ data: cat }, janela, { data: mesmos }] = await Promise.all([
    i.category_id ? sb.from("categories").select("slug").eq("id", i.category_id).maybeSingle() : Promise.resolve({ data: null }),
    janelaIndicacoes(),
    i.indicado_documento
      ? sb
          .from("indicacoes")
          .select("id, category_id")
          .eq(campo, valor)
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
