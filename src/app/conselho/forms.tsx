"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { aceitarConvite, entrarConselho, pedirLinkPorEmail } from "@/lib/server/acoes-convite";
import { Aviso, Campo, btnPrim, btnSec, inputCls } from "@/components/area/ui";
import { DECLARACAO_ANEXO_III } from "@/lib/avaliacao";

const ROMANOS = ["I", "II", "III", "IV", "V", "VI"];

// Link do grupo: entrar (nome ou e-mail + senha), primeiro acesso e esqueci a senha.
// Nos dois últimos, o link para criar a senha vai para o e-mail do cadastro (mostrado parcialmente).
export function FormEntrarConselho({ aviso }: { aviso?: string }) {
  const [modo, setModo] = useState<"entrar" | "primeiro" | "esqueci">("entrar");
  // Controlado: o formulário é limpo depois de cada envio, e o nome não deve sumir se der erro.
  const [nome, setNome] = useState("");
  const [estado, acao, pendente] = useActionState(entrarConselho, undefined);
  const [estadoL, acaoL, pendenteL] = useActionState(pedirLinkPorEmail, undefined);

  if (modo !== "entrar") {
    const primeiro = modo === "primeiro";
    return (
      <form action={acaoL} key={modo}>
        <input type="hidden" name="tipo" value={modo} />
        <h2 className="text-xl font-semibold">{primeiro ? "Primeiro acesso" : "Esqueci a senha"}</h2>
        <p className="mt-1.5 font-light text-fundo/70">
          {primeiro
            ? "Digite o seu nome completo. Enviamos para o e-mail do seu cadastro um link para você criar a senha."
            : "Digite o seu nome completo. Enviamos para o e-mail do seu cadastro um link para criar uma senha nova."}
        </p>
        <div className="mt-7 space-y-4">
          <Campo label="Nome completo" dica="Acentos e maiúsculas não importam.">
            <input name="nome" autoComplete="name" required value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
          </Campo>
        </div>
        {estadoL?.erro && (
          <Aviso tom="erro" className="mt-4">
            {estadoL.erro}
          </Aviso>
        )}
        {estadoL?.msg && (
          <Aviso tom="ok" className="mt-4">
            {estadoL.msg}
          </Aviso>
        )}
        <button className={`${btnPrim} mt-6 w-full`} disabled={pendenteL}>
          {pendenteL && <Loader2 className="size-4 animate-spin" />} Enviar link para o meu e-mail
        </button>
        <button type="button" onClick={() => setModo("entrar")} className="mt-4 w-full text-center text-sm font-semibold text-verde underline underline-offset-4">
          Voltar para entrar
        </button>
      </form>
    );
  }

  return (
    <form action={acao}>
      <h2 className="text-xl font-semibold">Entrar</h2>
      <p className="mt-1.5 font-light text-fundo/70">Use o seu nome completo (ou e-mail) e a senha que você criou.</p>
      {aviso && (
        <Aviso tom="info" className="mt-4">
          {aviso}
        </Aviso>
      )}
      <div className="mt-7 space-y-4">
        <Campo label="Nome completo ou e-mail" dica="Acentos e maiúsculas não importam.">
          <input name="nome" autoComplete="username" required value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
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
      <button type="button" onClick={() => setModo("esqueci")} className="mt-4 w-full text-center text-sm font-semibold text-verde underline underline-offset-4">
        Esqueci a senha
      </button>
      <div className="mt-8 border-t border-fundo/10 pt-6">
        <p className="text-sm font-medium">É a sua primeira vez aqui?</p>
        <button type="button" onClick={() => setModo("primeiro")} className={`${btnSec} mt-3 w-full`}>
          Primeiro acesso: criar minha senha
        </button>
        <Link href="/conselho/ajuda" className="mt-4 block text-center text-sm font-semibold text-verde underline underline-offset-4">
          Passo a passo com imagens
        </Link>
      </div>
    </form>
  );
}

// Primeira senha (com Anexo III e privacidade) ou senha nova, a partir do link pessoal.
export function FormSenhaConselho({ token, nome, modo }: { token: string; nome: string; modo: "primeiro" | "redefinir" }) {
  const [estado, acao, pendente] = useActionState(aceitarConvite.bind(null, token), undefined);
  // Controlados: o formulário volta ao estado inicial depois de cada envio, e as caixas não devem desmarcar.
  const [anexo, setAnexo] = useState(false);
  const [priv, setPriv] = useState(false);
  const primeiro = modo === "primeiro";

  return (
    <form action={acao}>
      <h2 className="text-xl font-semibold">{primeiro ? "Crie a sua senha" : "Crie uma senha nova"}</h2>
      <p className="mt-1.5 font-light text-fundo/70">
        {primeiro ? "Depois, para entrar, use o seu nome completo (ou e-mail) e esta senha, em premio.lvrs.com.br/conselho." : "A senha anterior deixa de valer."}
      </p>
      <div className="mt-6 space-y-4">
        <Campo label="Nome completo">
          <input value={nome} disabled className={inputCls} />
        </Campo>
        <Campo label="Senha" dica="Mínimo de 8 caracteres. Ninguém da organização terá acesso a ela.">
          <input name="senha" type="password" autoComplete="new-password" required minLength={8} className={inputCls} />
        </Campo>
        <Campo label="Repita a senha">
          <input name="confirmar" type="password" autoComplete="new-password" required minLength={8} className={inputCls} />
        </Campo>
      </div>

      {primeiro && (
        <>
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
        </>
      )}

      {estado?.erro && (
        <Aviso tom="erro" className="mt-4">
          {estado.erro}
        </Aviso>
      )}
      <button className={`${btnPrim} mt-6 w-full`} disabled={pendente}>
        {pendente && <Loader2 className="size-4 animate-spin" />} {primeiro ? "Criar senha e entrar" : "Salvar senha e entrar"}
      </button>
    </form>
  );
}
