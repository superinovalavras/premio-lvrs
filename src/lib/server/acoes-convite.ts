"use server";

import { redirect } from "next/navigation";
import { auditar } from "./auditoria";
import { carregarConvite } from "./convites";
import { ipDaRequisicao, SENHA_PROVISORIA, servico, supabaseSessao, userAgent } from "./sessao";
import { TEXTO_ANEXO_III, TEXTO_PRIVACIDADE_AVALIADOR } from "@/lib/avaliacao";

export type EstadoConvite = { erro?: string; contaExistente?: boolean } | undefined;

// O conselheiro abre o link pessoal, cria a senha e aceita o Anexo III. O e-mail vem do convite e não muda.
// Se o e-mail já tem conta no site (ex.: representante de instituição), ele confirma a senha dessa conta.
export async function aceitarConvite(token: string, _: EstadoConvite, fd: FormData): Promise<EstadoConvite> {
  const convite = await carregarConvite(token);
  if (convite.estado !== "ok") return { erro: "Este link não vale mais. Peça um novo à Secretaria do Prêmio." };
  const { avaliador } = convite;

  if (fd.get("anexo3") !== "on") return { erro: "É preciso aceitar a Declaração de Impedimento e Confidencialidade." };
  if (fd.get("privacidade") !== "on") return { erro: "É preciso aceitar o Aviso de Privacidade." };

  const modo = fd.get("modo") === "vincular" ? "vincular" : "criar";
  const senha = String(fd.get("senha") ?? "");
  const adm = servico();
  let userId: string;
  let criado = false;

  if (modo === "criar") {
    if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
    if (senha === SENHA_PROVISORIA) return { erro: "Escolha uma senha diferente de 123456." };
    if (senha !== String(fd.get("confirmar") ?? "")) return { erro: "As senhas não conferem." };
    const { data, error } = await adm.auth.admin.createUser({
      email: avaliador.email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: avaliador.nome },
    });
    if (error || !data.user) {
      if (/already|registered|exists/i.test(error?.message ?? "")) {
        return {
          contaExistente: true,
          erro: "Este e-mail já tem uma conta no site do Prêmio. Digite a senha dessa conta para ligar o acesso de avaliador a ela.",
        };
      }
      // Só status e código: a mensagem pode conter o cabeçalho com a chave.
      console.error("aceitarConvite", error?.status, error?.code);
      return { erro: "Não foi possível criar o acesso agora. Tente novamente em instantes." };
    }
    userId = data.user.id;
    criado = true;
  } else {
    const sb = await supabaseSessao();
    const { data, error } = await sb.auth.signInWithPassword({ email: avaliador.email, password: senha });
    if (error || !data.user) return { contaExistente: true, erro: "Senha incorreta." };
    userId = data.user.id;
  }

  const { data: ligado, error: e2 } = await adm
    .from("avaliadores")
    .update({ user_id: userId })
    .eq("id", avaliador.id)
    .is("user_id", null)
    .select("id");
  if (e2 || !ligado?.length) {
    if (criado) await adm.auth.admin.deleteUser(userId);
    return { erro: "Não foi possível ligar o acesso. Peça um novo link à Secretaria do Prêmio." };
  }
  await adm.from("convites_avaliador").update({ usado_em: new Date().toISOString() }).eq("id", convite.conviteId);

  const ip = await ipDaRequisicao();
  const ua = await userAgent();
  await adm.from("aceites_avaliador").insert([
    { avaliador_id: avaliador.id, declaracao: "anexo_iii", texto: TEXTO_ANEXO_III, ip, user_agent: ua },
    { avaliador_id: avaliador.id, declaracao: "privacidade", texto: TEXTO_PRIVACIDADE_AVALIADOR, ip, user_agent: ua },
  ]);
  await auditar({ id: userId, email: avaliador.email }, "convite_aceito", { tipo: "avaliador", id: avaliador.id }, {
    conta: criado ? "nova" : "existente",
  });

  if (criado) {
    const sb = await supabaseSessao();
    await sb.auth.signInWithPassword({ email: avaliador.email, password: senha });
  }
  redirect("/avaliacao");
}
