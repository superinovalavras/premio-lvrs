import type { Metadata } from "next";
import Link from "next/link";
import { TelaDividida } from "@/components/area/tela-dividida";
import { Aviso, btnPrim } from "@/components/area/ui";
import { carregarConvite } from "@/lib/server/convites";
import { FormConvite } from "./form";

export const metadata: Metadata = {
  title: "Convite do Conselho · Prêmio Lavras de Inovação 2026",
  robots: { index: false, follow: false },
};

const MOTIVO: Record<string, string> = {
  invalido: "Este link não é válido. Confira se ele foi copiado inteiro ou peça um novo à Secretaria do Prêmio.",
  expirado: "Este link venceu (vale 7 dias). Peça um novo à Secretaria do Prêmio.",
  usado: "Este convite já foi usado. Entre com o seu e-mail e a senha que você criou.",
  inativo: "Este acesso foi desativado pela Secretaria do Prêmio.",
};

export default async function Convite({ params }: PageProps<"/convite/[token]">) {
  const { token } = await params;
  const convite = await carregarConvite(token);

  if (convite.estado !== "ok") {
    return (
      <TelaDividida
        selo="Conselho avaliador"
        titulo={
          <>
            Convite <span className="enfase">indisponível</span>
          </>
        }
        texto="Área de avaliação do COCITIEIS no Prêmio Lavras de Inovação 2026."
      >
        <Aviso tom={convite.estado === "usado" ? "info" : "alerta"}>{MOTIVO[convite.estado]}</Aviso>
        <Link href="/entrar" className={`${btnPrim} mt-6 w-full`}>
          Ir para o login
        </Link>
      </TelaDividida>
    );
  }

  const primeiro = convite.avaliador.nome.split(" ")[0];
  return (
    <TelaDividida
      selo="Conselho avaliador"
      titulo={
        <>
          Bem-vindo, <span className="enfase">{primeiro}</span>
        </>
      }
      texto="Você foi convidado a avaliar os concorrentes do Prêmio Lavras de Inovação 2026 como membro do COCITIEIS. Crie a sua senha para entrar."
    >
      <FormConvite token={token} nome={convite.avaliador.nome} email={convite.avaliador.email} />
    </TelaDividida>
  );
}
