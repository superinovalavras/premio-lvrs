"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Loader2, Save, Send } from "lucide-react";
import { abrirMaterial, enviarFicha, salvarRascunho, type NotaEnviada } from "@/lib/server/acoes-avaliacao";
import { Aviso, Cartao, btnPrim, btnSec, inputCls } from "@/components/area/ui";
import { ESCALA, exigeComentario, formatarNota, lerNota, notaIndividual, type Matriz } from "@/lib/avaliacao";
import { cn } from "@/lib/utils";

export type ValorNota = { nota: string; comentario: string };
type Candidato = { id: string; nome: string; resumo: string; temMaterial: boolean };

const chave = (f: string, c: string) => `${f}|${c}`;

export function Ficha({
  rodadaId,
  matriz,
  candidatos,
  iniciais,
  editavel,
  situacao,
}: {
  rodadaId: string;
  matriz: Matriz;
  candidatos: Candidato[];
  iniciais: Record<string, ValorNota>;
  editavel: boolean;
  situacao: string | null;
}) {
  const router = useRouter();
  const [valores, setValores] = useState(iniciais);
  const [sujo, setSujo] = useState(false);
  const [msg, setMsg] = useState<{ tom: "ok" | "erro"; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  // Aviso ao sair com alterações não salvas.
  useEffect(() => {
    if (!sujo) return;
    const f = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [sujo]);

  const total = candidatos.length * matriz.criterios.length;
  const preenchidas = useMemo(() => Object.values(valores).filter((v) => lerNota(v.nota) !== null).length, [valores]);

  const set = (k: string, campo: keyof ValorNota, v: string) => {
    setValores((x) => ({ ...x, [k]: { ...(x[k] ?? { nota: "", comentario: "" }), [campo]: v } }));
    setSujo(true);
    setMsg(null);
  };

  const lista = (): NotaEnviada[] =>
    candidatos.flatMap((f) =>
      matriz.criterios.map((c) => ({
        finalista: f.id,
        criterio: c.id,
        nota: valores[chave(f.id, c.id)]?.nota ?? "",
        comentario: valores[chave(f.id, c.id)]?.comentario ?? "",
      })),
    );

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarRascunho(rodadaId, lista());
      setMsg(r.ok ? { tom: "ok", texto: "Rascunho salvo. Você pode voltar depois." } : { tom: "erro", texto: r.erro });
      if (r.ok) setSujo(false);
    });

  const enviar = () => {
    if (!confirm("Enviar a ficha? Depois de enviada, nenhuma nota pode ser alterada (art. 15, § 5º).")) return;
    iniciar(async () => {
      const r = await enviarFicha(rodadaId, lista());
      if (!r.ok) return setMsg({ tom: "erro", texto: r.erro });
      setSujo(false);
      router.refresh();
    });
  };

  const verMaterial = async (finalistaId: string) => {
    const w = window.open("", "_blank");
    const r = await abrirMaterial(rodadaId, finalistaId);
    if (r.ok && w) {
      w.opener = null;
      w.location.href = r.url;
    } else {
      w?.close();
      if (!r.ok) setMsg({ tom: "erro", texto: r.erro });
    }
  };

  return (
    <div className="grid gap-5">
      {situacao && (
        <Aviso tom={situacao.startsWith("Ficha enviada") ? "ok" : "info"}>
          {situacao.startsWith("Ficha enviada") && <CheckCircle2 className="mr-1.5 inline size-4 text-verde" />}
          {situacao}
        </Aviso>
      )}

      {editavel && (
        <details className="rounded-[22px] border border-fundo/10 bg-papel px-5 py-4 text-sm">
          <summary className="cursor-pointer font-semibold">Escala de pontuação (Anexo I)</summary>
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {ESCALA.map((e) => (
              <div key={e.nota} className="grid grid-cols-[44px_1fr] gap-2">
                <dt className="font-semibold text-verde">{e.nota}</dt>
                <dd className="font-light text-fundo/75">{e.texto}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-fundo/70">Notas intermediárias são permitidas. Abaixo de 4,0 ou acima de 9,0, escreva um comentário curto.</p>
        </details>
      )}

      {candidatos.map((f, i) => {
        const notas: Record<string, number> = {};
        let completo = true;
        for (const c of matriz.criterios) {
          const n = lerNota(valores[chave(f.id, c.id)]?.nota ?? "");
          if (n === null) completo = false;
          else notas[c.id] = n;
        }
        return (
          <Cartao key={f.id} className="p-0 sm:p-0">
            <div className="flex flex-wrap items-start gap-4 border-b border-fundo/10 p-5 sm:p-6">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fundo text-sm font-semibold text-amarelo">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold">{f.nome}</h3>
                <p className="mt-1 text-sm font-light text-fundo/75">{f.resumo}</p>
                {f.temMaterial && (
                  <button type="button" onClick={() => verMaterial(f.id)} className={`${btnSec} mt-3`}>
                    <FileText className="size-4" /> Abrir material da indicação
                  </button>
                )}
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fundo/55">Sua nota</p>
                <p className={cn("text-2xl font-semibold", completo ? "text-verde" : "text-fundo/35")}>
                  {completo ? formatarNota(notaIndividual(matriz, notas), 2) : "—"}
                </p>
                <p className="text-xs text-fundo/55">de 100</p>
              </div>
            </div>

            <div className="divide-y divide-fundo/10">
              {matriz.criterios.map((c) => {
                const k = chave(f.id, c.id);
                const v = valores[k] ?? { nota: "", comentario: "" };
                const n = lerNota(v.nota);
                const invalida = v.nota.trim() !== "" && n === null;
                const pedeComentario = n !== null && exigeComentario(n);
                const idCampo = `n-${f.id}-${c.id}`;
                return (
                  <div key={c.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_120px] sm:px-6">
                    <div>
                      <label htmlFor={idCampo} className="font-medium">
                        {c.nome} <span className="text-sm font-normal text-fundo/55">· peso {c.peso}</span>
                      </label>
                      <p className="mt-0.5 text-sm font-light text-fundo/65">{c.guia}</p>
                    </div>
                    <div>
                      <input
                        id={idCampo}
                        value={v.nota}
                        onChange={(e) => set(k, "nota", e.target.value)}
                        disabled={!editavel}
                        inputMode="decimal"
                        placeholder="0 a 10"
                        aria-invalid={invalida}
                        className={cn(inputCls, "text-center text-lg font-semibold", invalida && "border-vermelho")}
                      />
                      {invalida && <p className="mt-1 text-xs text-vermelho">De 0 a 10, uma casa decimal</p>}
                    </div>
                    {(pedeComentario || v.comentario) && (
                      <div className="sm:col-span-2">
                        <textarea
                          value={v.comentario}
                          onChange={(e) => set(k, "comentario", e.target.value)}
                          disabled={!editavel}
                          rows={2}
                          maxLength={1000}
                          placeholder={pedeComentario ? "Comentário obrigatório para nota abaixo de 4,0 ou acima de 9,0" : "Comentário"}
                          aria-label={`Comentário sobre ${c.nome}`}
                          className={cn(inputCls, "text-sm", pedeComentario && !v.comentario.trim() && "border-amarelo")}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Cartao>
        );
      })}

      {editavel && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-3 rounded-[22px] border border-fundo/10 bg-papel/95 p-4 shadow-[0_12px_32px_-18px_rgba(1,41,40,.35)] backdrop-blur">
          <div className="mr-auto text-sm">
            <b className="font-semibold">
              {preenchidas} de {total}
            </b>{" "}
            notas preenchidas
            {msg && <span className={cn("ml-2", msg.tom === "erro" ? "text-vermelho" : "text-verde")}>· {msg.texto}</span>}
          </div>
          <button type="button" onClick={salvar} disabled={pendente} className={btnSec}>
            {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar rascunho
          </button>
          <button type="button" onClick={enviar} disabled={pendente || preenchidas < total} className={btnPrim}>
            <Send className="size-4" /> Enviar ficha
          </button>
        </div>
      )}
    </div>
  );
}
