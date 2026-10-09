"use server";

import { revalidatePath } from "next/cache";
import { auditar } from "./auditoria";
import { carregarRodada, invalidarAtosNaCategoria } from "./avaliacao-dados";
import { exigirAvaliador, ipDaRequisicao, servico, userAgent } from "./sessao";
import { HIPOTESES_IMPEDIMENTO, estadoRodada, exigeComentario, lerNota } from "@/lib/avaliacao";

export type Resultado = { ok: true; msg?: string } | { ok: false; erro: string };
export type NotaEnviada = { finalista: string; criterio: string; nota: string; comentario: string };

// Avaliador ativo, rodada aberta, do mesmo ambiente (teste ou oficial).
async function contexto(rodadaId: string) {
  const { user, avaliador } = await exigirAvaliador();
  const dados = await carregarRodada(rodadaId);
  if (!dados || dados.rodada.is_test !== avaliador.is_test) return { erro: "Rodada não encontrada." } as const;
  if (estadoRodada(dados.rodada) !== "aberta") return { erro: "Esta rodada não está aberta." } as const;
  const { data: declaracao } = await servico()
    .from("declaracoes_avaliador")
    .select("impedido")
    .eq("avaliador_id", avaliador.id)
    .eq("category_id", dados.categoria.id)
    .eq("is_test", dados.rodada.is_test)
    .maybeSingle();
  return { user, avaliador, ...dados, declaracao } as const;
}

// Declaração da categoria antes de ver as fichas. "Não impedido" pode virar "impedido" depois
// (o conselheiro que descobre um vínculo deve se declarar); o contrário só pela Secretaria.
export async function declarar(rodadaId: string, fd: FormData): Promise<Resultado> {
  const c = await contexto(rodadaId);
  if ("erro" in c) return { ok: false, erro: c.erro! };
  const impedido = fd.get("impedido") === "sim";
  if (c.declaracao && (c.declaracao.impedido || !impedido)) return { ok: false, erro: "A declaração desta categoria já foi registrada." };

  let hipotese: string | null = null;
  let finalista: string | null = null;
  let motivo: string | null = null;
  if (impedido) {
    hipotese = String(fd.get("hipotese") ?? "");
    if (!HIPOTESES_IMPEDIMENTO.some((h) => h.id === hipotese)) return { ok: false, erro: "Escolha a hipótese de impedimento." };
    finalista = String(fd.get("finalista") ?? "") || null;
    if (finalista && !c.rodada.candidatos.includes(finalista)) return { ok: false, erro: "Concorrente inválido." };
    motivo = String(fd.get("motivo") ?? "").trim().slice(0, 1000);
    if (motivo.length < 5) return { ok: false, erro: "Descreva o motivo em poucas palavras." };
  } else if (fd.get("ciente") !== "on") {
    return { ok: false, erro: "Confirme que examinou a lista de concorrentes." };
  }

  const registro = {
    avaliador_id: c.avaliador.id,
    category_id: c.categoria.id,
    is_test: c.rodada.is_test,
    impedido,
    hipotese,
    finalist_id: finalista,
    motivo,
    origem: "avaliador",
    declarado_em: new Date().toISOString(),
    ip: await ipDaRequisicao(),
    user_agent: await userAgent(),
  };
  const sb = servico();
  const { error } = c.declaracao
    ? await sb
        .from("declaracoes_avaliador")
        .update(registro)
        .eq("avaliador_id", c.avaliador.id)
        .eq("category_id", c.categoria.id)
        .eq("is_test", c.rodada.is_test)
    : await sb.from("declaracoes_avaliador").insert(registro);
  if (error) return { ok: false, erro: "Não foi possível registrar a declaração." };

  if (impedido) await invalidarAtosNaCategoria(c.avaliador.id, c.categoria.id, c.rodada.is_test, "Impedimento declarado pelo avaliador");
  await auditar(c.user, impedido ? "impedimento_declarado" : "sem_impedimento_declarado", { tipo: "categoria", id: c.categoria.id }, {
    avaliador: c.avaliador.id,
    hipotese,
    teste: c.rodada.is_test,
  });
  revalidatePath("/avaliacao", "layout");
  return { ok: true };
}

