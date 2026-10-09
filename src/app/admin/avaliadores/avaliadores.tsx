"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Link2, Loader2, Mail, Plus, Power, Trash2, X } from "lucide-react";
import {
  alternarAvaliador,
  convidarAvaliador,
  excluirAvaliador,
  gerarNovoLink,
  senhaProvisoriaAvaliador,
  type ResultadoConvite,
} from "@/lib/server/acoes-avaliadores";
import { CartaoAdmin, btnAmarelo, btnContorno, btnPerigo, inputEscuro } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export type LinhaAvaliador = {
  id: string;
  nome: string;
  email: string;
  papel: string;
  instituicao: string | null;
  ativo: boolean;
  teste: boolean;
  acesso: "ativo" | "pendente" | "expirado" | "sem_convite";
  expira: string | null;
  fichas: number;
};

const ACESSO = {
  ativo: { rotulo: "Acesso criado", tom: "bg-verde/35 text-[#8ff0bd]" },
  pendente: { rotulo: "Convite enviado", tom: "bg-amarelo/15 text-amarelo" },
  expirado: { rotulo: "Convite vencido", tom: "bg-vermelho/25 text-[#ff8a8f]" },
  sem_convite: { rotulo: "Sem link válido", tom: "bg-white/10 text-white/75" },
};

const ate = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(iso));

export function Avaliadores({ lista }: { lista: LinhaAvaliador[] }) {
  const [novo, setNovo] = useState(false);
  const [link, setLink] = useState<{ nome: string; email: string; url: string } | null>(null);
  const oficiais = lista.filter((a) => !a.teste);
  const testes = lista.filter((a) => a.teste);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/70">
          {oficiais.filter((a) => a.ativo).length} avaliadores · {oficiais.filter((a) => a.acesso === "ativo").length} com acesso criado
          {testes.length ? ` · ${testes.length} de teste` : ""}
        </p>
        <button type="button" className={btnAmarelo} onClick={() => setNovo(true)}>
          <Plus className="size-4" /> Convidar avaliador
        </button>
      </div>

      {!lista.length && (
        <CartaoAdmin>
          <p className="text-white/70">
            Nenhum avaliador ainda. Convide cada membro do COCITIEIS (e os suplentes): o sistema gera um link pessoal para a
            pessoa criar a senha.
          </p>
        </CartaoAdmin>
      )}

      <div className="grid gap-3">
        {lista.map((a) => (
          <Linha key={a.id} a={a} mostrarLink={(url) => setLink({ nome: a.nome, email: a.email, url })} />
        ))}
      </div>

      {novo && (
        <NovoAvaliador
          fechar={() => setNovo(false)}
          criado={(nome, email, url) => {
            setNovo(false);
            setLink({ nome, email, url });
          }}
        />
      )}
      {link && <JanelaLink {...link} fechar={() => setLink(null)} />}
    </>
  );
}

