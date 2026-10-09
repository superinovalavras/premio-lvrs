import type { Metadata } from "next";
import { TopoAdmin } from "@/components/admin/ui";
import { servico } from "@/lib/server/sessao";
import { Avaliadores, type LinhaAvaliador } from "./avaliadores";

export const metadata: Metadata = { title: "Avaliadores · Painel do Prêmio" };

export default async function PaginaAvaliadores() {
  const sb = servico();
  const [{ data: lista, error }, { data: convites }, { data: fichas }] = await Promise.all([
    sb.from("avaliadores").select("id, nome, email, papel, instituicao, ativo, is_test, user_id, criado_em").order("is_test").order("nome"),
    sb.from("convites_avaliador").select("avaliador_id, expira_em, usado_em, revogado_em, criado_em").order("criado_em", { ascending: false }),
    sb.from("fichas").select("avaliador_id").eq("status", "enviada"),
  ]);

  const ultimo = new Map<string, { expira_em: string; usado_em: string | null; revogado_em: string | null }>();
  for (const c of convites ?? []) if (!ultimo.has(c.avaliador_id)) ultimo.set(c.avaliador_id, c);
  const enviadas = new Map<string, number>();
  for (const f of fichas ?? []) enviadas.set(f.avaliador_id, (enviadas.get(f.avaliador_id) ?? 0) + 1);

  const linhas: LinhaAvaliador[] = (lista ?? []).map((a) => {
    const c = ultimo.get(a.id);
    const acesso: LinhaAvaliador["acesso"] = a.user_id
      ? "ativo"
      : !c || c.revogado_em
        ? "sem_convite"
        : new Date(c.expira_em) < new Date()
          ? "expirado"
          : "pendente";
    return {
      id: a.id,
      nome: a.nome,
      email: a.email,
      papel: a.papel,
      instituicao: a.instituicao,
      ativo: a.ativo,
      teste: a.is_test,
      acesso,
      expira: c && !a.user_id ? c.expira_em : null,
      fichas: enviadas.get(a.id) ?? 0,
    };
  });

  return (
    <>
      <TopoAdmin
        selo="Avaliação do Conselho"
        titulo={<span className="enfase">Avaliadores</span>}
        sub="Membros do COCITIEIS e suplentes que avaliam pelo sistema. Cada pessoa recebe um link pessoal, de uso único, que vale 7 dias, para criar a própria senha."
      />
      {error ? (
        <p className="rounded-2xl border border-amarelo/60 bg-amarelo/10 px-4 py-3 text-sm">
          <b className="font-semibold text-amarelo">Falta rodar a migração 0008.</b> Abra o SQL Editor do Supabase e rode o arquivo
          supabase/migrations/0008_avaliacao_conselho.sql.
        </p>
      ) : (
        <Avaliadores lista={linhas} />
      )}
    </>
  );
}
