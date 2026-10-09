"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, FileUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { removerConcorrente, salvarConcorrente, verMaterial } from "@/lib/server/acoes-avaliacao-admin";
import { enviarMaterial } from "@/components/admin/upload";
import { CartaoAdmin, btnAmarelo, btnContorno, btnPerigo, inputEscuro } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type C = {
  id: string | null;
  nome: string;
  resumo: string;
  etapa: "indicado" | "finalista";
  teste: boolean;
  ordem: number;
  link: string;
  materialNome: string | null;
};

export function Concorrentes({ categoriaId, honoraria, lista }: { categoriaId: string; honoraria: boolean; lista: C[] }) {
  const [editando, setEditando] = useState<C | null>(null);
  const vazio: C = { id: null, nome: "", resumo: "", etapa: honoraria ? "finalista" : "indicado", teste: false, ordem: lista.length + 1, link: "", materialNome: null };

  const abrir = async (id: string) => {
    const w = window.open("", "_blank");
    const r = await verMaterial(id);
    if (r.ok && w) {
      w.opener = null;
      w.location.href = r.url;
    } else w?.close();
  };

  return (
    <>
      <button type="button" className={`${btnAmarelo} mb-4`} onClick={() => setEditando(vazio)}>
        <Plus className="size-4" /> {honoraria ? "Adicionar proposta" : "Adicionar concorrente"}
      </button>
      {!lista.length && (
        <CartaoAdmin>
          <p className="text-white/70">Nenhum cadastrado ainda.</p>
        </CartaoAdmin>
      )}
      <div className="grid gap-3">
        {lista.map((f) => (
          <CartaoAdmin key={f.id} className={cn("flex flex-wrap items-center gap-4", f.teste && "border-dashed")}>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{f.nome}</h3>
              <p className="mt-0.5 line-clamp-2 text-sm font-light text-white/70">{f.resumo}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]">
                {f.teste && <span className="rounded-lg bg-amarelo px-2.5 py-0.5 text-fundo">Teste</span>}
                {!honoraria && (
                  <span className={cn("rounded-lg px-2.5 py-0.5", f.etapa === "finalista" ? "bg-verde/35 text-[#8ff0bd]" : "bg-white/10 text-white/75")}>
                    {f.etapa === "finalista" ? "Finalista" : "Indicado"}
                  </span>
                )}
                {f.materialNome || f.link ? (
                  <button type="button" onClick={() => abrir(f.id!)} className="rounded-lg bg-white/10 px-2.5 py-0.5 text-white/75 hover:text-amarelo">
                    <FileText className="mr-1 inline size-3" /> Ver material
                  </button>
                ) : (
                  <span className="rounded-lg bg-amarelo/15 px-2.5 py-0.5 text-amarelo">Sem material</span>
                )}
              </div>
            </div>
            <button type="button" className={btnContorno} onClick={() => setEditando(f)}>
              Editar
            </button>
          </CartaoAdmin>
        ))}
      </div>
      {editando && <Gaveta inicial={editando} categoriaId={categoriaId} honoraria={honoraria} fechar={() => setEditando(null)} />}
    </>
  );
}

function Gaveta({ inicial, categoriaId, honoraria, fechar }: { inicial: C; categoriaId: string; honoraria: boolean; fechar: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(inicial);
  const [material, setMaterial] = useState<{ caminho: string; nome: string } | null | undefined>(undefined);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const arquivo = useRef<HTMLInputElement>(null);

  async function enviar(file: File) {
    setErro(null);
    setEnviando(true);
    const r = await enviarMaterial(file);
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setMaterial({ caminho: r.caminho, nome: file.name });
    setF((x) => ({ ...x, materialNome: file.name }));
  }

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarConcorrente(f.id, categoriaId, {
        nome: f.nome,
        resumo: f.resumo,
        etapa: f.etapa,
        teste: f.teste,
        ordem: f.ordem,
        link: f.link,
        material,
      });
      if (!r.ok) return setErro(r.erro);
      router.refresh();
      fechar();
    });

  const remover = () => {
    if (!f.id || !confirm(`Remover ${f.nome}?`)) return;
    iniciar(async () => {
      const r = await removerConcorrente(f.id!);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
      fechar();
    });
  };

  const rotulo = (t: string) => <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">{t}</span>;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="h-full w-full max-w-[460px] overflow-y-auto border-l border-white/10 bg-fundo p-6" data-lenis-prevent>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{f.id ? "Editar" : honoraria ? "Nova proposta" : "Novo concorrente"}</h2>
          <button type="button" onClick={fechar} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>

        <div className="grid gap-4">
          <label>
            {rotulo(honoraria ? "Nome do homenageado" : "Nome do indicado")}
            <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className={inputEscuro} />
          </label>
          <label>
            {rotulo(honoraria ? "Fundamentação resumida" : "Resumo da realização")}
            <textarea value={f.resumo} onChange={(e) => setF({ ...f, resumo: e.target.value })} rows={5} maxLength={600} className={inputEscuro} />
            <span className="mt-1 block text-right text-[11.5px] text-white/50">{f.resumo.length}/600 · os conselheiros veem este texto</span>
          </label>
          {!honoraria && (
            <label>
              {rotulo("Etapa")}
              <select value={f.etapa} onChange={(e) => setF({ ...f, etapa: e.target.value as C["etapa"] })} className={inputEscuro}>
                <option value="indicado">Indicado (pré-seleção)</option>
                <option value="finalista">Finalista</option>
              </select>
            </label>
          )}

          <div>
            {rotulo("Material da indicação")}
            <input ref={arquivo} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnContorno} disabled={enviando} onClick={() => arquivo.current?.click()}>
                {enviando ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} {f.materialNome ? "Trocar PDF" : "Enviar PDF"}
              </button>
              {f.materialNome && (
                <button
                  type="button"
                  className="text-xs text-white/60 hover:text-amarelo"
                  onClick={() => {
                    setMaterial(null);
                    setF((x) => ({ ...x, materialNome: null }));
                  }}
                >
                  Remover PDF
                </button>
              )}
            </div>
            {f.materialNome && <p className="mt-1.5 truncate text-[12px] text-white/70">{f.materialNome}</p>}
            <p className="mt-1.5 text-[11.5px] text-white/50">PDF até 20 MB, guardado em área privada. Só conselheiros não impedidos abrem.</p>
          </div>
          <label>
            {rotulo("Ou link para o material")}
            <input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://" className={inputEscuro} />
          </label>
          <label>
            {rotulo("Ordem")}
            <input type="number" min={0} value={f.ordem} onChange={(e) => setF({ ...f, ordem: Number(e.target.value) })} className={`${inputEscuro} max-w-[120px]`} />
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 p-3 text-sm">
            <input type="checkbox" checked={f.teste} onChange={(e) => setF({ ...f, teste: e.target.checked })} className="mt-0.5 accent-[#ffcd00]" />
            <span>
              Concorrente de teste
              <span className="block text-[12px] text-white/55">Só entra em rodadas de teste. Nunca aparece no site nem nas rodadas oficiais.</span>
            </span>
          </label>
        </div>

        {erro && <p className="mt-4 rounded-xl border border-vermelho bg-vermelho/15 p-3 text-sm">{erro}</p>}

        <div className="mt-6 flex gap-2">
          <button type="button" className={btnAmarelo} disabled={pendente || enviando} onClick={salvar}>
            {pendente && <Loader2 className="size-4 animate-spin" />} Salvar
          </button>
          {f.id && (
            <button type="button" className={btnPerigo} disabled={pendente} onClick={remover}>
              <Trash2 className="size-4" /> Remover
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
