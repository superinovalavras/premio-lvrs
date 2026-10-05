import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CabecalhoArea, ConteudoArea } from "@/components/area/cabecalho";
import { exigirUsuario } from "@/lib/server/sessao";
import { carregarEntidadeDoUsuario } from "@/lib/server/entidades-dados";
import { calcularPendencias, podeEditar } from "@/lib/entidades";
import { FormularioCadastro } from "./formulario";

export const metadata: Metadata = { title: "Cadastro da instituição · Prêmio Lavras de Inovação 2026" };

export default async function CadastroEntidade() {
  const user = await exigirUsuario();
  const dados = await carregarEntidadeDoUsuario(user.id);
  if (!dados) redirect("/entidade");
  const nome = dados.titular?.nome ?? (user.user_metadata?.nome as string) ?? user.email ?? "";
  const editavel = podeEditar(dados.entidade.status);

  return (
    <>
      <CabecalhoArea
        nome={nome}
        selo="Cadastro da instituição indicadora"
        titulo={
          editavel ? (
            <>
              Cadastro em <span className="enfase">5 passos</span>
            </>
          ) : (
            <>
              Cadastro <span className="enfase">enviado</span>
            </>
          )
        }
        texto={
          editavel
            ? "Cada passo é salvo ao continuar — você pode parar e voltar depois. A Secretaria Executiva analisa em até 1 dia útil."
            : "O cadastro está com a Secretaria Executiva e não pode ser alterado agora."
        }
      />
      <ConteudoArea>
        <FormularioCadastro
          entidade={dados.entidade}
          titular={dados.titular}
          suplente={dados.suplente}
          documentos={dados.documentos}
          pendencias={calcularPendencias(dados.entidade, dados.representantes, dados.documentos)}
          editavel={editavel}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          supabaseAnon={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
        />
      </ConteudoArea>
    </>
  );
}
