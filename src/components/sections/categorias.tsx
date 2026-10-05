"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, Crown, Trophy, Vote } from "lucide-react";
import { TIPO_LABEL, type Categoria, type TipoCategoria } from "@/lib/data";
import { useParametros } from "@/components/parametros-context";
import { cn } from "@/lib/utils";
import { Titulo } from "@/components/titulo";
import { Arcos, TagVertical } from "@/components/marca";
import { useVoto } from "@/components/voto-context";

type Filtro = "todas" | TipoCategoria;

const FILTROS: { id: Filtro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "competitive", label: "Competitivas" },
  { id: "special", label: "Especial" },
  { id: "honorary", label: "Honorárias" },
];

const ICONE_TIPO = { competitive: Trophy, special: Award, honorary: Crown };

function contar(lista: Categoria[], f: Filtro) {
  return f === "todas" ? lista.length : lista.filter((c) => c.tipo === f).length;
}

function Card({ c, indice }: { c: Categoria; indice: number }) {
  const { abrir } = useVoto();
  const Icone = ICONE_TIPO[c.tipo];

  // holofote que segue o cursor
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  const popular = c.votoPopular;
  const chapado = !popular && c.tipo !== "competitive"; // especial e honorárias em bloco verde

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.4, delay: indice * 0.03, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={popular ? undefined : onMove}
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-3xl p-6 transition-colors duration-300 sm:p-7",
        !popular && "spotlight",
        c.destaque && "md:col-span-2",
        popular && "bg-amarelo text-fundo md:row-span-2",
        chapado && "bg-verde",
        !popular && !chapado && "border border-white/10 bg-white/[0.04] hover:border-amarelo/50",
      )}
    >
      {/* bloco amarelo com arcos verdes no canto — a peça do notebook no manual */}
      {popular && <Arcos cor="var(--verde)" className="-right-14 -top-14 -z-10 size-64 sm:size-80" />}

      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid size-11 place-items-center rounded-2xl",
            popular ? "bg-fundo text-amarelo" : chapado ? "bg-amarelo text-fundo" : "bg-white/10 text-amarelo",
          )}
        >
          <Icone className="size-5" />
        </span>
        <span
          className={cn(
            "rounded-lg px-3 py-1 text-[0.62rem] font-medium uppercase tracking-[0.2em]",
            popular ? "bg-fundo text-white" : "border border-white/20 text-white/80",
          )}
        >
          {TIPO_LABEL[c.tipo]}
        </span>
      </div>

      <h3
        className={cn(
          "mt-6 font-medium leading-tight",
          popular ? "max-w-sm text-3xl font-semibold sm:text-4xl" : "text-2xl",
        )}
      >
        {c.nome}
      </h3>
      {popular && (
        <div className="mt-3 flex flex-wrap gap-4">
          <TagVertical v="agro" />
          <TagVertical v="food" />
          <TagVertical v="tech" />
        </div>
      )}
      <p className={cn("mt-3 font-light", popular ? "max-w-md text-fundo/85" : "text-white/80")}>{c.resumo}</p>

      {popular && (
        <div className="mt-auto pt-8">
          <div className="mb-5 grid max-w-md grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-fundo p-4 text-white">
              <p className="text-3xl font-semibold text-amarelo">80%</p>
              <p className="text-white/75">avaliação técnica do COCITIEIS</p>
            </div>
            <div className="rounded-2xl bg-fundo p-4 text-white">
              <p className="text-3xl font-semibold text-amarelo">20%</p>
              <p className="text-white/75">voto popular normalizado</p>
            </div>
          </div>
          <button
            onClick={abrir}
            className="inline-flex items-center gap-2 rounded-xl bg-fundo px-5 py-3 text-sm font-semibold text-amarelo transition-transform hover:-translate-y-0.5"
          >
            <Vote className="size-4" /> Votar nesta categoria
          </button>
        </div>
      )}
    </motion.article>
  );
}

export function Categorias() {
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const { categorias: CATEGORIAS } = useParametros();
  const lista = filtro === "todas" ? CATEGORIAS : CATEGORIAS.filter((c) => c.tipo === filtro);

  return (
    <section id="categorias" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Titulo
          selo="11 reconhecimentos"
          titulo="As categorias"
          texto="Oito categorias competitivas, uma especial e duas honorárias para startups, empresas, pessoas, pesquisadores e professores."
        />

        <div role="tablist" aria-label="Filtrar categorias" className="mt-10 inline-flex flex-wrap gap-1 rounded-2xl bg-chrome p-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(
                "relative rounded-xl px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] transition-colors",
                filtro === f.id ? "text-fundo" : "text-white/70 hover:text-white",
              )}
            >
              {filtro === f.id && (
                <motion.span
                  layoutId="filtro-ativo"
                  className="absolute inset-0 rounded-xl bg-amarelo"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">
                {f.label} <span className="opacity-60">({contar(CATEGORIAS, f.id)})</span>
              </span>
            </button>
          ))}
        </div>

        <motion.div layout className="mt-10 grid grid-flow-dense auto-rows-[minmax(14rem,auto)] grid-cols-1 gap-4 md:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {lista.map((c, i) => (
              <Card key={c.slug} c={c} indice={i} />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
