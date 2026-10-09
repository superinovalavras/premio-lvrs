import "server-only";
import { servico } from "./sessao";
import type { DadosRodada } from "./avaliacao-dados";
import { MIN_AVALIACOES, NOTA_PRE_SELECAO, NOTA_VITORIA, VAGAS_FINALISTAS, notaIndividual } from "@/lib/avaliacao";

const r2 = (n: number) => Math.round(n * 100) / 100;
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export type SituacaoFicha = { avaliadorId: string; nome: string; status: "valida" | "rascunho" | "invalidada" | "impedido" | "pendente"; detalhe?: string; fichaId?: string };

export type LinhaNotas = {
  id: string;
  nome: string;
  tecnica: number | null;
  porCriterio: Record<string, number>;
  individuais: { avaliador: string; nota: number }[];
  votos?: number;
  popular?: number;
  final: number | null;
  posicao: number;
  empate: boolean;
  situacao: string;
  destaque: boolean;
};

async function avaliadoresDoAmbiente(isTest: boolean) {
  const { data } = await servico().from("avaliadores").select("id, nome, ativo").eq("is_test", isTest).order("nome");
  return data ?? [];
}

async function impedidosNaCategoria(categoryId: string, isTest: boolean) {
  const { data } = await servico()
    .from("declaracoes_avaliador")
    .select("avaliador_id, impedido, motivo, origem")
    .eq("category_id", categoryId)
    .eq("is_test", isTest);
  return new Map((data ?? []).map((d) => [d.avaliador_id, d]));
}

