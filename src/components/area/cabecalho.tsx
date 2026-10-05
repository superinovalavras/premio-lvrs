import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Arcos, Mais } from "@/components/marca";
import { sair } from "@/lib/server/acoes-conta";

// Topo verde-profundo da área da instituição, com a chamada da página.
export function CabecalhoArea({
  nome,
  selo,
  titulo,
  texto,
}: {
  nome: string;
  selo: string;
  titulo: React.ReactNode;
  texto?: React.ReactNode;
}) {
  const iniciais = nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <header className="relative isolate overflow-hidden bg-fundo text-white">
      <Arcos className="-right-24 -top-24 -z-10 hidden size-96 sm:block" />
      <div className="mx-auto flex max-w-[1080px] items-center gap-4 px-4 py-4 sm:px-6">
        <Link href="/entidade" className="flex items-center gap-3.5">
          <Image src="/marca/lvrs-pacto.png" alt="LVRS+" width={900} height={520} className="h-8 w-auto" />
          <span className="hidden border-l border-white/20 pl-3.5 text-[10px] uppercase leading-snug tracking-[0.2em] text-white/80 sm:block">
            Área da instituição
            <br />
            Prêmio Lavras <b className="font-semibold text-amarelo">2026</b>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-3 text-[13px]">
          <span className="hidden text-white/85 sm:inline">{nome}</span>
          <span className="grid size-9 place-items-center rounded-full bg-verde text-[13px] font-semibold">{iniciais}</span>
          <form action={sair}>
            <button className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-white/75 hover:text-amarelo" title="Sair">
              <LogOut className="size-4" /> <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </div>
      <div className="mx-auto max-w-[1080px] px-4 pb-14 pt-6 sm:px-6 sm:pt-8">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amarelo">
          <Mais className="size-3.5" /> {selo}
        </p>
        <h1 className="mt-3 max-w-[22ch] text-3xl font-medium leading-[1.12] sm:text-[2.6rem]">{titulo}</h1>
        {texto && <div className="mt-3 max-w-[60ch] font-light text-white/80">{texto}</div>}
      </div>
    </header>
  );
}

export function ConteudoArea({ children }: { children: React.ReactNode }) {
  return <div className="relative mx-auto -mt-6 max-w-[1080px] px-4 pb-20 sm:px-6">{children}</div>;
}
