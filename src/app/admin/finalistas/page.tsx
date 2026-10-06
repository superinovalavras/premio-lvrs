import type { Metadata } from "next";
import { TopoAdmin } from "@/components/admin/ui";
import { servico } from "@/lib/server/sessao";
import { Finalistas } from "./finalistas";

export const metadata: Metadata = { title: "Finalistas · Painel do Prêmio" };

export default async function PaginaFinalistas() {
  const sb = servico();
  const { data: cat } = await sb.from("categories").select("id, name").eq("has_popular_vote", true).maybeSingle();
  const { data } = await sb
    .from("finalists")
    .select("id, name, summary, image_url, technical_score, is_test, sort_order")
    .order("is_test")
    .order("sort_order");
  const idsTeste = (data ?? []).filter((f) => f.is_test).map((f) => f.id);
  const { count: votosTeste } = idsTeste.length
    ? await sb.from("votes").select("id", { count: "exact", head: true }).in("finalist_id", idsTeste)
    : { count: 0 };

  return (
    <>
      <TopoAdmin
        selo={`Prêmio · ${cat?.name ?? "Votação popular"}`}
        titulo={<span className="enfase">Finalistas</span>}
        sub="Os finalistas da votação popular. A nota técnica do COCITIEIS fica só aqui — nunca aparece no site — e pode ser lançada a qualquer momento até a apuração."
      />
      <Finalistas
        votosTeste={votosTeste ?? 0}
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
