import "server-only";
import { servico } from "./sessao";
import { matrizDaCategoria, type Matriz } from "@/lib/avaliacao";

export type Rodada = {
  id: string;
  category_id: string;
  tipo: "pre_selecao" | "final" | "honoraria";
  turno: number;
  candidatos: string[];
  abre_em: string;
  fecha_em: string;
  encerrada_em: string | null;
  is_test: boolean;
  criado_em: string;
};

export type Categoria = { id: string; slug: string; name: string; type: string; has_popular_vote: boolean };

export type Concorrente = {
  id: string;
  name: string;
  summary: string;
  etapa: "indicado" | "finalista";
  is_test: boolean;
  sort_order: number;
  image_url: string | null;
  material_path: string | null;
  material_nome: string | null;
  material_link: string | null;
};

export const CAMPOS_RODADA = "id, category_id, tipo, turno, candidatos, abre_em, fecha_em, encerrada_em, is_test, criado_em";
export const CAMPOS_CONCORRENTE =
  "id, name, summary, etapa, is_test, sort_order, image_url, material_path, material_nome, material_link";

// Rodada com a categoria, a matriz e os concorrentes na ordem do site.
export async function carregarRodada(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const sb = servico();
  const { data: rodada } = await sb.from("rodadas").select(CAMPOS_RODADA).eq("id", id).maybeSingle<Rodada>();
  if (!rodada) return null;
  const [{ data: categoria }, { data: lista }] = await Promise.all([
    sb.from("categories").select("id, slug, name, type, has_popular_vote").eq("id", rodada.category_id).single<Categoria>(),
    sb.from("finalists").select(CAMPOS_CONCORRENTE).in("id", rodada.candidatos).order("sort_order").order("name"),
  ]);
  if (!categoria) return null;
  const matriz: Matriz | null = matrizDaCategoria(categoria.slug, categoria.type);
  return { rodada, categoria, matriz, candidatos: (lista ?? []) as Concorrente[] };
}

export type DadosRodada = NonNullable<Awaited<ReturnType<typeof carregarRodada>>>;

// Impedido na categoria: fichas e votos dela deixam de valer (art. 23, §§ 2º e 5º).
export async function invalidarAtosNaCategoria(avaliadorId: string, categoryId: string, isTest: boolean, motivo: string) {
  const sb = servico();
  const { data: rodadas } = await sb.from("rodadas").select("id").eq("category_id", categoryId).eq("is_test", isTest);
  const ids = (rodadas ?? []).map((r) => r.id);
  if (!ids.length) return;
  const agora = new Date().toISOString();
  await sb
    .from("fichas")
    .update({ status: "invalidada", invalidada_em: agora, invalidada_motivo: motivo })
    .eq("avaliador_id", avaliadorId)
    .in("rodada_id", ids)
    .neq("status", "invalidada");
  await sb
    .from("votos_honorarios")
    .update({ invalidado_em: agora, invalidado_motivo: motivo })
    .eq("avaliador_id", avaliadorId)
    .in("rodada_id", ids)
    .is("invalidado_em", null);
}
