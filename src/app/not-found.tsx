import Image from "next/image";
import Link from "next/link";
import { Mais } from "@/components/marca";

// Página 404 na identidade do Prêmio (a padrão do Next aparece em inglês).
export default function NaoEncontrada() {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-fundo px-4 text-white">
      <div className="max-w-md text-center">
        <Link href="/" aria-label="Voltar ao site do Prêmio" className="inline-block">
          <Image src="/marca/lvrs-pacto.png" alt="LVRS+" width={900} height={520} className="mx-auto h-10 w-auto" />
        </Link>
        <p className="mt-10 flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-amarelo">
          <Mais className="size-3" /> Página não encontrada
        </p>
        <h1 className="mt-3 text-3xl font-medium">
          Este endereço <span className="enfase">não existe</span>
        </h1>
        <p className="mt-3 text-white/75">Confira o link ou volte para a página do Prêmio.</p>
        <Link href="/" className="mt-8 inline-flex h-12 items-center rounded-xl bg-amarelo px-6 font-semibold text-fundo transition hover:-translate-y-0.5">
          Ir para o site do Prêmio
        </Link>
      </div>
    </main>
  );
}
