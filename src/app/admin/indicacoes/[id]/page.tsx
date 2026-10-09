import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CartaoAdmin, TopoAdmin } from "@/components/admin/ui";
import { servico } from "@/lib/server/sessao";
import { carregarIndicacao } from "@/lib/server/indicacoes-dados";
import { CONDICOES_VINCULO, CONFLITOS, STATUS_INDICACAO, TIPOS_INDICADO, menores, tipoAnexoIV } from "@/lib/indicacoes";
import { formatarCnpj, formatarData } from "@/lib/entidades";
import { idadeEm, mascaraCelular, mascaraCpf } from "@/lib/voto";
import { AbrirDoc } from "./abrir";

export const metadata: Metadata = { title: "Indicação · Painel do Prêmio" };

function Linha({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b border-white/10 py-2.5 text-sm last:border-0 sm:grid-cols-[170px_1fr]">
      <dt className="text-white/55">{rotulo}</dt>
      <dd className="min-w-0 whitespace-pre-line break-words">{valor || <span className="text-white/40">—</span>}</dd>
    </div>
  );
}

const doc = (d: string | null) => (!d ? "" : d.length === 14 ? formatarCnpj(d) : mascaraCpf(d));

export default async function DetalheIndicacao({ params }: PageProps<"/admin/indicacoes/[id]">) {
  const { id } = await params;
  const r = await carregarIndicacao(id);
  if (!r) notFound();
  const { indicacao: i, documentos } = r;
  const sb = servico();
  const [{ data: cat }, { data: ent }, { data: versoes }] = await Promise.all([
    i.category_id ? sb.from("categories").select("name").eq("id", i.category_id).maybeSingle() : Promise.resolve({ data: null }),
    sb.from("entidades").select("id, razao_social, cnpj").eq("id", i.entidade_id).maybeSingle(),
    sb.from("indicacao_versoes").select("versao, criado_em, ip").eq("indicacao_id", id).order("versao"),
  ]);
  const tipo = TIPOS_INDICADO.find((t) => t.id === i.indicado_tipo)?.rotulo;
  const docsDe = (t: string) => documentos.filter((d) => d.tipo === t);
  const listaDocs = (t: string) =>
    docsDe(t).length ? (
      <ul className="grid gap-1">
        {docsDe(t).map((d) => (
          <li key={d.id}>
            <AbrirDoc id={d.id} rotulo={d.link ?? d.nome_arquivo ?? "arquivo"} />
          </li>
        ))}
      </ul>
    ) : null;

  return (
    <>
      <Link href="/admin/indicacoes" className="mb-3 inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-amarelo">
        <ArrowLeft className="size-4" /> Todas as indicações
      </Link>
      <TopoAdmin
        selo={`${(cat as { name: string } | null)?.name ?? "Sem categoria"} · ${STATUS_INDICACAO[i.status]}`}
        titulo={i.indicado_nome ?? "Indicação"}
        sub={
          <>
            Indicada por{" "}
            <Link href={`/admin/entidades/${ent?.id}`} className="font-semibold text-amarelo underline underline-offset-4">
              {ent?.razao_social ?? "instituição"}
            </Link>
            {i.submetido_em && <> · primeiro envio em {formatarData(i.submetido_em)}</>}
            {i.versao > 1 && <> · versão {i.versao}</>}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <CartaoAdmin>
          <h2 className="mb-2 font-semibold">Indicado</h2>
          <dl>
            <Linha rotulo="Tipo" valor={tipo} />
            <Linha rotulo="CPF/CNPJ" valor={doc(i.indicado_documento)} />
            {i.indicado_tipo === "pf" && (
              <Linha rotulo="Nascimento" valor={i.indicado_nascimento ? `${formatarData(i.indicado_nascimento + "T12:00:00Z", false)} · ${idadeEm(i.indicado_nascimento)} anos` : ""} />
            )}
            {i.indicado_tipo === "conjunto" && (
              <Linha
                rotulo="Integrantes"
                valor={i.integrantes.map((g) => `${g.nome} · ${mascaraCpf(g.cpf)} · ${g.nascimento ? `${idadeEm(g.nascimento)} anos` : "—"}`).join("\n")}
              />
            )}
            {i.aspecto_distinto && <Linha rotulo="Aspecto distinto" valor={i.aspecto_distinto} />}
            <Linha rotulo="Vínculo" valor={CONDICOES_VINCULO.find((c) => c.id === i.vinculo_condicao)?.texto} />
            <Linha rotulo="Descrição do vínculo" valor={i.vinculo_descricao} />
            <Linha rotulo="Evidência do vínculo" valor={listaDocs("vinculo")} />
          </dl>

          <h2 className="mb-2 mt-6 font-semibold">Contato do indicado</h2>
          <dl>
            <Linha rotulo="Nome" valor={i.contato_nome} />
            <Linha rotulo="E-mail" valor={i.contato_email} />
            <Linha rotulo="Telefone" valor={i.contato_telefone ? mascaraCelular(i.contato_telefone) : ""} />
          </dl>

          <h2 className="mb-2 mt-6 font-semibold">Vínculos e conflitos</h2>
          <dl>
            {CONFLITOS.map((c) => {
              const resp = i[`conflito_${c.id}` as const];
              return (
                <Linha
                  key={c.id}
                  rotulo={c.pergunta}
                  valor={
                    resp === null ? "" : resp ? (
                      <span className="text-amarelo">Sim · {i[`conflito_${c.id}_desc` as const]}</span>
                    ) : (
                      "Não"
                    )
                  }
                />
              );
            })}
          </dl>

          {menores(i).length > 0 && (
            <>
              <h2 className="mb-2 mt-6 font-semibold">Anexo IV (menores de 18 anos)</h2>
              <dl>
                {menores(i).map((m) => (
                  <Linha key={m.cpf} rotulo={m.nome} valor={listaDocs(tipoAnexoIV(m.cpf))} />
                ))}
              </dl>
            </>
          )}
        </CartaoAdmin>

        <CartaoAdmin>
          <h2 className="mb-2 font-semibold">A realização</h2>
          <dl>
            <Linha rotulo="Título" valor={i.titulo} />
            <Linha rotulo="Resumo executivo" valor={i.resumo} />
            <Linha rotulo="Problema ou oportunidade" valor={i.problema} />
            <Linha rotulo="Solução ou contribuição" valor={i.solucao} />
            <Linha rotulo="Resultados e indicadores" valor={i.resultados} />
            <Linha
              rotulo="Período"
              valor={i.periodo_inicio && i.periodo_fim ? `${formatarData(i.periodo_inicio + "T12:00:00Z", false)} a ${formatarData(i.periodo_fim + "T12:00:00Z", false)}` : ""}
            />
            <Linha rotulo="Beneficiários" valor={i.beneficiarios ? `${i.beneficiarios}${i.beneficiarios_qtd !== null ? ` · ${i.beneficiarios_qtd.toLocaleString("pt-BR")}` : ""}` : ""} />
            <Linha rotulo="Evidências" valor={listaDocs("evidencia")} />
            <Linha rotulo="Documentos" valor={listaDocs("comprobatorio")} />
          </dl>
          <h2 className="mb-2 mt-6 font-semibold">Histórico</h2>
          <dl>
            <Linha rotulo="Instituição" valor={`${ent?.razao_social ?? ""}${ent?.cnpj ? ` · ${formatarCnpj(ent.cnpj)}` : ""}`} />
            <Linha rotulo="Versões enviadas" valor={(versoes ?? []).map((v) => `v${v.versao} · ${formatarData(v.criado_em)}`).join("\n")} />
          </dl>
        </CartaoAdmin>
      </div>
    </>
  );
}
