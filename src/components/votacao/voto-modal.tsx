"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, Check, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mais } from "@/components/marca";
import { estadoVotacao } from "@/lib/janela";
import { useParametros } from "@/components/parametros-context";
import { dia, diaCurto, hora } from "@/lib/datas";
import type { Finalista } from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  IDADE_MINIMA,
  VINCULOS,
  VINCULO_LABEL,
  mascaraCelular,
  mascaraCpf,
  votoSchema,
  type Vinculo,
} from "@/lib/voto";
import { Turnstile, TURNSTILE_SITE_KEY } from "./turnstile";

const PASSOS = ["Finalistas", "Escolha", "Seus dados", "Vínculo", "Confirmação"];

type Form = {
  finalistaId: string;
  nome: string;
  email: string;
  celular: string;
  nascimento: string;
  cpf: string;
  vinculos: Vinculo[];
  declaracao: boolean;
  privacidade: boolean;
};

const VAZIO: Form = {
  finalistaId: "",
  nome: "",
  email: "",
  celular: "",
  nascimento: "",
  cpf: "",
  vinculos: [],
  declaracao: false,
  privacidade: false,
};

// Campos validados ao sair de cada passo.
const CAMPOS_DO_PASSO: Record<number, (keyof Form)[]> = {
  1: ["finalistaId"],
  2: ["nome", "email", "celular", "nascimento", "cpf"],
  3: ["vinculos", "declaracao", "privacidade"],
};

function validar(form: Form, passo: number) {
  const campos = CAMPOS_DO_PASSO[passo];
  if (!campos) return {};
  const mascara = Object.fromEntries(campos.map((c) => [c, true])) as Partial<Record<keyof Form, true>>;
  const r = votoSchema.pick(mascara as never).safeParse(form);
  if (r.success) return {};
  const erros: Partial<Record<keyof Form, string>> = {};
  for (const issue of r.error.issues) {
    const k = issue.path[0] as keyof Form;
    erros[k] ??= issue.message;
  }
  return erros;
}

function Iniciais({ nome }: { nome: string }) {
  const ini = nome
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  return (
    <div className="grid size-full place-items-center bg-verde text-2xl text-amarelo">
      {ini}
    </div>
  );
}

function Foto({ f, className }: { f: Finalista; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl bg-verde", className)}>
      {f.imagem ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.imagem} alt={`Logo de ${f.nome}`} className="size-full object-cover" />
      ) : (
        <Iniciais nome={f.nome} />
      )}
    </div>
  );
}

function Campo({
  label,
  erro,
  dica,
  children,
}: {
  label: string;
  erro?: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/85">{label}</span>
      {children}
      {erro ? (
        <span className="mt-1 block text-xs text-[#ff8a8f]" role="alert">
          {erro}
        </span>
      ) : dica ? (
        <span className="mt-1 block text-xs text-white/60">{dica}</span>
      ) : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/15 bg-fundo/60 px-4 py-3 text-white placeholder:text-white/70 outline-none transition focus:border-amarelo focus:ring-2 focus:ring-amarelo/30";

function Check2({
  marcado,
  onChange,
  children,
  erro,
}: {
  marcado: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  erro?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
        marcado ? "border-amarelo/60 bg-amarelo/10" : erro ? "border-vermelho/70" : "border-white/12 hover:border-white/30",
      )}
    >
      <input type="checkbox" className="peer sr-only" checked={marcado} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-amarelo",
          marcado ? "border-amarelo bg-amarelo text-fundo" : "border-white/40",
        )}
      >
        {marcado && <Check className="size-3.5" strokeWidth={3} />}
      </span>
      <span className="text-sm text-white/85">{children}</span>
    </label>
  );
}

function soltarConfete() {
  // paleta LVRS+: amarelo, verde, vermelho, azul, branco
  const cores = ["#FFCD00", "#0D8049", "#D34046", "#5282FF", "#FFFFFF"];
  const base = { spread: 70, ticks: 220, gravity: 0.9, colors: cores, zIndex: 100 };
  confetti({ ...base, particleCount: 90, origin: { x: 0.5, y: 0.6 } });
  setTimeout(() => confetti({ ...base, particleCount: 60, angle: 60, origin: { x: 0, y: 0.7 } }), 180);
  setTimeout(() => confetti({ ...base, particleCount: 60, angle: 120, origin: { x: 1, y: 0.7 } }), 320);
}

