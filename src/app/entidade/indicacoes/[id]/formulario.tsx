"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Check, ExternalLink, FileUp, Link2, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Aviso, Campo, Cartao, btnEscuro, btnPrim, btnSec, inputCls } from "@/components/area/ui";
import { cn } from "@/lib/utils";
import { mascaraCelular, mascaraCpf, somenteDigitos } from "@/lib/voto";
import { formatarData, mascaraCnpj } from "@/lib/entidades";
import {
  CONDICOES_VINCULO,
  CONFLITOS,
  DECLARACAO_INDICADOR,
  JOVEM,
  LIMITES_TEXTO,
  MAX_COMPROBATORIOS,
  MAX_EVIDENCIAS,
  MAX_EVIDENCIAS_VINCULO,
  PASSOS_INDICACAO,
  TIPOS_INDICADO,
  menores,
  tipoAnexoIV,
  type IndDocRow,
  type IndicacaoRow,
  type Integrante,
  type Pendencia,
} from "@/lib/indicacoes";
import {
  abrirDocIndicacao,
  confirmarUploadIndicacao,
  enviarIndicacao,
  excluirIndicacao,
  prepararUploadIndicacao,
  reabrirIndicacao,
  removerDocIndicacao,
  salvarLinkIndicacao,
  salvarPassoIndicacao,
  type Resultado,
} from "@/lib/server/acoes-indicacao";

type Props = {
  indicacao: IndicacaoRow;
  documentos: IndDocRow[];
  pendencias: Pendencia[];
  mesmoIndicadoEmOutra: boolean;
  categorias: { id: string; nome: string; slug: string }[];
  fechamento: string;
  editavel: boolean;
  podeReabrir: boolean;
  supabaseUrl: string;
  supabaseAnon: string;
};

const N = PASSOS_INDICACAO.length;

