"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditar } from "./auditoria";
import { enviarEmail, URL_SITE } from "./email";
import { carregarEntidade } from "./entidades-dados";
import { credencialProvisoria, exigirAdmin, servico } from "./sessao";
import { INCISOS, cnpjValido, incisoPorId } from "@/lib/entidades";
import { somenteDigitos } from "@/lib/voto";

export type Resultado = { ok: true; msg?: string } | { ok: false; erro: string };

// ───── Decisão da Secretaria (item 1.6) ─────

export async function decidir(entidadeId: string, fd: FormData): Promise<Resultado> {
  const admin = await exigirAdmin();
  const decisao = String(fd.get("decisao") ?? "");
  const motivo = String(fd.get("motivo") ?? "").trim().slice(0, 2000);
  if (!["deferir", "ajuste", "indeferir"].includes(decisao)) return { ok: false, erro: "Decisão inválida." };
  if (decisao !== "deferir" && motivo.length < 10) {
    return { ok: false, erro: "Escreva o motivo (é enviado à entidade e fica no processo)." };
  }

  const dados = await carregarEntidade(entidadeId);
  if (!dados) return { ok: false, erro: "Cadastro não encontrado." };
  if (dados.entidade.status !== "em_analise") {
    return { ok: false, erro: "Só cadastros em análise podem ser decididos." };
  }

  const status = decisao === "deferir" ? "deferido" : decisao === "ajuste" ? "pendente_ajuste" : "indeferido";
  const agora = new Date().toISOString();
  const { error } = await servico()
    .from("entidades")
    .update({
      status,
      motivo: decisao === "deferir" ? null : motivo,
      decidido_em: agora,
      decidido_por: admin.id,
      atualizado_em: agora,
    })
    .eq("id", entidadeId)
    .eq("status", "em_analise");
  if (error) return { ok: false, erro: "Não foi possível registrar a decisão." };
  await auditar(admin, `entidade_${status}`, { tipo: "entidade", id: entidadeId }, motivo ? { motivo } : undefined);

  const nome = dados.entidade.razao_social ?? "sua entidade";
  const inciso = incisoPorId(dados.entidade.inciso)?.rotulo;
  const para = dados.titular?.email;
  if (para) {
    const base = { para, entidadeId, tipo: `decisao_${status}` };
    if (status === "deferido") {
      await enviarEmail({
        ...base,
        assunto: "Cadastro deferido — você já pode indicar",
        titulo: "Cadastro deferido",
        paragrafos: [
          `O cadastro de ${nome} foi deferido pela Secretaria Executiva do Prêmio Lavras de Inovação 2026.`,
          "O formulário de indicação fica disponível de 12/10/2026, à 0h, até 23/10/2026, às 23h59.",
        ],
        botao: { texto: "Acessar o formulário de indicação", url: `${URL_SITE}/entidade` },
      });
    } else if (status === "pendente_ajuste") {
      await enviarEmail({
        ...base,
        assunto: "Seu cadastro precisa de um ajuste",
        titulo: "A Secretaria pediu um ajuste",
        paragrafos: [`O cadastro de ${nome} precisa de correção antes da decisão:`, motivo, "Ajuste e reenvie pela plataforma."],
        botao: { texto: "Ajustar cadastro", url: `${URL_SITE}/entidade/cadastro` },
      });
    } else {
      await enviarEmail({
        ...base,
        assunto: "Decisão sobre o seu pedido de cadastro",
        titulo: "Cadastro indeferido",
        paragrafos: [
          `O pedido de cadastro de ${nome} foi indeferido pela Secretaria Executiva, por não atender ao inciso ${inciso} do art. 2º-B da Lei nº 3.813/2011.`,
          `Motivo: ${motivo}`,
        ],
      });
    }
  }
  revalidatePath("/admin", "layout");
  return { ok: true, msg: "Decisão registrada e comunicada por e-mail." };
}

// ───── Pré-cadastro (individual e planilha) ─────

const preSchema = z.object({
  razao_social: z.string().trim().min(3, "Razão social obrigatória.").max(200),
  cnpj: z
    .string()
    .transform(somenteDigitos)
    .refine((v) => v === "" || cnpjValido(v), "CNPJ inválido."),
  inciso: z.string().refine((v) => v === "" || INCISOS.some((i) => i.id === v), "Enquadramento inválido."),
  representante: z.string().trim().min(5, "Nome do representante obrigatório.").max(160),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  assento: z.enum(["sim", "nao", ""]),
  conselheiro: z.string().trim().max(160),
});

