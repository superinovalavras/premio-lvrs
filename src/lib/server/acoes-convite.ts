"use server";

import { redirect } from "next/navigation";
import { auditar } from "./auditoria";
import { carregarConvite } from "./convites";
import { conselheirosPorNome, emailTecnico, emitirLinkConselho } from "./conselho";
import { enviarEmail } from "./email";
import { ipDaRequisicao, SENHA_PROVISORIA, servico, supabaseSessao, userAgent } from "./sessao";
import { TEXTO_ANEXO_III, TEXTO_PRIVACIDADE_AVALIADOR } from "@/lib/avaliacao";

export type EstadoConvite = { erro?: string; msg?: string } | undefined;

function validarSenha(fd: FormData) {
  const senha = String(fd.get("senha") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." } as const;
  if (senha === SENHA_PROVISORIA) return { erro: "Escolha uma senha diferente de 123456." } as const;
  if (senha !== String(fd.get("confirmar") ?? "")) return { erro: "As senhas não conferem." } as const;
  return { senha } as const;
}

// Link pessoal do conselheiro (/conselho/<token>):
// primeiro acesso → cria a senha e aceita o Anexo III e a privacidade; redefinir → só cria uma senha nova.
export async function aceitarConvite(token: string, _: EstadoConvite, fd: FormData): Promise<EstadoConvite> {
  const convite = await carregarConvite(token);
  if (convite.estado !== "ok") return { erro: "Este link não vale mais. Entre com o seu nome e senha, ou peça um link novo." };
  const { avaliador, modo } = convite;
  const v = validarSenha(fd);
  if ("erro" in v) return { erro: v.erro };
  const adm = servico();
  let userId: string;
  let emailLogin: string;

  if (modo === "primeiro") {
    if (fd.get("anexo3") !== "on") return { erro: "É preciso aceitar a Declaração de Impedimento e Confidencialidade." };
    if (fd.get("privacidade") !== "on") return { erro: "É preciso aceitar o Aviso de Privacidade." };
    emailLogin = emailTecnico(avaliador.id);
    const { data, error } = await adm.auth.admin.createUser({
      email: emailLogin,
      password: v.senha,
      email_confirm: true,
      user_metadata: { nome: avaliador.nome },
    });
    if (error || !data.user) {
      // Só status e código: a mensagem pode conter o cabeçalho com a chave.
      console.error("aceitarConvite", error?.status, error?.code);
      return { erro: "Não foi possível criar o acesso agora. Tente novamente em instantes." };
    }
    userId = data.user.id;
    const { data: ligado, error: e2 } = await adm.from("avaliadores").update({ user_id: userId }).eq("id", avaliador.id).is("user_id", null).select("id");
    if (e2 || !ligado?.length) {
      await adm.auth.admin.deleteUser(userId);
      return { erro: "Não foi possível ligar o acesso. Peça um novo link à Secretaria do Prêmio." };
    }
    const ip = await ipDaRequisicao();
    const ua = await userAgent();
    await adm.from("aceites_avaliador").insert([
      { avaliador_id: avaliador.id, declaracao: "anexo_iii", texto: TEXTO_ANEXO_III, ip, user_agent: ua },
      { avaliador_id: avaliador.id, declaracao: "privacidade", texto: TEXTO_PRIVACIDADE_AVALIADOR, ip, user_agent: ua },
    ]);
  } else {
    userId = avaliador.user_id!;
    const { data: u, error } = await adm.auth.admin.updateUserById(userId, { password: v.senha, app_metadata: { deve_trocar_senha: false } });
    if (error || !u.user?.email) return { erro: "Não foi possível trocar a senha agora. Tente novamente em instantes." };
    emailLogin = u.user.email;
  }

  const agora = new Date().toISOString();
  await adm.from("convites_avaliador").update({ usado_em: agora }).eq("id", convite.conviteId);
  // Usado um link, os outros pendentes desta pessoa param de valer.
  await adm.from("convites_avaliador").update({ revogado_em: agora }).eq("avaliador_id", avaliador.id).is("usado_em", null).is("revogado_em", null);
  await auditar({ id: userId, email: emailLogin }, modo === "primeiro" ? "convite_aceito" : "senha_redefinida_por_link", { tipo: "avaliador", id: avaliador.id });
  const sb = await supabaseSessao();
  await sb.auth.signInWithPassword({ email: emailLogin, password: v.senha });
  redirect("/avaliacao");
}

// Login do conselheiro pelo nome completo. A mensagem de erro é sempre a mesma, para não revelar quem está cadastrado.
export async function entrarConselho(_: EstadoConvite, fd: FormData): Promise<EstadoConvite> {
  const nome = String(fd.get("nome") ?? "");
  const senha = String(fd.get("senha") ?? "");
  const ERRO = { erro: "Nome ou senha incorretos." };
  if (!nome.trim() || !senha) return { erro: "Informe o nome completo e a senha." };
  const achados = (await conselheirosPorNome(nome)).filter((a) => a.user_id);
  if (achados.length > 1) return { erro: "Há mais de um conselheiro com este nome. Fale com a Secretaria do Prêmio." };
  if (!achados.length) return ERRO;
  const { data: u } = await servico().auth.admin.getUserById(achados[0].user_id!);
  if (!u.user?.email) return ERRO;
  const sb = await supabaseSessao();
  const { data, error } = await sb.auth.signInWithPassword({ email: u.user.email, password: senha });
  if (error || !data.user) return ERRO;
  await auditar(data.user, "login_conselho", { tipo: "avaliador", id: achados[0].id });
  redirect("/avaliacao");
}

// "Esqueci a senha": manda um link novo para o e-mail cadastrado no perfil. A resposta é a mesma em qualquer caso.
export async function pedirNovaSenha(_: EstadoConvite, fd: FormData): Promise<EstadoConvite> {
  const nome = String(fd.get("nome") ?? "");
  if (!nome.trim()) return { erro: "Informe o nome completo." };
  const RESPOSTA = {
    msg: "Se o nome estiver cadastrado com e-mail, enviamos um link para criar uma senha nova. Confira a caixa de entrada e o spam. Sem e-mail no cadastro, fale com a Secretaria do Prêmio.",
  };
  const achados = await conselheirosPorNome(nome);
  if (achados.length !== 1 || !achados[0].email) return RESPOSTA;
  const av = achados[0];
  // No máximo um pedido a cada 10 minutos por conselheiro.
  const { count } = await servico()
    .from("convites_avaliador")
    .select("id", { count: "exact", head: true })
    .eq("avaliador_id", av.id)
    .is("criado_por", null)
    .gte("criado_em", new Date(Date.now() - 10 * 60_000).toISOString());
  if ((count ?? 0) > 0) return RESPOSTA;
  const link = await emitirLinkConselho(av.id, null, false, 1); // vale 24 horas
  if (!link) return RESPOSTA;
  await enviarEmail({
    para: av.email!,
    assunto: "Prêmio Lavras de Inovação — crie uma senha nova",
    tipo: "senha_conselho",
    titulo: "Crie uma senha nova",
    paragrafos: [
      `Olá, ${av.nome.split(" ")[0]}. Recebemos um pedido para trocar a senha do seu acesso ao Conselho no Prêmio Lavras de Inovação.`,
      "O link abaixo é pessoal, vale por 24 horas e para uma única troca. Se não foi você, ignore esta mensagem: a senha atual continua valendo.",
    ],
    botao: { texto: "Criar senha nova", url: link },
  });
  await auditar(null, "senha_conselho_pedida", { tipo: "avaliador", id: av.id });
  return RESPOSTA;
}
