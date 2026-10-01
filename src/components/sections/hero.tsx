"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, Vote } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Arcos, Mais } from "@/components/marca";
import { useVoto } from "@/components/voto-context";
import { CERIMONIA, PUBLICOS } from "@/lib/data";

function restante(alvo: Date) {
  const ms = Math.max(0, alvo.getTime() - Date.now());
  return {
    dias: Math.floor(ms / 86_400_000),
    horas: Math.floor(ms / 3_600_000) % 24,
    minutos: Math.floor(ms / 60_000) % 60,
    segundos: Math.floor(ms / 1000) % 60,
  };
}

function Digito({ valor, rotulo }: { valor: number | null; rotulo: string }) {
  const texto = valor === null ? "--" : String(valor).padStart(2, "0");
  return (
    <div className="flex min-w-[4.25rem] flex-col items-center rounded-2xl bg-verde px-3 py-3 sm:min-w-[5.5rem] sm:px-4">
      <div className="relative h-10 overflow-hidden sm:h-12" aria-hidden>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={texto}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="block text-4xl font-semibold tabular-nums text-white sm:text-5xl"
          >
            {texto}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="mt-1 text-[0.62rem] font-medium uppercase tracking-[0.2em] text-white/75">{rotulo}</span>
    </div>
  );
}

function Contagem() {
  const [t, setT] = useState<ReturnType<typeof restante> | null>(null);
  useEffect(() => {
    const tick = () => setT(restante(CERIMONIA));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.22em] text-amarelo">
        Cerimônia de Gala · 17 de novembro de 2026
      </p>
      <div
        className="flex gap-2 sm:gap-3"
        role="timer"
        aria-label={t ? `Faltam ${t.dias} dias e ${t.horas} horas para a cerimônia` : "Contagem para a cerimônia"}
      >
        <Digito valor={t?.dias ?? null} rotulo="dias" />
        <Digito valor={t?.horas ?? null} rotulo="horas" />
        <Digito valor={t?.minutos ?? null} rotulo="min" />
        <Digito valor={t?.segundos ?? null} rotulo="seg" />
      </div>
    </div>
  );
}

const entrada = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero() {
  const { abrir } = useVoto();
  return (
    <section id="topo" className="relative isolate flex min-h-[100svh] items-center overflow-hidden bg-fundo pb-20 pt-28">
      {/* arcos grossos cortando o canto, sobre cor chapada — como na capa do manual */}
      <Arcos
        className="-right-24 -top-24 -z-10 size-[26rem] sm:-right-10 sm:-top-10 sm:size-[40rem] lg:size-[46rem]"
        bandas={3}
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
        <motion.p
          variants={entrada}
          initial="hidden"
          animate="show"
          custom={0}
          className="mb-7 inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.25em] text-white/80"
        >
          <Mais className="size-4 text-amarelo" /> Prêmio Lavras de Inovação · Edição 2026
        </motion.p>

        <motion.h1
          variants={entrada}
          initial="hidden"
          animate="show"
          custom={1}
          className="max-w-3xl text-[2.5rem] font-medium leading-[1.1] tracking-tight sm:text-6xl lg:text-[4.25rem]"
        >
          Lavras reconhece quem transforma ideias em <span className="enfase">impacto</span>
        </motion.h1>

        <motion.p
          variants={entrada}
          initial="hidden"
          animate="show"
          custom={2}
          className="mt-5 text-xl font-light text-white/85 sm:text-2xl"
        >
          A Capital do Futuro do Alimento
        </motion.p>

        <motion.div variants={entrada} initial="hidden" animate="show" custom={3} className="mt-10">
          <Contagem />
        </motion.div>

        <motion.div variants={entrada} initial="hidden" animate="show" custom={4} className="mt-10 flex flex-wrap gap-3">
          <Button size="lg" onClick={abrir}>
            <Vote className="size-5" /> Votar Agora
          </Button>
          <a href="#categorias" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Ver Categorias <ArrowDown className="size-4" />
          </a>
        </motion.div>

        <motion.ul
          variants={entrada}
          initial="hidden"
          animate="show"
          custom={5}
          className="mt-14 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium uppercase tracking-[0.2em] text-white/60"
          aria-label="Públicos reconhecidos"
        >
          {PUBLICOS.map((p, i) => (
            <li key={p} className="flex items-center gap-5">
              {i > 0 && <Mais className="size-2.5 text-amarelo" />}
              {p}
            </li>
          ))}
        </motion.ul>
      </div>

      {/* filete amarelo na base, como a faixa que separa foto e texto no manual */}
      <motion.div
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.9, duration: 1, ease: [0.65, 0, 0.35, 1] }}
        className="absolute bottom-0 left-0 h-2 w-[55%] origin-left rounded-r-full bg-amarelo"
      />
    </section>
  );
}
