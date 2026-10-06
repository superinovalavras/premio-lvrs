"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, KeyRound, Loader2 } from "lucide-react";
import { decidir, excluirEntidade, redefinirSenha } from "@/lib/server/acoes-admin";
import { abrirDocumento } from "@/lib/server/acoes-entidade";
import { CartaoAdmin, btnAmarelo, btnContorno, btnPerigo, inputEscuro } from "@/components/admin/ui";
import type { StatusEntidade } from "@/lib/entidades";
import { cn } from "@/lib/utils";

export function BotaoDocumento({ id }: { id: string }) {
  const [carregando, setCarregando] = useState(false);
  return (
    <button
      type="button"
      className={cn(btnContorno, "px-3 py-1.5 text-xs")}
      disabled={carregando}
      onClick={async () => {
        setCarregando(true);
        const r = await abrirDocumento(id);
        setCarregando(false);
        if (r.ok) window.open(r.url, "_blank", "noopener");
        else alert(r.erro);
      }}
    >
      {carregando ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />} Abrir
    </button>
  );
}

const OPCOES = [
  { id: "deferir", rotulo: "Deferir", explica: "Libera o acesso ao formulário de indicação." },
  { id: "ajuste", rotulo: "Pedir ajuste", explica: "Devolve para correção. A entidade corrige e reenvia." },
  { id: "indeferir", rotulo: "Indeferir", explica: "Decisão motivada, com o inciso não atendido." },
] as const;

export function PainelDecisao({
  id,
  status,
  pendencias,
  motivo,
}: {
  id: string;
  status: StatusEntidade;
  pendencias: string[];
  motivo: string | null;
}) {
  const router = useRouter();
  const [decisao, setDecisao] = useState<(typeof OPCOES)[number]["id"] | "">("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  if (status !== "em_analise") {
    return (
      <CartaoAdmin className={status === "deferido" ? "border-verde bg-verde/25" : undefined}>
        <h2 className="font-semibold">Decisão</h2>
        <p className="mt-1 text-sm text-white/75">
          {status === "rascunho" && "A entidade ainda não enviou o cadastro para análise."}
          {status === "pendente_ajuste" && "Aguardando a entidade corrigir e reenviar."}
          {status === "deferido" && "Cadastro deferido. A entidade pode indicar no período de indicações."}
          {status === "indeferido" && "Cadastro indeferido."}
        </p>
        {motivo && <p className="mt-2 border-l-[3px] border-amarelo pl-2.5 text-sm">{motivo}</p>}
      </CartaoAdmin>
    );
  }

  return (
    <CartaoAdmin className="border-amarelo/50">
      <h2 className="font-semibold">Decisão da Secretaria</h2>
      {pendencias.length > 0 && (
        <div className="mt-3 rounded-xl bg-amarelo/10 p-3 text-[13px]">
          <p className="font-semibold text-amarelo">O sistema aponta {pendencias.length} pendência(s):</p>
          <ul className="mt-1 list-disc pl-4 text-white/85">
            {pendencias.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      <form
        action={(fd) =>
          iniciar(async () => {
            const r = await decidir(id, fd);
            setMsg(r.ok ? { ok: true, texto: r.msg ?? "Decisão registrada." } : { ok: false, texto: r.erro });
            if (r.ok) router.refresh();
          })
        }
        className="mt-3 grid gap-2"
      >
        {OPCOES.map((o) => (
          <label
            key={o.id}
            className={cn(
              "flex cursor-pointer gap-3 rounded-xl border p-3 text-sm",
              decisao === o.id ? "border-amarelo bg-amarelo/10" : "border-white/15 hover:border-white/30",
            )}
          >
            <input type="radio" name="decisao" value={o.id} checked={decisao === o.id} onChange={() => setDecisao(o.id)} className="mt-1 accent-[#ffcd00]" />
            <span>
              <b className="font-semibold">{o.rotulo}</b>
              <span className="block text-[12.5px] text-white/60">{o.explica}</span>
            </span>
          </label>
        ))}
        {decisao && decisao !== "deferir" && (
          <label className="mt-1 block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">
              Motivo (vai por e-mail para a entidade e fica no processo)
            </span>
            <textarea name="motivo" required minLength={10} rows={4} className={inputEscuro} />
          </label>
        )}
        <button
          disabled={!decisao || pendente}
          className={cn("mt-1", decisao === "indeferir" ? btnPerigo : btnAmarelo)}
        >
          {pendente && <Loader2 className="size-4 animate-spin" />}
          {decisao === "deferir" ? "Deferir cadastro" : decisao === "ajuste" ? "Pedir ajuste" : decisao === "indeferir" ? "Indeferir" : "Escolha a decisão"}
        </button>
      </form>
      {msg && <p className={cn("mt-3 text-sm", msg.ok ? "text-[#8ff0bd]" : "text-[#ff8a8f]")}>{msg.texto}</p>}
    </CartaoAdmin>
  );
}

export function RedefinirSenha({ id }: { id: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="mt-3">
      <button
        type="button"
        disabled={pendente}
        className={cn(btnContorno, "w-full")}
        onClick={() => {
          if (!confirm("Gerar a senha provisória 123456 para este representante? A senha atual deixa de valer.")) return;
          iniciar(async () => {
            const r = await redefinirSenha(id);
            setMsg(r.ok ? (r.msg ?? "Pronto.") : r.erro);
          });
        }}
      >
        <KeyRound className="size-4" /> Gerar senha provisória
      </button>
      {msg && <p className="mt-2 text-[13px] text-white/80">{msg}</p>}
    </div>
  );
}

export function ExcluirCadastro({ id }: { id: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="mt-3 grid gap-2">
      <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Digite EXCLUIR" className={inputEscuro} />
      <button
        type="button"
        className={btnPerigo}
        disabled={pendente || texto.trim().toUpperCase() !== "EXCLUIR"}
        onClick={() =>
          iniciar(async () => {
            const r = await excluirEntidade(id, texto);
            if (!r.ok) return setMsg(r.erro);
            router.push("/admin/entidades");
          })
        }
      >
        {pendente && <Loader2 className="size-4 animate-spin" />} Excluir cadastro
      </button>
      {msg && <p className="text-[13px] text-[#ff8a8f]">{msg}</p>}
    </div>
  );
}
