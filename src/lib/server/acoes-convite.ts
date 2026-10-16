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
  const ERRO = { erro: "Nome (ou e-mail) ou senha incorretos." };
  if (!nome.trim() || !senha) return { erro: "Informe o nome completo (ou e-mail) e a senha." };
  // Aceita o nome completo ou o e-mail do cadastro.
  const porEmail = nome.includes("@");
  const achados = porEmail
    ? ((await servico().from("avaliadores").select("id, nome, email, user_id, ativo").eq("ativo", true).ilike("email", nome.trim().replace(/[\\%_]/g, "\\$&"))).data ?? []).filter((a) => a.user_id)
    : (await conselheirosPorNome(nome)).filter((a) => a.user_id);
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

// Mostra o e-mail sem entregá-lo: "ra••••••12@gmail.com". A pessoa reconhece o dela; quem digitar outro nome, não descobre.
function mascarar(email: string) {
  const [u, d] = email.split("@");
  if (!d) return "•••";
  const vis = u.length <= 3 ? u.slice(0, 1) : u.slice(0, 2);
  const fim = u.length > 5 ? u.slice(-2) : "";
  return `${vis}${"•".repeat(Math.max(3, u.length - vis.length - fim.length))}${fim}@${d}`;
}

// Primeiro acesso e "esqueci a senha" pelo link do grupo: o link para criar a senha vai para o e-mail do cadastro.
// Só quem tem acesso àquele e-mail cria a senha. No máximo um pedido a cada 10 minutos por conselheiro.
export async function pedirLinkPorEmail(_: EstadoConvite, fd: FormData): Promise<EstadoConvite> {
  const nome = String(fd.get("nome") ?? "");
  const primeiroAcesso = fd.get("tipo") === "primeiro";
  if (!nome.trim()) return { erro: "Informe o nome completo." };
  const achados = await conselheirosPorNome(nome);
  if (achados.length > 1) return { erro: "Há mais de um conselheiro com este nome. Fale com a Secretaria do Prêmio." };
  if (!achados.length) return { erro: "Não encontramos este nome no cadastro do Conselho. Confira como está escrito (nome completo) ou fale com a Secretaria do Prêmio." };
  const av = achados[0];
  if (primeiroAcesso && av.user_id) return { erro: "Você já criou o seu acesso. Entre com o nome e a senha, ou use “Esqueci a senha”." };
  if (!av.email) return { erro: "O seu cadastro ainda não tem e-mail. Fale com a Secretaria do Prêmio, que envia o link pelo WhatsApp." };
  const destino = mascarar(av.email);

  const { count } = await servico()
    .from("convites_avaliador")
    .select("id", { count: "exact", head: true })
    .eq("avaliador_id", av.id)
    .is("criado_por", null)
    .gte("criado_em", new Date(Date.now() - 10 * 60_000).toISOString());
  if ((count ?? 0) > 0) return { msg: `Já enviamos um link para ${destino} há poucos minutos. Confira a caixa de entrada e o spam.` };

  const link = await emitirLinkConselho(av.id, null, false, 1); // vale 24 horas; não anula o link do WhatsApp
  if (!link) return { erro: "Não foi possível gerar o link agora. Tente novamente em instantes." };
  const envio = await enviarEmail({
    para: av.email,
    assunto: av.user_id ? "Prêmio Lavras de Inovação — crie uma senha nova" : "Prêmio Lavras de Inovação — crie o seu acesso ao Conselho",
    tipo: av.user_id ? "senha_conselho" : "primeiro_acesso_conselho",
    titulo: av.user_id ? "Crie uma senha nova" : "Crie o seu acesso",
    paragrafos: av.user_id
      ? [
          `Olá, ${av.nome.split(" ")[0]}. Recebemos um pedido para trocar a senha do seu acesso ao Conselho no Prêmio Lavras de Inovação.`,
          "O link abaixo é pessoal, vale por 24 horas e para uma única troca. Se não foi você, ignore esta mensagem: a senha atual continua valendo.",
        ]
      : [
          `Olá, ${av.nome.split(" ")[0]}. Este é o seu primeiro acesso à área do Conselho no Prêmio Lavras de Inovação 2026.`,
          "Clique no botão para criar a sua senha. Depois, entre em premio.lvrs.com.br/conselho com o seu nome completo (ou este e-mail) e a senha.",
          "O link é pessoal e vale por 24 horas. Se não foi você, ignore esta mensagem.",
        ],
    botao: { texto: av.user_id ? "Criar senha nova" : "Criar minha senha", url: link },
  });
  await auditar(null, av.user_id ? "senha_conselho_pedida" : "primeiro_acesso_pedido", { tipo: "avaliador", id: av.id }, { enviado: envio.ok });
  if (!envio.ok) return { erro: "Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos ou fale com a Secretaria do Prêmio." };
  return { msg: `Enviamos um link para ${destino}. Abra o e-mail (confira também o spam) e clique em “${av.user_id ? "Criar senha nova" : "Criar minha senha"}”. O link vale 24 horas.` };
}
