"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Titulo } from "@/components/titulo";
import { buttonVariants } from "@/components/ui/button";
import { useParametros } from "@/components/parametros-context";
import { periodo } from "@/lib/datas";

const passos = (janela: string) => [
  { n: "1", t: "Peça o cadastro", d: "A instituição informa o enquadramento no art. 2º-B da Lei nº 3.813/2011 e anexa os documentos." },
  { n: "2", t: "Análise da Secretaria", d: "A Secretaria Executiva defere ou indefere com motivação, em até 1 dia útil." },
  { n: "3", t: `Indique de ${janela}`, d: "Até 2 indicações por categoria e 6 no total, com evidências da realização." },
];

const QUEM = [
  "Órgãos e entidades do Município",
  "Aceleradoras",
  "Instituições de ensino superior",
  "Associações e instituições de CT&I",
  "LAVRASTEC e incubadoras",
  "Empresas de base tecnológica e inovadoras",
];

// Linha que se acende passo a passo — efeito próprio desta seção.
export function Indicar() {
  const { indicacoesAbrem, indicacoesFecham } = useParametros();
  const janela = periodo(indicacoesAbrem, indicacoesFecham);
  const PASSOS = passos(janela);
  return (
    <section id="indicar" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div>
            <Titulo
              selo={`Indicações · ${janela}`}
              titulo={
                <>
                  Sua instituição pode <span className="enfase">indicar</span>
                </>
              }
              texto="Quem indica são as instituições de Lavras habilitadas pela Secretaria Executiva do Prêmio, por meio de um representante designado."
            />
            <ul className="mt-6 flex flex-wrap gap-2">
              {QUEM.map((q) => (
                <li key={q} className="rounded-lg border border-white/15 px-3 py-1.5 text-[13px] text-white/80">
                  {q}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/cadastro" className={buttonVariants({ size: "lg" })}>
                Pedir cadastro <ArrowRight className="size-4" />
              </Link>
              <Link href="/entrar" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Já tenho acesso
              </Link>
            </div>
          </div>

          <ol className="relative grid gap-3">
            <motion.span
              aria-hidden
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
              className="absolute bottom-8 left-[27px] top-8 w-1 origin-top rounded-full bg-amarelo"
            />
            {PASSOS.map((p, i) => (
              <motion.li
                key={p.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: 0.25 + i * 0.3, duration: 0.5 }}
                className="relative flex gap-5 rounded-3xl bg-verde p-5 sm:p-6"
              >
                <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-amarelo text-lg font-semibold text-fundo">
                  {p.n}
                </span>
                <span>
                  <span className="block text-lg font-semibold">{p.t}</span>
                  <span className="mt-1 block font-light text-white/90">{p.d}</span>
                </span>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
