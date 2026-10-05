"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { entrar } from "@/lib/server/acoes-conta";
import { Aviso, Campo, btnPrim, inputCls } from "@/components/area/ui";

export function FormEntrar() {
  const [estado, acao, pendente] = useActionState(entrar, undefined);
  return (
    <form action={acao}>
      <h2 className="text-xl font-semibold">Entrar</h2>
      <p className="mt-1.5 font-light text-fundo/70">Use o e-mail cadastrado e a sua senha.</p>
      <div className="mt-7 space-y-4">
        <Campo label="E-mail">
          <input name="email" type="email" autoComplete="email" required className={inputCls} />
        </Campo>
        <Campo label="Senha">
          <input name="senha" type="password" autoComplete="current-password" required className={inputCls} />
        </Campo>
      </div>
      {estado?.erro && (
        <Aviso tom="erro" className="mt-4">
          {estado.erro}
        </Aviso>
      )}
      <button className={`${btnPrim} mt-6 w-full`} disabled={pendente}>
        {pendente && <Loader2 className="size-4 animate-spin" />} Entrar
      </button>
      <p className="mt-4 text-center text-[13px] text-fundo/70">
        Esqueceu a senha? Fale com a Secretaria do Prêmio, que gera uma nova senha provisória.
      </p>
      <div className="mt-8 border-t border-fundo/10 pt-6">
        <p className="text-sm font-medium">Sua instituição ainda não tem cadastro?</p>
        <Link href="/cadastro" className="mt-2 inline-block text-sm font-semibold text-verde underline underline-offset-4">
          Pedir cadastro para indicar →
        </Link>
      </div>
    </form>
  );
}
