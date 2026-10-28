"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { CartaoAdmin, btnAmarelo, btnContorno, inputEscuro } from "@/components/admin/ui";
import {
  confirmarUploadSecretaria,
  editarIndicacaoSecretaria,
  linkSecretaria,
  prepararUploadSecretaria,
  removerDocSecretaria,
  type Resultado,
} from "@/lib/server/acoes-indicacao-secretaria";
import { LIMITES_TEXTO, aceitaLink, type IndicacaoRow } from "@/lib/indicacoes";
import { cn } from "@/lib/utils";

type Doc = { id: string; tipo: string; link: string | null; nome_arquivo: string | null };
type Categoria = { id: string; name: string };

const TIPOS_DOC = [
  { id: "evidencia", rotulo: "Evidência" },
  { id: "comprobatorio", rotulo: "Documento comprobatório" },
  { id: "vinculo", rotulo: "Evidência do vínculo" },
];

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-white/65">{rotulo}</span>
      {children}
    </label>
  );
}

// Esclarecimentos do art. 10: a Secretaria completa a indicação depois do prazo. Tudo vai para a auditoria.
export function EditarIndicacao({ i, documentos, categorias }: { i: IndicacaoRow; documentos: Doc[]; categorias: Categoria[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [tipoDoc, setTipoDoc] = useState("evidencia");
  const [link, setLink] = useState("");

  const rodar = (f: () => Promise<Resultado>, depois?: () => void) =>
    iniciar(async () => {
      const r = await f();
      setMsg(r.ok ? { ok: true, texto: r.msg ?? "Pronto." } : { ok: false, texto: r.erro });
      if (r.ok) {
        depois?.();
        router.refresh();
      }
    });

  const enviarArquivo = (f: File) =>
    rodar(async () => {
      const prep = await prepararUploadSecretaria(i.id, tipoDoc, f.name, f.size, f.type);
      if (!prep.ok) return prep;
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
      const { error } = await sb.storage.from("entidades").uploadToSignedUrl(prep.caminho, prep.token, f, { contentType: f.type });
      if (error) return { ok: false, erro: "Falha no envio do arquivo. Tente de novo." };
      return confirmarUploadSecretaria(i.id, tipoDoc, prep.caminho, f.name, f.size);
    });

  if (!aberto) {
    return (
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button type="button" className={btnContorno} onClick={() => setAberto(true)}>
          <Pencil className="size-4" /> Corrigir dados da indicação
        </button>
        <span className="text-[12.5px] text-white/55">Para completar com o que chegar nos esclarecimentos. Fica registrado na auditoria.</span>
      </div>
    );
  }

  return (
    <CartaoAdmin className="mb-6">
      <div className="flex items-center gap-3">
        <h2 className="flex-1 font-semibold">Corrigir dados da indicação</h2>
        <button type="button" aria-label="Fechar" className="text-white/60 hover:text-amarelo" onClick={() => setAberto(false)}>
          <X className="size-5" />
        </button>
      </div>
      <p className="mt-1 text-[12.5px] text-white/55">
        Não manda e-mail a ninguém. Se a indicação já for concorrente, o nome, o resumo e a categoria mudam lá também.
      </p>

      <form
        className="mt-4 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          rodar(() => editarIndicacaoSecretaria(i.id, fd));
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Campo rotulo="Nome do indicado">
            <input name="indicado_nome" defaultValue={i.indicado_nome ?? ""} maxLength={200} className={inputEscuro} />
          </Campo>
          <Campo rotulo="Categoria">
            <select name="category_id" defaultValue={i.category_id ?? ""} className={inputEscuro}>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Campo>
          {i.indicado_tipo === "pf" && (
            <Campo rotulo="Data de nascimento">
              <input type="date" name="indicado_nascimento" defaultValue={i.indicado_nascimento ?? ""} className={inputEscuro} />
            </Campo>
          )}
          <Campo rotulo="Título da realização">
            <input name="titulo" defaultValue={i.titulo ?? ""} maxLength={LIMITES_TEXTO.titulo} className={inputEscuro} />
          </Campo>
        </div>
        <Campo rotulo="Descrição do vínculo com Lavras">
          <textarea name="vinculo_descricao" defaultValue={i.vinculo_descricao ?? ""} rows={2} maxLength={LIMITES_TEXTO.vinculo} className={inputEscuro} />
        </Campo>
        <Campo rotulo="Resumo executivo">
          <textarea name="resumo" defaultValue={i.resumo ?? ""} rows={3} maxLength={LIMITES_TEXTO.resumo} className={inputEscuro} />
        </Campo>
        <Campo rotulo="Problema ou oportunidade">
          <textarea name="problema" defaultValue={i.problema ?? ""} rows={3} maxLength={LIMITES_TEXTO.problema} className={inputEscuro} />
        </Campo>
        <Campo rotulo="Solução ou contribuição">
          <textarea name="solucao" defaultValue={i.solucao ?? ""} rows={4} maxLength={LIMITES_TEXTO.solucao} className={inputEscuro} />
        </Campo>
        <Campo rotulo="Resultados e indicadores">
          <textarea name="resultados" defaultValue={i.resultados ?? ""} rows={4} maxLength={LIMITES_TEXTO.resultados} className={inputEscuro} />
        </Campo>
        <div className="grid gap-4 md:grid-cols-4">
          <Campo rotulo="Período: início">
            <input type="date" name="periodo_inicio" defaultValue={i.periodo_inicio ?? ""} className={inputEscuro} />
          </Campo>
          <Campo rotulo="Período: fim">
            <input type="date" name="periodo_fim" defaultValue={i.periodo_fim ?? ""} className={inputEscuro} />
          </Campo>
          <Campo rotulo="Beneficiários">
            <input name="beneficiarios" defaultValue={i.beneficiarios ?? ""} maxLength={1000} className={inputEscuro} />
          </Campo>
          <Campo rotulo="Quantidade">
            <input name="beneficiarios_qtd" inputMode="numeric" defaultValue={i.beneficiarios_qtd ?? ""} className={inputEscuro} />
          </Campo>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Campo rotulo="Contato do indicado: nome">
            <input name="contato_nome" defaultValue={i.contato_nome ?? ""} maxLength={160} className={inputEscuro} />
          </Campo>
          <Campo rotulo="E-mail">
            <input type="email" name="contato_email" defaultValue={i.contato_email ?? ""} maxLength={160} className={inputEscuro} />
          </Campo>
          <Campo rotulo="Telefone (DDD + número)">
            <input name="contato_telefone" defaultValue={i.contato_telefone ?? ""} className={inputEscuro} />
          </Campo>
        </div>
        <button type="submit" disabled={pendente} className={cn(btnAmarelo, "justify-self-start")}>
          {pendente && <Loader2 className="size-4 animate-spin" />} Salvar correções
        </button>
      </form>

      <div className="mt-6 grid gap-3 border-t border-white/10 pt-4 text-sm">
        <h3 className="font-semibold">Evidências e documentos</h3>
        {documentos.length > 0 && (
          <ul className="grid gap-1.5">
            {documentos.map((d) => (
              <li key={d.id} className="flex items-center gap-2">
                <span className="w-44 shrink-0 text-white/55">{TIPOS_DOC.find((t) => t.id === d.tipo)?.rotulo ?? d.tipo}</span>
                <span className="min-w-0 flex-1 truncate">{d.link ?? d.nome_arquivo}</span>
                <button
                  type="button"
                  aria-label="Retirar"
                  disabled={pendente}
                  className="text-white/50 hover:text-[#ff8a8f]"
                  onClick={() => confirm("Retirar este item da indicação?") && rodar(() => removerDocSecretaria(i.id, d.id))}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <select value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} className={cn(inputEscuro, "w-auto")}>
            {TIPOS_DOC.map((t) => (
              <option key={t.id} value={t.id}>
                {t.rotulo}
              </option>
            ))}
          </select>
          {aceitaLink(tipoDoc) && (
            <>
              <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className={cn(inputEscuro, "min-w-0 flex-1")} />
              <button type="button" disabled={pendente || !link} className={btnContorno} onClick={() => rodar(() => linkSecretaria(i.id, tipoDoc, link), () => setLink(""))}>
                Incluir link
              </button>
            </>
          )}
          <label className={cn(btnContorno, "cursor-pointer")}>
            Enviar arquivo
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="sr-only"
              disabled={pendente}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) enviarArquivo(f);
              }}
            />
          </label>
        </div>
        <p className="text-[12px] text-white/45">PDF, PNG ou JPG até 10 MB.</p>
      </div>

      {msg && <p className={cn("mt-3 text-sm", msg.ok ? "text-[#8ff0bd]" : "text-[#ff8a8f]")}>{msg.texto}</p>}
    </CartaoAdmin>
  );
}
