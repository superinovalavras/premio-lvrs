"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Medal, Square, Trash2 } from "lucide-react";
import {
  abrirSegundaRodada,
  encerrarRodada,
  excluirRodada,
  invalidarAvaliacao,
  promoverClassificados,
  prorrogarRodada,
  registrarImpedimento,
  type Resultado,
} from "@/lib/server/acoes-avaliacao-admin";
import { btnAmarelo, btnContorno, btnPerigo, inputEscuro } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

function useAcao() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const rodar = (f: () => Promise<Resultado>, depois?: (r: Extract<Resultado, { ok: true }>) => void) =>
    iniciar(async () => {
      const r = await f();
      setMsg(r.ok ? { ok: true, texto: r.msg ?? "Pronto." } : { ok: false, texto: r.erro });
      if (r.ok) {
        depois?.(r);
        router.refresh();
      }
    });
  return { msg, pendente, rodar, router };
}

const Msg = ({ msg }: { msg: { ok: boolean; texto: string } | null }) =>
  msg && <p className={cn("mt-2 text-sm", msg.ok ? "text-[#8ff0bd]" : "text-[#ff8a8f]")}>{msg.texto}</p>;

export function AcoesRodada({
  id,
  slug,
  estado,
  teste,
  manual,
  fecha,
}: {
  id: string;
  slug: string;
  estado: "agendada" | "aberta" | "encerrada";
  teste: boolean;
  manual: boolean;
  fecha: string;
}) {
  const { msg, pendente, rodar, router } = useAcao();
  const [prazo, setPrazo] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<string | null>(null);

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {pendente && <Loader2 className="size-5 animate-spin self-center text-white/60" />}
        {estado !== "encerrada" && (
          <button
            type="button"
            className={btnContorno}
            disabled={pendente}
            onClick={() => confirm("Encerrar agora? Fichas em rascunho não contam, e a rodada não reabre.") && rodar(() => encerrarRodada(id))}
          >
            <Square className="size-4" /> Encerrar agora
          </button>
        )}
        {!manual && (
          <button type="button" className={btnContorno} disabled={pendente} onClick={() => setPrazo(prazo === null ? fecha : null)}>
            <CalendarClock className="size-4" /> {estado === "encerrada" ? "Reabrir com novo prazo" : "Mudar prazo"}
          </button>
        )}
        <button type="button" className={btnPerigo} disabled={pendente} onClick={() => setExcluir(excluir === null ? "" : null)} aria-label="Excluir rodada">
          <Trash2 className="size-4" />
        </button>
      </div>
      {prazo !== null && (
        <div className="flex flex-wrap justify-end gap-2">
          <input type="datetime-local" value={prazo} onChange={(e) => setPrazo(e.target.value)} className={cn(inputEscuro, "max-w-[230px]")} />
          <button type="button" className={btnAmarelo} disabled={pendente} onClick={() => rodar(() => prorrogarRodada(id, prazo), () => setPrazo(null))}>
            Salvar prazo
          </button>
        </div>
      )}
      {excluir !== null && (
        <div className="flex flex-wrap justify-end gap-2">
          <input
            value={excluir}
            onChange={(e) => setExcluir(e.target.value)}
            placeholder="Digite EXCLUIR"
            className={cn(inputEscuro, "max-w-[180px]")}
          />
          <button
            type="button"
            className={btnPerigo}
            disabled={pendente || excluir.trim().toUpperCase() !== "EXCLUIR"}
            onClick={() => rodar(() => excluirRodada(id, excluir), () => router.push(`/admin/avaliacao/${slug}`))}
          >
            Excluir rodada{teste ? " de teste" : ""}
          </button>
        </div>
      )}
      <Msg msg={msg} />
    </div>
  );
}

