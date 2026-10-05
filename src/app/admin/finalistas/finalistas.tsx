"use client";

/* eslint-disable @next/next/no-img-element -- logos vêm do Storage público, tamanhos variados */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Loader2, Plus, Trash2, X } from "lucide-react";
import { removerFinalista, salvarFinalista } from "@/lib/server/acoes-parametros";
import { enviarArquivoPublico } from "@/components/admin/upload";
import { CartaoAdmin, btnAmarelo, btnContorno, btnPerigo, inputEscuro } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type F = { id: string | null; nome: string; resumo: string; imagem: string | null; nota: string; teste: boolean; ordem: number };

const VAZIO: F = { id: null, nome: "", resumo: "", imagem: null, nota: "", teste: false, ordem: 0 };

function Logo({ f, grande }: { f: Pick<F, "nome" | "imagem">; grande?: boolean }) {
  const ini = f.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
  return (
    <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-verde font-bold text-amarelo", grande ? "size-24 text-2xl" : "size-14 text-lg")}>
      {f.imagem ? <img src={f.imagem} alt="" className="size-full object-cover" /> : ini}
    </div>
  );
}

export function Finalistas({ lista }: { lista: F[] }) {
  const [editando, setEditando] = useState<F | null>(null);
  const oficiais = lista.filter((f) => !f.teste);
  const testes = lista.filter((f) => f.teste);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/70">
          {oficiais.length} oficiais{testes.length ? ` · ${testes.length} de teste` : ""}
          {oficiais.length !== 3 && <span className="text-amarelo"> · a votação prevê 3 finalistas</span>}
        </p>
        <button type="button" className={btnAmarelo} onClick={() => setEditando({ ...VAZIO, ordem: lista.length + 1 })}>
          <Plus className="size-4" /> Adicionar finalista
        </button>
      </div>

      {lista.length === 0 && (
        <CartaoAdmin>
          <p className="text-white/70">Nenhum finalista cadastrado. Enquanto isso, o site mostra três finalistas de exemplo.</p>
        </CartaoAdmin>
      )}

      <div className="grid gap-3">
        {lista.map((f) => (
          <CartaoAdmin key={f.id} className={cn("flex flex-wrap items-center gap-4", f.teste && "border-dashed")}>
            <Logo f={f} />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold">{f.nome}</h3>
              <p className="mt-0.5 line-clamp-2 text-sm font-light text-white/70">{f.resumo}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]">
                {f.teste && <span className="rounded-lg bg-amarelo px-2.5 py-0.5 text-fundo">Teste</span>}
                {!f.imagem && <span className="rounded-lg bg-amarelo/15 px-2.5 py-0.5 text-amarelo">Falta a logo</span>}
                <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-white/75">
                  Nota técnica: {f.nota || "pendente"}
                </span>
              </div>
            </div>
            <button type="button" className={btnContorno} onClick={() => setEditando(f)}>
              Editar
            </button>
          </CartaoAdmin>
        ))}
      </div>

      {editando && <Gaveta inicial={editando} fechar={() => setEditando(null)} />}
    </>
  );
}

function Gaveta({ inicial, fechar }: { inicial: F; fechar: () => void }) {
  const router = useRouter();
  const [f, setF] = useState(inicial);
  const [logoNova, setLogoNova] = useState<string | null | undefined>(undefined); // undefined = sem mudança
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const arquivo = useRef<HTMLInputElement>(null);

  async function trocarLogo(file: File) {
    setErro(null);
    setEnviando(true);
    const r = await enviarArquivoPublico("finalistas", file);
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    setLogoNova(r.caminho);
    setF((x) => ({ ...x, imagem: URL.createObjectURL(file) }));
  }

  const salvar = () =>
    iniciar(async () => {
      const r = await salvarFinalista(f.id, { nome: f.nome, resumo: f.resumo, nota: f.nota, teste: f.teste, ordem: f.ordem, logo: logoNova });
      if (!r.ok) return setErro(r.erro);
      router.refresh();
      fechar();
    });

  const remover = () => {
    if (!f.id || !confirm(`Remover ${f.nome}?`)) return;
    iniciar(async () => {
      const r = await removerFinalista(f.id!);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
      fechar();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="h-full w-full max-w-[460px] overflow-y-auto border-l border-white/10 bg-fundo p-6" data-lenis-prevent>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{f.id ? "Editar finalista" : "Novo finalista"}</h2>
          <button type="button" onClick={fechar} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Logo f={f} grande />
          <div className="grid gap-2">
            <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => e.target.files?.[0] && trocarLogo(e.target.files[0])} />
            <button type="button" className={btnContorno} disabled={enviando} onClick={() => arquivo.current?.click()}>
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />} {f.imagem ? "Trocar logo" : "Enviar logo"}
            </button>
            {f.imagem && (
              <button type="button" className="text-left text-xs text-white/60 hover:text-amarelo" onClick={() => { setLogoNova(null); setF((x) => ({ ...x, imagem: null })); }}>
                Remover logo
              </button>
            )}
            <p className="text-[11.5px] text-white/50">Quadrada, PNG/JPG/WEBP/SVG.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <label>
            <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Nome</span>
            <input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} className={inputEscuro} />
          </label>
          <label>
            <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Resumo da solução</span>
            <textarea value={f.resumo} onChange={(e) => setF({ ...f, resumo: e.target.value })} rows={4} maxLength={400} className={inputEscuro} />
            <span className="mt-1 block text-right text-[11.5px] text-white/50">{f.resumo.length}/400 · aparece no formulário de voto</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Nota técnica (0–100)</span>
              <input value={f.nota} onChange={(e) => setF({ ...f, nota: e.target.value })} inputMode="decimal" placeholder="Pode lançar depois" className={inputEscuro} />
            </label>
            <label>
              <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Ordem no site</span>
              <input type="number" min={0} value={f.ordem} onChange={(e) => setF({ ...f, ordem: Number(e.target.value) })} className={inputEscuro} />
            </label>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 p-3 text-sm">
            <input type="checkbox" checked={f.teste} onChange={(e) => setF({ ...f, teste: e.target.checked })} className="mt-0.5 accent-[#ffcd00]" />
            <span>
              Finalista de teste
              <span className="block text-[12px] text-white/55">Só aparece no link de teste. Nunca no site oficial.</span>
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
