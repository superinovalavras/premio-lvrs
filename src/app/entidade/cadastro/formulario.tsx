"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, ArrowRight, Check, ExternalLink, FileUp, Link2, Loader2, Trash2 } from "lucide-react";
import { Aviso, Campo, Cartao, btnEscuro, btnPrim, btnSec, inputCls } from "@/components/area/ui";
import { cn } from "@/lib/utils";
import { mascaraCelular, mascaraCpf } from "@/lib/voto";
import {
  CRITERIOS_VII,
  DECLARACOES,
  INCISOS,
  NATUREZAS,
  NOTA_INCISO_VI,
  documentosExigidos,
  formatarData,
  incisoPorId,
  mascaraCnpj,
  tipoCriterio,
  type DocumentoRow,
  type EntidadeRow,
  type Pendencia,
  type RepresentanteRow,
} from "@/lib/entidades";
import {
  abrirDocumento,
  confirmarUpload,
  enviarParaAnalise,
  prepararUpload,
  removerDocumento,
  salvarDados,
  salvarEnquadramento,
  salvarLink,
  salvarRepresentantes,
  type Resultado,
} from "@/lib/server/acoes-entidade";

const PASSOS = ["Enquadramento", "Dados da instituição", "Representante", "Documentos", "Revisão e envio"];

type Props = {
  entidade: EntidadeRow;
  titular: RepresentanteRow | null;
  suplente: RepresentanteRow | null;
  documentos: DocumentoRow[];
  pendencias: Pendencia[];
  editavel: boolean;
  supabaseUrl: string;
  supabaseAnon: string;
};

