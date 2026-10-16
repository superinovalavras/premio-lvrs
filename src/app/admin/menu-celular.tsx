"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

// No celular, o menu lateral do painel vira gaveta: barra fixa no topo (logo, tela atual, botão Menu)
// e o menu completo abre por cima. No computador (lg), o layout usa o menu lateral de sempre.
export function MenuCelular({ telas, children }: { telas: { href: string; rotulo: string }[]; children: React.ReactNode }) {
  const caminho = usePathname();
  // Guarda a tela em que o menu foi aberto: ao navegar, a tela muda e o menu fecha sozinho.
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === caminho;
  const setAberto = (v: boolean) => setAbertoEm(v ? caminho : null);
  const atual = telas
    .filter((t) => caminho === t.href || caminho.startsWith(t.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.rotulo;

  // Esc fecha; com a gaveta aberta, a página de trás não rola.
  useEffect(() => {
    if (!aberto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbertoEm(null);
    document.addEventListener("keydown", tecla);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = antes;
    };
  }, [aberto]);

  return (
    <div className="lg:hidden">
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-chrome px-4">
        <Link href="/admin/entidades" aria-label="Início do painel" className="flex min-h-10 items-center">
          <Image src="/marca/lvrs-pacto.png" alt="LVRS+" width={900} height={520} className="h-7 w-auto" />
        </Link>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/85">{atual ?? "Painel do Prêmio"}</span>
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-expanded={aberto}
          aria-controls="menu-painel"
          className="flex h-10 items-center gap-1.5 rounded-xl border border-white/20 px-3 text-sm font-semibold text-white"
        >
          <Menu className="size-5" /> Menu
        </button>
      </div>

      <div
        className={cn("fixed inset-0 z-50 transition", aberto ? "visible" : "invisible")}
        aria-hidden={!aberto}
        onClick={(e) => e.target === e.currentTarget && setAberto(false)}
      >
        <div className={cn("absolute inset-0 bg-black/60 transition-opacity", aberto ? "opacity-100" : "opacity-0")} onClick={() => setAberto(false)} />
        <aside
          id="menu-painel"
          role="dialog"
          aria-modal="true"
          aria-label="Menu do painel"
          onClick={(e) => (e.target as HTMLElement).closest("a") && setAbertoEm(null)}
          className={cn(
            "absolute inset-y-0 left-0 w-[84%] max-w-[300px] overflow-y-auto border-r border-white/10 bg-chrome px-3.5 py-4 shadow-2xl transition-transform duration-200",
            aberto ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl text-white/80 hover:bg-white/10"
            aria-label="Fechar o menu"
          >
            <X className="size-5" />
          </button>
          {children}
        </aside>
      </div>
    </div>
  );
}
