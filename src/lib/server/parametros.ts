import "server-only";
import { supabaseServico } from "./supabase";
import {
  CATEGORIAS,
  CERIMONIA,
  CRONOGRAMA,
  DOCUMENTOS,
  VOTACAO_ABRE,
  VOTACAO_FECHA,
  type Categoria,
  type TipoCategoria,
} from "@/lib/data";

// Parâmetros do prêmio, editados pelo master no painel. Se o banco não responder,
// o site cai nos valores de src/lib/data.ts para nunca sair do ar.

export type EtapaCronograma = { id?: string; titulo: string; data: string; texto: string; destaque: boolean };
export type DocumentoPublico = { id?: string; titulo: string; descricao: string; href: string | null; nome_arquivo?: string | null };
export type CategoriaSite = Categoria & { id?: string };

export type Parametros = {
  votacaoAbre: string;
  votacaoFecha: string;
  galaEm: string;
  galaLocal: string | null;
  indicacoesAbrem: string;
  indicacoesFecham: string;
  cronograma: EtapaCronograma[];
  categorias: CategoriaSite[];
  documentos: DocumentoPublico[];
};

const PADRAO: Parametros = {
  votacaoAbre: VOTACAO_ABRE.toISOString(),
  votacaoFecha: VOTACAO_FECHA.toISOString(),
  galaEm: CERIMONIA.toISOString(),
  galaLocal: null,
  indicacoesAbrem: new Date("2026-10-12T00:00:00-03:00").toISOString(),
  indicacoesFecham: new Date("2026-10-23T23:59:59-03:00").toISOString(),
  cronograma: CRONOGRAMA.map((e) => ({ titulo: e.titulo, data: e.data, texto: e.texto, destaque: !!e.destaque })),
  categorias: CATEGORIAS,
  documentos: DOCUMENTOS,
};

export function urlPublica(caminho: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/publico/${caminho}`;
}

export async function carregarParametros(): Promise<Parametros> {
  const sb = supabaseServico();
  if (!sb) return PADRAO;
  try {
    const [janela, par, crono, cats, docs] = await Promise.all([
      sb.from("vote_window").select("opens_at, closes_at").maybeSingle(),
      sb.from("parametros").select("*").maybeSingle(),
      sb.from("cronograma").select("id, titulo, data_texto, texto, destaque").order("ordem"),
      sb.from("categories").select("id, slug, name, type, has_popular_vote, description, destaque").order("sort_order"),
      sb.from("documentos_publicos").select("id, titulo, descricao, storage_path, nome_arquivo").order("ordem"),
    ]);
    if (par.error || !par.data) return PADRAO; // migração 0005 ainda não rodou

    return {
      votacaoAbre: janela.data?.opens_at ?? PADRAO.votacaoAbre,
      votacaoFecha: janela.data?.closes_at ?? PADRAO.votacaoFecha,
      galaEm: par.data.gala_em,
      galaLocal: par.data.gala_local,
      indicacoesAbrem: par.data.indicacoes_abrem,
      indicacoesFecham: par.data.indicacoes_fecham,
      cronograma: (crono.data ?? []).map((e) => ({
        id: e.id,
        titulo: e.titulo,
        data: e.data_texto,
        texto: e.texto,
        destaque: e.destaque,
      })),
      categorias: (cats.data ?? []).map((c) => ({
        id: c.id,
        slug: c.slug,
        nome: c.name,
        tipo: c.type as TipoCategoria,
        resumo: c.description ?? "",
        votoPopular: c.has_popular_vote,
        destaque: c.destaque,
      })),
      documentos: (docs.data ?? []).map((d) => ({
        id: d.id,
        titulo: d.titulo,
        descricao: d.descricao,
        href: d.storage_path ? urlPublica(d.storage_path) : null,
        nome_arquivo: d.nome_arquivo,
      })),
    };
  } catch {
    return PADRAO;
  }
}

// Data e hora de Brasília (UTC-3, sem horário de verão) ↔ ISO.
export function paraBrasilia(iso: string) {
  const d = new Date(new Date(iso).getTime() - 3 * 3600_000);
  return d.toISOString().slice(0, 16); // "AAAA-MM-DDTHH:mm" para <input type="datetime-local">
}
// fimDoMinuto: encerramentos valem até o último segundo (23:59 → 23:59:59).
export function deBrasilia(local: string, fimDoMinuto = false) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const d = new Date(`${local}:${fimDoMinuto ? "59" : "00"}-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
