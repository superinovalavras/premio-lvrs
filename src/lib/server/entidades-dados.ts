import "server-only";
import { servico } from "./sessao";
import type { DocumentoRow, EntidadeRow, RepresentanteRow } from "@/lib/entidades";

const CAMPOS_ENTIDADE =
  "id, status, inciso, razao_social, nome_fantasia, cnpj, unidade_municipal, natureza_juridica, endereco, data_constituicao, site, assento_cocitieis, conselheiro_nome, criterios_vii, pre_cadastrado, submetido_em, decidido_em, motivo, criado_em, user_id";

export type DadosEntidade = {
  entidade: EntidadeRow & { user_id: string | null };
  representantes: RepresentanteRow[];
  titular: RepresentanteRow | null;
  suplente: RepresentanteRow | null;
  documentos: DocumentoRow[];
};

async function completar(entidade: DadosEntidade["entidade"]): Promise<DadosEntidade> {
  const sb = servico();
  const [{ data: reps }, { data: docs }] = await Promise.all([
    sb.from("representantes").select("papel, nome, cpf, cargo, email, telefone").eq("entidade_id", entidade.id),
    sb
      .from("entidade_documentos")
      .select("id, tipo, nome_arquivo, tamanho, link, storage_path, enviado_em")
      .eq("entidade_id", entidade.id)
      .order("enviado_em"),
  ]);
  const representantes = (reps ?? []) as RepresentanteRow[];
  return {
    entidade,
    representantes,
    titular: representantes.find((r) => r.papel === "titular") ?? null,
    suplente: representantes.find((r) => r.papel === "suplente") ?? null,
    documentos: (docs ?? []) as DocumentoRow[],
  };
}

export async function carregarEntidadeDoUsuario(userId: string) {
  const { data } = await servico().from("entidades").select(CAMPOS_ENTIDADE).eq("user_id", userId).maybeSingle();
  return data ? completar(data as DadosEntidade["entidade"]) : null;
}

export async function carregarEntidade(id: string) {
  const { data } = await servico().from("entidades").select(CAMPOS_ENTIDADE).eq("id", id).maybeSingle();
  return data ? completar(data as DadosEntidade["entidade"]) : null;
}

export async function emailsAdmins() {
  const { data } = await servico().from("admins").select("email");
  return (data ?? []).map((a) => a.email as string);
}
