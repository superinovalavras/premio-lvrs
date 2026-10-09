import type { Metadata } from "next";
import { TopoAdmin } from "@/components/admin/ui";
import { servico } from "@/lib/server/sessao";
import { Finalistas } from "./finalistas";

export const metadata: Metadata = { title: "Finalistas · Painel do Prêmio" };

export default async function PaginaFinalistas() {
  const sb = servico();
  const { data: cat } = await sb.from("categories").select("id, name").eq("has_popular_vote", true).maybeSingle();
  // Só os finalistas da votação popular; os concorrentes das outras categorias ficam em Avaliação.
  const consulta = (soFinalistas: boolean) => {
    let q = sb
      .from("finalists")
      .select("id, name, summary, image_url, technical_score, is_test, sort_order")
      .eq("category_id", cat?.id ?? "00000000-0000-0000-0000-000000000000");
    if (soFinalistas) q = q.eq("etapa", "finalista");
    return q.order("is_test").order("sort_order");
  };
  let { data, error } = await consulta(true);
  if (error?.code === "42703") ({ data, error } = await consulta(false));
  const { count: votos } = await sb.from("votes").select("id", { count: "exact", head: true });

  return (
    <>
      <TopoAdmin
        selo={`Prêmio · ${cat?.name ?? "Votação popular"}`}
        titulo={<span className="enfase">Finalistas</span>}
        sub="Os finalistas da votação popular, como aparecem no site. A nota técnica sai das fichas dos conselheiros (Avaliação); o campo manual aqui só serve se a avaliação for feita em papel."
      />
      <Finalistas
        votos={votos ?? 0}
        lista={(data ?? []).map((f) => ({
          id: f.id,
          nome: f.name,
          resumo: f.summary,
          imagem: f.image_url,
          nota: f.technical_score === null ? "" : String(f.technical_score),
          teste: f.is_test,
          ordem: f.sort_order,
        }))}
      />
    </>
  );
}
