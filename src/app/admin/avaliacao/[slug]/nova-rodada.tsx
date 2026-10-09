"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { criarRodada } from "@/lib/server/acoes-avaliacao-admin";
import { CartaoAdmin, btnAmarelo, btnContorno, inputEscuro } from "@/components/admin/ui";

// Datas do art. 8º-A como sugestão: pré-seleção 29/10 a 03/11; avaliação dos finalistas 06 a 12/11.
const PADRAO = {
  pre_selecao: { abre: "2026-10-29T00:00", fecha: "2026-11-03T23:59" },
  final: { abre: "2026-11-06T00:00", fecha: "2026-11-12T23:59" },
  honoraria: { abre: "2026-11-06T00:00", fecha: "2026-11-12T23:59" },
};

export function NovaRodada({ categoriaId, honoraria }: { categoriaId: string; honoraria: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<"pre_selecao" | "final" | "honoraria">(honoraria ? "honoraria" : "pre_selecao");
  const [datas, setDatas] = useState(PADRAO[tipo]);
  const [teste, setTeste] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (!aberto) {
    return (
      <button type="button" className={btnContorno} onClick={() => setAberto(true)}>
        <Plus className="size-4" /> Nova rodada
      </button>
    );
  }

  const criar = () =>
    iniciar(async () => {
      setErro(null);
      const r = await criarRodada(categoriaId, { tipo, turno: 1, abre: datas.abre, fecha: datas.fecha, teste });
      if (!r.ok) return setErro(r.erro);
      router.push(`/admin/avaliacao/rodada/${r.id}`);
    });

  const rotulo = (t: string) => <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">{t}</span>;

  return (
    <CartaoAdmin className="bg-chrome">
      <h3 className="font-semibold">Nova rodada</h3>
      <p className="mt-1 text-[13px] text-white/65">
        A lista de concorrentes fica congelada na abertura: todos os avaliadores pontuam os mesmos (art. 15, § 1º).
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {!honoraria && (
          <label>
            {rotulo("Tipo")}
            <select
              value={tipo}
              onChange={(e) => {
                const t = e.target.value as "pre_selecao" | "final";
                setTipo(t);
                setDatas(PADRAO[t]);
              }}
              className={inputEscuro}
            >
              <option value="pre_selecao">Pré-seleção (indicados)</option>
              <option value="final">Avaliação final (finalistas)</option>
            </select>
          </label>
        )}
        <label>
          {rotulo("Abre (Brasília)")}
          <input type="datetime-local" value={datas.abre} onChange={(e) => setDatas({ ...datas, abre: e.target.value })} className={inputEscuro} />
        </label>
        <label>
          {rotulo("Fecha (Brasília)")}
          <input type="datetime-local" value={datas.fecha} onChange={(e) => setDatas({ ...datas, fecha: e.target.value })} className={inputEscuro} />
        </label>
      </div>
      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 p-3 text-sm">
        <input type="checkbox" checked={teste} onChange={(e) => setTeste(e.target.checked)} className="mt-0.5 accent-[#ffcd00]" />
        <span>
          Rodada de teste
          <span className="block text-[12px] text-white/55">Usa só concorrentes de teste e só aparece para avaliadores de teste. Pode ser excluída depois.</span>
        </span>
      </label>
      {erro && <p className="mt-4 rounded-xl border border-vermelho bg-vermelho/15 p-3 text-sm">{erro}</p>}
      <div className="mt-4 flex gap-2">
        <button type="button" className={btnAmarelo} disabled={pendente} onClick={criar}>
          {pendente && <Loader2 className="size-4 animate-spin" />} Criar rodada
        </button>
        <button type="button" className={btnContorno} onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </CartaoAdmin>
  );
}
