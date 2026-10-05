import Image from "next/image";
import Link from "next/link";
import { Arcos, Mais } from "@/components/marca";

// Entrar, criar conta, trocar senha: marca de um lado, formulário do outro.
export function TelaDividida({
  selo,
  titulo,
  texto,
  children,
}: {
  selo: string;
  titulo: React.ReactNode;
  texto: string;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-[100svh] bg-papel text-fundo lg:grid-cols-[1.05fr_1fr]">
      <section className="relative isolate flex flex-col justify-between gap-10 overflow-hidden bg-fundo px-6 py-8 text-white sm:px-12 sm:py-12">
        <Arcos className="-right-28 -top-28 -z-10 size-[22rem] sm:size-[30rem]" />
        <Link href="/" className="self-start" aria-label="Voltar ao site do Prêmio">
          <Image src="/marca/lvrs-pacto.png" alt="LVRS+" width={900} height={520} className="h-10 w-auto" priority />
        </Link>
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amarelo">
            <Mais className="size-3.5" /> {selo}
          </p>
          <h1 className="mt-4 max-w-[15ch] text-4xl font-medium leading-[1.12] sm:text-5xl">{titulo}</h1>
          <p className="mt-4 max-w-[42ch] font-light text-white/80">{texto}</p>
        </div>
        <p className="hidden text-xs text-white/55 lg:block">
          Superintendência de Inovação de Lavras · Secretaria do COCITIEIS
        </p>
      </section>
      <section className="grid place-items-center px-6 py-10">
        <div className="w-full max-w-[400px]">{children}</div>
      </section>
    </main>
  );
}