export function VotoModal({
  aberto,
  onFechar,
  finalistas,
  exemplo,
}: {
  aberto: boolean;
  onFechar: () => void;
  finalistas: Finalista[];
  exemplo: boolean;
}) {
  const [passo, setPasso] = useState(0);
  const [dir, setDir] = useState(1);
  const [form, setForm] = useState<Form>(VAZIO);
  const [erros, setErros] = useState<Partial<Record<keyof Form, string>>>({});
  const [token, setToken] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);
  const painel = useRef<HTMLDivElement>(null);

  const { votacaoAbre, votacaoFecha, galaEm } = useParametros();
  const estado = estadoVotacao(votacaoAbre, votacaoFecha);
  // Em preview local os finalistas de exemplo destravam o fluxo (a API recusa sem Supabase).
  const bloqueado = estado !== "aberta" || (exemplo && process.env.NEXT_PUBLIC_VOTACAO_PREVIEW !== "1");

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErros((e) => ({ ...e, [k]: undefined }));
  };

  // Esc fecha, trava o scroll da página e leva o foco para o diálogo.
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    document.addEventListener("keydown", onKey);
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    painel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = overflow;
    };
  }, [aberto, onFechar]);

  // Ao fechar depois de votar, zera tudo — nenhum dado pessoal fica em memória.
  useEffect(() => {
    if (aberto) return;
    const t = setTimeout(() => {
      if (concluido) {
        setForm(VAZIO);
        setConcluido(false);
        setPasso(0);
      }
      setFalha(null);
    }, 400);
    return () => clearTimeout(t);
  }, [aberto, concluido]);

  const onToken = useCallback((t: string | null) => setToken(t), []);

  const ir = (novo: number) => {
    if (novo > passo) {
      const e = validar(form, passo);
      if (Object.keys(e).length) {
        setErros(e);
        return;
      }
    }
    setDir(novo > passo ? 1 : -1);
    setPasso(novo);
    painel.current?.scrollTo({ top: 0 });
  };

  const enviar = async () => {
    setEnviando(true);
    setFalha(null);
    try {
      const res = await fetch("/api/votar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken: token ?? undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; mensagem?: string };
      if (!res.ok || !data.ok) {
        setFalha(data.mensagem ?? "Não foi possível registrar o voto.");
        return;
      }
      setConcluido(true);
      soltarConfete();
    } catch {
      setFalha("Sem conexão. Verifique sua internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  };

  const escolhido = finalistas.find((f) => f.id === form.finalistaId);
  const podeConfirmar = !enviando && (!!token || !TURNSTILE_SITE_KEY);

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-fundo/80 backdrop-blur-md" onClick={onFechar} aria-hidden />

          <motion.div
            ref={painel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="voto-titulo"
            tabIndex={-1}
            data-lenis-prevent
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-fundo shadow-2xl outline-none sm:rounded-3xl"
          >
            {/* Cabeçalho */}
            <div className="sticky top-0 z-10 border-b border-white/10 bg-fundo/95 px-5 pb-4 pt-5 backdrop-blur sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.22em] text-amarelo">Votação Popular</p>
                  <h2 id="voto-titulo" className="mt-1 text-xl font-medium sm:text-2xl">
                    Agro e/ou Food e/ou Tech do Ano
                  </h2>
                </div>
                <button
                  onClick={onFechar}
                  className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </button>
              </div>

              {!concluido && (
                <ol className="mt-4 flex gap-1.5" aria-label="Etapas">
                  {PASSOS.map((p, i) => (
                    <li key={p} className="flex-1" aria-current={i === passo ? "step" : undefined}>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full bg-amarelo"
                          initial={false}
                          animate={{ width: i <= passo ? "100%" : "0%" }}
                          transition={{ duration: 0.4 }}
                        />
                      </div>
                      <span
                        className={cn(
                          "mt-1.5 hidden text-[0.65rem] uppercase tracking-wider sm:block",
                          i === passo ? "text-amarelo" : "text-white/70",
                        )}
                      >
                        {p}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="px-5 py-6 sm:px-7">
              {concluido ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center"
                >
                  <div className="mx-auto grid size-20 place-items-center rounded-full bg-amarelo text-fundo ">
                    <Mais className="size-10" />
                  </div>
                  <h3 className="mt-6 text-3xl font-medium">Voto <span className="enfase">registrado</span>!</h3>
                  <p className="mx-auto mt-3 max-w-md text-white/70">
                    Obrigado por participar. O resultado é sigiloso e só será revelado na Cerimônia de Gala, em 17 de
                    novembro de 2026.
                  </p>
                  <Button className="mt-8" onClick={onFechar}>
                    Fechar
                  </Button>
                </motion.div>
              ) : (
                <AnimatePresence mode="wait" custom={dir} initial={false}>
                  <motion.div
                    key={passo}
                    custom={dir}
                    initial={{ opacity: 0, x: dir * 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: dir * -40 }}
                    transition={{ duration: 0.28, ease: "easeOut" }}
                  >
                    {passo === 0 && (
                      <div>
                        <p className="text-white/70">
                          Conheça os três finalistas escolhidos pela avaliação técnica. Você poderá votar em um deles.
                        </p>
                        <ul className="mt-5 space-y-3">
                          {finalistas.map((f) => (
                            <li key={f.id} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                              <Foto f={f} className="size-16 shrink-0 sm:size-20" />
                              <div>
                                <h3 className="text-lg font-medium">{f.nome}</h3>
                                <p className="mt-1 text-sm text-white/65">{f.resumo}</p>
                              </div>
                            </li>
                          ))}
                        </ul>

                        {bloqueado && (
                          <div className="mt-6 flex gap-3 rounded-2xl border border-amarelo/30 bg-amarelo/10 p-4 text-sm">
                            <Lock className="mt-0.5 size-4 shrink-0 text-amarelo" />
                            <p className="text-white/85">
                              {estado === "encerrada"
                                ? `A votação popular foi encerrada em ${dia(votacaoFecha)}. O resultado será revelado na cerimônia de ${diaCurto(galaEm)}.`
                                : exemplo
                                  ? `Os finalistas ainda não foram divulgados. A votação abre em ${dia(votacaoAbre)} e vai até ${dia(votacaoFecha)}.`
                                  : `A votação abre em ${dia(votacaoAbre)}, à ${hora(votacaoAbre)}, e vai até ${dia(votacaoFecha)}, às ${hora(votacaoFecha)} (horário de Brasília).`}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {passo === 1 && (
                      <fieldset>
                        <legend className="text-white/70">Selecione o finalista que recebe o seu voto.</legend>
                        <div className="mt-5 grid gap-3">
                          {finalistas.map((f) => {
                            const sel = form.finalistaId === f.id;
                            return (
                              <label
                                key={f.id}
                                className={cn(
                                  "flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all",
                                  sel
                                    ? "border-amarelo bg-amarelo/10"
                                    : "border-white/12 hover:border-white/30",
                                )}
                              >
                                <input
                                  type="radio"
                                  name="finalista"
                                  value={f.id}
                                  checked={sel}
                                  onChange={() => set("finalistaId", f.id)}
                                  className="peer sr-only"
                                />
                                <Foto f={f} className="size-12 shrink-0" />
                                <span className="flex-1 text-lg font-medium">{f.nome}</span>
                                <span
                                  aria-hidden
                                  className={cn(
                                    "grid size-6 place-items-center rounded-full border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-amarelo",
                                    sel ? "border-amarelo bg-amarelo text-fundo" : "border-white/30",
                                  )}
                                >
                                  {sel && <Check className="size-3.5" strokeWidth={3} />}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {erros.finalistaId && (
                          <p className="mt-3 text-sm text-[#ff8a8f]" role="alert">
                            Escolha um finalista para continuar.
                          </p>
                        )}
                      </fieldset>
                    )}

                    {passo === 2 && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <Campo label="Nome completo" erro={erros.nome}>
                            <input
                              className={inputCls}
                              autoComplete="name"
                              value={form.nome}
                              onChange={(e) => set("nome", e.target.value)}
                            />
                          </Campo>
                        </div>
                        <Campo label="E-mail" erro={erros.email}>
                          <input
                            className={inputCls}
                            type="email"
                            autoComplete="email"
                            inputMode="email"
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                          />
                        </Campo>
                        <Campo label="Celular" erro={erros.celular}>
                          <input
                            className={inputCls}
                            type="tel"
                            autoComplete="tel-national"
                            inputMode="numeric"
                            placeholder="(35) 99999-9999"
                            value={form.celular}
                            onChange={(e) => set("celular", mascaraCelular(e.target.value))}
                          />
                        </Campo>
                        <Campo
                          label="Data de nascimento"
                          erro={erros.nascimento}
                          dica={`Idade mínima para votar: ${IDADE_MINIMA} anos.`}
                        >
                          <input
                            className={cn(inputCls, "[color-scheme:dark]")}
                            type="date"
                            autoComplete="bday"
                            max={new Date().toISOString().slice(0, 10)}
                            value={form.nascimento}
                            onChange={(e) => set("nascimento", e.target.value)}
                          />
                        </Campo>
                        <Campo label="CPF" erro={erros.cpf} dica="Usado só para garantir um voto por pessoa.">
                          <input
                            className={inputCls}
                            inputMode="numeric"
                            placeholder="000.000.000-00"
                            value={form.cpf}
                            onChange={(e) => set("cpf", mascaraCpf(e.target.value))}
                          />
                        </Campo>
                      </div>
                    )}

                    {passo === 3 && (
                      <div className="space-y-5">
                        <fieldset>
                          <legend className="text-white/70">
                            Qual é o seu vínculo com Lavras? Marque todos que se aplicam.
                          </legend>
                          <div className="mt-4 grid gap-2 sm:grid-cols-3">
                            {VINCULOS.map((v) => (
                              <Check2
                                key={v}
                                erro={!!erros.vinculos}
                                marcado={form.vinculos.includes(v)}
                                onChange={(m) =>
                                  set("vinculos", m ? [...form.vinculos, v] : form.vinculos.filter((x) => x !== v))
                                }
                              >
                                {VINCULO_LABEL[v]}
                              </Check2>
                            ))}
                          </div>
                          {erros.vinculos && (
                            <p className="mt-2 text-xs text-[#ff8a8f]" role="alert">
                              {erros.vinculos}
                            </p>
                          )}
                        </fieldset>

                        <Check2
                          marcado={form.declaracao}
                          erro={!!erros.declaracao}
                          onChange={(m) => set("declaracao", m)}
                        >
                          Declaro, sob as penas da lei, que resido, estudo ou trabalho em Lavras (MG) e que as
                          informações prestadas são verdadeiras.
                        </Check2>

                        <Check2
                          marcado={form.privacidade}
                          erro={!!erros.privacidade}
                          onChange={(m) => set("privacidade", m)}
                        >
                          Li o{" "}
                          <a href="#privacidade" onClick={onFechar} className="text-amarelo underline underline-offset-2">
                            Aviso de Privacidade
                          </a>{" "}
                          e entendo que meu CPF será guardado apenas como código criptográfico irreversível, para
                          auditoria e garantia de voto único.
                        </Check2>
                      </div>
                    )}

                    {passo === 4 && escolhido && (
                      <div className="space-y-5">
                        <div className="flex items-center gap-4 rounded-2xl border border-amarelo/50 bg-amarelo/10 p-4">
                          <Foto f={escolhido} className="size-14 shrink-0" />
                          <div>
                            <p className="text-xs uppercase tracking-wider text-amarelo">Seu voto</p>
                            <p className="text-xl font-medium">{escolhido.nome}</p>
                          </div>
                        </div>
                        <dl className="grid gap-x-6 gap-y-2 rounded-2xl border border-white/10 p-4 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-white/60">Eleitor</dt>
                            <dd>{form.nome}</dd>
                          </div>
                          <div>
                            <dt className="text-white/60">CPF</dt>
                            <dd>***.***.***-{form.cpf.slice(-2)}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-white/60">Vínculo</dt>
                            <dd>{form.vinculos.map((v) => VINCULO_LABEL[v]).join(" · ")}</dd>
                          </div>
                        </dl>
                        <p className="flex gap-2 text-xs text-white/70">
                          <ShieldCheck className="size-4 shrink-0 text-amarelo" />O voto é definitivo: cada CPF vota uma
                          única vez e não é possível alterar depois.
                        </p>
                        <Turnstile onToken={onToken} />
                        {falha && (
                          <p className="rounded-xl border-2 border-vermelho bg-vermelho/15 p-3 text-sm" role="alert">
                            {falha}
                          </p>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Rodapé de navegação */}
            {!concluido && (
              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-white/10 bg-fundo/95 px-5 py-4 backdrop-blur sm:px-7">
                <Button variant="ghost" size="sm" onClick={() => ir(passo - 1)} disabled={passo === 0 || enviando}>
                  <ArrowLeft className="size-4" /> Voltar
                </Button>
                {passo < PASSOS.length - 1 ? (
                  <Button onClick={() => ir(passo + 1)} disabled={bloqueado}>
                    {passo === 0 ? "Quero votar" : "Continuar"} <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button onClick={enviar} disabled={!podeConfirmar}>
                    {enviando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Confirmar voto
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
