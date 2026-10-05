"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { criarConta } from "@/lib/server/acoes-conta";
import { Aviso, Campo, btnPrim, inputCls } from "@/components/area/ui";

const PASSOS = ["Crie o acesso do representante", "Preencha o cadastro e anexe os documentos", "A Secretaria analisa em até 1 dia útil", "Deferido, você indica no período de indicações"];

export function FormCadastro() {
  const [estado, acao, pendente] = useActionState(criarConta, undefined);
  return (
    <form action={acao}>
      <ol className="mb-7 grid gap-2">
        {PASSOS.map((p, i) => (
          <li key={p} className="flex items-center gap-3 text-[13px] text-fundo/75">
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${i === 0 ? "bg-amarelo text-fundo" : "bg-nevoa text-fundo/60"}`}
            >
              {i + 1}
            </span>
            {p}
          </li>
        ))}
      </ol>

      <h2 className="text-xl font-semibold">Acesso do representante</h2>
      <p className="mt-1.5 font-light text-fundo/70">
        A pessoa designada pela instituição para fazer as indicações. Prefira um e-mail institucional.
      </p>
      <div className="mt-6 space-y-4">
        <Campo label="Nome completo">
          <input name="nome" autoComplete="name" defaultValue={estado?.campos?.nome} required className={inputCls} />
        </Campo>
        <Campo label="E-mail" dica="Será o seu login.">
          <input name="email" type="email" autoComplete="email" defaultValue={estado?.campos?.email} required className={inputCls} />
        </Campo>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Senha" dica="Mínimo de 8 caracteres.">
            <input name="senha" type="password" autoComplete="new-password" minLength={8} required className={inputCls} />
          </Campo>
          <Campo label="Repita a senha">
            <input name="confirmar" type="password" autoComplete="new-password" minLength={8} required className={inputCls} />
          </Campo>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-nevoa p-4 text-[13px] text-fundo/85">
          <input name="privacidade" type="checkbox" required className="mt-0.5 size-4 accent-[#0d8049]" />
          <span>
            Li e aceito o{" "}
            <Link href="/privacidade" target="_blank" className="font-semibold text-verde underline underline-offset-2">
              Aviso de Privacidade
            </Link>
            . Os dados informados servem para analisar o cadastro e processar as indicações.
          </span>
        </label>
      </div>
      {estado?.erro && (
        <Aviso tom="erro" className="mt-4">
          {estado.erro}
        </Aviso>
      )}
      <button className={`${btnPrim} mt-6 w-full`} disabled={pendente}>
        {pendente && <Loader2 className="size-4 animate-spin" />} Criar acesso e começar
      </button>
      <p className="mt-5 text-center text-[13px] text-fundo/70">
        Já tem acesso?{" "}
        <Link href="/entrar" className="font-semibold text-verde underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </form>
  );
}
