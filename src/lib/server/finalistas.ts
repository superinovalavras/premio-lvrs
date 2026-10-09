import "server-only";
import { FINALISTAS_EXEMPLO, type Finalista } from "@/lib/data";
import { supabaseServico } from "./supabase";
import { MODO_TESTE } from "./ambiente";

export type ResultadoFinalistas = { finalistas: Finalista[]; exemplo: boolean };

export async function carregarFinalistas(): Promise<ResultadoFinalistas> {
  // Lido pelo servidor; nenhuma consulta pública aos finalistas (aviso de segurança do Supabase).
  const sb = supabaseServico();
  if (!sb) return { finalistas: FINALISTAS_EXEMPLO, exemplo: true };

  const { data: cat } = await sb
    .from("categories")
    .select("id")
    .eq("has_popular_vote", true)
    .maybeSingle();
  if (!cat) return { finalistas: FINALISTAS_EXEMPLO, exemplo: true };

  const consulta = (soFinalistas: boolean) => {
    let q = sb
      .from("finalists")
      .select("id, name, summary, image_url")
      .eq("category_id", cat.id)
      // site oficial nunca mostra finalista de teste; o ambiente de teste só mostra os de teste
      .eq("is_test", MODO_TESTE);
    // Indicados ainda na pré-seleção não aparecem no site.
    if (soFinalistas) q = q.eq("etapa", "finalista");
    return q.order("sort_order");
  };
  let { data, error } = await consulta(true);
  // Coluna "etapa" ainda não existe (migração 0008 não rodou): segue como antes.
  if (error?.code === "42703") ({ data, error } = await consulta(false));

  if (error || !data?.length) return { finalistas: FINALISTAS_EXEMPLO, exemplo: true };

  return {
    exemplo: false,
    finalistas: data.map((f) => ({ id: f.id, nome: f.name, resumo: f.summary, imagem: f.image_url })),
  };
}
