"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import { CartaoAdmin, btnAmarelo, btnContorno, inputEscuro } from "@/components/admin/ui";
import {
  decidirReconsideracao,
  incluirComoConcorrente,
  registrarAnalise,
  registrarReconsideracao,
  type Resultado,
} from "@/lib/server/acoes-elegibilidade";
import type { Analise } from "@/lib/elegibilidade";
import { cn } from "@/lib/utils";

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

// Art. 10: decisão preliminar (26 a 28/10), reconsideração (29/10 a 03/11) e passagem das aptas para a avaliação.
export function AnaliseIndicacao({ id, an }: { id: string; an: Analise | null }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [decisao, setDecisao] = useState<"apta" | "inapta" | "">("");
  const [texto, setTexto] = useState("");

  const rodar = (f: () => Promise<Resultado>) =>
    iniciar(async () => {
      const r = await f();
      setMsg(r.ok ? { ok: true, texto: r.msg ?? "Pronto." } : { ok: false, texto: r.erro });
      if (r.ok) {
        setMensagem(r.mensagem ?? null);
        setTexto("");
        setDecisao("");
        router.refresh();
      }
    });

  const decidido = an?.analise;
  return (
    <CartaoAdmin className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 font-semibold">Análise de elegibilidade (art. 10)</h2>
        {decidido && (
          <span
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em]",
              decidido === "apta" ? "bg-verde/35 text-[#8ff0bd]" : "bg-vermelho/25 text-[#ff8a8f]",
            )}
          >
            {decidido}
          </span>
        )}
      </div>

      {an === null && <p className="mt-2 text-sm text-amarelo">Falta rodar a migração 0011 no Supabase para registrar a análise.</p>}

      {an && (
        <div className="mt-3 grid gap-4 text-sm">
          {an.analisada_em && (
            <p className="text-white/75">
              Decisão preliminar em {quando(an.analisada_em)}
              {an.analise_motivo ? ` · ${an.analise_motivo}` : ""}. Comunicada ao indicador e ao indicado.
            </p>
          )}

          {/* 1. Decisão preliminar */}
          {!an.finalist_id && !an.reconsideracao && (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-2">
                {(["apta", "inapta"] as const).map((d) => (
                  <label key={d} className={cn(btnContorno, "cursor-pointer", decisao === d && "border-amarelo text-amarelo")}>
                    <input type="radio" name="decisao" className="sr-only" checked={decisao === d} onChange={() => setDecisao(d)} />
                    {d === "apta" ? "Apta" : "Inapta"}
                  </label>
                ))}
              </div>
              {decisao && (
                <>
                  <textarea
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    rows={3}
                    maxLength={1500}
                    placeholder={decisao === "inapta" ? "Motivo (vai para o indicador e o indicado)" : "Observação (opcional)"}
                    className={inputEscuro}
                  />
                  <button type="button" disabled={pendente} className={cn(btnAmarelo, "justify-self-start")} onClick={() => rodar(() => registrarAnalise(id, decisao, texto))}>
                    {pendente && <Loader2 className="size-4 animate-spin" />} {an.analise ? "Corrigir a decisão" : "Registrar e comunicar"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* 2. Reconsideração (só inapta) */}
          {an.analise === "inapta" && !an.reconsideracao_decisao && !an.reconsideracao && (
            <div className="grid gap-2 border-t border-white/10 pt-4">
              <h3 className="font-semibold">Chegou pedido de reconsideração?</h3>
              <p className="text-white/65">Prazo de dois dias úteis após a comunicação (art. 10, § 2º). Cole o pedido como chegou.</p>
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} maxLength={4000} className={inputEscuro} />
              <button type="button" disabled={pendente} className={cn(btnContorno, "justify-self-start")} onClick={() => rodar(() => registrarReconsideracao(id, texto))}>
                Registrar pedido
              </button>
            </div>
          )}
          {an.reconsideracao && (
            <div className="grid gap-2 border-t border-white/10 pt-4">
              <h3 className="font-semibold">Pedido de reconsideração{an.reconsideracao_em ? ` · ${quando(an.reconsideracao_em)}` : ""}</h3>
              <p className="whitespace-pre-line text-white/80">{an.reconsideracao}</p>
              {an.reconsideracao_decisao ? (
                <p className={an.reconsideracao_decisao === "deferida" ? "text-[#8ff0bd]" : "text-[#ff8a8f]"}>
                  {an.reconsideracao_decisao === "deferida" ? "Deferido" : "Indeferido"}
                  {an.reconsideracao_decidida_em ? ` em ${quando(an.reconsideracao_decidida_em)}` : ""}: {an.reconsideracao_motivo}
                </p>
              ) : (
                <>
                  <p className="text-white/65">Decisão do COCITIEIS ou de comissão designada, em até dois dias úteis (art. 10, § 3º).</p>
                  <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} maxLength={1500} placeholder="Fundamento da decisão" className={inputEscuro} />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={pendente} className={btnAmarelo} onClick={() => rodar(() => decidirReconsideracao(id, "deferida", texto))}>
                      Deferir
                    </button>
                    <button type="button" disabled={pendente} className={btnContorno} onClick={() => rodar(() => decidirReconsideracao(id, "indeferida", texto))}>
                      Indeferir
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 3. Apta → concorrente */}
          {an.analise === "apta" && (
            <div className="border-t border-white/10 pt-4">
              {an.finalist_id ? (
                <p className="text-[#8ff0bd]">Já é concorrente da categoria, em Avaliação do Conselho.</p>
              ) : (
                <button type="button" disabled={pendente} className={btnAmarelo} onClick={() => rodar(() => incluirComoConcorrente(id))}>
                  {pendente && <Loader2 className="size-4 animate-spin" />} Incluir como concorrente
                </button>
              )}
            </div>
          )}

          {msg && <p className={msg.ok ? "text-[#8ff0bd]" : "text-[#ff8a8f]"}>{msg.texto}</p>}
          {mensagem && (
            <div className="rounded-xl border border-white/15 p-3">
              <p className="text-[12px] text-white/60">
                Mensagem registrada. Se o e-mail automático ainda não estiver configurado, copie e envie ao indicador e ao indicado:
              </p>
              <p className="mt-2 whitespace-pre-line text-white/85">{mensagem}</p>
              <button
                type="button"
                className={cn(btnContorno, "mt-2")}
                onClick={() => {
                  navigator.clipboard.writeText(mensagem);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                }}
              >
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />} {copiado ? "Copiada" : "Copiar mensagem"}
              </button>
            </div>
          )}
        </div>
      )}
    </CartaoAdmin>
  );
}
