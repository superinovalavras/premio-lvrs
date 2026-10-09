"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { auditar } from "./auditoria";
import { carregarRodada, invalidarAtosNaCategoria } from "./avaliacao-dados";
import { apurarNotas, apurarVotacao } from "./apuracao";
import { exigirAdmin, servico } from "./sessao";
import { deBrasilia } from "./parametros";
import { estadoRodada } from "@/lib/avaliacao";

export type Resultado = { ok: true; msg?: string; id?: string } | { ok: false; erro: string };

function atualizar() {
  revalidatePath("/admin/avaliacao", "layout");
  revalidatePath("/avaliacao", "layout");
  revalidatePath("/", "layout"); // finalistas da votação popular aparecem no site
}

// ───── Concorrentes (indicados da pré-seleção e finalistas) ─────

export async function prepararUploadMaterial(nome: string, tamanho: number, mime: string) {
  await exigirAdmin();
  if (mime !== "application/pdf") return { ok: false as const, erro: "Envie o material em PDF." };
  if (tamanho > 20 * 1024 * 1024) return { ok: false as const, erro: "O arquivo passa de 20 MB." };
  const seguro = nome.normalize("NFD").replace(/[^\w.-]+/g, "_").slice(-80);
  const caminho = `material/${randomUUID()}-${seguro}`;
  const { data, error } = await servico().storage.from("avaliacao").createSignedUploadUrl(caminho);
  if (error || !data) return { ok: false as const, erro: "Não foi possível preparar o envio." };
  return { ok: true as const, caminho, token: data.token };
}

export async function verMaterial(finalistaId: string) {
  await exigirAdmin();
  const { data: f } = await servico().from("finalists").select("material_path, material_link").eq("id", finalistaId).maybeSingle();
  if (f?.material_path) {
    const { data } = await servico().storage.from("avaliacao").createSignedUrl(f.material_path, 600);
    if (data?.signedUrl) return { ok: true as const, url: data.signedUrl };
  }
  if (f?.material_link) return { ok: true as const, url: f.material_link };
  return { ok: false as const, erro: "Sem material." };
}

export type DadosConcorrente = {
  nome: string;
  resumo: string;
  etapa: "indicado" | "finalista";
  teste: boolean;
  ordem: number;
  link: string;
  material?: { caminho: string; nome: string } | null; // undefined = não mexe
};

// Concorrente que já está em alguma rodada não troca de categoria nem de ambiente.
async function emRodada(id: string) {
  const { count } = await servico().from("rodadas").select("id", { count: "exact", head: true }).contains("candidatos", [id]);
  return (count ?? 0) > 0;
}

export async function salvarConcorrente(id: string | null, categoriaId: string, d: DadosConcorrente): Promise<Resultado> {
  const admin = await exigirAdmin();
  const sb = servico();
  const nome = d.nome.trim().slice(0, 160);
  const resumo = d.resumo.trim().slice(0, 600);
  if (nome.length < 2) return { ok: false, erro: "Informe o nome do concorrente." };
  if (resumo.length < 10) return { ok: false, erro: "Escreva um resumo da realização." };
  const link = d.link.trim().slice(0, 500);
  if (link && !/^https?:\/\/\S+$/i.test(link)) return { ok: false, erro: "O link precisa começar com http:// ou https://." };
  if (d.material && !d.material.caminho.startsWith("material/")) return { ok: false, erro: "Arquivo inválido." };

  const campos: Record<string, unknown> = {
    name: nome,
    summary: resumo,
    etapa: d.etapa,
    sort_order: d.ordem,
    material_link: link || null,
  };
  if (d.material !== undefined) {
    campos.material_path = d.material?.caminho ?? null;
    campos.material_nome = d.material?.nome ?? null;
  }

  if (id) {
    const { data: antes } = await sb.from("finalists").select("name, etapa, is_test, material_path").eq("id", id).maybeSingle();
    if (!antes) return { ok: false, erro: "Concorrente não encontrado." };
    if (antes.is_test !== d.teste && (await emRodada(id))) return { ok: false, erro: "Já está em uma rodada: não dá para trocar entre teste e oficial." };
    const { error } = await sb.from("finalists").update({ ...campos, is_test: d.teste }).eq("id", id);
    if (error) return { ok: false, erro: "Não foi possível salvar." };
    if (d.material !== undefined && antes.material_path) await sb.storage.from("avaliacao").remove([antes.material_path]);
    await auditar(admin, "concorrente_editado", { tipo: "finalista", id }, {
      nome,
      ...(antes.etapa !== d.etapa ? { etapa_antes: antes.etapa, etapa_depois: d.etapa } : {}),
    });
  } else {
    const { data, error } = await sb
      .from("finalists")
      .insert({ ...campos, is_test: d.teste, category_id: categoriaId })
      .select("id")
      .single();
    if (error || !data) return { ok: false, erro: "Não foi possível cadastrar." };
    await auditar(admin, "concorrente_cadastrado", { tipo: "finalista", id: data.id }, { nome, etapa: d.etapa, teste: d.teste });
  }
  atualizar();
  return { ok: true, msg: "Concorrente salvo." };
}