// Rodadas com ficha (pré-seleção e final): art. 15 (média das notas individuais), art. 19 (voto popular),
// art. 20 (mínimo de 70), art. 21 (desempate) e art. 11 (três maiores com 60 ou mais).
export async function apurarNotas(d: DadosRodada) {
  const { rodada, categoria, matriz, candidatos } = d;
  if (!matriz) throw new Error("rodada sem matriz");
  const sb = servico();
  const [avaliadores, declaracoes, { data: fichas }] = await Promise.all([
    avaliadoresDoAmbiente(rodada.is_test),
    impedidosNaCategoria(categoria.id, rodada.is_test),
    sb.from("fichas").select("id, avaliador_id, status, enviada_em, invalidada_motivo").eq("rodada_id", rodada.id),
  ]);
  const enviadas = (fichas ?? []).filter((f) => f.status === "enviada" && !declaracoes.get(f.avaliador_id)?.impedido);
  const { data: notas } = enviadas.length
    ? await sb.from("fichas_notas").select("ficha_id, finalist_id, criterio, nota").in("ficha_id", enviadas.map((f) => f.id))
    : { data: [] as { ficha_id: string; finalist_id: string; criterio: string; nota: number }[] };

  // Ficha incompleta é inválida para todos os concorrentes (art. 15, § 5º).
  const total = candidatos.length * matriz.criterios.length;
  const porFicha = new Map<string, Map<string, Record<string, number>>>();
  for (const n of notas ?? []) {
    const m = porFicha.get(n.ficha_id) ?? new Map<string, Record<string, number>>();
    const linha = m.get(n.finalist_id) ?? {};
    linha[n.criterio] = Number(n.nota);
    m.set(n.finalist_id, linha);
    porFicha.set(n.ficha_id, m);
  }
  const validas = enviadas.filter((f) => {
    const m = porFicha.get(f.id);
    return !!m && [...m.values()].reduce((s, l) => s + Object.keys(l).length, 0) === total;
  });

  const nomes = new Map(avaliadores.map((a) => [a.id, a.nome]));
  const situacoes: SituacaoFicha[] = avaliadores
    .filter((a) => a.ativo || (fichas ?? []).some((f) => f.avaliador_id === a.id))
    .map((a) => {
      const dec = declaracoes.get(a.id);
      const f = (fichas ?? []).find((x) => x.avaliador_id === a.id);
      if (dec?.impedido) return { avaliadorId: a.id, nome: a.nome, status: "impedido", detalhe: dec.motivo ?? undefined };
      if (!f) return { avaliadorId: a.id, nome: a.nome, status: "pendente" };
      if (f.status === "invalidada") return { avaliadorId: a.id, nome: a.nome, status: "invalidada", detalhe: f.invalidada_motivo ?? undefined, fichaId: f.id };
      if (f.status === "rascunho") return { avaliadorId: a.id, nome: a.nome, status: "rascunho", fichaId: f.id };
      if (!validas.includes(f)) return { avaliadorId: a.id, nome: a.nome, status: "invalidada", detalhe: "Ficha incompleta", fichaId: f.id };
      return { avaliadorId: a.id, nome: a.nome, status: "valida", fichaId: f.id };
    });

  const popular = categoria.has_popular_vote && rodada.tipo === "final";
  const votos = new Map<string, number>();
  if (popular) {
    await Promise.all(
      candidatos.map(async (c) => {
        const { count } = await sb.from("votes").select("id", { count: "exact", head: true }).eq("finalist_id", c.id);
        votos.set(c.id, count ?? 0);
      }),
    );
  }
  const maxVotos = Math.max(0, ...votos.values());

  const linhas: LinhaNotas[] = candidatos.map((c) => {
    const individuais = validas.map((f) => ({
      avaliador: nomes.get(f.avaliador_id) ?? "—",
      nota: notaIndividual(matriz, porFicha.get(f.id)!.get(c.id) ?? {}),
    }));
    const porCriterio: Record<string, number> = {};
    for (const cr of matriz.criterios) {
      porCriterio[cr.id] = r2(media(validas.map((f) => porFicha.get(f.id)!.get(c.id)?.[cr.id] ?? 0)));
    }
    const tecnica = validas.length ? r2(media(individuais.map((i) => i.nota))) : null;
    const v = votos.get(c.id) ?? 0;
    const pop = popular ? (maxVotos === 0 ? 0 : r2((v / maxVotos) * 100)) : undefined;
    const final = tecnica === null ? null : popular ? r2(0.8 * tecnica + 0.2 * (pop ?? 0)) : tecnica;
    return { id: c.id, nome: c.name, tecnica, porCriterio, individuais, votos: popular ? v : undefined, popular: pop, final, posicao: 0, empate: false, situacao: "", destaque: false };
  });

  // Desempate do art. 21: critérios na ordem da matriz ("__tecnica" = nota técnica).
  const chave = (l: LinhaNotas, k: string) => (k === "__tecnica" ? (l.tecnica ?? 0) : (l.porCriterio[k] ?? 0));
  const comparar = (a: LinhaNotas, b: LinhaNotas) => {
    if ((b.final ?? -1) !== (a.final ?? -1)) return (b.final ?? -1) - (a.final ?? -1);
    for (const k of matriz.desempate) if (chave(b, k) !== chave(a, k)) return chave(b, k) - chave(a, k);
    return 0;
  };
  linhas.sort(comparar);

  // Art. 19, § 9º: com 10 pontos ou mais de diferença técnica entre 1º e 2º, prevalece a ordem técnica no topo.
  let trava = false;
  if (popular && validas.length) {
    const porTecnica = [...linhas].sort((a, b) => (b.tecnica ?? 0) - (a.tecnica ?? 0));
    if (porTecnica.length > 1 && (porTecnica[0].tecnica ?? 0) - (porTecnica[1].tecnica ?? 0) >= 10) {
      trava = true;
      const lider = porTecnica[0];
      linhas.splice(linhas.indexOf(lider), 1);
      linhas.unshift(lider);
    }
  }

  const suficiente = validas.length >= MIN_AVALIACOES;
  linhas.forEach((l, i) => {
    l.posicao = i + 1;
    const vizinho = (j: number) => linhas[j] && !(trava && (i === 0 || j === 0)) && comparar(l, linhas[j]) === 0;
    l.empate = !!(vizinho(i - 1) || vizinho(i + 1));
    if (l.tecnica === null) l.situacao = "Sem avaliações válidas";
    else if (!suficiente) l.situacao = `Suspensa: menos de ${MIN_AVALIACOES} avaliações válidas`;
    else if (rodada.tipo === "pre_selecao") {
      const ok = l.posicao <= VAGAS_FINALISTAS && l.tecnica >= NOTA_PRE_SELECAO;
      l.destaque = ok;
      l.situacao = ok ? "Classificado para a final" : l.tecnica < NOTA_PRE_SELECAO ? `Abaixo de ${NOTA_PRE_SELECAO}` : "Fora das 3 vagas";
    } else if (l.posicao === 1) {
      l.destaque = (l.final ?? 0) >= NOTA_VITORIA;
      l.situacao = l.destaque ? "1º lugar provisório" : `1º, mas abaixo de ${NOTA_VITORIA}: categoria pode não ser concedida`;
    } else l.situacao = `${l.posicao}º lugar`;
    if (l.empate && suficiente) l.situacao += " · empate: votação nominal do plenário (art. 21, IV)";
  });

  return { linhas, situacoes, validas: validas.length, suficiente, trava, popular };
}

