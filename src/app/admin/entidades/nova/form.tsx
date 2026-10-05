"use client";

import { useRef, useState, useTransition } from "react";
import { Copy, Loader2 } from "lucide-react";
import { preCadastrar } from "@/lib/server/acoes-admin";
import { CartaoAdmin, btnAmarelo, btnContorno, inputEscuro } from "@/components/admin/ui";
import { INCISOS, mascaraCnpj } from "@/lib/entidades";
import { cn } from "@/lib/utils";

export function mensagemAcesso(nome: string, email: string) {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  return `Olá, ${primeiro}! Sua instituição foi pré-cadastrada como indicadora do Prêmio Lavras de Inovação 2026.

Acesse: https://premio.lvrs.com.br/entrar
E-mail: ${email}
Senha provisória: 123456 (vale por 48 horas)

No primeiro acesso você cria a sua própria senha e completa o cadastro da instituição, que depois passa pela análise da Secretaria Executiva.`;
}

export function FormPreCadastro() {
  const form = useRef<HTMLFormElement>(null);
  const [cnpj, setCnpj] = useState("");
  const [assento, setAssento] = useState("");
  const [pendente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string; mensagem?: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_400px] xl:items-start">
      <CartaoAdmin>
        <form
          ref={form}
          action={(fd) =>
            iniciar(async () => {
              setCopiado(false);
              const r = await preCadastrar(fd);
              if (r.ok) {
                setResultado({
                  ok: true,
                  texto: r.msg ?? "Acesso criado.",
                  mensagem: mensagemAcesso(String(fd.get("representante")), String(fd.get("email"))),
                });
                form.current?.reset();
                setCnpj("");
                setAssento("");
              } else setResultado({ ok: false, texto: r.erro });
            })
          }
          className="grid gap-4 sm:grid-cols-2"
        >
          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Razão social ou denominação</span>
            <input name="razao_social" required className={inputEscuro} />
          </label>
          <label>
            <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">CNPJ (opcional)</span>
            <input name="cnpj" value={cnpj} onChange={(e) => setCnpj(mascaraCnpj(e.target.value))} inputMode="numeric" className={inputEscuro} />
          </label>
          <label>
            <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Enquadramento (opcional)</span>
            <select name="inciso" className={inputEscuro} defaultValue="">
              <option value="">A instituição escolhe</option>
              {INCISOS.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.rotulo} · {i.quem}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Nome do representante</span>
            <input name="representante" required className={inputEscuro} />
          </label>
          <label>
            <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">E-mail do representante (login)</span>
            <input name="email" type="email" required className={inputEscuro} />
          </label>
          <div className="sm:col-span-2">
            <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Assento no COCITIEIS</span>
            <div className="flex gap-2">
              {[
                ["sim", "Sim"],
                ["nao", "Não"],
                ["", "Não sei"],
              ].map(([v, r]) => (
                <label
                  key={r}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm",
                    assento === v ? "border-amarelo bg-amarelo/10" : "border-white/15",
                  )}
                >
                  <input type="radio" name="assento" value={v} checked={assento === v} onChange={() => setAssento(v)} className="accent-[#ffcd00]" />
                  {r}
                </label>
              ))}
            </div>
          </div>
          {assento === "sim" && (
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Conselheiro</span>
              <input name="conselheiro" className={inputEscuro} />
            </label>
          )}
          <div className="sm:col-span-2">
            <button className={btnAmarelo} disabled={pendente}>
              {pendente && <Loader2 className="size-4 animate-spin" />} Criar acesso
            </button>
          </div>
        </form>
      </CartaoAdmin>

      <div className="grid gap-4">
        {resultado && (
          <CartaoAdmin className={resultado.ok ? "border-verde bg-verde/25" : "border-vermelho bg-vermelho/15"}>
            <p className="font-semibold">{resultado.texto}</p>
            {resultado.mensagem && (
              <>
                <p className="mt-3 text-[13px] text-white/75">Mensagem pronta para enviar por WhatsApp ou e-mail:</p>
                <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-black/25 p-3 font-sans text-[13px] leading-relaxed">
                  {resultado.mensagem}
                </pre>
                <button
                  type="button"
                  className={cn(btnContorno, "mt-3")}
                  onClick={async () => {
                    await navigator.clipboard.writeText(resultado.mensagem!);
                    setCopiado(true);
                  }}
                >
                  <Copy className="size-4" /> {copiado ? "Copiada!" : "Copiar mensagem"}
                </button>
              </>
            )}
          </CartaoAdmin>
        )}
        <CartaoAdmin className="bg-chrome">
          <h2 className="font-semibold">Como funciona</h2>
          <ul className="mt-2 space-y-1.5 text-[13px] text-white/75">
            <li>· O representante entra com o e-mail e a senha 123456.</li>
            <li>· É obrigado a criar a própria senha antes de qualquer outra ação.</li>
            <li>· Se não entrar em 48 horas, a senha provisória expira — gere outra na ficha da instituição.</li>
            <li>· Ele completa o cadastro e envia; você analisa como os demais.</li>
          </ul>
        </CartaoAdmin>
      </div>
    </div>
  );
}
