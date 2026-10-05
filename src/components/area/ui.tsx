// Peças da área clara (instituições): papel branco, tinta verde-profunda, amarelo só na ação principal.
import { cn } from "@/lib/utils";

export const inputCls =
  "w-full rounded-xl border-[1.5px] border-fundo/15 bg-papel px-3.5 py-3 text-fundo placeholder:text-fundo/35 outline-none transition focus:border-verde focus:ring-4 focus:ring-verde/15 disabled:bg-nevoa disabled:text-fundo/60";

export function Campo({
  label,
  opcional,
  dica,
  erro,
  children,
  className,
}: {
  label: string;
  opcional?: boolean;
  dica?: React.ReactNode;
  erro?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium text-fundo">
        {label} {opcional && <span className="font-normal text-fundo/55">(opcional)</span>}
      </span>
      {children}
      {erro ? (
        <span className="mt-1.5 block text-xs text-vermelho" role="alert">
          {erro}
        </span>
      ) : dica ? (
        <span className="mt-1.5 block text-xs text-fundo/60">{dica}</span>
      ) : null}
    </label>
  );
}

export function Cartao({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-fundo/10 bg-papel p-6 shadow-[0_1px_2px_rgba(1,41,40,.04),0_12px_32px_-18px_rgba(1,41,40,.18)] sm:p-7",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Aviso({
  tom = "info",
  children,
  className,
}: {
  tom?: "info" | "alerta" | "erro" | "ok";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3 text-sm",
        tom === "info" && "bg-nevoa text-fundo/80",
        tom === "alerta" && "border border-amarelo bg-amarelo/15 text-fundo",
        tom === "erro" && "border border-vermelho/40 bg-vermelho/10 text-fundo",
        tom === "ok" && "border border-verde/30 bg-verde/10 text-fundo",
        className,
      )}
      role={tom === "erro" ? "alert" : undefined}
    >
      {children}
    </div>
  );
}

export const btnPrim =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-amarelo px-5 py-3 text-[14.5px] font-semibold text-fundo transition hover:-translate-y-px hover:shadow-[0_10px_26px_-10px_rgba(255,205,0,.9)] disabled:pointer-events-none disabled:opacity-50";
export const btnEscuro =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-fundo px-5 py-3 text-[14.5px] font-semibold text-white transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50";
export const btnSec =
  "inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-fundo/15 px-4 py-2.5 text-sm font-semibold text-fundo transition hover:border-fundo disabled:pointer-events-none disabled:opacity-50";
