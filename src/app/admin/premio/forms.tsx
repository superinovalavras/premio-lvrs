"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { salvarCronograma, salvarDatas } from "@/lib/server/acoes-parametros";
import { CartaoAdmin, btnAmarelo, btnContorno, inputEscuro } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

function Mensagem({ m }: { m: { ok: boolean; texto: string } | null }) {
  if (!m) return null;
  return <p className={cn("text-sm", m.ok ? "text-[#8ff0bd]" : "text-[#ff8a8f]")}>{m.texto}</p>;
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">{children}</span>;
}

export function FormDatas({
  valores,
  votacaoComecou,
  indicacoesComecaram,
}: {
  valores: Record<string, string>;
  votacaoComecou: boolean;
  indicacoesComecaram: boolean;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [mexeu, setMexeu] = useState<Set<string>>(new Set());
  const exigeMotivo =
    (votacaoComecou && (mexeu.has("votacao_abre") || mexeu.has("votacao_fecha"))) ||
    (indicacoesComecaram && (mexeu.has("indicacoes_abrem") || mexeu.has("indicacoes_fecham")));

  const campo = (nome: string, rotulo: string, tipo = "datetime-local") => (
    <label>
      <Rotulo>{rotulo}</Rotulo>
      <input
        type={tipo}
        name={nome}
        defaultValue={valores[nome]}
        onChange={() => setMexeu((s) => new Set(s).add(nome))}
        required={tipo !== "text"}
        className={inputEscuro}
      />
    </label>
  );

  return (
    <form
      action={(fd) =>
        iniciar(async () => {
          const r = await salvarDatas(fd);
          setMsg(r.ok ? { ok: true, texto: r.msg ?? "Salvo." } : { ok: false, texto: r.erro });
          if (r.ok) {
            setMexeu(new Set());
            router.refresh();
          }
        })
      }
      className="grid gap-4 lg:grid-cols-3"
    >
      <CartaoAdmin>
        <h2 className="font-semibold">Indicações</h2>
        <p className="mb-4 mt-1 text-[13px] text-white/60">Período em que instituições deferidas indicam (art. 8º-A, II).</p>
        <div className="grid gap-3">
          {campo("indicacoes_abrem", "Abrem em")}
          {campo("indicacoes_fecham", "Encerram em")}
        </div>
      </CartaoAdmin>
      <CartaoAdmin>
        <h2 className="font-semibold">Votação popular</h2>
        <p className="mb-4 mt-1 text-[13px] text-white/60">Vale para o site e para a trava do banco ao mesmo tempo.</p>
        <div className="grid gap-3">
          {campo("votacao_abre", "Abre em")}
          {campo("votacao_fecha", "Encerra em")}
        </div>
      </CartaoAdmin>
      <CartaoAdmin>
        <h2 className="font-semibold">Cerimônia de gala</h2>
        <p className="mb-4 mt-1 text-[13px] text-white/60">A contagem regressiva do site conta até aqui.</p>
        <div className="grid gap-3">
          {campo("gala_em", "Data e hora")}
          {campo("gala_local", "Local (opcional)", "text")}
        </div>
      </CartaoAdmin>

      {exigeMotivo && (
        <CartaoAdmin className="border-amarelo/60 lg:col-span-3">
          <label>
            <Rotulo>Este período já começou. Motivo da alteração (obrigatório, fica no histórico)</Rotulo>
            <textarea name="motivo" required minLength={10} rows={3} className={inputEscuro} />
          </label>
        </CartaoAdmin>
      )}

      <div className="flex flex-wrap items-center gap-4 lg:col-span-3">
        <button className={btnAmarelo} disabled={pendente}>
          {pendente && <Loader2 className="size-4 animate-spin" />} Salvar datas
        </button>
        <Mensagem m={msg} />
      </div>
    </form>
  );
}

type Etapa = { titulo: string; data: string; texto: string; destaque: boolean };

export function EditorCronograma({ etapas: iniciais }: { etapas: Etapa[] }) {
  const router = useRouter();
  const [etapas, setEtapas] = useState<(Etapa & { k: number })[]>(iniciais.map((e, k) => ({ ...e, k })));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  const muda = (i: number, campo: keyof Etapa, valor: string | boolean) =>
    setEtapas((l) => l.map((e, j) => (j === i ? { ...e, [campo]: valor } : e)));
  const move = (i: number, d: -1 | 1) =>
    setEtapas((l) => {
      const n = [...l];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  return (
    <CartaoAdmin className="mt-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Linha do tempo do site</h2>
          <p className="mt-1 text-[13px] text-white/60">
            Só o texto da linha do tempo do site — não abre nem fecha nada. Os prazos de verdade são os campos de datas
            acima. Etapas em destaque aparecem em verde.
          </p>
        </div>
        <button
          type="button"
          className={btnContorno}
          onClick={() => setEtapas((l) => [...l, { titulo: "", data: "A confirmar", texto: "", destaque: false, k: Date.now() }])}
        >
          <Plus className="size-4" /> Adicionar etapa
        </button>
      </div>

      <ol className="grid gap-3">
        {etapas.map((e, i) => (
          <li key={e.k} className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <div className="grid gap-3 md:grid-cols-[1.2fr_0.8fr_auto]">
              <input value={e.titulo} onChange={(ev) => muda(i, "titulo", ev.target.value)} placeholder="Etapa" className={inputEscuro} />
              <input value={e.data} onChange={(ev) => muda(i, "data", ev.target.value)} placeholder="Data exibida" className={inputEscuro} />
              <div className="flex items-center gap-1.5">
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-[13px]">
                  <input type="checkbox" checked={e.destaque} onChange={(ev) => muda(i, "destaque", ev.target.checked)} className="accent-[#ffcd00]" />
                  Destaque
                </label>
                <button type="button" title="Subir" disabled={i === 0} onClick={() => move(i, -1)} className={cn(btnContorno, "px-2")}>
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" title="Descer" disabled={i === etapas.length - 1} onClick={() => move(i, 1)} className={cn(btnContorno, "px-2")}>
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" title="Remover" onClick={() => setEtapas((l) => l.filter((_, j) => j !== i))} className={cn(btnContorno, "px-2")}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <textarea
              value={e.texto}
              onChange={(ev) => muda(i, "texto", ev.target.value)}
              placeholder="Descrição curta"
              rows={2}
              className={cn(inputEscuro, "mt-3")}
            />
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          className={btnAmarelo}
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await salvarCronograma(etapas.map((e) => ({ titulo: e.titulo, data: e.data, texto: e.texto, destaque: e.destaque })));
              setMsg(r.ok ? { ok: true, texto: r.msg ?? "Salvo." } : { ok: false, texto: r.erro });
              if (r.ok) router.refresh();
            })
          }
        >
          {pendente && <Loader2 className="size-4 animate-spin" />} Salvar cronograma
        </button>
        <Mensagem m={msg} />
      </div>
    </CartaoAdmin>
  );
}