export async function removerConcorrente(id: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const sb = servico();
  const { data: f } = await sb.from("finalists").select("name, is_test, material_path").eq("id", id).maybeSingle();
  if (!f) return { ok: false, erro: "Concorrente não encontrado." };
  if (!f.is_test && (await emRodada(id))) return { ok: false, erro: "Este concorrente já está em uma rodada e não pode ser removido." };
  const { count } = await sb.from("votes").select("id", { count: "exact", head: true }).eq("finalist_id", id);
  if ((count ?? 0) > 0 && !f.is_test) return { ok: false, erro: "Este concorrente já recebeu votos populares." };
  if (f.is_test) {
    // Teste: some junto com as rodadas de teste em que aparece.
    await sb.from("rodadas").delete().contains("candidatos", [id]).eq("is_test", true);
    await sb.from("votes").delete().eq("finalist_id", id);
  }
  const { error } = await sb.from("finalists").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível remover." };
  if (f.material_path) await sb.storage.from("avaliacao").remove([f.material_path]);
  await auditar(admin, "concorrente_removido", { tipo: "finalista", id }, { nome: f.name, teste: f.is_test });
  atualizar();
  return { ok: true, msg: "Concorrente removido." };
}

// ───── Rodadas ─────

export async function criarRodada(
  categoriaId: string,
  d: { tipo: "pre_selecao" | "final" | "honoraria"; turno: 1 | 2; abre: string; fecha: string; teste: boolean; candidatos?: string[] },
): Promise<Resultado> {
  const admin = await exigirAdmin();
  const sb = servico();
  const { data: cat } = await sb.from("categories").select("id, name, type").eq("id", categoriaId).maybeSingle();
  if (!cat) return { ok: false, erro: "Categoria não encontrada." };
  if ((cat.type === "honorary") !== (d.tipo === "honoraria")) {
    return { ok: false, erro: cat.type === "honorary" ? "Categorias honorárias são decididas por votação nominal." : "Esta categoria é avaliada por ficha." };
  }
  const abre = deBrasilia(d.abre);
  const fecha = deBrasilia(d.fecha, true);
  if (!abre || !fecha) return { ok: false, erro: "Preencha abertura e encerramento." };
  if (new Date(fecha) <= new Date(abre)) return { ok: false, erro: "O encerramento precisa ser depois da abertura." };

  // Retrato dos concorrentes: todos os avaliadores pontuam a mesma lista (art. 15, § 1º).
  let q = sb.from("finalists").select("id").eq("category_id", categoriaId).eq("is_test", d.teste);
  if (d.tipo === "pre_selecao") q = q.eq("etapa", "indicado");
  if (d.tipo === "final") q = q.eq("etapa", "finalista");
  const { data: todos } = await q;
  const disponiveis = new Set((todos ?? []).map((f) => f.id));
  const candidatos = d.candidatos?.length ? d.candidatos.filter((id) => disponiveis.has(id)) : [...disponiveis];
  if (d.candidatos?.length && candidatos.length !== d.candidatos.length) return { ok: false, erro: "Lista de concorrentes inválida." };
  if (!candidatos.length) {
    return {
      ok: false,
      erro:
        d.tipo === "pre_selecao"
          ? "Cadastre os indicados (etapa “Indicado”) antes de abrir a pré-seleção."
          : d.tipo === "final"
            ? "Cadastre os finalistas (etapa “Finalista”) antes de abrir a avaliação final."
            : "Cadastre as propostas antes de abrir a votação.",
    };
  }
  if (d.tipo === "honoraria" && d.turno === 2 && candidatos.length < 2) return { ok: false, erro: "A 2ª rodada precisa de dois concorrentes." };

  const { data, error } = await sb
    .from("rodadas")
    .insert({ category_id: categoriaId, tipo: d.tipo, turno: d.tipo === "honoraria" ? d.turno : 1, candidatos, abre_em: abre, fecha_em: fecha, is_test: d.teste, criado_por: admin.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, erro: "Não foi possível criar a rodada." };
  await auditar(admin, "rodada_criada", { tipo: "rodada", id: data.id }, { categoria: cat.name, tipo: d.tipo, turno: d.turno, teste: d.teste, candidatos: candidatos.length });
  atualizar();
  return { ok: true, msg: "Rodada criada.", id: data.id };
}

export async function encerrarRodada(id: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const { error } = await servico().from("rodadas").update({ encerrada_em: new Date().toISOString() }).eq("id", id).is("encerrada_em", null);
  if (error) return { ok: false, erro: "Não foi possível encerrar." };
  await auditar(admin, "rodada_encerrada", { tipo: "rodada", id });
  atualizar();
  return { ok: true, msg: "Rodada encerrada. As fichas em rascunho não contam." };
}

// Prorroga o prazo (ex.: art. 15, § 4º, convocação de suplentes). Só antes do encerramento.
export async function prorrogarRodada(id: string, fecha: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const novo = deBrasilia(fecha, true);
  if (!novo) return { ok: false, erro: "Data inválida." };
  const dados = await carregarRodada(id);
  if (!dados) return { ok: false, erro: "Rodada não encontrada." };
  if (dados.rodada.encerrada_em) return { ok: false, erro: "Rodada encerrada manualmente não reabre. Crie uma nova rodada." };
  if (new Date(novo) <= new Date(dados.rodada.abre_em)) return { ok: false, erro: "O encerramento precisa ser depois da abertura." };
  const { error } = await servico().from("rodadas").update({ fecha_em: novo }).eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível salvar." };
  await auditar(admin, "rodada_prazo_alterado", { tipo: "rodada", id }, { antes: dados.rodada.fecha_em, depois: novo });
  atualizar();
  return { ok: true, msg: "Prazo atualizado." };
}

export async function excluirRodada(id: string, confirmacao: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const dados = await carregarRodada(id);
  if (!dados) return { ok: false, erro: "Rodada não encontrada." };
  const sb = servico();
  if (!dados.rodada.is_test) {
    const [{ count: f }, { count: v }] = await Promise.all([
      sb.from("fichas").select("id", { count: "exact", head: true }).eq("rodada_id", id).neq("status", "rascunho"),
      sb.from("votos_honorarios").select("rodada_id", { count: "exact", head: true }).eq("rodada_id", id),
    ]);
    if ((f ?? 0) + (v ?? 0) > 0) return { ok: false, erro: "Esta rodada oficial já tem fichas ou votos e não pode ser excluída." };
  }
  if (confirmacao.trim().toUpperCase() !== "EXCLUIR") return { ok: false, erro: "Digite EXCLUIR para confirmar." };
  const { error } = await sb.from("rodadas").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível excluir." };
  await auditar(admin, "rodada_excluida", { tipo: "rodada", id }, { categoria: dados.categoria.name, teste: dados.rodada.is_test });
  atualizar();
  return { ok: true, msg: "Rodada excluída." };
}

// Art. 15, § 5º e art. 22, § 1º: invalida a ficha (ou o voto) de um avaliador, com motivo registrado.
export async function invalidarAvaliacao(rodadaId: string, avaliadorId: string, motivo: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const m = motivo.trim().slice(0, 500);
  if (m.length < 5) return { ok: false, erro: "Registre o motivo da invalidação." };
  const sb = servico();
  const agora = new Date().toISOString();
  await sb
    .from("fichas")
    .update({ status: "invalidada", invalidada_em: agora, invalidada_motivo: m })
    .eq("rodada_id", rodadaId)
    .eq("avaliador_id", avaliadorId)
    .neq("status", "invalidada");
  await sb
    .from("votos_honorarios")
    .update({ invalidado_em: agora, invalidado_motivo: m })
    .eq("rodada_id", rodadaId)
    .eq("avaliador_id", avaliadorId)
    .is("invalidado_em", null);
  await auditar(admin, "avaliacao_invalidada", { tipo: "rodada", id: rodadaId }, { avaliador: avaliadorId, motivo: m });
  atualizar();
  return { ok: true, msg: "Avaliação invalidada." };
}

// Art. 23, §§ 4º e 5º: impedimento reconhecido pela Secretaria/plenário. Invalida o que o avaliador fez na categoria.
export async function registrarImpedimento(rodadaId: string, avaliadorId: string, motivo: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const m = motivo.trim().slice(0, 1000);
  if (m.length < 5) return { ok: false, erro: "Registre o motivo do impedimento." };
  const dados = await carregarRodada(rodadaId);
  if (!dados) return { ok: false, erro: "Rodada não encontrada." };
  const { categoria, rodada } = dados;
  const { error } = await servico()
    .from("declaracoes_avaliador")
    .upsert(
      {
        avaliador_id: avaliadorId,
        category_id: categoria.id,
        is_test: rodada.is_test,
        impedido: true,
        hipotese: null,
        motivo: m,
        origem: "secretaria",
        declarado_em: new Date().toISOString(),
      },
      { onConflict: "avaliador_id,category_id,is_test" },
    );
  if (error) return { ok: false, erro: "Não foi possível registrar." };
  await invalidarAtosNaCategoria(avaliadorId, categoria.id, rodada.is_test, `Impedimento registrado pela Secretaria: ${m}`);
  await auditar(admin, "impedimento_registrado", { tipo: "categoria", id: categoria.id }, { avaliador: avaliadorId, motivo: m, teste: rodada.is_test });
  atualizar();
  return { ok: true, msg: "Impedimento registrado. As avaliações do conselheiro nesta categoria foram invalidadas." };
}

// Art. 11: os três maiores resultados com 60 ou mais viram finalistas. Os demais continuam como indicados.
export async function promoverClassificados(rodadaId: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const dados = await carregarRodada(rodadaId);
  if (!dados || dados.rodada.tipo !== "pre_selecao") return { ok: false, erro: "Só vale para a pré-seleção." };
  if (estadoRodada(dados.rodada) !== "encerrada") return { ok: false, erro: "Encerre a rodada antes." };
  const ap = await apurarNotas(dados);
  if (!ap.suficiente) return { ok: false, erro: "Avaliação suspensa: menos de 5 avaliações válidas (art. 15, § 4º)." };
  if (ap.linhas.some((l) => l.destaque && l.empate)) return { ok: false, erro: "Há empate na última vaga: resolva em plenário e promova manualmente." };
  const ids = ap.linhas.filter((l) => l.destaque).map((l) => l.id);
  if (!ids.length) return { ok: false, erro: "Ninguém alcançou 60 pontos." };
  const { error } = await servico().from("finalists").update({ etapa: "finalista" }).in("id", ids);
  if (error) return { ok: false, erro: "Não foi possível promover." };
  await auditar(admin, "finalistas_promovidos", { tipo: "rodada", id: rodadaId }, {
    finalistas: ap.linhas.filter((l) => l.destaque).map((l) => ({ id: l.id, nome: l.nome, nota: l.tecnica })),
  });
  atualizar();
  return { ok: true, msg: `${ids.length} finalista(s) promovido(s). Confira e abra a avaliação final.` };
}

// Abre a 2ª rodada da honorária com os dois mais votados (art. 13).
export async function abrirSegundaRodada(rodadaId: string, abre: string, fecha: string, candidatos: string[]): Promise<Resultado> {
  await exigirAdmin();
  const dados = await carregarRodada(rodadaId);
  if (!dados || dados.rodada.tipo !== "honoraria" || dados.rodada.turno !== 1) return { ok: false, erro: "Só vale para a 1ª rodada honorária." };
  if (estadoRodada(dados.rodada) !== "encerrada") return { ok: false, erro: "Encerre a 1ª rodada antes." };
  const ap = await apurarVotacao(dados);
  if (ap.resultado.tipo !== "segunda_rodada") return { ok: false, erro: "A 1ª rodada não pede segunda rodada." };
  if (candidatos.length !== 2) return { ok: false, erro: "Escolha exatamente dois concorrentes." };
  return criarRodada(dados.categoria.id, { tipo: "honoraria", turno: 2, abre, fecha, teste: dados.rodada.is_test, candidatos });
}
