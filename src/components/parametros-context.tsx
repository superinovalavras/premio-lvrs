"use client";

import { createContext, useContext } from "react";
import type { Parametros } from "@/lib/server/parametros";

const Ctx = createContext<Parametros | null>(null);

export function ParametrosProvider({ valor, children }: { valor: Parametros; children: React.ReactNode }) {
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useParametros() {
  const p = useContext(Ctx);
  if (!p) throw new Error("useParametros fora do ParametrosProvider");
  return p;
}
