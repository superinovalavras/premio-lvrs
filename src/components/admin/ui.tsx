// Peças do painel (tema escuro), no desenho aprovado.
import { Mais } from "@/components/marca";
import { cn } from "@/lib/utils";
import type { StatusEntidade } from "@/lib/entidades";
import { STATUS } from "@/lib/entidades";

export function TopoAdmin({
  selo,
  titulo,
  sub,
  acoes,
}: {
  selo: string;
  titulo: React.ReactNode;
  sub?: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-amarelo">
          <Mais className="size-3" /> {selo}
        </p>
        <h1 className="mt-1.5 text-[28px] font-medium leading-tight">{titulo}</h1>
        {sub && <div className="mt-1.5 max-w-[70ch] font-light text-white/75">{sub}</div>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  );
}

export function CartaoAdmin({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-[20px] border border-white/10 bg-white/[0.04] p-5", className)}>{children}</div>;
}

const TOM: Record<StatusEntidade, string> = {
  rascunho: "bg-white/10 text-white/75",
  em_analise: "bg-amarelo/15 text-amarelo",
  pendente_ajuste: "bg-[#ff8a8f]/15 text-[#ffb3b6]",
  deferido: "bg-verde/35 text-[#8ff0bd]",
  indeferido: "bg-vermelho/25 text-[#ff8a8f]",
};

export function PillStatus({ status }: { status: StatusEntidade }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em]",
        TOM[status],
      )}
    >
      {STATUS[status].rotulo}
    </span>
  );
}

export const inputEscuro =
  "w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2.5 text-white placeholder:text-white/35 outline-none [color-scheme:dark] focus:border-amarelo focus:ring-2 focus:ring-amarelo/20";
export const btnAmarelo =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-amarelo px-4 py-2.5 text-[13.5px] font-semibold text-fundo transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-40";
export const btnContorno =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/20 px-3.5 py-2 text-[13.5px] font-semibold text-white transition hover:border-amarelo hover:text-amarelo disabled:pointer-events-none disabled:opacity-40";
export const btnPerigo =
  "inline-flex items-center justify-center gap-2 rounded-xl border-2 border-vermelho px-3.5 py-2 text-[13.5px] font-semibold text-white transition hover:bg-vermelho/20 disabled:pointer-events-none disabled:opacity-40";
