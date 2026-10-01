"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoto } from "./voto-context";

const LINKS = [
  { href: "#eixos", label: "Eixos" },
  { href: "#categorias", label: "Categorias" },
  { href: "#votacao", label: "Votação" },
  { href: "#cronograma", label: "Cronograma" },
  { href: "#transparencia", label: "Transparência" },
];

export function Header() {
  const [rolou, setRolou] = useState(false);
  const [menu, setMenu] = useState(false);
  const { abrir } = useVoto();

  useEffect(() => {
    const onScroll = () => setRolou(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        // Barra sempre chapada: os arcos do hero passam por baixo dela, nunca por trás do texto.
        "fixed inset-x-0 top-0 z-40 border-b bg-fundo transition-colors duration-500",
        rolou || menu ? "border-white/10" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#topo" className="flex items-center gap-3" aria-label="Prêmio Lavras de Inovação — início">
          <Image src="/marca/lvrs-pacto.png" alt="LVRS+" width={900} height={520} className="h-8 w-auto" priority />
          <span className="hidden border-l border-white/20 pl-3 text-[0.68rem] font-medium uppercase leading-tight tracking-[0.2em] text-white/85 sm:block">
            Prêmio Lavras
            <br />
            de Inovação <span className="text-amarelo">2026</span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Seções">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="group relative px-3 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-white"
            >
              {l.label}
              <span className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-amarelo transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={abrir}
            className="rounded-xl bg-amarelo px-4 py-2 text-sm font-semibold text-fundo transition-shadow hover:shadow-[0_8px_28px_-6px_var(--amarelo)]"
          >
            Votar
          </button>
          <button
            className="rounded-xl p-2 text-white lg:hidden"
            onClick={() => setMenu((m) => !m)}
            aria-label={menu ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menu}
          >
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menu && (
        <nav className="border-t border-white/10 px-4 py-3 lg:hidden" aria-label="Seções">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenu(false)}
              className="block rounded-xl px-3 py-3 text-sm font-medium uppercase tracking-[0.18em] text-white/85 hover:bg-white/5 hover:text-amarelo"
            >
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </motion.header>
  );
}