// Valida e grava as notas do rascunho. Devolve as notas lidas para conferência no envio.
async function gravarNotas(c: Exclude<Awaited<ReturnType<typeof contexto>>, { erro: string }>, notas: NotaEnviada[]) {
  if (!c.matriz) return { ok: false as const, erro: "Esta categoria é decidida por votação, não por ficha." };
  if (c.declaracao?.impedido !== false) return { ok: false as const, erro: "Registre a declaração de impedimento primeiro." };
  const criterios = new Set(c.matriz.criterios.map((x) => x.id));
  const linhas: { finalist_id: string; criterio: string; nota: number; comentario: string | null }[] = [];
  for (const n of notas.slice(0, 500)) {
    if (!c.rodada.candidatos.includes(n.finalista) || !criterios.has(n.criterio)) return { ok: false as const, erro: "Ficha inválida." };
    if (!n.nota.trim()) continue; // ainda não preenchida
    const v = lerNota(n.nota);
    if (v === null) return { ok: false as const, erro: `Nota inválida: “${n.nota}”. Use de 0 a 10, com até uma casa decimal.` };
    linhas.push({ finalist_id: n.finalista, criterio: n.criterio, nota: v, comentario: n.comentario.trim().slice(0, 1000) || null });
  }

  const sb = servico();
  let { data: ficha } = await sb
    .from("fichas")
    .select("id, status")
    .eq("rodada_id", c.rodada.id)
    .eq("avaliador_id", c.avaliador.id)
    .maybeSingle();
  if (ficha && ficha.status !== "rascunho") return { ok: false as const, erro: "Esta ficha já foi enviada e não pode mais ser alterada." };
  if (ficha) {
    await sb.from("fichas").update({ atualizada_em: new Date().toISOString() }).eq("id", ficha.id);
  } else {
    ({ data: ficha } = await sb
      .from("fichas")
      .insert({ rodada_id: c.rodada.id, avaliador_id: c.avaliador.id })
      .select("id, status")
      .single());
    if (!ficha) return { ok: false as const, erro: "Não foi possível salvar a ficha." };
  }

  // Campo apagado: some do rascunho.
  await sb.from("fichas_notas").delete().eq("ficha_id", ficha.id);
  if (linhas.length) {
    const { error: e2 } = await sb.from("fichas_notas").insert(linhas.map((l) => ({ ...l, ficha_id: ficha.id })));
    if (e2) return { ok: false as const, erro: "Não foi possível salvar as notas." };
  }
  return { ok: true as const, fichaId: ficha.id, linhas };
}

export async function salvarRascunho(rodadaId: string, notas: NotaEnviada[]): Promise<Resultado> {
  const c = await contexto(rodadaId);
  if ("erro" in c) return { ok: false, erro: c.erro! };
  const r = await gravarNotas(c, notas);
  if (!r.ok) return r;
  return { ok: true, msg: "Rascunho salvo." };
}

// Art. 15, § 1º e § 5º: todos os concorrentes, todos os critérios, comentário nas notas extremas.
export async function enviarFicha(rodadaId: string, notas: NotaEnviada[]): Promise<Resultado> {
  const c = await contexto(rodadaId);
  if ("erro" in c) return { ok: false, erro: c.erro! };
  const r = await gravarNotas(c, notas);
  if (!r.ok) return r;

  const total = c.rodada.candidatos.length * c.matriz!.criterios.length;
  if (r.linhas.length !== total) return { ok: false, erro: `Faltam ${total - r.linhas.length} notas. Todos os concorrentes precisam ser avaliados.` };
  const semComentario = r.linhas.find((l) => exigeComentario(l.nota) && !l.comentario);
  if (semComentario) return { ok: false, erro: "Notas abaixo de 4,0 ou acima de 9,0 precisam de um comentário." };

  const { error } = await servico()
    .from("fichas")
    .update({
      status: "enviada",
      enviada_em: new Date().toISOString(),
      ip: await ipDaRequisicao(),
      user_agent: await userAgent(),
    })
    .eq("id", r.fichaId)
    .eq("status", "rascunho");
  if (error) return { ok: false, erro: "Não foi possível enviar a ficha." };
  await auditar(c.user, "ficha_enviada", { tipo: "ficha", id: r.fichaId }, { rodada: c.rodada.id, avaliador: c.avaliador.id });
  revalidatePath("/avaliacao", "layout");
  return { ok: true, msg: "Ficha enviada." };
}

// Art. 13: votação nominal. Um voto por rodada; "abster" não conta como voto válido.
export async function votar(rodadaId: string, escolha: string): Promise<Resultado> {
  const c = await contexto(rodadaId);
  if ("erro" in c) return { ok: false, erro: c.erro! };
  if (c.matriz) return { ok: false, erro: "Esta categoria é avaliada por ficha." };
  if (c.declaracao?.impedido !== false) return { ok: false, erro: "Registre a declaração de impedimento primeiro." };
  const finalista = escolha === "abster" ? null : escolha;
  if (finalista && !c.rodada.candidatos.includes(finalista)) return { ok: false, erro: "Escolha inválida." };

  const { error } = await servico()
    .from("votos_honorarios")
    .insert({
      rodada_id: c.rodada.id,
      avaliador_id: c.avaliador.id,
      finalist_id: finalista,
      ip: await ipDaRequisicao(),
      user_agent: await userAgent(),
    });
  if (error) return { ok: false, erro: error.code === "23505" ? "Seu voto nesta rodada já foi registrado." : "Não foi possível registrar o voto." };
  await auditar(c.user, finalista ? "voto_honorario" : "abstencao_honoraria", { tipo: "rodada", id: c.rodada.id }, {
    avaliador: c.avaliador.id,
  });
  revalidatePath("/avaliacao", "layout");
  return { ok: true, msg: "Voto registrado." };
}

// Link temporário (10 min) para o material da indicação, só para quem pode avaliar.
export async function abrirMaterial(rodadaId: string, finalistaId: string): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  const c = await contexto(rodadaId);
  if ("erro" in c) return { ok: false, erro: c.erro! };
  if (c.declaracao?.impedido !== false) return { ok: false, erro: "Registre a declaração de impedimento primeiro." };
  const f = c.candidatos.find((x) => x.id === finalistaId);
  if (!f) return { ok: false, erro: "Concorrente não encontrado." };
  if (f.material_path) {
    const { data } = await servico().storage.from("avaliacao").createSignedUrl(f.material_path, 600);
    if (data?.signedUrl) return { ok: true, url: data.signedUrl };
  }
  if (f.material_link) return { ok: true, url: f.material_link };
  return { ok: false, erro: "Material não disponível." };
}
