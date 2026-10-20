import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Mais } from "@/components/marca";
import { Tutorial } from "@/components/tutorial-visual";
import { carregarParametros } from "@/lib/server/parametros";
import { diaCurto } from "@/lib/datas";
import { topicosConselho } from "@/lib/tutoriais/conselho";

export const metadata: Metadata = {
  title: "Ajuda do Conselho · Prêmio Lavras de Inovação 2026",
  robots: { index: false, follow: false },
};

// Pública (sem login): o conselheiro vê o passo a passo, inclusive o primeiro acesso, antes de ter senha.
// Mesmos tópicos de /avaliacao/como-avaliar. Não aparece em menu: o link fica na tela de entrada do Conselho.
export default async function AjudaConselho() {
  const par = await carregarParametros();
  return (
    <main className="min-h-[100svh] bg-fundo text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Image src="/marca/lvrs-pacto.png" alt="LVRS+" width={900} height={520} className="h-8 w-auto" />
          <Link href="/conselho" className="inline-flex items-center gap-1.5 py-2.5 text-sm text-white/75 hover:text-amarelo">
            <ArrowLeft className="size-4" /> Entrar no Conselho
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-amarelo">
          <Mais className="size-3" /> Conselho · COCITIEIS
        </p>
        <h1 className="mt-2 text-3xl font-medium sm:text-4xl">
          Como <span className="enfase">participar</span>
        </h1>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          {[
            "Entrada: premio.lvrs.com.br/conselho",
            `Indicações até ${diaCurto(par.indicacoesFecham)}`,
            "Até 2 por categoria, 6 no total",
          ].map((t) => (
            <li key={t} className="rounded-lg border border-white/15 px-3 py-1.5 text-white/85">
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Tutorial topicos={topicosConselho} />
        </div>
      </div>
    </main>
  );
}