function Linha({ a, mostrarLink }: { a: LinhaAvaliador; mostrarLink: (url: string) => void }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const ac = ACESSO[a.acesso];

  const rodar = (f: () => Promise<ResultadoConvite>, confirmar?: string) => {
    if (confirmar && !confirm(confirmar)) return;
    iniciar(async () => {
      const r = await f();
      if (!r.ok) return setMsg(r.erro);
      if (r.link) mostrarLink(r.link);
      else setMsg(r.msg);
      router.refresh();
    });
  };

  return (
    <CartaoAdmin className={cn("flex flex-wrap items-center gap-4", a.teste && "border-dashed", !a.ativo && "opacity-60")}>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">
          {a.nome} <span className="text-sm font-normal text-white/55">· {a.papel === "suplente" ? "Suplente" : "Titular"}</span>
        </h3>
        <p className="mt-0.5 truncate text-sm text-white/70">
          {a.email}
          {a.instituicao ? ` · ${a.instituicao}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]">
          {a.teste && <span className="rounded-lg bg-amarelo px-2.5 py-0.5 text-fundo">Teste</span>}
          {!a.ativo && <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-white/75">Desativado</span>}
          <span className={cn("rounded-lg px-2.5 py-0.5", ac.tom)}>
            {ac.rotulo}
            {a.acesso === "pendente" && a.expira ? ` · vale até ${ate(a.expira)}` : ""}
          </span>
          {a.fichas > 0 && <span className="rounded-lg bg-white/10 px-2.5 py-0.5 text-white/75">{a.fichas} ficha(s) enviada(s)</span>}
        </div>
        {msg && <p className="mt-2 text-sm text-white/80">{msg}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {pendente && <Loader2 className="size-5 animate-spin self-center text-white/60" />}
        {a.acesso !== "ativo" && a.ativo && (
          <button type="button" className={btnContorno} disabled={pendente} onClick={() => rodar(() => gerarNovoLink(a.id))}>
            <Link2 className="size-4" /> {a.acesso === "pendente" ? "Gerar novo link" : "Gerar link"}
          </button>
        )}
        {a.acesso === "ativo" && a.ativo && (
          <button
            type="button"
            className={btnContorno}
            disabled={pendente}
            onClick={() => rodar(() => senhaProvisoriaAvaliador(a.id), `Gerar senha provisória para ${a.nome}?`)}
          >
            <KeyRound className="size-4" /> Senha provisória
          </button>
        )}
        <button
          type="button"
          className={btnContorno}
          disabled={pendente}
          title={a.ativo ? "Desativar acesso" : "Reativar acesso"}
          onClick={() => rodar(() => alternarAvaliador(a.id, !a.ativo), a.ativo ? `Desativar o acesso de ${a.nome}?` : undefined)}
        >
          <Power className="size-4" /> {a.ativo ? "Desativar" : "Reativar"}
        </button>
        {a.fichas === 0 && (
          <button
            type="button"
            className={btnPerigo}
            disabled={pendente}
            aria-label={`Excluir ${a.nome}`}
            onClick={() => rodar(() => excluirAvaliador(a.id), `Excluir ${a.nome} da lista de avaliadores?`)}
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </CartaoAdmin>
  );
}

function NovoAvaliador({ fechar, criado }: { fechar: () => void; criado: (nome: string, email: string, url: string) => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const router = useRouter();

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    iniciar(async () => {
      const r = await convidarAvaliador(fd);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
      criado(String(fd.get("nome")), String(fd.get("email")), r.link!);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <form onSubmit={enviar} className="h-full w-full max-w-[460px] overflow-y-auto border-l border-white/10 bg-fundo p-6" data-lenis-prevent>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Convidar avaliador</h2>
          <button type="button" onClick={fechar} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid gap-4">
          <label>
            <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Nome completo</span>
            <input name="nome" required minLength={5} className={inputEscuro} />
          </label>
          <label>
            <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">E-mail</span>
            <input name="email" type="email" required className={inputEscuro} />
            <span className="mt-1 block text-[11.5px] text-white/50">Vira o login. Não dá para trocar depois.</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Assento</span>
              <select name="papel" defaultValue="titular" className={inputEscuro}>
                <option value="titular">Titular</option>
                <option value="suplente">Suplente</option>
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-[12.5px] font-medium text-white/85">Instituição</span>
              <input name="instituicao" placeholder="Opcional" className={inputEscuro} />
            </label>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/15 p-3 text-sm">
            <input type="checkbox" name="teste" className="mt-0.5 accent-[#ffcd00]" />
            <span>
              Avaliador de teste
              <span className="block text-[12px] text-white/55">Só vê rodadas de teste e não conta nas oficiais. Para ensaiar o fluxo.</span>
            </span>
          </label>
        </div>
        {erro && <p className="mt-4 rounded-xl border border-vermelho bg-vermelho/15 p-3 text-sm">{erro}</p>}
        <button className={`${btnAmarelo} mt-6`} disabled={pendente}>
          {pendente && <Loader2 className="size-4 animate-spin" />} Criar convite
        </button>
      </form>
    </div>
  );
}

// O link só aparece aqui: o banco guarda apenas o hash. Perdeu? "Gerar novo link".
function JanelaLink({ nome, email, url, fechar }: { nome: string; email: string; url: string; fechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const primeiro = nome.split(" ")[0];
  const texto = `Olá, ${primeiro}! Você foi convidado(a) para avaliar os concorrentes do Prêmio Lavras de Inovação 2026 como membro do COCITIEIS. Crie a sua senha por este link pessoal (vale 7 dias e só pode ser usado uma vez): ${url}`;
  const mailto = `mailto:${email}?subject=${encodeURIComponent("Prêmio Lavras de Inovação 2026 · Seu acesso de avaliador")}&body=${encodeURIComponent(texto)}`;

  const copiar = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      campo.current?.select();
      document.execCommand("copy");
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="w-full max-w-[560px] rounded-[20px] border border-white/10 bg-fundo p-6" role="dialog" aria-modal="true" aria-label={`Link de ${nome}`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Link de {primeiro}</h2>
          <button type="button" onClick={fechar} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        <p className="text-sm text-white/75">
          Mande este link só para {nome}. Ele vale 7 dias e funciona uma vez. <b className="text-amarelo">Copie agora:</b> por segurança,
          ele não aparece de novo (se perder, gere outro).
        </p>
        <input ref={campo} readOnly value={url} onFocus={(e) => e.target.select()} className={`${inputEscuro} mt-4 font-mono text-[12.5px]`} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={btnAmarelo} onClick={() => copiar(url)}>
            {copiado ? <Check className="size-4" /> : <Copy className="size-4" />} {copiado ? "Copiado" : "Copiar link"}
          </button>
          <button type="button" className={btnContorno} onClick={() => copiar(texto)}>
            <Copy className="size-4" /> Copiar mensagem pronta
          </button>
          <a href={mailto} className={btnContorno}>
            <Mail className="size-4" /> Abrir no e-mail
          </a>
        </div>
      </div>
    </div>
  );
}
