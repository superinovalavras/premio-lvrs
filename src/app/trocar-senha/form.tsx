"use client";

import { useActionState, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { trocarSenha } from "@/lib/server/acoes-conta";
import { Aviso, Campo, btnPrim, inputCls } from "@/components/area/ui";
import { cn } from "@/lib/utils";

export function FormTrocarSenha() {
  const [estado, acao, pendente] = useActionState(trocarSenha, undefined);
  const [senha, setSenha] = useState("");
  const regras = [
    { ok: senha.length >= 8, texto: "Pelo menos 8 caracteres" },
    { ok: senha.length > 0 && senha !== "123456", texto: "Diferente da senha provisória" },
  ];
  return (
    <form action={acao}>
      <h2 className="text-xl font-semibold">Crie sua senha</h2>
      <p className="mt-1.5 font-light text-fundo/70">A senha provisória deixa de valer assim que você salvar.</p>
      <div className="mt-7 space-y-4">
        <Campo label="Nova senha">
          <input
            name="senha"
            type="password"
            autoComplete="new-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={inputCls}
          />
        </Campo>
        <ul className="grid gap-1 text-[12.5px]">
          {regras.map((r) => (
            <li key={r.texto} className={cn("flex items-center gap-1.5", r.ok ? "text-verde" : "text-fundo/55")}>
              <Check className="size-3.5" /> {r.texto}
            </li>
          ))}
        </ul>
        <Campo label="Repita a nova senha">
          <input name="confirmar" type="password" autoComplete="new-password" required className={inputCls} />
        </Campo>
      </div>
      {estado?.erro && (
        <Aviso tom="erro" className="mt-4">
          {estado.erro}
        </Aviso>
      )}
      <button className={`${btnPrim} mt-6 w-full`} disabled={pendente}>
        {pendente && <Loader2 className="size-4 animate-spin" />} Salvar e continuar
      </button>
    </form>
  );
}
