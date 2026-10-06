import type { Metadata } from "next";
import { TopoAdmin } from "@/components/admin/ui";
import { carregarParametros, paraBrasilia } from "@/lib/server/parametros";
import { FormDatas, EditorCronograma } from "./forms";

export const metadata: Metadata = { title: "Datas e cronograma · Painel do Prêmio" };

export default async function Premio() {
  const p = await carregarParametros();
  return (
    <>
      <TopoAdmin
        selo="Prêmio"
        titulo={
          <>
            Datas e <span className="enfase">cronograma</span>
          </>
        }
        sub="O que você salva aqui vale na hora para o site, a contagem regressiva, as travas de prazo e o banco. Horário de Brasília."
      />
      <FormDatas
        valores={{
          votacao_abre: paraBrasilia(p.votacaoAbre),
          votacao_fecha: paraBrasilia(p.votacaoFecha),
          indicacoes_abrem: paraBrasilia(p.indicacoesAbrem),
          indicacoes_fecham: paraBrasilia(p.indicacoesFecham),
          gala_em: paraBrasilia(p.galaEm),
          gala_local: p.galaLocal ?? "",
        }}
      />
      <EditorCronograma etapas={p.cronograma} />
    </>
  );
}
