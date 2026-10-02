import "server-only";
import { FINALISTAS_EXEMPLO, type Finalista } from "@/lib/data";
import { supabasePublico } from "./supabase";
import { MODO_TESTE } from "./ambiente";

export type ResultadoFinalistas = { finalistas: Finalista[]; exemplo: boolean };

export async function carregarFinalistas(): Promise<ResultadoFinalistas> {
  const sb = supabasePublico();
  if (!sb) return { finalistas: FINALISTAS_EXEMPLO, exemplo: true };

  const { data: cat } = await sb
    .from("categories")
    .select("id")
    .eq("has_popular_vote", true)
    .maybeSingle();
  if (!cat) return { finalistas: FINALISTAS_EXEMPLO, exemplo: true };

  const { data, error } = await sb
    .from("public_finalists")
    .select("id, name, summary, image_url")
    .eq("category_id", cat.id)
    // site oficial nunca mostra finalista de teste; o ambiente de teste só mostra os de teste
    .eq("is_test", MODO_TESTE)
    .order("sort_order");

  if (error || !data?.length) return { finalistas: FINALISTAS_EXEMPLO, exemplo: true };

  return {
    exemplo: false,
    finalistas: data.map((f) => ({ id: f.id, nome: f.name, resumo: f.summary, imagem: f.image_url })),
  };
}
