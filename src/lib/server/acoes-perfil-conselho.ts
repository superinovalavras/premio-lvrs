"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditar } from "./auditoria";
import { conselheirosPorNome } from "./conselho";
import { exigirAvaliador, SENHA_PROVISORIA, servico, supabaseSessao } from "./sessao";

export type EstadoPerfil = { erro?: string; msg?: string } | undefined;

// "Meu perfil" do conselheiro: nome (é o login), e-mail (recebe a recuperação de senha) e senha.
// Toda mudança pede a senha atual: quem pegar um celular desbloqueado não troca o e-mail para tomar a conta.
export async function salvarPerfilConselho(_: EstadoPerfil, fd: FormData): Promise<EstadoPerfil> {
  const { user, avaliador } = await exigirAvaliador();
  const nome = String(fd.get("nome") ?? "").trim().replace(/\s+/g, " ");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const atual = String(fd.get("senha_atual") ?? "");
  const nova = String(fd.get("nova_senha") ?? "");
  const confirmar = String(fd.get("confirmar") ?? "");

  if (nome.length < 5) return { erro: "Informe o nome completo." };
  if (email && !z.string().email().safeParse(email).success) return { erro: "E-mail inválido." };
  if (nova) {
    if (nova.length < 8) return { erro: "A senha nova precisa ter pelo menos 8 caracteres." };
    if (nova === SENHA_PROVISORIA) return { erro: "Escolha uma senha diferente de 123456." };
    if (nova !== confirmar) return { erro: "As senhas novas não conferem." };
  }
  if (!atual) return { erro: "Digite a sua senha atual para salvar." };

  // Confere a senha atual sem mexer na sessão de mais ninguém: é o próprio usuário logado.
  const sb = await supabaseSessao();
  const { error: e1 } = await sb.auth.signInWithPassword({ email: user.email!, password: atual });
  if (e1) return { erro: "Senha atual incorreta." };

  const mudouNome = nome !== avaliador.nome;
  if (mudouNome && (await conselheirosPorNome(nome)).some((a) => a.id !== avaliador.id)) {
    return { erro: "Já existe outro conselheiro com este nome. Fale com a Secretaria do Prêmio." };
  }
  const mudouEmail = email !== (avaliador.email ?? "");
  if (mudouNome || mudouEmail) {
    const { error } = await servico()
      .from("avaliadores")
      .update({ nome, email: email || null })
      .eq("id", avaliador.id);
    if (error) return { erro: error.code === "23505" ? "Este e-mail já está no cadastro de outro conselheiro." : "Não foi possível salvar agora." };
  }
  if (nova) {
    const { error } = await servico().auth.admin.updateUserById(user.id, { password: nova });
    if (error) return { erro: "Não foi possível trocar a senha agora." };
    await sb.auth.signInWithPassword({ email: user.email!, password: nova });
  }
  if (!mudouNome && !mudouEmail && !nova) return { msg: "Nada mudou." };

  await auditar(user, "perfil_conselho", { tipo: "avaliador", id: avaliador.id }, { nome: mudouNome, email: mudouEmail, senha: !!nova });
  revalidatePath("/avaliacao", "layout");
  const partes = [mudouNome && "nome", mudouEmail && "e-mail", nova && "senha"].filter(Boolean).join(", ");
  return { msg: `Salvo: ${partes}.${mudouNome ? " Para entrar, use o nome novo." : ""}` };
}
