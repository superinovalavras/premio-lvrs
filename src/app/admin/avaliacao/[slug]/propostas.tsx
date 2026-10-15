"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { CartaoAdmin } from "@/components/admin/ui";
import { incluirPropostaNaVotacao } from "@/lib/server/acoes-honorarias";
import { CAMPOS_PROPOSTA, type PropostaRow } from "@/lib/honorarias";

type Item = PropostaRow & { conselheiro: string };

// Propostas honorárias enviadas pelos conselheiros (art. 13). A Secretaria leva cada uma para a votação nominal.
export function Propostas({ lista }: { lista: Item[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (!lista.length) return <p className="mb-8 text-sm text-white/60">Nenhuma proposta recebida ainda. Elas chegam pela área do conselho.</p>;
  return (
    <div className="mb-8 grid gap-3">
      {lista.map((p) => (
        <CartaoAdmin key={p.id}>
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">
                {p.indicado_nome} <span className="font-normal text-white/60">· {p.indicado_tipo === "pf" ? "pessoa" : "instituição"}</span>
              </h3>
              <p className="text-sm text-white/65">Proposta de {p.conselheiro}</p>
            </div>
            {p.finalist_id ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-verde/35 px-2.5 py-1 text-xs font-semibold text-[#8ff0bd]">
                <CheckCircle2 className="size-4" /> Na votação
              </span>
            ) : (
              <button
                type="button"
                disabled={pendente}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amarelo px-3.5 py-2 text-sm font-semibold text-fundo disabled:opacity-50"
                onClick={() =>
                  iniciar(async () => {
                    const r = await incluirPropostaNaVotacao(p.id);
                    setMsg(r.ok ? (r.msg ?? null) : r.erro);
                    if (r.ok) router.refresh();
                  })
                }
              >
                {pendente ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Incluir na votação
              </button>
            )}
          </div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-amarelo">Ler a proposta</summary>
            <dl className="mt-2 grid gap-2">
              {CAMPOS_PROPOSTA.filter((c) => c.id !== "indicado_nome").map((c) => {
                const v = p[c.id as keyof PropostaRow] as string | null;
                return v ? (
                  <div key={c.id}>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">{c.rotulo}</dt>
                    <dd className="whitespace-pre-line text-white/85">{v}</dd>
                  </div>
                ) : null;
              })}
            </dl>
          </details>
        </CartaoAdmin>
      ))}
      {msg && <p className="text-sm text-amarelo">{msg}</p>}
    </div>
  );
}
