"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// O "+" da LVRS+: cruz inclinada de braços com ponta cortada, na cor do destaque.
export function Mais({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path
        transform="rotate(-14 12 12)"
        d="M10.2 1.2 13.9.6l.2 9.3 9.3-.4-.8 3.8-8.4.7.3 9.4-3.7.6-.4-9.9-9.8.6.9-3.9 8.9-.6Z"
      />
    </svg>
  );
}

/*
  Arcos concêntricos da marca — derivados da curva do "L".
  Regra do manual: só sobre cor chapada, sempre grossos e opacos, cortando a peça
  pela borda. Nunca sobre foto e nunca translúcidos (foi reprovado na vitrine).
  Desenham-se uma vez ao entrar na tela.
*/
export function Arcos({
  className,
  cor = "var(--amarelo)",
  canto = "top-right",
  bandas = 3,
}: {
  className?: string;
  cor?: string;
  canto?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
  bandas?: number;
}) {
  // Quarto de círculo com centro no canto escolhido; o container corta o resto.
  const espessura = 46;
  const vao = 34;
  const r0 = 70;
  const rot = { "top-right": 0, "bottom-right": 90, "bottom-left": 180, "top-left": 270 }[canto];

  return (
    <svg
      viewBox="0 0 400 400"
      aria-hidden
      className={cn("pointer-events-none absolute", className)}
      style={{ transform: `rotate(${rot}deg)` }}
    >
      {Array.from({ length: bandas }, (_, i) => {
        const r = r0 + i * (espessura + vao) + espessura / 2;
        // arco de (400 - r, 0) até (400, r), centro em (400, 0)
        return (
          <motion.path
            key={i}
            d={`M ${400 - r} 0 A ${r} ${r} 0 0 0 400 ${r}`}
            fill="none"
            stroke={cor}
            strokeWidth={espessura}
            strokeLinecap="butt"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 1.1, delay: 0.15 + i * 0.15, ease: [0.65, 0, 0.35, 1] }}
          />
        );
      })}
    </svg>
  );
}

/* Tag de vertical: cor da vertical só no marcador, texto em branco (vermelho e verde
   não têm contraste para texto corrido sobre o fundo escuro). */
export const VERTICAL_COR = {
  agro: "var(--agro)",
  food: "var(--vermelho)",
  tech: "var(--azul)",
} as const;

export function TagVertical({ v }: { v: keyof typeof VERTICAL_COR }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
      <span className="size-2.5 rounded-full" style={{ background: VERTICAL_COR[v] }} aria-hidden />
      {v}
    </span>
  );
}