export type LinhaPre = z.input<typeof preSchema>;

async function criarPreCadastro(linha: LinhaPre, admin: { id: string; email?: string }) {
  const v = preSchema.safeParse(linha);
  if (!v.success) return { ok: false as const, erro: v.error.issues[0].message };
  const d = v.data;
  const sb = servico();

  if (d.cnpj) {
    const { data: existe } = await sb.from("entidades").select("id").eq("cnpj", d.cnpj).is("unidade_municipal", null);
    if (existe?.length) return { ok: false as const, erro: "CNPJ já cadastrado." };
  }

  const { data: criado, error } = await sb.auth.admin.createUser({
    email: d.email,
    email_confirm: true,
    user_metadata: { nome: d.representante },
    ...credencialProvisoria(),
  });
  if (error || !criado.user) {
    return {
      ok: false as const,
      erro: /already|registered|exists/i.test(error?.message ?? "") ? "E-mail já cadastrado." : "Falha ao criar acesso.",
    };
  }

  const { data: ent, error: e2 } = await sb
    .from("entidades")
    .insert({
      user_id: criado.user.id,
      razao_social: d.razao_social,
      cnpj: d.cnpj || null,
      inciso: d.inciso || null,
      assento_cocitieis: d.assento === "sim" ? true : d.assento === "nao" ? false : null,
      conselheiro_nome: d.assento === "sim" ? d.conselheiro || null : null,
      pre_cadastrado: true,
    })
    .select("id")
    .single();
  if (e2 || !ent) {
    await sb.auth.admin.deleteUser(criado.user.id);
    return { ok: false as const, erro: e2?.code === "23505" ? "CNPJ já cadastrado." : "Falha ao criar o cadastro." };
  }
  await sb.from("representantes").insert({ entidade_id: ent.id, papel: "titular", nome: d.representante, email: d.email });
  await auditar(admin, "entidade_pre_cadastrada", { tipo: "entidade", id: ent.id }, { email: d.email });
  return { ok: true as const, id: ent.id, email: d.email };
}

export async function preCadastrar(fd: FormData): Promise<Resultado> {
  const admin = await exigirAdmin();
  const r = await criarPreCadastro(
    {
      razao_social: String(fd.get("razao_social") ?? ""),
      cnpj: String(fd.get("cnpj") ?? ""),
      inciso: String(fd.get("inciso") ?? ""),
      representante: String(fd.get("representante") ?? ""),
      email: String(fd.get("email") ?? ""),
      assento: String(fd.get("assento") ?? "") as "sim" | "nao" | "",
      conselheiro: String(fd.get("conselheiro") ?? ""),
    },
    admin,
  );
  revalidatePath("/admin", "layout");
  return r.ok ? { ok: true, msg: `Acesso criado para ${r.email}.` } : { ok: false, erro: r.erro };
}

export async function importarPreCadastros(linhas: LinhaPre[]) {
  const admin = await exigirAdmin();
  const resultados: { linha: number; ok: boolean; erro?: string; email?: string }[] = [];
  for (const [i, l] of linhas.slice(0, 300).entries()) {
    const r = await criarPreCadastro(l, admin);
    resultados.push({ linha: i + 2, ok: r.ok, erro: r.ok ? undefined : r.erro, email: r.ok ? r.email : l.email });
  }
  await auditar(admin, "importacao_planilha", null, {
    total: resultados.length,
    criados: resultados.filter((r) => r.ok).length,
  });
  revalidatePath("/admin", "layout");
  return resultados;
}

// Nova senha provisória (123456, 48h) para quem perdeu o acesso.
export async function redefinirSenha(entidadeId: string): Promise<Resultado> {
  const admin = await exigirAdmin();
  const dados = await carregarEntidade(entidadeId);
  if (!dados?.entidade.user_id) return { ok: false, erro: "Cadastro sem conta de acesso." };
  const { error } = await servico().auth.admin.updateUserById(dados.entidade.user_id, credencialProvisoria());
  if (error) return { ok: false, erro: "Não foi possível redefinir a senha." };
  await auditar(admin, "senha_redefinida", { tipo: "entidade", id: entidadeId });
  return { ok: true, msg: "Senha provisória 123456 ativa por 48 horas. Avise o representante." };
}
