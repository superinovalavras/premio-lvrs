import type { Metadata } from "next";
import Link from "next/link";
import { CartaoAdmin, PillStatus, TopoAdmin, btnAmarelo, btnContorno } from "@/components/admin/ui";
import { servico } from "@/lib/server/sessao";
import { STATUS, formatarCnpj, formatarData, incisoPorId, type StatusEntidade } from "@/lib/entidades";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Instituições · Painel do Prêmio" };

const ORDEM: StatusEntidade[] = ["em_analise", "pendente_ajuste", "rascunho", "deferido", "indeferido"];

export default async function Entidades({ searchParams }: PageProps<"/admin/entidades">) {
  const filtro = (await searchParams).status;
  const status = typeof filtro === "string" && filtro in STATUS ? (filtro as StatusEntidade) : null;

  const { data } = await servico()
    .from("entidades")
    .select("id, status, razao_social, cnpj, inciso, pre_cadastrado, submetido_em, criado_em, representantes(nome, email, papel)")
    .order("submetido_em", { ascending: true, nullsFirst: false })
    .order("criado_em", { ascending: false });
  const todas = data ?? [];
  const contagem = Object.fromEntries(ORDEM.map((s) => [s, todas.filter((e) => e.status === s).length]));
  const lista = (status ? todas.filter((e) => e.status === status) : todas).sort(
    (a, b) => ORDEM.indexOf(a.status as StatusEntidade) - ORDEM.indexOf(b.status as StatusEntidade),
  );

  return (
    <>
      <TopoAdmin
        selo="Indicadores"
        titulo={
          <>
            Instituições <span className="enfase">indicadoras</span>
          </>
        }
        sub="Pedidos de cadastro (art. 8º). Os em análise aparecem primeiro, na ordem de envio — compromisso de análise em até 1 dia útil."
        acoes={
          <>
            <Link href="/admin/entidades/importar" className={btnContorno}>
              Importar planilha
            </Link>
            <Link href="/admin/entidades/nova" className={btnAmarelo}>
              + Pré-cadastrar
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {ORDEM.map((s) => (
          <Link
            key={s}
            href={status === s ? "/admin/entidades" : `/admin/entidades?status=${s}`}
            className={cn(
              "rounded-[18px] border p-4 transition",
              status === s
                ? "border-amarelo bg-amarelo text-fundo"
                : s === "em_analise" && contagem[s]
                  ? "border-verde bg-verde"
                  : "border-white/10 bg-white/[0.04] hover:border-white/30",
            )}
          >
            <p className="text-[10.5px] uppercase tracking-[0.16em] opacity-80">{STATUS[s].rotulo}</p>
            <p className="mt-1 text-3xl font-semibold">{contagem[s]}</p>
          </Link>
        ))}
      </div>

      <CartaoAdmin className="mt-4 overflow-x-auto p-0">
        {lista.length === 0 ? (
          <p className="p-6 text-white/70">
            {status ? `Nenhum cadastro com a situação “${STATUS[status].rotulo}”.` : "Nenhum cadastro ainda."}
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.16em] text-white/55">
                <th className="px-5 py-3 font-semibold">Instituição</th>
                <th className="px-3 py-3 font-semibold">Inciso</th>
                <th className="px-3 py-3 font-semibold">Representante</th>
                <th className="px-3 py-3 font-semibold">Situação</th>
                <th className="px-3 py-3 font-semibold">Enviado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const tit = (e.representantes as { nome: string | null; email: string | null; papel: string }[]).find(
                  (r) => r.papel === "titular",
                );
                return (
                  <tr key={e.id} className="border-t border-white/10">
                    <td className="px-5 py-3.5">
                      <p className="font-medium">{e.razao_social || <span className="text-white/50">Sem nome ainda</span>}</p>
                      <p className="text-xs text-white/55">
                        {formatarCnpj(e.cnpj)}
                        {e.pre_cadastrado && " · pré-cadastrada"}
                      </p>
                    </td>
                    <td className="px-3 py-3.5">{incisoPorId(e.inciso)?.rotulo ?? "—"}</td>
                    <td className="px-3 py-3.5">
                      <p>{tit?.nome ?? "—"}</p>
                      <p className="text-xs text-white/55">{tit?.email}</p>
                    </td>
                    <td className="px-3 py-3.5">
                      <PillStatus status={e.status as StatusEntidade} />
                    </td>
                    <td className="px-3 py-3.5 text-white/70">{formatarData(e.submetido_em) || "—"}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/entidades/${e.id}`}
                        className={e.status === "em_analise" ? btnAmarelo : btnContorno}
                      >
                        {e.status === "em_analise" ? "Analisar" : "Abrir"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CartaoAdmin>
    </>
  );
}
