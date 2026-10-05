"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileUp, Loader2, Plus, Trash2 } from "lucide-react";
import { removerDocumentoPublico, salvarDocumento } from "@/lib/server/acoes-parametros";
import { enviarArquivoPublico } from "@/components/admin/upload";
import { CartaoAdmin, btnAmarelo, btnContorno, inputEscuro } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

type D = { id: string; titulo: string; descricao: string; href: string | null; nome_arquivo?: string | null };

export function Documentos({ lista }: { lista: D[] }) {
  const [novo, setNovo] = useState(false);
  return (
    <div className="grid gap-3">
      {lista.map((d) => (
        <Linha key={d.id} d={d} />
      ))}
      {novo ? (
        <Linha d={{ id: "", titulo: "", descricao: "", href: null }} aoFechar={() => setNovo(false)} />
      ) : (
        <button type="button" className={cn(btnContorno, "justify-self-start")} onClick={() => setNovo(true)}>
          <Plus className="size-4" /> Novo documento
        </button>
      )}
    </div>
  );
}

function Linha({ d, aoFechar }: { d: D; aoFechar?: () => void }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(d.titulo);
  const [descricao, setDescricao] = useState(d.descricao);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pendente, iniciar] = useTransition();
  const arquivo = useRef<HTMLInputElement>(null);
  const mudouTexto = titulo !== d.titulo || descricao !== d.descricao;

  async function enviar(f: File) {
    setMsg(null);
    setEnviando(true);
    const up = await enviarArquivoPublico("documentos", f);
    if (!up.ok) {
      setEnviando(false);
      return setMsg({ ok: false, texto: up.erro });
    }
    const r = await salvarDocumento(d.id || null, { titulo, descricao, caminho: up.caminho, nome_arquivo: f.name, tamanho: f.size });
    setEnviando(false);
    setMsg(r.ok ? { ok: true, texto: "PDF publicado no site." } : { ok: false, texto: r.erro });
    if (r.ok) {
      router.refresh();
      aoFechar?.();
    }
  }

  const salvarTexto = () =>
    iniciar(async () => {
      const r = await salvarDocumento(d.id || null, { titulo, descricao });
      setMsg(r.ok ? { ok: true, texto: "Salvo." } : { ok: false, texto: r.erro });
      if (r.ok) {
        router.refresh();
        aoFechar?.();
      }
    });

  return (
    <CartaoAdmin className={cn(!d.href && "border-dashed")}>
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="grid gap-2">
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" className={cn(inputEscuro, "font-semibold")} />
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descrição curta" className={inputEscuro} />
          <p className="text-[12.5px] text-white/60">
            {d.href ? (
              <>
                Publicado: {d.nome_arquivo ?? "arquivo"} ·{" "}
                <a href={d.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-amarelo hover:underline">
                  abrir <ExternalLink className="size-3" />
                </a>
              </>
            ) : (
              <span className="text-amarelo">Sem arquivo — no site aparece “Em breve”.</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={arquivo} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])} />
          <button type="button" className={d.href ? btnContorno : btnAmarelo} disabled={enviando || titulo.trim().length < 3} onClick={() => arquivo.current?.click()}>
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} {d.href ? "Trocar PDF" : "Enviar PDF"}
          </button>
          {(mudouTexto || !d.id) && (
            <button type="button" className={btnContorno} disabled={pendente} onClick={salvarTexto}>
              {pendente && <Loader2 className="size-4 animate-spin" />} Salvar texto
            </button>
          )}
          {d.id ? (
            <button
              type="button"
              title="Remover do site"
              className={cn(btnContorno, "px-2.5")}
              onClick={() => {
                if (!confirm(`Remover “${d.titulo}” da Central de Transparência?`)) return;
                iniciar(async () => {
                  const r = await removerDocumentoPublico(d.id);
                  if (!r.ok) return setMsg({ ok: false, texto: r.erro });
                  router.refresh();
                });
              }}
            >
              <Trash2 className="size-4" />
            </button>
          ) : (
            <button type="button" className={btnContorno} onClick={aoFechar}>
              Cancelar
            </button>
          )}
        </div>
      </div>
      {msg && <p className={cn("mt-2 text-sm", msg.ok ? "text-[#8ff0bd]" : "text-[#ff8a8f]")}>{msg.texto}</p>}
    </CartaoAdmin>
  );
}
