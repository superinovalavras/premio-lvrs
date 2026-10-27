"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Aviso, Campo, btnPrim, inputCls } from "@/components/area/ui";
import { salvarPropostaHonoraria } from "@/lib/server/acoes-honorarias";
import { CAMPOS_PROPOSTA, SO_PESSOA, type PropostaRow } from "@/lib/honorarias";
import { cn } from "@/lib/utils";

export function FormularioProposta({ slug, proposta, editavel }: { slug: string; proposta: PropostaRow | null; editavel: boolean }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [tipo, setTipo] = useState(proposta?.indicado_tipo ?? "pf");

  // onSubmit (não action): em caso de erro o formulário não é limpo.
  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await salvarPropostaHonoraria(slug, fd);
      if (!r.ok) return setMsg({ ok: false, texto: r.erro });
      // Deu certo: volta para a área do conselho, que mostra a confirmação no topo.
      router.push(`/avaliacao?proposta=${r.msg === "Proposta atualizada." ? "atualizada" : "enviada"}`);
    });
  };

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <fieldset disabled={!editavel || pendente} className="grid gap-5">
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-fundo">Quem é o indicado</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "pf", rotulo: "Pessoa" },
              { id: "instituicao", rotulo: "Instituição" },
            ]
              .filter((o) => o.id === "pf" || !SO_PESSOA.includes(slug))
              .map((o) => (
                <label
                  key={o.id}
                  className={cn(
                    "cursor-pointer rounded-xl border-[1.5px] px-4 py-2.5 text-sm font-medium transition",
                    tipo === o.id ? "border-verde bg-verde/10 text-fundo" : "border-fundo/15 text-fundo/75 hover:border-fundo/40",
                  )}
                >
                  <input
                    type="radio"
                    name="indicado_tipo"
                    value={o.id}
                    checked={tipo === o.id}
                    onChange={() => setTipo(o.id as "pf" | "instituicao")}
                    className="sr-only"
                  />
                  {o.rotulo}
                </label>
              ))}
          </div>
        </div>
        {CAMPOS_PROPOSTA.map((c) => (
          <Campo
            key={c.id}
            label={c.rotulo}
            opcional={!c.obrigatorio}
            dica={c.dica ?? (c.linhas > 1 ? `Até ${c.max} caracteres.` : undefined)}
          >
            {c.linhas > 1 ? (
              <textarea
                name={c.id}
                rows={c.linhas}
                maxLength={c.max}
                required={c.obrigatorio}
                defaultValue={(proposta?.[c.id as keyof PropostaRow] as string | null) ?? ""}
                className={inputCls}
              />
            ) : (
              <input
                name={c.id}
                maxLength={c.max}
                required={c.obrigatorio}
                type={c.id === "link" ? "url" : "text"}
                placeholder={c.id === "link" ? "https://" : undefined}
                defaultValue={(proposta?.[c.id as keyof PropostaRow] as string | null) ?? ""}
                className={inputCls}
              />
            )}
          </Campo>
        ))}
      </fieldset>
      {msg && <Aviso tom={msg.ok ? "ok" : "erro"}>{msg.texto}</Aviso>}
      {editavel && (
        <div className="flex justify-end">
          <button className={btnPrim} disabled={pendente}>
            {pendente ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {proposta ? "Salvar alterações" : "Enviar proposta"}
          </button>
        </div>
      )}
    </form>
  );
}
