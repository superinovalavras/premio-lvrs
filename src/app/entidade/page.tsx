import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, CheckCircle2, CircleDashed, FileWarning, Hourglass, XCircle } from "lucide-react";
import { CabecalhoArea, ConteudoArea } from "@/components/area/cabecalho";
import { Aviso, Cartao, btnPrim } from "@/components/area/ui";
import { destinoDoUsuario, exigirUsuario } from "@/lib/server/sessao";
import { sair } from "@/lib/server/acoes-conta";
import { TelaDividida } from "@/components/area/tela-dividida";
import { carregarEntidadeDoUsuario } from "@/lib/server/entidades-dados";
import { STATUS, calcularPendencias, formatarData, incisoPorId } from "@/lib/entidades";
import { cn } from "@/lib/utils";
import { carregarParametros } from "@/lib/server/parametros";
import { dia, hora, periodo } from "@/lib/datas";
import { PainelIndicacoes } from "./indicacoes-painel";

export const metadata: Metadata = { title: "Minha instituição · Prêmio Lavras de Inovação 2026" };


const ICONE = {
  rascunho: CircleDashed,
  em_analise: Hourglass,
  pendente_ajuste: FileWarning,
  deferido: CheckCircle2,
  indeferido: XCircle,
};

export default async function PainelEntidade() {
  const user = await exigirUsuario();
  const dados = await carregarEntidadeDoUsuario(user.id);
  if (!dados) {
    const destino = await destinoDoUsuario(user.id);
    if (destino !== "/entidade") redirect(destino);
    // Conta sem instituição e sem outro perfil (ex.: avaliador desativado): avisa em vez de voltar ao login em ciclo.
    return (
      <TelaDividida selo="Área restrita" titulo={<>Acesso <span className="enfase">indisponível</span></>} texto="Esta conta não tem cadastro de instituição nem acesso de avaliador ativo.">
        <Aviso>Fale com a Secretaria do Prêmio para revisar o seu acesso.</Aviso>
        <form action={sair} className="mt-6">
          <button className={btnPrim}>Sair</button>
        </form>
      </TelaDividida>
    );
  }
  const { entidade: e, titular } = dados;
  const nome = titular?.nome ?? (user.user_metadata?.nome as string) ?? user.email ?? "";
  const st = STATUS[e.status];
  const Icone = ICONE[e.status];
  const pend = calcularPendencias(e, dados.representantes, dados.documentos);
  const par = await carregarParametros();
  const INDICACOES_ABREM = new Date(par.indicacoesAbrem);
  const INDICACOES_FECHAM = new Date(par.indicacoesFecham);
  const agora = new Date();
  const dias = Math.ceil((INDICACOES_ABREM.getTime() - agora.getTime()) / 86_400_000);

  const etapas = [
    { rotulo: "Cadastro preenchido", feito: e.status !== "rascunho" },
    { rotulo: "Análise da Secretaria", feito: e.status === "deferido" || e.status === "indeferido" },
    { rotulo: `Indicações (${periodo(par.indicacoesAbrem, par.indicacoesFecham)})`, feito: false },
  ];

  return (
    <>
      <CabecalhoArea
        nome={nome}
        selo="Indicações 2026"
        titulo={
          <>
            Quem merece ser <span className="enfase">reconhecido</span>?
          </>
        }
        texto={
          e.razao_social
            ? `${e.razao_social}${e.inciso ? ` · inciso ${incisoPorId(e.inciso)?.rotulo} do art. 2º-B` : ""}`
            : "Complete o cadastro da sua instituição para poder indicar."
        }
      />
      <ConteudoArea>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Cartao>
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-2xl",
                  e.status === "deferido" ? "bg-verde text-white" : e.status === "indeferido" ? "bg-vermelho text-white" : "bg-amarelo text-fundo",
                )}
              >
                <Icone className="size-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-fundo/55">Situação do cadastro</p>
                <h2 className="text-xl font-semibold">{st.rotulo}</h2>
              </div>
            </div>
            <p className="mt-3 font-light text-fundo/75">{st.explica}</p>

            {e.status === "pendente_ajuste" && e.motivo && (
              <Aviso tom="alerta" className="mt-4">
                <b className="font-semibold">Pedido da Secretaria:</b> {e.motivo}
              </Aviso>
            )}
            {e.status === "indeferido" && e.motivo && (
              <Aviso tom="erro" className="mt-4">
                <b className="font-semibold">Motivo:</b> {e.motivo}
              </Aviso>
            )}
            {(e.status === "rascunho" || e.status === "pendente_ajuste") && (
              <div className="mt-5">
                {pend.length > 0 && e.status === "rascunho" && (
                  <p className="mb-3 text-sm text-fundo/70">
                    Faltam <b className="font-semibold text-fundo">{pend.length}</b> {pend.length === 1 ? "item" : "itens"} para enviar.
                  </p>
                )}
                <Link href="/entidade/cadastro" className={btnPrim}>
                  {e.status === "pendente_ajuste" ? "Ajustar e reenviar" : pend.length ? "Continuar cadastro" : "Revisar e enviar"}
                </Link>
              </div>
            )}
            {(e.status === "em_analise" || e.status === "deferido" || e.status === "indeferido") && (
              <p className="mt-4 text-sm text-fundo/65">
                Enviado em {formatarData(e.submetido_em)}
                {e.decidido_em && ` · decidido em ${formatarData(e.decidido_em)}`} ·{" "}
                <Link href="/entidade/cadastro" className="font-semibold text-verde underline underline-offset-4">
                  ver cadastro
                </Link>
              </p>
            )}

            <ol className="mt-6 grid gap-2 border-t border-fundo/10 pt-5 sm:grid-cols-3">
              {etapas.map((et, i) => (
                <li key={et.rotulo} className="flex items-center gap-2 text-[13px]">
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                      et.feito ? "bg-verde text-white" : "bg-nevoa text-fundo/55",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className={et.feito ? "text-fundo" : "text-fundo/60"}>{et.rotulo}</span>
                </li>
              ))}
            </ol>
          </Cartao>

          <div className="grid content-start gap-4">
            <div className="rounded-[22px] bg-verde p-6 text-white sm:p-7">
              <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">
                <CalendarClock className="size-4" /> Período de indicações
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {agora < INDICACOES_ABREM ? `Abre em ${dias} ${dias === 1 ? "dia" : "dias"}` : agora <= INDICACOES_FECHAM ? "Aberto" : "Encerrado"}
              </p>
              <p className="mt-1 text-sm text-white/85">
                {dia(par.indicacoesAbrem)}, à {hora(par.indicacoesAbrem)}, até {dia(par.indicacoesFecham)}, às {hora(par.indicacoesFecham)}
              </p>
            </div>
            <Cartao className="p-6">
              <h3 className="font-semibold">Como funciona</h3>
              <ul className="mt-2 space-y-1.5 text-sm font-light text-fundo/75">
                <li>· Até 2 indicações por categoria e 6 no total.</li>
                <li>· Só cadastros deferidos indicam.</li>
                <li>· A análise do cadastro leva até 1 dia útil — pedidos enviados nas últimas 24 horas do prazo podem não ser analisados a tempo.</li>
              </ul>
            </Cartao>
          </div>
        </div>
        {e.status === "deferido" && <PainelIndicacoes entidadeId={e.id} />}
      </ConteudoArea>
    </>
  );
}
