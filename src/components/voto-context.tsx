"use client";

import { createContext, useContext, useState } from "react";
import type { Finalista } from "@/lib/data";
import { VotoModal } from "@/components/votacao/voto-modal";

type Ctx = { abrir: () => void };
const VotoContext = createContext<Ctx>({ abrir: () => {} });

export function useVoto() {
  return useContext(VotoContext);
}

export function VotoProvider({
  children,
  finalistas,
  exemplo,
}: {
  children: React.ReactNode;
  finalistas: Finalista[];
  exemplo: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <VotoContext.Provider value={{ abrir: () => setAberto(true) }}>
      {children}
      <VotoModal aberto={aberto} onFechar={() => setAberto(false)} finalistas={finalistas} exemplo={exemplo} />
    </VotoContext.Provider>
  );
}