// Honorárias (art. 13): maioria simples dos votos válidos na 1ª rodada; senão, os dois mais votados vão à 2ª.
export async function apurarVotacao(d: DadosRodada) {
  const { rodada, categoria, candidatos } = d;
  const sb = servico();
  const [avaliadores, declaracoes, { data: votos }] = await Promise.all([
    avaliadoresDoAmbiente(rodada.is_test),
    impedidosNaCategoria(categoria.id, rodada.is_test),
    sb.from("votos_honorarios").select("avaliador_id, finalist_id, votado_em, invalidado_em, invalidado_motivo").eq("rodada_id", rodada.id),
  ]);
  const validosLista = (votos ?? []).filter((v) => !v.invalidado_em && !declaracoes.get(v.avaliador_id)?.impedido);
  const contagem = new Map(candidatos.map((c) => [c.id, 0]));
  for (const v of validosLista) if (v.finalist_id) contagem.set(v.finalist_id, (contagem.get(v.finalist_id) ?? 0) + 1);
  const validos = validosLista.filter((v) => v.finalist_id).length;
  const abstencoes = validosLista.length - validos;

  const linhas = candidatos
    .map((c) => ({ id: c.id, nome: c.name, votos: contagem.get(c.id) ?? 0 }))
    .sort((a, b) => b.votos - a.votos);
  const [p1, p2, p3] = linhas;
  let resultado: { tipo: "vencedor"; id: string } | { tipo: "segunda_rodada"; ids: string[]; empateNaVaga: boolean } | { tipo: "empate" } | { tipo: "sem_votos" };
  if (!validos) resultado = { tipo: "sem_votos" };
  else if (rodada.turno === 1 && p1.votos > validos / 2) resultado = { tipo: "vencedor", id: p1.id };
  else if (rodada.turno === 1) {
    resultado = { tipo: "segunda_rodada", ids: [p1, p2].filter(Boolean).map((l) => l.id), empateNaVaga: !!p3 && !!p2 && p3.votos === p2.votos };
  } else if (!p2 || p1.votos > p2.votos) resultado = { tipo: "vencedor", id: p1.id };
  else resultado = { tipo: "empate" };

  const nomeDe = new Map(candidatos.map((c) => [c.id, c.name]));
  const nominal = avaliadores
    .filter((a) => a.ativo || (votos ?? []).some((v) => v.avaliador_id === a.id))
    .map((a) => {
      const dec = declaracoes.get(a.id);
      const v = (votos ?? []).find((x) => x.avaliador_id === a.id);
      const escolha = dec?.impedido
        ? "Impedido"
        : !v
          ? "Não votou"
          : v.invalidado_em
            ? `Invalidado (${v.invalidado_motivo ?? "sem motivo"})`
            : v.finalist_id
              ? (nomeDe.get(v.finalist_id) ?? "—")
              : "Abstenção";
      return { avaliadorId: a.id, nome: a.nome, escolha, votou: !!v && !v.invalidado_em && !dec?.impedido };
    });

  return { linhas, validos, abstencoes, resultado, nominal };
}
