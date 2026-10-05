"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type Item =
  | { grupo: string }
  | { href?: string; rotulo: string; icone: React.ReactNode; badge?: number };

export function NavAdmin({ itens }: { itens: Item[] }) {
  const caminho = usePathname();
  // O item mais específico que casa com a URL fica ativo.
  const ativo = itens
    .filter((i): i is Extract<Item, { rotulo: string }> => "rotulo" in i && !!i.href)
    .filter((i) => caminho === i.href || caminho.startsWith(i.href + "/"))
    .sort((a, b) => b.href!.length - a.href!.length)[0]?.href;

  return (
    <nav className="grid gap-0.5" aria-label="Painel">
      {itens.map((i, n) =>
        "grupo" in i ? (
          <p key={n} className="mx-2.5 mb-1.5 mt-4 text-[10px] uppercase tracking-[0.2em] text-white/50">
            {i.grupo}
          </p>
        ) : i.href ? (
          <Link
            key={i.rotulo}
            href={i.href}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13.5px] font-medium",
              ativo === i.href ? "bg-amarelo text-fundo" : "text-white/75 hover:bg-white/5 hover:text-white",
            )}
          >
            {i.icone}
            {i.rotulo}
            {!!i.badge && (
              <span
                className={cn(
                  "ml-auto rounded-full px-2 text-[10px] font-bold",
                  ativo === i.href ? "bg-fundo text-amarelo" : "bg-vermelho text-white",
                )}
              >
                {i.badge}
              </span>
            )}
          </Link>
        ) : (
          <span key={i.rotulo} className="flex items-center gap-2.5 px-2.5 py-2.5 text-[13.5px] font-medium text-white/35">
            {i.icone}
            {i.rotulo}
          </span>
        ),
      )}
    </nav>
  );
}