// Invalidar ficha/voto (art. 15, § 5º) ou registrar impedimento reconhecido pela Secretaria (art. 23, §§ 4º e 5º).
export function AcoesLinha({ rodadaId, avaliadorId, nome, podeInvalidar }: { rodadaId: string; avaliadorId: string; nome: string; podeInvalidar: boolean }) {
  const { msg, pendente, rodar } = useAcao();
  const [modo, setModo] = useState<"invalidar" | "impedir" | null>(null);
  const [motivo, setMotivo] = useState("");

  return (
    <div className="mt-2">
      {!modo && (
        <div className="flex flex-wrap gap-3 text-[12px]">
          {podeInvalidar && (
            <button type="button" className="text-white/60 hover:text-amarelo" onClick={() => setModo("invalidar")}>
              Invalidar
            </button>
          )}
          <button type="button" className="text-white/60 hover:text-amarelo" onClick={() => setModo("impedir")}>
            Registrar impedimento
          </button>
        </div>
      )}
      {modo && (
        <div className="grid gap-2">
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            placeholder={modo === "invalidar" ? "Motivo da invalidação (fica na ata)" : "Motivo do impedimento (decisão do plenário)"}
            className={cn(inputEscuro, "text-sm")}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className={cn(btnPerigo, "px-3 py-1.5 text-[12.5px]")}
              disabled={pendente || motivo.trim().length < 5}
              onClick={() =>
                confirm(
                  modo === "invalidar"
                    ? `Invalidar a avaliação de ${nome} nesta rodada?`
                    : `Registrar impedimento de ${nome} nesta categoria? Tudo o que fez nela deixa de valer.`,
                ) &&
                rodar(
                  () => (modo === "invalidar" ? invalidarAvaliacao(rodadaId, avaliadorId, motivo) : registrarImpedimento(rodadaId, avaliadorId, motivo)),
                  () => setModo(null),
                )
              }
            >
              {pendente && <Loader2 className="size-3.5 animate-spin" />} Confirmar
            </button>
            <button type="button" className={cn(btnContorno, "px-3 py-1.5 text-[12.5px]")} onClick={() => setModo(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      <Msg msg={msg} />
    </div>
  );
}

export function Promover({ id }: { id: string }) {
  const { msg, pendente, rodar } = useAcao();
  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <button
        type="button"
        className={btnAmarelo}
        disabled={pendente}
        onClick={() => confirm("Promover os classificados a finalistas? Os demais continuam como indicados.") && rodar(() => promoverClassificados(id))}
      >
        {pendente ? <Loader2 className="size-4 animate-spin" /> : <Medal className="size-4" />} Promover classificados a finalistas
      </button>
      <p className="mt-2 text-[12.5px] text-white/55">
        Até 3, com 60 pontos ou mais (art. 11). Desistência antes da avaliação final: troque a etapa na categoria e chame o próximo.
      </p>
      <Msg msg={msg} />
    </div>
  );
}

export function SegundaRodada({ id, candidatos, sugeridos }: { id: string; candidatos: { id: string; nome: string }[]; sugeridos: string[] }) {
  const { msg, pendente, rodar, router } = useAcao();
  const [marcados, setMarcados] = useState<string[]>(sugeridos);
  const [abre, setAbre] = useState(() => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 16));
  const [fecha, setFecha] = useState(() => new Date(Date.now() + 21 * 3600_000).toISOString().slice(0, 16));

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <h3 className="font-semibold">Abrir 2ª rodada</h3>
      <div className="mt-3 grid gap-2">
        {candidatos.map((c) => (
          <label key={c.id} className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={marcados.includes(c.id)}
              onChange={(e) => setMarcados((m) => (e.target.checked ? [...m, c.id] : m.filter((x) => x !== c.id)))}
              className="accent-[#ffcd00]"
            />
            {c.nome}
          </label>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Abre (Brasília)</span>
          <input type="datetime-local" value={abre} onChange={(e) => setAbre(e.target.value)} className={inputEscuro} />
        </label>
        <label>
          <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Fecha (Brasília)</span>
          <input type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputEscuro} />
        </label>
      </div>
      <button
        type="button"
        className={`${btnAmarelo} mt-3`}
        disabled={pendente || marcados.length !== 2}
        onClick={() => rodar(() => abrirSegundaRodada(id, abre, fecha, marcados), (r) => r.id && router.push(`/admin/avaliacao/rodada/${r.id}`))}
      >
        {pendente && <Loader2 className="size-4 animate-spin" />} Abrir 2ª rodada
      </button>
      <Msg msg={msg} />
    </div>
  );
}
