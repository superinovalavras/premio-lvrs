import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Check } from "lucide-react";
import { CartaoAdmin, PillStatus, TopoAdmin, btnContorno } from "@/components/admin/ui";
import { carregarEntidade } from "@/lib/server/entidades-dados";
import { servico } from "@/lib/server/sessao";
import {
  CRITERIOS_VII,
  calcularPendencias,
  documentosExigidos,
  formatarCnpj,
  formatarData,
  incisoPorId,
  tipoCriterio,
} from "@/lib/entidades";
import { mascaraCelular, mascaraCpf } from "@/lib/voto";
import { BotaoDocumento, PainelDecisao, RedefinirSenha } from "./acoes";

export const metadata: Metadata = { title: "Análise de cadastro · Painel do Prêmio" };

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-3 sm:grid-cols-[150px_1fr] border-b border-white/10 py-2.5 text-sm last:border-0">
      <dt className="text-white/55">{rotulo}</dt>
      <dd className="min-w-0 break-words">{valor || <span className="text-white/40">—</span>}</dd>
    </div>
  );
}

export default async function AnaliseEntidade({ params }: PageProps<"/admin/entidades/[id]">) {
  const { id } = await params;
  const dados = await carregarEntidade(id);
  if (!dados) notFound();
  const { entidade: e, titular, suplente, documentos } = dados;
  const inciso = incisoPorId(e.inciso);
  const pend = calcularPendencias(e, dados.representantes, documentos);

  const sb = servico();
  const [{ data: aceites }, { data: historico }, { data: emails }] = await Promise.all([
    sb.from("aceites").select("declaracao, aceito_em, ip").eq("entidade_id", id).order("aceito_em", { ascending: false }),
    sb.from("auditoria").select("em, acao, autor_email, detalhes, ip").eq("alvo_tipo", "entidade").eq("alvo_id", id).order("em", { ascending: false }).limit(40),
    sb.from("emails_enviados").select("em, para, assunto, status").eq("entidade_id", id).order("em", { ascending: false }),
  ]);

  const itensDoc = [
    ...documentosExigidos(e.inciso, !!suplente).map((d) => ({ tipo: d.id, nome: d.nome })),
    ...(e.inciso === "VII"
      ? e.criterios_vii.map((c) => ({
          tipo: tipoCriterio(c),
          nome: `Critério: ${CRITERIOS_VII.find((x) => x.id === c)?.nome}`,
        }))
      : []),
  ];

  return (
    <>
      <p className="mb-3 text-sm">
        <Link href="/admin/entidades" className="text-white/65 hover:text-amarelo">
          ← Instituições
        </Link>
      </p>
      <TopoAdmin
        selo={inciso ? `Inciso ${inciso.rotulo} · ${inciso.quem}` : "Sem enquadramento"}
        titulo={e.razao_social || "Cadastro sem nome"}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            <PillStatus status={e.status} />
            {e.submetido_em && <span>enviado em {formatarData(e.submetido_em)}</span>}
            {e.pre_cadastrado && <span>· pré-cadastrada pela Secretaria</span>}
          </span>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_380px] xl:items-start">
        <div className="grid gap-4">
          <CartaoAdmin>
            <h2 className="mb-2 font-semibold">Instituição</h2>
            <dl>
              <Linha rotulo="Razão social" valor={e.razao_social} />
              <Linha rotulo="Nome fantasia" valor={e.nome_fantasia} />
              <Linha rotulo="CNPJ" valor={formatarCnpj(e.cnpj)} />
              {e.unidade_municipal && <Linha rotulo="Unidade" valor={e.unidade_municipal} />}
              <Linha rotulo="Natureza jurídica" valor={e.natureza_juridica} />
              <Linha rotulo="Endereço em Lavras" valor={e.endereco} />
              <Linha rotulo="Constituição" valor={formatarData(e.data_constituicao, false)} />
              <Linha rotulo="Site e redes" valor={e.site} />
              <Linha
                rotulo="Assento no COCITIEIS"
                valor={e.assento_cocitieis === null ? null : e.assento_cocitieis ? `Sim · conselheiro: ${e.conselheiro_nome ?? "—"}` : "Não"}
              />
            </dl>
          </CartaoAdmin>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { r: titular, t: "Representante titular" },
              { r: suplente, t: "Suplente" },
            ].map(({ r, t }) => (
              <CartaoAdmin key={t}>
                <h2 className="mb-2 font-semibold">{t}</h2>
                {r ? (
                  <dl>
                    <Linha rotulo="Nome" valor={r.nome} />
                    <Linha rotulo="CPF" valor={r.cpf ? mascaraCpf(r.cpf) : null} />
                    <Linha rotulo="Cargo" valor={r.cargo} />
                    <Linha rotulo="E-mail" valor={r.email} />
                    <Linha rotulo="Telefone" valor={r.telefone ? mascaraCelular(r.telefone) : null} />
                  </dl>
                ) : (
                  <p className="text-sm text-white/55">Não indicado.</p>
                )}
              </CartaoAdmin>
            ))}
          </div>

          <CartaoAdmin>
            <h2 className="mb-3 font-semibold">Documentos</h2>
            <ul className="divide-y divide-white/10">
              {itensDoc.map((it) => {
                const doc = documentos.find((d) => d.tipo === it.tipo);
                return (
                  <li key={it.tipo} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                    {doc ? <Check className="size-4 text-[#8ff0bd]" /> : <AlertTriangle className="size-4 text-amarelo" />}
                    <span className="min-w-0 flex-1">
                      {it.nome}
                      {doc && <span className="block truncate text-xs text-white/55">{doc.link ?? doc.nome_arquivo}</span>}
                    </span>
                    {doc ? <BotaoDocumento id={doc.id} /> : <span className="text-xs text-amarelo">não anexado</span>}
                  </li>
                );
              })}
            </ul>
          </CartaoAdmin>

          <CartaoAdmin>
            <h2 className="mb-3 font-semibold">Histórico</h2>
            <ul className="space-y-3 text-sm">
              {(historico ?? []).map((h, i) => (
                <li key={i} className="grid gap-1 sm:grid-cols-[130px_1fr]">
                  <span className="text-white/55">{formatarData(h.em)}</span>
                  <span>
                    {h.acao.replaceAll("_", " ")} <span className="text-white/55">· {h.autor_email ?? "sistema"}{h.ip ? ` · IP ${h.ip}` : ""}</span>
                    {(h.detalhes as { motivo?: string } | null)?.motivo && (
                      <span className="mt-1 block border-l-[3px] border-amarelo pl-2.5 text-white/85">
                        {(h.detalhes as { motivo: string }).motivo}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </CartaoAdmin>
        </div>

        <div className="grid gap-4 xl:sticky xl:top-6">
          <PainelDecisao id={e.id} status={e.status} pendencias={pend.map((p) => p.texto)} motivo={e.motivo} />

          <CartaoAdmin>
            <h2 className="mb-2 font-semibold">Declarações aceitas</h2>
            {aceites?.length ? (
              <ul className="space-y-1.5 text-[13px]">
                {aceites.map((a, i) => (
                  <li key={i}>
                    <span className="capitalize">{a.declaracao.replaceAll("_", " ")}</span>
                    <span className="text-white/55"> · {formatarData(a.aceito_em)} · IP {a.ip ?? "—"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/55">Nenhuma ainda.</p>
            )}
          </CartaoAdmin>

          <CartaoAdmin>
            <h2 className="mb-2 font-semibold">E-mails enviados</h2>
            {emails?.length ? (
              <ul className="space-y-1.5 text-[13px]">
                {emails.map((m, i) => (
                  <li key={i}>
                    {m.assunto}
                    <span className="text-white/55">
                      {" "}
                      · {m.para} · {formatarData(m.em)} · {m.status === "enviado" ? "enviado" : m.status === "sem_configuracao" ? "não enviado (e-mail não configurado)" : "falhou"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/55">Nenhum.</p>
            )}
          </CartaoAdmin>

          <CartaoAdmin>
            <h2 className="font-semibold">Acesso do representante</h2>
            <p className="mt-1 text-[13px] text-white/65">
              Se o representante perdeu a senha, gere a provisória 123456 (vale 48 horas, troca obrigatória).
            </p>
            <RedefinirSenha id={e.id} />
          </CartaoAdmin>
          <Link href="/admin/entidades" className={btnContorno}>
            Voltar à lista
          </Link>
        </div>
      </div>
    </>
  );
}
