import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TelaDividida } from "@/components/area/tela-dividida";
import { FormTrocarSenha } from "./form";
import { usuarioAtual } from "@/lib/server/sessao";

export const metadata: Metadata = { title: "Crie sua senha · Prêmio Lavras de Inovação 2026" };

export default async function TrocarSenha() {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  const nome = (u.user_metadata?.nome as string | undefined)?.split(" ")[0];
  const provisoria = u.app_metadata?.deve_trocar_senha === true;

  return (
    <TelaDividida
      selo={provisoria ? "Primeiro acesso" : "Trocar senha"}
      titulo={
        <>
          {nome ? "Bem-vindo, " : "Bem-vindo"}
          {nome && <span className="enfase">{nome}</span>}
        </>
      }
      texto="Antes de continuar, crie a sua senha. Ninguém da organização terá acesso a ela."
    >
      <FormTrocarSenha />
    </TelaDividida>
  );
}
