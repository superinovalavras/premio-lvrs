"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auditar } from "./auditoria";
import {
  ehAdmin,
  ipDaRequisicao,
  precisaTrocarSenha,
  SENHA_PROVISORIA,
  senhaProvisoriaExpirada,
  servico,
  supabaseSessao,
  userAgent,
  usuarioAtual,
} from "./sessao";
import { DECLARACOES } from "@/lib/entidades";

export type EstadoForm = { erro?: string; campos?: Record<string, string> } | undefined;


async function destinoPosLogin(userId: string) {
  return (await ehAdmin(userId)) ? "/admin" : "/entidade";
}

export async function entrar(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const senha = String(fd.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const sb = await supabaseSessao();
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) return { erro: "E-mail ou senha incorretos." };

  if (senhaProvisoriaExpirada(data.user)) {
    await sb.auth.signOut();
    return { erro: "Sua senha provisória expirou (vale 48 horas). Peça uma nova à Secretaria do Prêmio." };
  }
  await auditar(data.user, "login", { tipo: "usuario", id: data.user.id });
  if (precisaTrocarSenha(data.user)) redirect("/trocar-senha");
  redirect(await destinoPosLogin(data.user.id));
}

const contaSchema = z
  .object({
    nome: z.string().trim().min(5, "Informe seu nome completo.").max(160),
    email: z.string().trim().toLowerCase().email("E-mail inválido.").max(160),
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(72),
    confirmar: z.string(),
    privacidade: z.literal("on", { message: "É preciso aceitar o Aviso de Privacidade." }),
  })
  .refine((v) => v.senha === v.confirmar, { path: ["confirmar"], message: "As senhas não conferem." });

// Autocadastro: o representante cria a conta e a entidade nasce em rascunho.
export async function criarConta(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const bruto = Object.fromEntries(fd) as Record<string, string>;
  const v = contaSchema.safeParse(bruto);
  if (!v.success) return { erro: v.error.issues[0].message, campos: { nome: bruto.nome, email: bruto.email } };
  const { nome, email, senha } = v.data;

  const adm = servico();
  const { data: criado, error } = await adm.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error || !criado.user) {
    const jaExiste = /already|registered|exists/i.test(error?.message ?? "");
    return {
      erro: jaExiste
        ? "Já existe uma conta com este e-mail. Use “Entrar” ou peça à Secretaria uma nova senha."
        : "Não foi possível criar a conta agora. Tente novamente em instantes.",
      campos: { nome, email },
    };
  }
  const user = criado.user;

  const { data: ent, error: e2 } = await adm.from("entidades").insert({ user_id: user.id }).select("id").single();
  if (e2 || !ent) {
    await adm.auth.admin.deleteUser(user.id);
    return { erro: "Não foi possível criar o cadastro. Tente novamente.", campos: { nome, email } };
  }
  await adm.from("representantes").insert({ entidade_id: ent.id, papel: "titular", nome, email });

  // Aviso de privacidade aceito antes de qualquer coleta (spec, item 3.5).
  const priv = DECLARACOES.find((d) => d.id === "privacidade")!;
  await adm.from("aceites").insert({
    entidade_id: ent.id,
    user_id: user.id,
    declaracao: "privacidade_cadastro",
    texto: priv.texto,
    ip: await ipDaRequisicao(),
    user_agent: await userAgent(),
  });
  await auditar(user, "conta_criada", { tipo: "entidade", id: ent.id }, { origem: "autocadastro" });

  const sb = await supabaseSessao();
  await sb.auth.signInWithPassword({ email, password: senha });
  redirect("/entidade/cadastro");
}

export async function trocarSenha(_: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const user = await usuarioAtual();
  if (!user) redirect("/entrar");
  if (senhaProvisoriaExpirada(user)) {
    await (await supabaseSessao()).auth.signOut();
    return { erro: "Sua senha provisória expirou. Peça uma nova à Secretaria do Prêmio." };
  }

  const senha = String(fd.get("senha") ?? "");
  const confirmar = String(fd.get("confirmar") ?? "");
  if (senha.length < 8) return { erro: "A nova senha precisa ter pelo menos 8 caracteres." };
  if (senha === SENHA_PROVISORIA) return { erro: "A nova senha precisa ser diferente da provisória." };
  if (senha !== confirmar) return { erro: "As senhas não conferem." };

  const adm = servico();
  const { error } = await adm.auth.admin.updateUserById(user.id, {
    password: senha,
    app_metadata: { deve_trocar_senha: false, provisoria_expira_em: null },
  });
  if (error) return { erro: "Não foi possível salvar a senha. Tente novamente." };

  // Renova a sessão com a senha nova (o JWT antigo ainda carrega a flag de troca).
  const sb = await supabaseSessao();
  await sb.auth.signInWithPassword({ email: user.email!, password: senha });
  await auditar(user, "senha_trocada", { tipo: "usuario", id: user.id });
  redirect(await destinoPosLogin(user.id));
}

export async function sair() {
  const sb = await supabaseSessao();
  await sb.auth.signOut();
  redirect("/entrar");
}
