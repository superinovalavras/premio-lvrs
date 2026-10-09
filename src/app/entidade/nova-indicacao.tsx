"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { btnPrim } from "@/components/area/ui";
import { novaIndicacao } from "@/lib/server/acoes-indicacao";

export function NovaIndicacao() {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="grid justify-items-end gap-1">
      <button
        type="button"
        className={btnPrim}
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setErro(null);
            const r = await novaIndicacao();
            if (!r.ok) return setErro(r.erro);
            router.push(`/entidade/indicacoes/${r.id}`);
          })
        }
      >
        {pendente ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Nova indicação
      </button>
      {erro && <p className="text-sm text-vermelho">{erro}</p>}
    </div>
  );
}