export function FormularioIndicacao(p: Props) {
  const router = useRouter();
  const primeiro = p.pendencias[0]?.passo ?? N;
  const [passo, setPasso] = useState(p.editavel ? Math.min(primeiro, p.indicacao.category_id ? N : 1) : N);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [listaPend, setListaPend] = useState<string[] | null>(null);

  const ir = (n: number) => {
    setErro(null);
    setListaPend(null);
    setPasso(n);
    document.getElementById("topo-indicacao")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // onSubmit (não action): em caso de erro o formulário não é limpo.
  const salvar = (n: number) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!p.editavel) return ir(n + 1);
    const fd = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await salvarPassoIndicacao(p.indicacao.id, n, fd);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
      ir(n + 1);
    });
  };

  const temPend = (n: number) => p.pendencias.some((x) => x.passo === n);
  const docs = (tipo: string) => p.documentos.filter((d) => d.tipo === tipo);
  const comuns = { indicacaoId: p.indicacao.id, editavel: p.editavel, supabaseUrl: p.supabaseUrl, supabaseAnon: p.supabaseAnon, onErro: setErro };

  return (
    <div id="topo-indicacao" className="grid scroll-mt-4 gap-4 lg:grid-cols-[230px_1fr] lg:items-start">
      <nav aria-label="Passos da indicação" className="rounded-[22px] border border-fundo/10 bg-papel p-3 lg:sticky lg:top-4">
        <ol className="grid grid-cols-6 gap-1 lg:grid-cols-1">
          {PASSOS_INDICACAO.map((nome, i) => {
            const n = i + 1;
            const ok = !temPend(n) && (n < N || p.pendencias.length === 0);
            return (
              <li key={nome}>
                <button
                  type="button"
                  onClick={() => ir(n)}
                  aria-current={passo === n ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13px] font-medium transition",
                    passo === n ? "bg-fundo text-white" : "text-fundo/75 hover:bg-nevoa",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                      passo === n ? "bg-amarelo text-fundo" : ok ? "bg-verde text-white" : "bg-nevoa text-fundo/60",
                    )}
                  >
                    {ok && passo !== n ? <Check className="size-3.5" strokeWidth={3} /> : n}
                  </span>
                  <span className="hidden lg:inline">{nome}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <Link href="/entidade" className="mt-2 hidden items-center gap-1.5 px-2.5 py-2 text-[13px] text-fundo/65 hover:text-fundo lg:flex">
          <ArrowLeft className="size-4" /> Minhas indicações
        </Link>
      </nav>

      <Cartao>
        <p className="text-[12px] font-medium text-fundo/55">
          Passo {passo} de {N} · {PASSOS_INDICACAO[passo - 1]}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-nevoa">
          <div className="h-full rounded-full bg-verde transition-all" style={{ width: `${(passo / N) * 100}%` }} />
        </div>

        {!p.editavel && p.indicacao.status === "rascunho" && (
          <Aviso tom="info" className="mt-5">
            Modo de leitura: fora do prazo de indicações.
          </Aviso>
        )}

        <fieldset disabled={!p.editavel || pendente} data-leitura={p.editavel ? undefined : ""} className="group mt-6 min-w-0">
          {passo === 1 && <PassoIndicado {...p} onSubmit={salvar(1)} />}
          {passo === 2 && <PassoVinculo indicacao={p.indicacao} onSubmit={salvar(2)} />}
          {passo === 3 && <PassoRealizacao indicacao={p.indicacao} onSubmit={salvar(3)} />}
          {passo === 5 && <PassoContato indicacao={p.indicacao} onSubmit={salvar(5)} />}
        </fieldset>

        {passo === 2 && (
          <ListaDocs
            {...comuns}
            tipo="vinculo"
            titulo="Evidência do vínculo"
            dica="Pelo menos uma: arquivo ou link."
            aceitaLink
            max={MAX_EVIDENCIAS_VINCULO}
            docs={docs("vinculo")}
          />
        )}
        {passo === 4 && <PassoEvidencias {...p} comuns={comuns} docs={docs} />}
        {passo === N && (
          <PassoEnvio
            {...p}
            ocupado={pendente}
            ir={ir}
            onEnviar={(fd) =>
              iniciar(async () => {
                const r = await enviarIndicacao(p.indicacao.id, fd);
                if (!r.ok) {
                  setErro(r.erro);
                  setListaPend(r.pendencias ?? null);
                  return;
                }
                router.refresh();
              })
            }
            onAcao={(f: () => Promise<Resultado>, depois?: () => void) =>
              iniciar(async () => {
                const r = await f();
                if (!r.ok) return setErro(r.erro);
                depois?.();
                router.refresh();
              })
            }
          />
        )}

        {erro && (
          <Aviso tom="erro" className="mt-5">
            {erro}
            {listaPend && (
              <ul className="mt-2 list-disc pl-5">
                {listaPend.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
          </Aviso>
        )}

        {(passo === 4 || (!p.editavel && passo < N)) && (
          <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-fundo/10 pt-5">
            <button type="button" className={btnSec} onClick={() => ir(passo - 1)} disabled={passo === 1}>
              <ArrowLeft className="size-4" /> Voltar
            </button>
            <button type="button" className={btnPrim} onClick={() => ir(passo + 1)}>
              Continuar <ArrowRight className="size-4" />
            </button>
          </div>
        )}
      </Cartao>
    </div>
  );
}

function Navegacao({ voltar }: { voltar?: () => void }) {
  return (
    <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-fundo/10 pt-5 group-data-[leitura]:hidden">
      {voltar ? (
        <button type="button" className={btnSec} onClick={voltar}>
          <ArrowLeft className="size-4" /> Voltar
        </button>
      ) : (
        <Link href="/entidade" className={btnSec}>
          Sair e continuar depois
        </Link>
      )}
      <button className={btnPrim}>
        Salvar e continuar <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

// Campo de texto longo com contador em tela (spec 2.3).
function Texto({ nome, label, valor, max, linhas = 4, dica }: { nome: string; label: string; valor: string | null; max: number; linhas?: number; dica?: string }) {
  const [v, setV] = useState(valor ?? "");
  return (
    <Campo label={label} dica={dica} className="sm:col-span-2">
      <textarea name={nome} value={v} onChange={(e) => setV(e.target.value)} maxLength={max} rows={linhas} className={inputCls} />
      <span className={cn("mt-1 block text-right text-[11.5px]", v.length > max * 0.95 ? "text-vermelho" : "text-fundo/50")}>
        {v.length.toLocaleString("pt-BR")}/{max.toLocaleString("pt-BR")}
      </span>
    </Campo>
  );
}

// ───────── 1. Indicado ─────────

function PassoIndicado(p: Props & { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  const i = p.indicacao;
  const [cat, setCat] = useState(i.category_id ?? "");
  const [tipo, setTipo] = useState<string>(i.indicado_tipo ?? "");
  const [doc, setDoc] = useState(() => {
    const d = i.indicado_documento ?? "";
    return d.length === 14 ? mascaraCnpj(d) : mascaraCpf(d);
  });
  const [integrantes, setIntegrantes] = useState<Integrante[]>(
    i.integrantes?.length ? i.integrantes : [{ nome: "", cpf: "", nascimento: "" }, { nome: "", cpf: "", nascimento: "" }],
  );
  const jovem = p.categorias.find((c) => c.id === cat)?.slug === JOVEM.slug;
  const fim = formatarData(p.fechamento, false);
  const mascara = (v: string) => (tipo === "instituicao" || somenteDigitos(v).length > 11 ? mascaraCnpj(v) : mascaraCpf(v));
  const setG = (n: number, k: keyof Integrante, v: string) => setIntegrantes((xs) => xs.map((g, j) => (j === n ? { ...g, [k]: v } : g)));

  return (
    <form onSubmit={p.onSubmit}>
      <h2 className="text-xl font-semibold">Quem você está indicando?</h2>
      <p className="mt-1 text-sm font-light text-fundo/70">Uma categoria por indicação. Até 2 indicações por categoria e 6 no total.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Campo label="Categoria" className="sm:col-span-2">
          <select name="category_id" value={cat} onChange={(e) => setCat(e.target.value)} className={inputCls}>
            <option value="">Selecione</option>
            {p.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      {jovem && (
        <Aviso tom="info" className="mt-3">
          Jovem Inovador: a pessoa (ou cada integrante) precisa ter de 15 a 29 anos em {fim}. A idade é calculada pela data de nascimento.
        </Aviso>
      )}

      <p className="mt-6 text-[13px] font-medium">Tipo do indicado</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {TIPOS_INDICADO.map((t) => (
          <label
            key={t.id}
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-2xl border-[1.5px] px-4 py-3 text-sm font-medium transition",
              tipo === t.id ? "border-verde bg-verde/[0.06]" : "border-fundo/12 hover:border-fundo/35",
            )}
          >
            <input type="radio" name="indicado_tipo" value={t.id} checked={tipo === t.id} onChange={() => setTipo(t.id)} className="accent-[#0d8049]" />
            {t.rotulo}
          </label>
        ))}
      </div>

      {tipo && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Campo
            label={tipo === "pf" ? "Nome completo do indicado" : tipo === "conjunto" ? "Nome do grupo, equipe ou projeto" : "Nome da instituição"}
            className="sm:col-span-2"
          >
            <input name="indicado_nome" defaultValue={i.indicado_nome ?? ""} maxLength={200} className={inputCls} />
          </Campo>
          <Campo
            label={tipo === "pf" ? "CPF" : tipo === "instituicao" ? "CNPJ" : "CPF ou CNPJ do responsável"}
            opcional={tipo === "conjunto"}
            dica="Base da checagem de autoindicação e de impedimento."
          >
            <input
              name="indicado_documento"
              inputMode="numeric"
              value={doc}
              onChange={(e) => setDoc(mascara(e.target.value))}
              placeholder={tipo === "instituicao" ? "00.000.000/0000-00" : "000.000.000-00"}
              className={inputCls}
            />
          </Campo>
          {tipo === "pf" && (
            <Campo label="Data de nascimento" dica="Obrigatória: confere a idade do Jovem Inovador e se há menor de 18 anos.">
              <input name="indicado_nascimento" type="date" defaultValue={i.indicado_nascimento ?? ""} className={inputCls} />
            </Campo>
          )}
        </div>
      )}

      {tipo === "conjunto" && (
        <div className="mt-6">
          <p className="text-[13px] font-medium">Integrantes do conjunto</p>
          <p className="text-[12.5px] text-fundo/60">Nome, CPF e data de nascimento de cada pessoa.</p>
          <input type="hidden" name="integrantes" value={JSON.stringify(integrantes)} />
          <div className="mt-3 grid gap-3">
            {integrantes.map((g, n) => (
              <div key={n} className="grid gap-2 rounded-2xl bg-nevoa p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
                <Campo label={`Integrante ${n + 1}`}>
                  <input value={g.nome} onChange={(e) => setG(n, "nome", e.target.value)} maxLength={160} className={inputCls} />
                </Campo>
                <Campo label="CPF">
                  <input value={mascaraCpf(g.cpf)} onChange={(e) => setG(n, "cpf", somenteDigitos(e.target.value))} inputMode="numeric" className={inputCls} />
                </Campo>
                <Campo label="Nascimento">
                  <input type="date" value={g.nascimento} onChange={(e) => setG(n, "nascimento", e.target.value)} className={inputCls} />
                </Campo>
                <button
                  type="button"
                  onClick={() => setIntegrantes((xs) => xs.filter((_, j) => j !== n))}
                  disabled={integrantes.length <= 1}
                  className={cn(btnSec, "px-3 py-3 group-data-[leitura]:hidden")}
                  aria-label={`Remover integrante ${n + 1}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIntegrantes((xs) => [...xs, { nome: "", cpf: "", nascimento: "" }])}
            className={cn(btnSec, "mt-3 group-data-[leitura]:hidden")}
          >
            <Plus className="size-4" /> Adicionar integrante
          </button>
        </div>
      )}

      {p.mesmoIndicadoEmOutra && (
        <div className="mt-6 grid">
          <Aviso tom="alerta" className="mb-3">
            Sua instituição indicou o mesmo CPF/CNPJ em outra categoria. Cada indicação precisa se basear em um aspecto distinto da
            atuação, com justificativa própria (art. 6º, § 2º).
          </Aviso>
          <Texto nome="aspecto_distinto" label="Aspecto distinto desta indicação" valor={i.aspecto_distinto} max={1000} linhas={3} />
        </div>
      )}
      <Navegacao />
    </form>
  );
}

// ───────── 2. Vínculo ─────────

function PassoVinculo({ indicacao: i, onSubmit }: { indicacao: IndicacaoRow; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  const [cond, setCond] = useState(i.vinculo_condicao ?? "");
  return (
    <form onSubmit={onSubmit}>
      <h2 className="text-xl font-semibold">Vínculo do indicado com Lavras</h2>
      <p className="mt-1 text-sm font-light text-fundo/70">Pelo menos uma das condições do art. 7º.</p>
      <div className="mt-5 grid gap-2">
        {CONDICOES_VINCULO.map((c) => (
          <label
            key={c.id}
            className={cn(
              "flex cursor-pointer gap-3 rounded-2xl border-[1.5px] p-4 transition",
              cond === c.id ? "border-verde bg-verde/[0.06]" : "border-fundo/12 hover:border-fundo/35",
            )}
          >
            <input type="radio" name="vinculo_condicao" value={c.id} checked={cond === c.id} onChange={() => setCond(c.id)} className="mt-1 size-4 accent-[#0d8049]" />
            <span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-verde">Inciso {c.id}</span>
              <span className="mt-0.5 block text-[14px] font-medium leading-snug">{c.texto}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="mt-5 grid">
        <Texto nome="vinculo_descricao" label="Descreva o vínculo" valor={i.vinculo_descricao} max={LIMITES_TEXTO.vinculo} linhas={3} />
      </div>
      <Navegacao />
    </form>
  );
}

// ───────── 3. Realização ─────────

function PassoRealizacao({ indicacao: i, onSubmit }: { indicacao: IndicacaoRow; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit}>
      <h2 className="text-xl font-semibold">A realização</h2>
      <p className="mt-1 text-sm font-light text-fundo/70">O que o indicado fez, para quem e com que resultado. Prefira números a adjetivos.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Campo label="Título da realização" className="sm:col-span-2">
          <input name="titulo" defaultValue={i.titulo ?? ""} maxLength={LIMITES_TEXTO.titulo} className={inputCls} />
        </Campo>
        <Texto nome="resumo" label="Resumo executivo" valor={i.resumo} max={LIMITES_TEXTO.resumo} />
        <Texto nome="problema" label="Problema ou oportunidade" valor={i.problema} max={LIMITES_TEXTO.problema} />
        <Texto nome="solucao" label="Solução ou contribuição" valor={i.solucao} max={LIMITES_TEXTO.solucao} linhas={6} />
        <Texto
          nome="resultados"
          label="Resultados e indicadores"
          valor={i.resultados}
          max={LIMITES_TEXTO.resultados}
          linhas={6}
          dica="Números, não adjetivos: quanto, quantos, em quanto tempo."
        />
        <Campo label="Início da realização">
          <input name="periodo_inicio" type="date" defaultValue={i.periodo_inicio ?? ""} className={inputCls} />
        </Campo>
        <Campo label="Fim (ou data de hoje, se continua)">
          <input name="periodo_fim" type="date" defaultValue={i.periodo_fim ?? ""} className={inputCls} />
        </Campo>
        <Campo label="Beneficiários: quem" className="sm:col-span-1">
          <input name="beneficiarios" defaultValue={i.beneficiarios ?? ""} maxLength={1000} placeholder="Ex.: produtores rurais da região" className={inputCls} />
        </Campo>
        <Campo label="Beneficiários: quantos">
          <input name="beneficiarios_qtd" inputMode="numeric" defaultValue={i.beneficiarios_qtd ?? ""} placeholder="Ex.: 120" className={inputCls} />
        </Campo>
      </div>
      <Navegacao />
    </form>
  );
}

// ───────── 4. Evidências ─────────

type Comuns = {
  indicacaoId: string;
  editavel: boolean;
  supabaseUrl: string;
  supabaseAnon: string;
  onErro: (e: string | null) => void;
};

function PassoEvidencias(p: Props & { comuns: Comuns; docs: (tipo: string) => IndDocRow[] }) {
  const menoresDeIdade = menores(p.indicacao);
  return (
    <div>
      <h2 className="text-xl font-semibold">Evidências e documentos</h2>
      <p className="mt-1 text-sm font-light text-fundo/70">PDF ou imagem (PNG/JPG), até 10 MB por arquivo.</p>
      <ListaDocs
        {...p.comuns}
        tipo="evidencia"
        titulo="Evidências e links"
        dica={`De 1 a ${MAX_EVIDENCIAS}: páginas, matérias, relatórios, vídeos, arquivos.`}
        aceitaLink
        max={MAX_EVIDENCIAS}
        docs={p.docs("evidencia")}
      />
      <ListaDocs
        {...p.comuns}
        tipo="comprobatorio"
        titulo="Documentos comprobatórios"
        dica={`Opcional, até ${MAX_COMPROBATORIOS} arquivos.`}
        max={MAX_COMPROBATORIOS}
        docs={p.docs("comprobatorio")}
      />
      {p.docs("vinculo").length === 0 && (
        <Aviso tom="alerta" className="mt-5">
          Falta a evidência do vínculo com Lavras: ela fica no passo 2.
        </Aviso>
      )}
      {menoresDeIdade.map((m) => (
        <ListaDocs
          key={m.cpf}
          {...p.comuns}
          tipo={tipoAnexoIV(m.cpf)}
          titulo={`Anexo IV: autorização do responsável por ${m.nome || "menor de 18 anos"}`}
          dica="Menor de 18 anos: sem o termo assinado por pai, mãe ou responsável legal, a indicação não é enviada (art. 37). O modelo está no regulamento."
          max={1}
          docs={p.docs(tipoAnexoIV(m.cpf))}
        />
      ))}
    </div>
  );
}

function ListaDocs({
  indicacaoId,
  editavel,
  supabaseUrl,
  supabaseAnon,
  onErro,
  tipo,
  titulo,
  dica,
  aceitaLink,
  max,
  docs,
}: Comuns & { tipo: string; titulo: string; dica: string; aceitaLink?: boolean; max: number; docs: IndDocRow[] }) {
  const router = useRouter();
  const arquivo = useRef<HTMLInputElement>(null);
  const [ocupado, setOcupado] = useState(false);
  const [modoLink, setModoLink] = useState(false);
  const [link, setLink] = useState("");
  const cheio = docs.length >= max;

  async function enviar(f: File) {
    onErro(null);
    if (f.size > 10 * 1024 * 1024) return onErro("O arquivo passa de 10 MB.");
    setOcupado(true);
    try {
      const prep = await prepararUploadIndicacao(indicacaoId, tipo, f.name, f.size, f.type);
      if (!prep.ok) return onErro(prep.erro);
      const sb = createClient(supabaseUrl, supabaseAnon, { auth: { persistSession: false } });
      const { error } = await sb.storage.from("entidades").uploadToSignedUrl(prep.caminho, prep.token, f, { contentType: f.type });
      if (error) return onErro("Falha no envio do arquivo. Tente de novo.");
      const r = await confirmarUploadIndicacao(indicacaoId, tipo, prep.caminho, f.name, f.size);
      if (!r.ok) return onErro(r.erro);
      router.refresh();
    } finally {
      setOcupado(false);
      if (arquivo.current) arquivo.current.value = "";
    }
  }

  async function gravarLink() {
    onErro(null);
    setOcupado(true);
    const r = await salvarLinkIndicacao(indicacaoId, tipo, link);
    setOcupado(false);
    if (!r.ok) return onErro(r.erro);
    setModoLink(false);
    setLink("");
    router.refresh();
  }

  async function abrir(id: string) {
    const r = await abrirDocIndicacao(id);
    if (r.ok) window.open(r.url, "_blank", "noopener");
    else onErro(r.erro);
  }

  async function remover(id: string) {
    setOcupado(true);
    const r = await removerDocIndicacao(indicacaoId, id);
    setOcupado(false);
    if (!r.ok) return onErro(r.erro);
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-2xl border border-fundo/10 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <span className={cn("mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl", docs.length ? "bg-verde text-white" : "bg-amarelo/30 text-fundo")}>
          {docs.length ? <Check className="size-4" strokeWidth={3} /> : <FileUp className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{titulo}</p>
          <p className="text-[12.5px] text-fundo/60">{dica}</p>
        </div>
        {editavel && !cheio && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={arquivo}
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])}
            />
            <button type="button" disabled={ocupado} onClick={() => arquivo.current?.click()} className={cn(btnEscuro, "px-3 py-2")}>
              {ocupado ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} Arquivo
            </button>
            {aceitaLink && (
              <button type="button" onClick={() => setModoLink((m) => !m)} className={cn(btnSec, "px-3 py-2")}>
                <Link2 className="size-4" /> Link
              </button>
            )}
          </div>
        )}
      </div>
      {modoLink && (
        <div className="mt-3 flex gap-2 sm:pl-12">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={inputCls} />
          <button type="button" onClick={gravarLink} disabled={ocupado || !link} className={btnEscuro}>
            Salvar
          </button>
        </div>
      )}
      {docs.length > 0 && (
        <ul className="mt-3 grid gap-1.5 sm:pl-12">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate text-verde">{d.link ?? d.nome_arquivo}</span>
              <button type="button" onClick={() => abrir(d.id)} className="rounded-lg p-1.5 text-fundo/60 hover:bg-nevoa hover:text-fundo" aria-label="Abrir">
                <ExternalLink className="size-4" />
              </button>
              {editavel && (
                <button type="button" disabled={ocupado} onClick={() => remover(d.id)} className="rounded-lg p-1.5 text-fundo/60 hover:bg-nevoa hover:text-vermelho" aria-label="Remover">
                  <Trash2 className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ───────── 5. Contato e conflitos ─────────

function PassoContato({ indicacao: i, onSubmit }: { indicacao: IndicacaoRow; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  const [tel, setTel] = useState(mascaraCelular(i.contato_telefone ?? ""));
  const [resp, setResp] = useState<Record<string, string>>(
    Object.fromEntries(CONFLITOS.map((c) => [c.id, i[`conflito_${c.id}` as const] === null ? "" : i[`conflito_${c.id}` as const] ? "sim" : "nao"])),
  );
  return (
    <form onSubmit={onSubmit}>
      <h2 className="text-xl font-semibold">Contato do indicado</h2>
      <p className="mt-1 text-sm font-light text-fundo/70">
        O indicado é contatado antes de qualquer divulgação do nome (art. 10, § 1º). Sem contato válido, a indicação não se habilita.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Campo label="Nome da pessoa de contato" className="sm:col-span-2">
          <input name="contato_nome" defaultValue={i.contato_nome ?? ""} maxLength={160} className={inputCls} />
        </Campo>
        <Campo label="E-mail">
          <input name="contato_email" type="email" defaultValue={i.contato_email ?? ""} maxLength={160} className={inputCls} />
        </Campo>
        <Campo label="Telefone com DDD">
          <input name="contato_telefone" inputMode="numeric" value={tel} onChange={(e) => setTel(mascaraCelular(e.target.value))} placeholder="(35) 99999-9999" className={inputCls} />
        </Campo>
      </div>

      <h2 className="mt-9 text-xl font-semibold">Vínculos e conflitos</h2>
      <p className="mt-1 text-sm font-light text-fundo/70">Nenhuma pode ficar em branco (art. 9º, VII, e art. 23).</p>
      <div className="mt-4 grid gap-3">
        {CONFLITOS.map((c) => (
          <div key={c.id} className="rounded-2xl border border-fundo/10 p-4">
            <p className="font-medium">{c.pergunta}</p>
            <div className="mt-2 flex gap-2">
              {[
                ["nao", "Não"],
                ["sim", "Sim"],
              ].map(([v, r]) => (
                <label
                  key={v}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border-[1.5px] px-4 py-2 text-sm font-medium",
                    resp[c.id] === v ? "border-verde bg-verde/[0.06]" : "border-fundo/12",
                  )}
                >
                  <input
                    type="radio"
                    name={`conflito_${c.id}`}
                    value={v}
                    checked={resp[c.id] === v}
                    onChange={() => setResp((x) => ({ ...x, [c.id]: v }))}
                    className="accent-[#0d8049]"
                  />
                  {r}
                </label>
              ))}
            </div>
            {resp[c.id] === "sim" && (
              <Campo label={c.dica} className="mt-3">
                <textarea name={`conflito_${c.id}_desc`} defaultValue={i[`conflito_${c.id}_desc` as const] ?? ""} maxLength={1000} rows={2} className={inputCls} />
              </Campo>
            )}
          </div>
        ))}
      </div>
      <Navegacao />
    </form>
  );
}

// ───────── 6. Revisão e envio ─────────

function PassoEnvio(
  p: Props & {
    ocupado: boolean;
    ir: (n: number) => void;
    onEnviar: (fd: FormData) => void;
    onAcao: (f: () => Promise<Resultado>, depois?: () => void) => void;
  },
) {
  const router = useRouter();
  const [aceite, setAceite] = useState(false);
  const i = p.indicacao;
  const cat = p.categorias.find((c) => c.id === i.category_id)?.nome;

  if (i.status === "enviada") {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-amarelo text-fundo">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold">Indicação enviada</h2>
        <p className="mx-auto mt-2 max-w-md font-light text-fundo/70">
          Registrada em {formatarData(i.submetido_em)}{i.versao > 1 ? ` · versão ${i.versao}` : ""}. A Secretaria Executiva analisa completude e
          elegibilidade de 26 a 28/10 e comunica a decisão preliminar.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/entidade" className={btnPrim}>
            Minhas indicações
          </Link>
          {p.podeReabrir && (
            <button
              type="button"
              className={btnSec}
              disabled={p.ocupado}
              onClick={() =>
                confirm(
                  "Reabrir para editar? A indicação volta a rascunho e só conta depois de reenviada, até o fim do prazo. A ordem de chegada continua a do primeiro envio.",
                ) && p.onAcao(() => reabrirIndicacao(i.id))
              }
            >
              <Pencil className="size-4" /> Editar
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Revisão e envio</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-3 rounded-2xl bg-nevoa p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-fundo/55">Categoria</dt>
          <dd className="font-medium">{cat ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-fundo/55">Indicado</dt>
          <dd className="font-medium">{i.indicado_nome || "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-fundo/55">Realização</dt>
          <dd className="font-medium">{i.titulo || "—"}</dd>
        </div>
      </dl>

      {p.pendencias.length > 0 ? (
        <Aviso tom="alerta" className="mt-5">
          <p className="font-semibold">{p.pendencias.length === 1 ? "Falta 1 item" : `Faltam ${p.pendencias.length} itens`} para enviar:</p>
          <ul className="mt-2 space-y-1">
            {p.pendencias.map((x) => (
              <li key={x.texto}>
                ·{" "}
                <button type="button" onClick={() => p.ir(x.passo)} className="text-left underline underline-offset-2">
                  {x.texto}
                </button>
              </li>
            ))}
          </ul>
        </Aviso>
      ) : (
        p.editavel && (
          <Aviso tom="ok" className="mt-5">
            Tudo preenchido. Leia a declaração e envie. O prazo, os limites e a autoindicação são conferidos no envio.
          </Aviso>
        )
      )}

      {p.editavel && (
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault();
            p.onEnviar(new FormData(e.currentTarget));
          }}
        >
          <p className="text-[13px] font-semibold">Declaração do indicador (Anexo II)</p>
          <p className="text-[12.5px] text-fundo/60">O aceite fica registrado com data, hora, IP e o representante.</p>
          <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] border-fundo/12 p-4 text-sm">
            <input type="checkbox" name="declaracao" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-0.5 size-4 accent-[#0d8049]" />
            <span>{DECLARACAO_INDICADOR}</span>
          </label>
          <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-fundo/10 pt-5">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSec} onClick={() => p.ir(5)}>
                <ArrowLeft className="size-4" /> Voltar
              </button>
              {!i.submetido_em && (
                <button
                  type="button"
                  className={cn(btnSec, "text-vermelho")}
                  disabled={p.ocupado}
                  onClick={() => confirm("Excluir este rascunho?") && p.onAcao(() => excluirIndicacao(i.id), () => router.push("/entidade"))}
                >
                  <Trash2 className="size-4" /> Excluir rascunho
                </button>
              )}
            </div>
            <button className={btnPrim} disabled={p.ocupado || p.pendencias.length > 0 || !aceite}>
              {p.ocupado && <Loader2 className="size-4 animate-spin" />} {i.submetido_em ? "Reenviar indicação" : "Enviar indicação"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
