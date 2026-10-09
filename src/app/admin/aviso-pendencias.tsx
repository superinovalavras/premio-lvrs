"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { Arcos, Mais } from "@/components/marca";
import { AVISO_VERSAO, PENDENCIAS_REGULAMENTO, PENDENCIAS_TECNICAS } from "@/lib/pendencias";

const CHAVE = `aviso-pendencias-${AVISO_VERSAO}`;

const TEM_ITENS = PENDENCIAS_REGULAMENTO.length + PENDENCIAS_TECNICAS.length > 0;
const semAssinatura = () => () => {};
const jaVisto = () => {
  try {
    return localStorage.getItem(CHAVE) === "1";
  } catch {
    return false;
  }
};

// Pop-up ao entrar no painel. Fechou, não volta neste navegador (até mudar AVISO_VERSAO).
export function AvisoPendencias() {
  // No servidor conta como visto: o aviso só aparece depois de ler o navegador.
  const visto = useSyncExternalStore(semAssinatura, jaVisto, () => true);
  const [fechado, setFechado] = useState(false);
  const aberto = TEM_ITENS && !visto && !fechado;
  const fechar = useRef<HTMLButtonElement>(null);

  const encerrar = useCallback(() => {
    try {
      localStorage.setItem(CHAVE, "1");
    } catch {}
    setFechado(true);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    fechar.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && encerrar();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [aberto, encerrar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/65 p-3 backdrop-blur-[3px] sm:p-6"
      onClick={(e) => e.target === e.currentTarget && encerrar()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="aviso-titulo"
        className="flex max-h-[92svh] w-full max-w-[760px] flex-col overflow-hidden rounded-[22px] bg-papel text-fundo shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)]"
      >
        <header className="relative isolate shrink-0 overflow-hidden bg-fundo px-6 pb-6 pt-5 text-white sm:px-8 sm:pb-7">
          <Arcos className="-right-24 -top-24 -z-10 size-72" />
          <div className="flex items-start justify-between gap-4">
            <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amarelo">
              <Mais className="size-3.5" /> Regulamento · pendências
            </p>
            <button
              ref={fechar}
              type="button"
              onClick={encerrar}
              className="-mr-2 -mt-1 grid size-10 place-items-center rounded-full text-white/80 hover:bg-white/10 hover:text-amarelo focus-visible:outline-2 focus-visible:outline-amarelo"
              aria-label="Fechar aviso"
            >
              <X className="size-5" />
            </button>
          </div>
          <h2 id="aviso-titulo" className="mt-3 max-w-[20ch] text-[28px] font-medium leading-tight sm:text-[34px]">
            Decisões que dependem de <span className="enfase">você</span>
          </h2>
          <p className="mt-2 max-w-[60ch] text-sm font-light text-white/80">
            Estes pontos divergem do regulamento ou não estão definidos nele. Cada item mostra o que o regulamento diz e o que o
            site faz hoje. Repasse a decisão à equipe do site.
          </p>
        </header>

        <div className="min-h-0 overflow-y-auto px-6 py-6 sm:px-8" data-lenis-prevent>
          <ol className="grid gap-4">
            {PENDENCIAS_REGULAMENTO.map((p, i) => (
              <li key={p.titulo} className="rounded-2xl border border-fundo/10 p-4 sm:p-5">
                <h3 className="flex items-start gap-3 font-semibold">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-fundo text-[13px] text-amarelo">{i + 1}</span>
                  <span className="pt-0.5">{p.titulo}</span>
                </h3>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 sm:gap-4">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-verde">Regulamento</dt>
                    <dd className="mt-0.5 font-light text-fundo/80">{p.regulamento}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-vermelho">No site hoje</dt>
                    <dd className="mt-0.5 font-light text-fundo/80">{p.site}</dd>
                  </div>
                </dl>
                <p className="mt-3 rounded-xl bg-amarelo/20 px-3 py-2 text-sm">
                  <b className="font-semibold">Decidir:</b> {p.decidir}
                </p>
              </li>
            ))}
          </ol>

          {!!PENDENCIAS_TECNICAS.length && (
            <section className="mt-6 rounded-2xl bg-nevoa p-4 sm:p-5">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fundo/70">Com a equipe do site · só para acompanhar</h3>
              <ul className="mt-2 grid gap-2 text-sm font-light text-fundo/80">
                {PENDENCIAS_TECNICAS.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span aria-hidden className="text-verde">•</span>
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-fundo/10 px-6 py-4 sm:px-8">
          <p className="text-[13px] text-fundo/60">{PENDENCIAS_REGULAMENTO.length} decisões pendentes</p>
          <button
            type="button"
            onClick={encerrar}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amarelo px-5 py-2.5 text-[14.5px] font-semibold text-fundo transition hover:-translate-y-px"
          >
            Entendi
          </button>
        </footer>
      </div>
    </div>
  );
}
