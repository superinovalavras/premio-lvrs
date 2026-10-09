"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Loader2, Vote } from "lucide-react";
import { abrirMaterial, votar } from "@/lib/server/acoes-avaliacao";
import { Aviso, Cartao, btnPrim, btnSec } from "@/components/area/ui";
import { cn } from "@/lib/utils";

type Candidato = { id: string; nome: string; resumo: string; temMaterial: boolean };

// Art. 13: votação nominal — o voto fica registrado com o nome do conselheiro.
export function Votacao({
  rodadaId,
  candidatos,
  turno,
  aberta,
  registrado,
}: {
  rodadaId: string;
  candidatos: Candidato[];
  turno: number;
  aberta: boolean;
  registrado: { escolha: string; em: string; invalidado: string | null } | null;
}) {
  const router = useRouter();
  const [escolha, setEscolha] = useState<string | null>(registrado?.escolha ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const travado = !aberta || !!registrado;

  const confirmar = () => {
    if (!escolha) return;
    const nome = escolha === "abster" ? "abstenção" : candidatos.find((c) => c.id === escolha)?.nome;
    if (!confirm(`Registrar voto: ${nome}? O voto não pode ser alterado depois.`)) return;
    iniciar(async () => {
      const r = await votar(rodadaId, escolha);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
    });
  };

  const verMaterial = async (id: string) => {
    const w = window.open("", "_blank");
    const r = await abrirMaterial(rodadaId, id);
    if (r.ok && w) {
      w.opener = null;
      w.location.href = r.url;
    } else {
      w?.close();
      if (!r.ok) setErro(r.erro);
    }
  };

  const opcoes = [...candidatos, { id: "abster", nome: "Abster-me", resumo: "Não conta como voto válido.", temMaterial: false }];

  return (
    <div className="grid gap-4">
      {registrado ? (
        <Aviso tom={registrado.invalidado ? "erro" : "ok"}>
          {registrado.invalidado ? (
            <>Seu voto foi invalidado: {registrado.invalidado}</>
          ) : (
            <>
              <CheckCircle2 className="mr-1.5 inline size-4 text-verde" />
              Voto registrado. Ele não pode mais ser alterado.
            </>
          )}
        </Aviso>
      ) : (
        <Aviso>
          {turno === 1
            ? "Escolha uma proposta. Vence quem tiver maioria simples dos votos válidos; se ninguém tiver, as duas mais votadas vão para a 2ª rodada."
            : "2ª rodada, com as duas propostas mais votadas. Escolha uma."}{" "}
          A votação é nominal: o seu voto fica registrado com o seu nome.
        </Aviso>
      )}

      <div className="grid gap-3" role="radiogroup" aria-label="Propostas">
        {opcoes.map((c) => (
          <Cartao
            key={c.id}
            className={cn(
              "flex flex-wrap items-start gap-4 p-5 transition sm:p-6",
              escolha === c.id && "border-verde ring-2 ring-verde/30",
              !travado && "cursor-pointer hover:border-fundo/30",
            )}
          >
            <button
              type="button"
              role="radio"
              aria-checked={escolha === c.id}
              disabled={travado}
              onClick={() => setEscolha(c.id)}
              className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default"
            >
              <span className={cn("mt-1 size-5 shrink-0 rounded-full border-2", escolha === c.id ? "border-[6px] border-verde" : "border-fundo/30")} />
              <span className="min-w-0">
                <b className="block text-lg font-semibold">{c.nome}</b>
                <span className="mt-0.5 block text-sm font-light text-fundo/75">{c.resumo}</span>
              </span>
            </button>
            {c.temMaterial && (
              <button type="button" onClick={() => verMaterial(c.id)} className={btnSec}>
                <FileText className="size-4" /> Material
              </button>
            )}
          </Cartao>
        ))}
      </div>

      {erro && <Aviso tom="erro">{erro}</Aviso>}
      {!travado && (
        <button type="button" onClick={confirmar} disabled={!escolha || pendente} className={`${btnPrim} justify-self-start`}>
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Vote className="size-4" />} Registrar voto
        </button>
      )}
    </div>
  );
}
