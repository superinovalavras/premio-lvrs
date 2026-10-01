"use client";

import { motion } from "framer-motion";
import { Mais } from "./marca";
import { cn } from "@/lib/utils";

// Selo em caixa alta com tracking largo — o tratamento de "PACTO LAVRAS PELA INOVAÇÃO".
export function Titulo({
  selo,
  titulo,
  texto,
  className,
}: {
  selo: string;
  titulo: React.ReactNode;
  texto?: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={cn("max-w-3xl", className)}
    >
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-amarelo">
        <Mais className="size-3.5" /> {selo}
      </p>
      <h2 className="mt-4 text-4xl font-medium leading-[1.12] tracking-tight sm:text-5xl">{titulo}</h2>
      {texto && <p className="mt-5 text-lg font-light text-white/75">{texto}</p>}
    </motion.div>
  );
}
