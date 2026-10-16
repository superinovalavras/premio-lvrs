"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { salvarPerfilConselho } from "@/lib/server/acoes-perfil-conselho";
import { Aviso, Campo, btnPrim, inputCls } from "@/components/area/ui";

export function FormPerfil({ nome, email }: { nome: string; email: string }) {
  const [estado, acao, pendente] = useActionState(salvarPerfilConselho, undefined);
  // Controlados: o formulário é limpo depois de cada envio, e os dados não devem sumir.
  const [n, setN] = useState(nome);
  const [e, setE] = useState(email);
  return (
    <form action={acao}>
      <h2 className="text-xl font-semibold">Meu perfil</h2>
      <div className="mt-6 space-y-4">
        <Campo label="Nome completo" dica="É como você entra no site. Escreva como prefere digitar.">
          <input name="nome" required value={n} onChange={(x) => setN(x.target.value)} autoComplete="name" className={inputCls} />
        </Campo>
        <Campo label="E-mail" opcional dica="Recebe o link quando você esquece a senha. Também serve para entrar.">
          <input name="email" type="email" value={e} onChange={(x) => setE(x.target.value)} autoComplete="email" className={inputCls} />
        </Campo>
      </div>
      <p className="mt-7 text-[13px] font-semibold">Trocar a senha (opcional)</p>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <Campo label="Senha nova">
          <input name="nova_senha" type="password" minLength={8} autoComplete="new-password" className={inputCls} />
        </Campo>
        <Campo label="Repita a senha nova">
          <input name="confirmar" type="password" minLength={8} autoComplete="new-password" className={inputCls} />
        </Campo>
      </div>
      <div className="mt-7 border-t border-fundo/10 pt-5">
        <Campo label="Sua senha atual" dica="Para salvar qualquer mudança.">
          <input name="senha_atual" type="password" required autoComplete="current-password" className={inputCls} />
        </Campo>
      </div>
      {estado?.erro && (
        <Aviso tom="erro" className="mt-4">
          {estado.erro}
        </Aviso>
      )}
      {estado?.msg && (
        <Aviso tom="ok" className="mt-4">
          {estado.msg}
        </Aviso>
      )}
      <button className={`${btnPrim} mt-6`} disabled={pendente}>
        {pendente && <Loader2 className="size-4 animate-spin" />} Salvar
      </button>
    </form>
  );
}