export function FormularioCadastro(p: Props) {
  const router = useRouter();
  const primeiroPendente = p.pendencias[0]?.passo ?? 5;
  const [passo, setPasso] = useState(p.editavel ? Math.min(primeiroPendente, p.entidade.inciso ? 5 : 1) : 5);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [listaPend, setListaPend] = useState<string[] | null>(null);
  const [enviado, setEnviado] = useState(false);

  const ir = (n: number) => {
    setErro(null);
    setListaPend(null);
    setPasso(n);
    document.getElementById("topo-cadastro")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const salvar = (acao: (fd: FormData) => Promise<Resultado>, proximo: number) => (fd: FormData) => {
    if (!p.editavel) return ir(proximo);
    iniciar(async () => {
      const r = await acao(fd);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      router.refresh();
      ir(proximo);
    });
  };

  const passoTemPendencia = (n: number) => p.pendencias.some((x) => x.passo === n);

  return (
    <div id="topo-cadastro" className="grid scroll-mt-4 gap-4 lg:grid-cols-[230px_1fr] lg:items-start">
      {/* navegação dos passos */}
      <nav aria-label="Passos do cadastro" className="rounded-[22px] border border-fundo/10 bg-papel p-3 lg:sticky lg:top-4">
        <ol className="grid grid-cols-5 gap-1 lg:grid-cols-1">
          {PASSOS.map((nome, i) => {
            const n = i + 1;
            const ok = !passoTemPendencia(n) && (n < 5 || p.pendencias.length === 0);
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
      </nav>

      <Cartao>
        <p className="text-[12px] font-medium text-fundo/55">
          Passo {passo} de 5 · {PASSOS[passo - 1]}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-nevoa">
          <div className="h-full rounded-full bg-verde transition-all" style={{ width: `${(passo / 5) * 100}%` }} />
        </div>

        {!p.editavel && (
          <Aviso tom="info" className="mt-5">
            Modo de leitura: o cadastro está {p.entidade.status === "em_analise" ? "em análise" : "decidido"} e não pode ser alterado.
          </Aviso>
        )}

        <fieldset
          disabled={!p.editavel || pendente}
          data-leitura={p.editavel ? undefined : ""}
          className="group mt-6 min-w-0"
        >
          {passo === 1 && (
            <PassoEnquadramento entidade={p.entidade} onSubmit={salvar(salvarEnquadramento, 2)} />
          )}
          {passo === 2 && <PassoDados entidade={p.entidade} onSubmit={salvar(salvarDados, 3)} />}
          {passo === 3 && (
            <PassoRepresentantes titular={p.titular} suplente={p.suplente} onSubmit={salvar(salvarRepresentantes, 4)} />
          )}
        </fieldset>
        {passo === 4 && (
          <PassoDocumentos
            {...p}
            onErro={setErro}
            ocupado={pendente}
            iniciar={iniciar}
            atualizar={() => router.refresh()}
          />
        )}
        {passo === 5 && (
          <PassoEnvio
            {...p}
            enviado={enviado}
            listaPend={listaPend}
            ocupado={pendente}
            ir={ir}
            onSubmit={(fd) =>
              iniciar(async () => {
                const r = await enviarParaAnalise(fd);
                if (!r.ok) {
                  setErro(r.erro);
                  setListaPend(r.pendencias ?? null);
                  return;
                }
                setEnviado(true);
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

        {(passo === 4 || (!p.editavel && passo < 5)) && (
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

// ───────── Rodapé dos passos com formulário ─────────

function Navegacao({ voltar, ocupado }: { voltar?: () => void; ocupado?: boolean }) {
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
        {ocupado ? <Loader2 className="size-4 animate-spin" /> : null} Salvar e continuar <ArrowRight className="size-4" />
      </button>
    </div>
  );
}

// ───────── 1. Enquadramento ─────────

function PassoEnquadramento({ entidade, onSubmit }: { entidade: EntidadeRow; onSubmit: (fd: FormData) => void }) {
  const [inciso, setInciso] = useState(entidade.inciso ?? "");
  const [criterios, setCriterios] = useState<string[]>(entidade.criterios_vii);
  return (
    <form action={onSubmit}>
      <h2 className="text-xl font-semibold">Em qual inciso do art. 2º-B a instituição se enquadra?</h2>
      <p className="mt-1 text-sm font-light text-fundo/70">
        Lei Municipal nº 3.813/2011. A escolha define os documentos exigidos.
      </p>
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {INCISOS.map((i) => {
          const sel = inciso === i.id;
          return (
            <label
              key={i.id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-2xl border-[1.5px] p-4 transition",
                sel ? "border-verde bg-verde/[0.06]" : "border-fundo/12 hover:border-fundo/35",
              )}
            >
              <input
                type="radio"
                name="inciso"
                value={i.id}
                checked={sel}
                onChange={() => setInciso(i.id)}
                className="mt-1 size-4 accent-[#0d8049]"
                required
              />
              <span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-verde">Inciso {i.rotulo}</span>
                <span className="mt-0.5 block text-[14px] font-medium leading-snug">{i.quem}</span>
              </span>
            </label>
          );
        })}
      </div>

      {inciso === "VI" && (
        <Aviso tom="info" className="mt-4">
          {NOTA_INCISO_VI}
        </Aviso>
      )}

      {inciso === "VII" && (
        <div className="mt-6">
          <h3 className="font-semibold">Critérios de aferição (item 1.2)</h3>
          <p className="mt-1 text-sm font-light text-fundo/70">
            Marque pelo menos um. Cada critério marcado exige uma evidência (arquivo ou link) no passo Documentos —
            nenhum critério é autodeclaratório.
          </p>
          <div className="mt-3 grid gap-2">
            {CRITERIOS_VII.map((c) => (
              <label
                key={c.id}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-2xl border-[1.5px] p-3.5 transition",
                  criterios.includes(c.id) ? "border-verde bg-verde/[0.06]" : "border-fundo/12 hover:border-fundo/35",
                )}
              >
                <input
                  type="checkbox"
                  name="criterios"
                  value={c.id}
                  checked={criterios.includes(c.id)}
                  onChange={(ev) =>
                    setCriterios((atual) => (ev.target.checked ? [...atual, c.id] : atual.filter((x) => x !== c.id)))
                  }
                  className="mt-1 size-4 accent-[#0d8049]"
                />
                <span>
                  <span className="block text-[14px] font-medium leading-snug">{c.nome}</span>
                  <span className="text-[12.5px] text-fundo/60">Evidência: {c.evidencia}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {inciso && (
        <div className="mt-6 rounded-2xl bg-nevoa p-4 text-sm">
          <p className="font-semibold">Documentos que serão pedidos</p>
          <ul className="mt-1.5 list-disc pl-5 text-fundo/75">
            {documentosExigidos(inciso as EntidadeRow["inciso"], false).map((d) => (
              <li key={d.id}>
                {d.nome}
                {d.dica && <span className="text-fundo/55"> — {d.dica}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <Navegacao />
    </form>
  );
}

// ───────── 2. Dados ─────────

function PassoDados({ entidade: e, onSubmit }: { entidade: EntidadeRow; onSubmit: (fd: FormData) => void }) {
  const inciso = incisoPorId(e.inciso);
  const [cnpj, setCnpj] = useState(mascaraCnpj(e.cnpj ?? ""));
  const [assento, setAssento] = useState(e.assento_cocitieis === null ? "" : e.assento_cocitieis ? "sim" : "nao");
  return (
    <form action={onSubmit}>
      <h2 className="text-xl font-semibold">Dados da instituição</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Campo label="Razão social ou denominação" className="sm:col-span-2">
          <input name="razao_social" defaultValue={e.razao_social ?? ""} className={inputCls} />
        </Campo>
        <Campo label="Nome fantasia" opcional>
          <input name="nome_fantasia" defaultValue={e.nome_fantasia ?? ""} className={inputCls} />
        </Campo>
        <Campo
          label="CNPJ"
          dica={e.inciso === "I_II" ? "Órgão municipal sem CNPJ próprio: use o da Prefeitura e informe a unidade." : undefined}
        >
          <input
            name="cnpj"
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            value={cnpj}
            onChange={(ev) => setCnpj(mascaraCnpj(ev.target.value))}
            className={inputCls}
          />
        </Campo>
        {e.inciso === "I_II" && (
          <Campo label="Unidade (secretaria, autarquia, órgão)" opcional className="sm:col-span-2">
            <input name="unidade_municipal" defaultValue={e.unidade_municipal ?? ""} className={inputCls} />
          </Campo>
        )}
        <Campo label="Natureza jurídica">
          <select name="natureza_juridica" defaultValue={e.natureza_juridica ?? ""} className={inputCls}>
            <option value="">Selecione</option>
            {NATUREZAS.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Data de constituição" opcional>
          <input name="data_constituicao" type="date" defaultValue={e.data_constituicao ?? ""} className={inputCls} />
        </Campo>
        <Campo
          label="Endereço completo em Lavras"
          opcional={!inciso?.enderecoObrigatorio}
          dica={inciso?.enderecoObrigatorio ? "A Lei exige sede, unidade ou instalação no Município." : undefined}
          className="sm:col-span-2"
        >
          <input name="endereco" defaultValue={e.endereco ?? ""} className={inputCls} />
        </Campo>
        <Campo label="Site e redes sociais" opcional className="sm:col-span-2">
          <input name="site" defaultValue={e.site ?? ""} placeholder="https://" className={inputCls} />
        </Campo>
      </div>

      <div className="mt-6">
        <p className="text-[13px] font-medium">A instituição tem assento no COCITIEIS?</p>
        <div className="mt-2 flex gap-2">
          {[
            ["sim", "Sim"],
            ["nao", "Não"],
          ].map(([v, r]) => (
            <label
              key={v}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl border-[1.5px] px-4 py-2.5 text-sm font-medium",
                assento === v ? "border-verde bg-verde/[0.06]" : "border-fundo/12",
              )}
            >
              <input type="radio" name="assento_cocitieis" value={v} checked={assento === v} onChange={() => setAssento(v)} className="accent-[#0d8049]" />
              {r}
            </label>
          ))}
        </div>
        {assento === "sim" && (
          <Campo
            label="Conselheiro que representa a instituição"
            dica="As indicações da instituição e as do seu conselheiro somam na mesma cota (art. 8º, § 7º)."
            className="mt-4"
          >
            <input name="conselheiro_nome" defaultValue={e.conselheiro_nome ?? ""} className={inputCls} />
          </Campo>
        )}
      </div>
      <Navegacao />
    </form>
  );
}

// ───────── 3. Representantes ─────────

function CamposPessoa({ prefixo, r, emailFixo }: { prefixo: string; r: RepresentanteRow | null; emailFixo?: boolean }) {
  const [cpf, setCpf] = useState(mascaraCpf(r?.cpf ?? ""));
  const [tel, setTel] = useState(mascaraCelular(r?.telefone ?? ""));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo label="Nome completo" className="sm:col-span-2">
        <input name={`${prefixo}_nome`} defaultValue={r?.nome ?? ""} className={inputCls} />
      </Campo>
      <Campo label="CPF" dica="Usado na checagem de autoindicação e de impedimento.">
        <input
          name={`${prefixo}_cpf`}
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(mascaraCpf(e.target.value))}
          className={inputCls}
        />
      </Campo>
      <Campo label="Cargo ou função">
        <input name={`${prefixo}_cargo`} defaultValue={r?.cargo ?? ""} className={inputCls} />
      </Campo>
      <Campo label="E-mail" dica={emailFixo ? "É o login de acesso e não pode ser alterado aqui." : "Preferencialmente institucional."}>
        <input
          name={`${prefixo}_email`}
          type="email"
          defaultValue={r?.email ?? ""}
          readOnly={emailFixo}
          className={cn(inputCls, emailFixo && "bg-nevoa text-fundo/70")}
        />
      </Campo>
      <Campo label="Telefone com DDD">
        <input
          name={`${prefixo}_telefone`}
          inputMode="numeric"
          placeholder="(35) 99999-9999"
          value={tel}
          onChange={(e) => setTel(mascaraCelular(e.target.value))}
          className={inputCls}
        />
      </Campo>
    </div>
  );
}

function PassoRepresentantes({
  titular,
  suplente,
  onSubmit,
}: {
  titular: RepresentanteRow | null;
  suplente: RepresentanteRow | null;
  onSubmit: (fd: FormData) => void;
}) {
  const [temSuplente, setTemSuplente] = useState(!!suplente);
  return (
    <form action={onSubmit}>
      <h2 className="text-xl font-semibold">Representante designado</h2>
      <p className="mt-1 text-sm font-light text-fundo/70">
        A indicação é ato da instituição, exercido pela pessoa designada. O ato de designação é pedido no passo
        Documentos.
      </p>
      <div className="mt-5">
        <CamposPessoa prefixo="titular" r={titular} emailFixo />
      </div>

      <label className="mt-7 flex cursor-pointer items-center gap-3 rounded-2xl bg-nevoa p-4 text-sm">
        <input
          type="checkbox"
          name="tem_suplente"
          checked={temSuplente}
          onChange={(e) => setTemSuplente(e.target.checked)}
          className="size-4 accent-[#0d8049]"
        />
        <span>
          <b className="font-semibold">Indicar um suplente</b>{" "}
          <span className="text-fundo/65">(opcional — compartilha a cota da instituição)</span>
        </span>
      </label>
      {temSuplente && (
        <div className="mt-5">
          <CamposPessoa prefixo="suplente" r={suplente} />
        </div>
      )}
      <Navegacao />
    </form>
  );
}

// ───────── 4. Documentos ─────────

type Item = { tipo: string; nome: string; dica?: string; aceitaLink: boolean };

function PassoDocumentos(
  p: Props & {
    onErro: (e: string | null) => void;
    ocupado: boolean;
    iniciar: (f: () => Promise<void>) => void;
    atualizar: () => void;
  },
) {
  const itens: Item[] = useMemo(
    () => [
      ...documentosExigidos(p.entidade.inciso, !!p.suplente).map((d) => ({
        tipo: d.id,
        nome: d.nome,
        dica: d.dica,
        aceitaLink: false,
      })),
      ...(p.entidade.inciso === "VII"
        ? p.entidade.criterios_vii.map((c) => {
            const crit = CRITERIOS_VII.find((x) => x.id === c)!;
            return { tipo: tipoCriterio(c), nome: `Evidência: ${crit.nome}`, dica: crit.evidencia, aceitaLink: true };
          })
        : []),
    ],
    [p.entidade, p.suplente],
  );

  if (!p.entidade.inciso) {
    return <Aviso tom="alerta">Escolha o enquadramento no passo 1 para ver os documentos exigidos.</Aviso>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Documentos comprobatórios</h2>
      <p className="mt-1 text-sm font-light text-fundo/70">PDF (ou imagem PNG/JPG), até 10 MB por arquivo.</p>
      <ul className="mt-5 divide-y divide-fundo/10">
        {itens.map((it) => (
          <LinhaDocumento key={it.tipo} item={it} doc={p.documentos.find((d) => d.tipo === it.tipo)} {...p} />
        ))}
      </ul>
    </div>
  );
}

function LinhaDocumento({
  item,
  doc,
  editavel,
  supabaseUrl,
  supabaseAnon,
  onErro,
  atualizar,
}: Props & {
  item: Item;
  doc?: DocumentoRow;
  onErro: (e: string | null) => void;
  atualizar: () => void;
}) {
  const arquivo = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [modoLink, setModoLink] = useState(false);
  const [link, setLink] = useState("");

  async function enviar(f: File) {
    onErro(null);
    if (f.size > 10 * 1024 * 1024) return onErro("O arquivo passa de 10 MB.");
    setEnviando(true);
    try {
      const prep = await prepararUpload(item.tipo, f.name, f.size, f.type);
      if (!prep.ok) return onErro(prep.erro);
      const sb = createClient(supabaseUrl, supabaseAnon, { auth: { persistSession: false } });
      const { error } = await sb.storage.from("entidades").uploadToSignedUrl(prep.caminho, prep.token, f, { contentType: f.type });
      if (error) return onErro("Falha no envio do arquivo. Tente de novo.");
      const r = await confirmarUpload(item.tipo, prep.caminho, f.name, f.size);
      if (!r.ok) return onErro(r.erro);
      atualizar();
    } finally {
      setEnviando(false);
      if (arquivo.current) arquivo.current.value = "";
    }
  }

  async function gravarLink() {
    onErro(null);
    setEnviando(true);
    const r = await salvarLink(item.tipo, link);
    setEnviando(false);
    if (!r.ok) return onErro(r.erro);
    setModoLink(false);
    setLink("");
    atualizar();
  }

  async function abrir() {
    if (!doc) return;
    const r = await abrirDocumento(doc.id);
    if (r.ok) window.open(r.url, "_blank", "noopener");
    else onErro(r.erro);
  }

  async function remover() {
    if (!doc) return;
    setEnviando(true);
    const r = await removerDocumento(doc.id);
    setEnviando(false);
    if (!r.ok) return onErro(r.erro);
    atualizar();
  }

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
            doc ? "bg-verde text-white" : "bg-amarelo/30 text-fundo",
          )}
        >
          {doc ? <Check className="size-4" strokeWidth={3} /> : <FileUp className="size-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{item.nome}</p>
          {item.dica && <p className="text-[12.5px] text-fundo/60">{item.dica}</p>}
          {doc && (
            <p className="mt-1 truncate text-[12.5px] text-verde">
              {doc.link ?? doc.nome_arquivo} · {formatarData(doc.enviado_em)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {doc && (
            <button type="button" onClick={abrir} className={cn(btnSec, "px-3 py-2")}>
              <ExternalLink className="size-4" /> Abrir
            </button>
          )}
          {editavel && (
            <>
              <input
                ref={arquivo}
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])}
              />
              <button
                type="button"
                disabled={enviando}
                onClick={() => arquivo.current?.click()}
                className={cn(doc ? btnSec : btnEscuro, "px-3 py-2")}
              >
                {enviando ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
                {doc ? "Trocar" : "Enviar arquivo"}
              </button>
              {item.aceitaLink && !doc && (
                <button type="button" onClick={() => setModoLink((m) => !m)} className={cn(btnSec, "px-3 py-2")}>
                  <Link2 className="size-4" /> Link
                </button>
              )}
              {doc && (
                <button type="button" disabled={enviando} onClick={remover} className={cn(btnSec, "px-3 py-2")} title="Remover">
                  <Trash2 className="size-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {modoLink && (
        <div className="mt-3 flex gap-2 sm:pl-12">
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={inputCls} />
          <button type="button" onClick={gravarLink} disabled={enviando || !link} className={btnEscuro}>
            Salvar
          </button>
        </div>
      )}
    </li>
  );
}

// ───────── 5. Revisão e envio ─────────

function PassoEnvio(
  p: Props & {
    enviado: boolean;
    listaPend: string[] | null;
    ocupado: boolean;
    ir: (n: number) => void;
    onSubmit: (fd: FormData) => void;
  },
) {
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const e = p.entidade;
  const inciso = incisoPorId(e.inciso);

  if (p.enviado || e.status === "em_analise") {
    return (
      <div className="py-6 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-amarelo text-fundo">
          <Check className="size-8" strokeWidth={3} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold">Cadastro enviado para análise</h2>
        <p className="mx-auto mt-2 max-w-md font-light text-fundo/70">
          A Secretaria Executiva analisa em até 1 dia útil. Você recebe a decisão por e-mail e pode acompanhar pelo
          painel.
        </p>
        <Link href="/entidade" className={cn(btnPrim, "mt-6")}>
          Ir para o painel
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold">Revisão e envio</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-3 rounded-2xl bg-nevoa p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-fundo/55">Instituição</dt>
          <dd className="font-medium">{e.razao_social || "—"}</dd>
        </div>
        <div>
          <dt className="text-fundo/55">Enquadramento</dt>
          <dd className="font-medium">{inciso ? `Inciso ${inciso.rotulo} · ${inciso.quem}` : "—"}</dd>
        </div>
        <div>
          <dt className="text-fundo/55">CNPJ</dt>
          <dd className="font-medium">{e.cnpj ? mascaraCnpj(e.cnpj) : "—"}</dd>
        </div>
        <div>
          <dt className="text-fundo/55">Representante</dt>
          <dd className="font-medium">{p.titular?.nome || "—"}</dd>
        </div>
      </dl>

      {p.pendencias.length > 0 ? (
        <Aviso tom="alerta" className="mt-5">
          <p className="font-semibold">Faltam {p.pendencias.length} itens para enviar:</p>
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
            Tudo preenchido. Confira as declarações e envie.
          </Aviso>
        )
      )}

      {p.editavel && (
        <form action={p.onSubmit} className="mt-6">
          <p className="text-[13px] font-semibold">Declarações obrigatórias</p>
          <p className="text-[12.5px] text-fundo/60">O aceite fica registrado com data, hora e IP.</p>
          <div className="mt-3 grid gap-2">
            {DECLARACOES.map((d) => (
              <label key={d.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border-[1.5px] border-fundo/12 p-3.5 text-sm">
                <input
                  type="checkbox"
                  name={`decl_${d.id}`}
                  checked={marcadas.includes(d.id)}
                  onChange={(ev) =>
                    setMarcadas((m) => (ev.target.checked ? [...m, d.id] : m.filter((x) => x !== d.id)))
                  }
                  className="mt-0.5 size-4 accent-[#0d8049]"
                />
                <span>
                  {d.texto}
                  {d.id === "privacidade" && (
                    <>
                      {" "}
                      <Link href="/privacidade" target="_blank" className="font-semibold text-verde underline underline-offset-2">
                        Ler o aviso
                      </Link>
                    </>
                  )}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-fundo/10 pt-5">
            <button type="button" className={btnSec} onClick={() => p.ir(4)}>
              <ArrowLeft className="size-4" /> Voltar
            </button>
            <button
              className={btnPrim}
              disabled={p.ocupado || p.pendencias.length > 0 || marcadas.length < DECLARACOES.length}
            >
              {p.ocupado && <Loader2 className="size-4 animate-spin" />}
              {e.status === "pendente_ajuste" ? "Reenviar para análise" : "Enviar para análise"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
