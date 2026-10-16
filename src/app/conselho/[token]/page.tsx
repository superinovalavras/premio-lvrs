import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TelaDividida } from "@/components/area/tela-dividida";
import { carregarConvite } from "@/lib/server/convites";
import { avaliadorDoUsuario, usuarioAtual } from "@/lib/server/sessao";
import { FormEntrarConselho, FormSenhaConselho } from "../forms";

export const metadata: Metadata = {
  title: "Conselho · Prêmio Lavras de Inovação 2026",
  robots: { index: false, follow: false },
};

const AVISO: Record<string, string> = {
  usado: "",
  expirado: "Este link de primeiro acesso venceu. Se você já criou a senha, entre abaixo. Se não, peça um link novo à Secretaria do Prêmio.",
  invalido: "Este link não é válido. Entre com o seu nome e senha, ou peça um link novo à Secretaria do Prêmio.",
  inativo: "Este acesso foi desativado pela Secretaria do Prêmio.",
};

// O link pessoal do WhatsApp: no primeiro uso cria a senha; depois, vira a página de entrada.
export default async function LinkConselho({ params }: PageProps<"/conselho/[token]">) {
  const { token } = await params;
  const convite = await carregarConvite(token);

  if (convite.estado === "ok") {
    const primeiro = convite.avaliador.nome.split(" ")[0];
    return (
      <TelaDividida
        selo="Conselho avaliador"
        titulo={
          <>
            Olá, <span className="enfase">{primeiro}</span>
          </>
        }
        texto={
          convite.modo === "primeiro"
            ? "Você foi convidado a indicar e avaliar no Prêmio Lavras de Inovação 2026 como membro do COCITIEIS. Crie a sua senha para entrar."
            : "Crie uma senha nova para o seu acesso ao Conselho."
        }
      >
        <FormSenhaConselho token={token} nome={convite.avaliador.nome} modo={convite.modo} />
      </TelaDividida>
    );
  }

  const u = await usuarioAtual();
  if (u && (await avaliadorDoUsuario(u.id))?.ativo) redirect("/avaliacao");
  return (
    <TelaDividida
      selo="Conselho avaliador"
      titulo={
        <>
          Área do <span className="enfase">Conselho</span>
        </>
      }
      texto="Indicações, propostas honorárias e avaliação do COCITIEIS no Prêmio Lavras de Inovação 2026."
    >
      <FormEntrarConselho aviso={AVISO[convite.estado] || undefined} />
    </TelaDividida>
  );
}
