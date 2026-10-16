import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Mais } from "@/components/marca";
import { Tutorial, type Topico } from "@/components/tutorial-visual";
import { carregarParametros } from "@/lib/server/parametros";
import { diaCurto } from "@/lib/datas";
import topicos from "@/lib/tutoriais/como-indicar.json";

export const metadata: Metadata = {
  title: "Como indicar · Prêmio Lavras de Inovação 2026",
  description: "Passo a passo ilustrado para instituições de Lavras se habilitarem e indicarem ao Prêmio Lavras de Inovação 2026.",
};

// Pública: a instituição vê o caminho antes de criar o acesso. Prints gerados por script de captura.
export default async function ComoIndicar() {
  const par = await carregarParametros();
  return (
    <main className="min-h-[100svh] bg-fundo text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" aria-label="Voltar ao site do Prêmio">
            <Image src="/marca/lvrs-pacto.png" alt="LVRS+" width={900} height={520} className="h-8 w-auto" />
          </Link>
          <Link href="/#indicar" className="inline-flex items-center gap-1.5 text-sm text-white/75 hover:text-amarelo">
            <ArrowLeft className="size-4" /> Voltar ao site
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-amarelo">
          <Mais className="size-3" /> Instituições indicadoras
        </p>
        <h1 className="mt-2 text-3xl font-medium sm:text-4xl">
          Como <span className="enfase">indicar</span>
        </h1>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {[
            "Instituições de Lavras (art. 2º-B)",
            "Cadastro analisado em até 1 dia útil",
            `Indicações de ${diaCurto(par.indicacoesAbrem)} a ${diaCurto(par.indicacoesFecham)}`,
            "Até 2 por categoria, 6 no total",
          ].map((t) => (
            <li key={t} className="rounded-lg border border-white/15 px-3 py-1.5 text-white/85">
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Tutorial topicos={topicos as Topico[]} />
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/cadastro"
            className="inline-flex h-12 items-center rounded-xl bg-amarelo px-6 font-semibold text-fundo transition hover:-translate-y-0.5"
          >
            Criar o acesso da instituição
          </Link>
          <Link
            href="/entrar"
            className="inline-flex h-12 items-center rounded-xl border-2 border-white/25 px-6 font-semibold text-white transition hover:border-amarelo hover:text-amarelo"
          >
            Já tenho acesso
          </Link>
        </div>
      </div>
    </main>
  );
}
