"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Cpu, MapPin, Rocket, Sprout, Wheat, type LucideIcon } from "lucide-react";
import { EIXOS } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Titulo } from "@/components/titulo";

const ICONES: Record<string, LucideIcon> = {
  territorio: MapPin,
  producao: Sprout,
  alimento: Wheat,
  tecnologia: Cpu,
  impacto: Rocket,
};

// Painéis que se expandem (acordeão horizontal no desktop, vertical no celular).
export function Eixos() {
  const [ativo, setAtivo] = useState(0);

  return (
    <section id="eixos" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Titulo
          selo="A narrativa"
          titulo={
            <>
              Lavras, Capital do <span className="enfase">Futuro</span> do Alimento
            </>
          }
          texto="Cinco eixos contam a história que o prêmio reconhece — do território onde tudo nasce ao impacto que fica."
        />

        <div className="mt-14 flex flex-col gap-3 lg:h-[26rem] lg:flex-row" role="tablist" aria-label="Eixos da narrativa">
          {EIXOS.map((e, i) => {
            const Icone = ICONES[e.id];
            const aberto = ativo === i;
            return (
              <motion.button
                key={e.id}
                role="tab"
                aria-selected={aberto}
                aria-controls={`eixo-${e.id}`}
                onClick={() => setAtivo(i)}
                onMouseEnter={() => setAtivo(i)}
                onFocus={() => setAtivo(i)}
                layout
                transition={{ type: "spring", stiffness: 180, damping: 26 }}
                className={cn(
                  "group relative overflow-hidden rounded-3xl border text-left outline-none focus-visible:ring-2 focus-visible:ring-amarelo",
                  aberto
                    ? "border-verde bg-verde lg:flex-[4]"
                    : "border-white/10 bg-white/[0.04] hover:border-amarelo/60 lg:flex-1",
                )}
              >
                {/* número gigante ao fundo */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute -bottom-10 -right-2 text-[11rem] font-bold leading-none transition-all duration-700",
                    aberto ? "text-fundo/25" : "text-white/[0.04]",
                  )}
                >
                  {e.numero}
                </span>

                <div className="relative flex h-full flex-col p-6 sm:p-7">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-2xl transition-colors duration-500",
                        aberto ? "bg-amarelo text-fundo" : "bg-white/10 text-white/75",
                      )}
                    >
                      <Icone className="size-5" />
                    </span>
                    <span className={cn("text-xs font-medium uppercase tracking-[0.2em] text-white/80", !aberto && "lg:hidden")}>
                      Eixo {e.numero}
                    </span>
                  </div>

                  <h3
                    className={cn(
                      "mt-5 text-2xl font-medium transition-colors lg:mt-auto",
                      aberto ? "text-white sm:text-4xl" : "text-white/80 lg:[writing-mode:vertical-rl] lg:rotate-180 lg:mt-6",
                    )}
                  >
                    {e.nome}
                  </h3>

                  <motion.div
                    id={`eixo-${e.id}`}
                    role="tabpanel"
                    initial={false}
                    animate={{ opacity: aberto ? 1 : 0, height: aberto ? "auto" : 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="mt-2 text-sm font-semibold uppercase tracking-wider text-amarelo">{e.tema}</p>
                    <p className="mt-3 max-w-md font-light text-white/90">{e.texto}</p>
                  </motion.div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
