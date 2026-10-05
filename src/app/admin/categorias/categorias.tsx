"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { salvarCategoria } from "@/lib/server/acoes-parametros";
import { CartaoAdmin, btnAmarelo, btnContorno, inputEscuro } from "@/components/admin/ui";
import { TIPO_LABEL, type Categoria } from "@/lib/data";
import { cn } from "@/lib/utils";

type C = Categoria & { id: string };

export function Categorias({ lista }: { lista: C[] }) {
  const [aberta, setAberta] = useState<string | null>(null);
  return (
    <div className="grid gap-3">
      {lista.map((c) => (
        <CartaoAdmin key={c.id} className={cn(c.votoPopular && "border-amarelo/50")}>
          {aberta === c.id ? (
            <Edicao c={c} fechar={() => setAberta(null)} />
          ) : (
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{c.nome}</h3>
                  <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/75">
                    {TIPO_LABEL[c.tipo]}
                  </span>
                  {c.votoPopular && (
                    <span className="rounded-lg bg-amarelo px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-fundo">
                      Voto popular
                    </span>
                  )}
                  {c.destaque && <span className="text-[12px] text-white/55">· card grande no site</span>}
                </div>
                <p className="mt-1.5 text-sm font-light text-white/75">{c.resumo || <i className="text-white/45">Sem descrição</i>}</p>
              </div>
              <button type="button" className={btnContorno} onClick={() => setAberta(c.id)}>
                Editar texto
              </button>
            </div>
          )}
        </CartaoAdmin>
      ))}
    </div>
  );
}

function Edicao({ c, fechar }: { c: C; fechar: () => void }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <form
      action={(fd) =>
        iniciar(async () => {
          const r = await salvarCategoria(c.id, fd);
          if (!r.ok) return setErro(r.erro);
          router.refresh();
          fechar();
        })
      }
      className="grid gap-3"
    >
      <label>
        <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Nome</span>
        <input name="nome" defaultValue={c.nome} className={inputEscuro} />
      </label>
      <label>
        <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Descrição no site</span>
        <textarea name="descricao" defaultValue={c.resumo} rows={3} maxLength={400} className={inputEscuro} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="destaque" defaultChecked={c.destaque} className="accent-[#ffcd00]" /> Card grande no site
      </label>
      {erro && <p className="text-sm text-[#ff8a8f]">{erro}</p>}
      <div className="flex gap-2">
        <button className={btnAmarelo} disabled={pendente}>
          {pendente && <Loader2 className="size-4 animate-spin" />} Salvar
        </button>
        <button type="button" className={btnContorno} onClick={fechar}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
