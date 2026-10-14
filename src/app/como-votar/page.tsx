import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Mais } from "@/components/marca";
import { Tutorial, type Topico } from "@/components/tutorial-visual";
import topicos from "@/lib/tutoriais/como-votar.json";

export const metadata: Metadata = {
  title: "Como votar · Prêmio Lavras de Inovação 2026",
  description: "Passo a passo ilustrado da votação popular do Prêmio Lavras de Inovação 2026.",
};

// Prints do próprio site, gerados por script de captura (fora do repositório).
export default function ComoVotar() {
  return (
    <main className="min-h-[100svh] bg-fundo text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Voltar ao site do Prêmio">
            <Image src="/marca/lvrs-pacto.png" alt="LVRS+" width={900} height={520} className="h-8 w-auto" />
          </Link>
          <Link href="/#votacao" className="inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-amarelo">
            <ArrowLeft className="size-4" /> Voltar para votar
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-amarelo">
          <Mais className="size-3" /> Votação popular
        </p>
        <h1 className="mt-2 text-3xl font-medium sm:text-4xl">
          Como <span className="enfase">votar</span>
        </h1>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {["18 anos ou mais", "Mora, estuda ou trabalha em Lavras", "1 voto por CPF", "Cerca de 2 minutos"].map((t) => (
            <li key={t} className="rounded-lg border border-white/15 px-3 py-1.5 text-white/85">
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Tutorial topicos={topicos as Topico[]} />
        </div>
      </div>
    </main>
  );
}
