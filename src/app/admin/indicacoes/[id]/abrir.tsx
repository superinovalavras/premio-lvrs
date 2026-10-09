"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { abrirDocIndicacao } from "@/lib/server/acoes-indicacao";

export function AbrirDoc({ id, rotulo }: { id: string; rotulo: string }) {
  const [erro, setErro] = useState<string | null>(null);
  return (
    <button
      type="button"
      onClick={async () => {
        const w = window.open("", "_blank");
        const r = await abrirDocIndicacao(id);
        if (r.ok && w) {
          w.opener = null;
          w.location.href = r.url;
        } else {
          w?.close();
          if (!r.ok) setErro(r.erro);
        }
      }}
      className="inline-flex max-w-full items-center gap-1.5 text-left text-amarelo hover:underline"
    >
      <ExternalLink className="size-3.5 shrink-0" />
      <span className="truncate">{erro ?? rotulo}</span>
    </button>
  );
}
