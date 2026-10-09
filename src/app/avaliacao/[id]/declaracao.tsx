"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { declarar } from "@/lib/server/acoes-avaliacao";
import { Aviso, Campo, Cartao, btnPrim, btnSec, inputCls } from "@/components/area/ui";
import { HIPOTESES_IMPEDIMENTO } from "@/lib/avaliacao";
import { cn } from "@/lib/utils";

type Candidato = { id: string; nome: string; resumo: string };

// Art. 23 e Anexo III: antes de ver as fichas, o conselheiro examina a lista e declara se está impedido.
// soImpedimento: quem já declarou "sem impedimento" e descobriu um vínculo depois.
export function Declaracao({ rodadaId, candidatos, soImpedimento }: { rodadaId: string; candidatos: Candidato[]; soImpedimento?: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(!soImpedimento);
  const [impedido, setImpedido] = useState<boolean | null>(soImpedimento ? true : null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  // onSubmit (e não action): em caso de erro, o formulário não é limpo.
  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setErro(null);
    if (impedido && !confirm("Ao se declarar impedido, você não avalia nem vota nesta categoria, e o que já fez nela deixa de valer. Confirmar?")) return;
    iniciar(async () => {
      const r = await declarar(rodadaId, fd);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
    });
  };

  if (soImpedimento && !aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="flex items-center gap-2 text-sm font-semibold text-fundo/75 hover:text-vermelho">
        <ShieldAlert className="size-4" /> Descobriu um vínculo com algum concorrente? Declarar impedimento
      </button>
    );
  }

  const corpo = (
    <form onSubmit={enviar}>
      <input type="hidden" name="impedido" value={impedido ? "sim" : "nao"} />
      {!soImpedimento && (
        <>
          <h2 className="text-xl font-semibold">Declaração de impedimento</h2>
          <p className="mt-1.5 font-light text-fundo/75">
            Antes de avaliar, examine a lista de concorrentes desta categoria. Você deve se declarar impedido se for
            indicado ou integrar equipe concorrente, tiver relação profissional, societária, hierárquica ou econômica
            com algum deles, for cônjuge ou parente até o terceiro grau de pessoa indicada, ou tiver apresentado
            indicação nesta categoria (art. 23).
          </p>
          <ul className="mt-4 divide-y divide-fundo/10 rounded-2xl border border-fundo/10">
            {candidatos.map((c) => (
              <li key={c.id} className="px-4 py-3">
                <p className="font-semibold">{c.nome}</p>
                <p className="mt-0.5 line-clamp-2 text-sm font-light text-fundo/70">{c.resumo}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { v: false, t: "Não tenho impedimento", d: "Vou avaliar todos os concorrentes." },
              { v: true, t: "Estou impedido", d: "Não avalio nem voto nesta categoria." },
            ].map((o) => (
              <button
                key={String(o.v)}
                type="button"
                onClick={() => setImpedido(o.v)}
                className={cn(
                  "rounded-2xl border-[1.5px] p-4 text-left transition",
                  impedido === o.v ? "border-verde bg-verde/5" : "border-fundo/15 hover:border-fundo/40",
                )}
                aria-pressed={impedido === o.v}
              >
                <b className="block font-semibold">{o.t}</b>
                <span className="text-sm text-fundo/65">{o.d}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {impedido === false && (
        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" name="ciente" required className="mt-0.5 size-4 accent-[#0d8049]" />
          <span>Examinei a lista e não tenho vínculo, interesse ou circunstância que comprometa minha imparcialidade nesta categoria.</span>
        </label>
      )}

      {impedido && (
        <div className="mt-5 grid gap-4">
          <Campo label="Hipótese">
            <select name="hipotese" required defaultValue="" className={inputCls}>
              <option value="" disabled>
                Escolha
              </option>
              {HIPOTESES_IMPEDIMENTO.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.texto}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Concorrente envolvido" opcional>
            <select name="finalista" defaultValue="" className={inputCls}>
              <option value="">Não se aplica a um concorrente específico</option>
              {candidatos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Motivo" dica="Em poucas palavras. Fica registrado no processo do Prêmio (art. 26).">
            <textarea name="motivo" required minLength={5} maxLength={1000} rows={3} className={inputCls} />
          </Campo>
        </div>
      )}

      {erro && (
        <Aviso tom="erro" className="mt-4">
          {erro}
        </Aviso>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <button className={btnPrim} disabled={pendente || impedido === null}>
          {pendente && <Loader2 className="size-4 animate-spin" />} Registrar declaração
        </button>
        {soImpedimento && (
          <button type="button" className={btnSec} onClick={() => setAberto(false)}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );

  return soImpedimento ? corpo : <Cartao>{corpo}</Cartao>;
}
