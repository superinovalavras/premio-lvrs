"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { CalendarDays } from "lucide-react";
import { Mais } from "@/components/marca";
import { Titulo } from "@/components/titulo";
import { CRONOGRAMA } from "@/lib/data";
import { cn } from "@/lib/utils";

// Linha do tempo que se desenha conforme a rolagem.
export function Cronograma() {
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 55%"] });
  const escala = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  return (
    <section id="cronograma" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Titulo
          selo="Cronograma 2026"
          titulo={
            <>
              Linha do <span className="enfase">tempo</span>
            </>
          }
        />

        <ol ref={ref} className="relative mt-14 space-y-6 pl-10 sm:pl-14">
          <div aria-hidden className="absolute bottom-2 left-[14px] top-2 w-1 rounded-full bg-white/10 sm:left-[22px]" />
          <motion.div
            aria-hidden
            style={{ scaleY: escala }}
            className="absolute bottom-2 left-[14px] top-2 w-1 origin-top rounded-full bg-amarelo sm:left-[22px]"
          />

          {CRONOGRAMA.map((e) => (
            <motion.li
              key={e.titulo}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute -left-10 top-5 grid size-8 place-items-center rounded-full border sm:-left-14 sm:size-12",
                  e.destaque ? "border-amarelo bg-amarelo text-fundo" : "border-white/25 bg-fundo text-white/60",
                )}
              >
                {e.destaque ? <Mais className="size-4 sm:size-6" /> : <span className="size-1.5 rounded-full bg-current" />}
              </span>

              <div
                className={cn(
                  "rounded-3xl border p-5 sm:p-6",
                  e.destaque ? "border-verde bg-verde" : "border-white/10 bg-white/[0.04]",
                )}
              >
                <p
                  className={cn(
                    "flex items-center gap-2 text-sm font-semibold",
                    e.destaque ? "text-amarelo" : "text-white/60",
                  )}
                >
                  <CalendarDays className="size-4" /> {e.data}
                </p>
                <h3 className={cn("mt-2 font-medium", e.destaque ? "text-3xl" : "text-xl text-white/90")}>{e.titulo}</h3>
                <p className="mt-2 font-light text-white/80">{e.texto}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
