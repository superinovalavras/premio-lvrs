"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { aceitarConvite } from "@/lib/server/acoes-convite";
import { Aviso, Campo, btnPrim, inputCls } from "@/components/area/ui";
import { DECLARACAO_ANEXO_III } from "@/lib/avaliacao";

const ROMANOS = ["I", "II", "III", "IV", "V", "VI"];

export function FormConvite({ token, nome, email }: { token: string; nome: string; email: string }) {
  const [estado, acao, pendente] = useActionState(aceitarConvite.bind(null, token), undefined);
  const vincular = !!estado?.contaExistente;
  // Controlados: o formulário volta ao estado inicial depois de cada envio, e as caixas não devem desmarcar.
  const [anexo, setAnexo] = useState(false);
  const [priv, setPriv] = useState(false);

  return (
    <form action={acao}>
      <h2 className="text-xl font-semibold">{vincular ? "Entre com a sua conta" : "Crie o seu acesso"}</h2>
      <p className="mt-1.5 font-light text-fundo/70">
        {vincular ? "Use a senha que você já tem no site do Prêmio." : "O e-mail é o do convite e será o seu login."}
      </p>
      <input type="hidden" name="modo" value={vincular ? "vincular" : "criar"} />

      <div className="mt-6 space-y-4">
        <Campo label="Nome">
          <input value={nome} disabled className={inputCls} />
        </Campo>
        <Campo label="E-mail">
          <input value={email} disabled className={inputCls} />
        </Campo>
        <Campo label={vincular ? "Senha da sua conta" : "Senha"} dica={vincular ? undefined : "Mínimo de 8 caracteres. Ninguém da organização terá acesso a ela."}>
          <input name="senha" type="password" autoComplete={vincular ? "current-password" : "new-password"} required minLength={vincular ? 1 : 8} className={inputCls} />
        </Campo>
        {!vincular && (
          <Campo label="Repita a senha">
            <input name="confirmar" type="password" autoComplete="new-password" required minLength={8} className={inputCls} />
          </Campo>
        )}
      </div>

      <details className="mt-6 rounded-2xl bg-nevoa px-4 py-3 text-sm">
        <summary className="cursor-pointer font-semibold">Declaração de Impedimento e Confidencialidade (Anexo III)</summary>
        <p className="mt-2 text-fundo/80">Como membro ou avaliador designado pelo COCITIEIS, declaro que:</p>
        <ol className="mt-2 space-y-1.5 text-fundo/80">
          {DECLARACAO_ANEXO_III.map((t, i) => (
            <li key={i}>
              <b className="font-semibold">{ROMANOS[i]}</b> — {t}
            </li>
          ))}
        </ol>
      </details>
      <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" name="anexo3" required checked={anexo} onChange={(e) => setAnexo(e.target.checked)} className="mt-0.5 size-4 accent-[#0d8049]" />
        <span>Li e aceito a Declaração de Impedimento e Confidencialidade.</span>
      </label>
      <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" name="privacidade" required checked={priv} onChange={(e) => setPriv(e.target.checked)} className="mt-0.5 size-4 accent-[#0d8049]" />
        <span>
          Li o{" "}
          <Link href="/privacidade" target="_blank" className="font-semibold text-verde underline underline-offset-4">
            Aviso de Privacidade
          </Link>
          . Meu nome, declarações e notas ficam registrados no processo do Prêmio.
        </span>
      </label>

      {estado?.erro && (
        <Aviso tom={vincular ? "alerta" : "erro"} className="mt-4">
          {estado.erro}
        </Aviso>
      )}
      <button className={`${btnPrim} mt-6 w-full`} disabled={pendente}>
        {pendente && <Loader2 className="size-4 animate-spin" />} {vincular ? "Entrar e ligar o acesso" : "Criar acesso e entrar"}
      </button>
    </form>
  );
}
