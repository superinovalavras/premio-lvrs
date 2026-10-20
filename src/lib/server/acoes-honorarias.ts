"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "./auditoria";
import { exigirAdmin, servico } from "./sessao";

export type Resultado = { ok: true; msg?: string } | { ok: false; erro: string };

// A Secretaria leva a proposta para a votação nominal: ela vira concorrente ("indicado") da categoria.
export async function incluirPropostaNaVotacao(propostaId: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const sb = servico();
  const { data: p } = await sb
    .from("propostas_honorarias")
    .select("id, category_id, indicado_nome, justificativa, link, finalist_id, is_test")
    .eq("id", propostaId)
    .maybeSingle();
  if (!p) return { ok: false, erro: "Proposta não encontrada." };
  if (p.finalist_id) return { ok: false, erro: "Esta proposta já está na votação." };
  const { data: f, error } = await sb
    .from("finalists")
    .insert({
      category_id: p.category_id,
      name: p.indicado_nome.slice(0, 160),
      summary: p.justificativa.slice(0, 600),
      etapa: "indicado",
      material_link: p.link,
      is_test: p.is_test,
      sort_order: 0,
    })
    .select("id")
    .single();
  if (error || !f) return { ok: false, erro: "Não foi possível incluir na votação." };
  await sb.from("propostas_honorarias").update({ finalist_id: f.id }).eq("id", p.id);
  await auditar(admin, "proposta_honoraria_incluida", { tipo: "finalista", id: f.id }, { proposta: p.id, nome: p.indicado_nome });
  revalidatePath("/admin/avaliacao", "layout");
  revalidatePath("/avaliacao", "layout");
  return { ok: true, msg: "Incluída como concorrente. Abra a rodada de votação nominal quando todas chegarem." };
}
