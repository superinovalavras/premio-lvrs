"use client";

import { motion } from "framer-motion";
import { EyeOff, Fingerprint, MapPin, ShieldCheck, UserCheck, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Arcos, Mais, TagVertical } from "@/components/marca";
import { useVoto } from "@/components/voto-context";
import { estadoVotacao } from "@/lib/janela";
import { useParametros } from "@/components/parametros-context";
import { dia, hora, periodo } from "@/lib/datas";

const REGRAS = [
  { icone: UserCheck, titulo: "18 anos ou mais", texto: "Idade mínima conferida pela data de nascimento." },
  { icone: MapPin, titulo: "Vínculo com Lavras", texto: "Quem reside, estuda ou trabalha na cidade." },
  { icone: Fingerprint, titulo: "1 voto por CPF", texto: "Sem cadastro nem senha. O CPF vira um código irreversível." },
  { icone: EyeOff, titulo: "Placar sigiloso", texto: "Nenhuma parcial é divulgada. O resultado sai na cerimônia." },
];

// Bloco verde chapado com arcos amarelos no canto — a peça "O futuro que desejamos" do manual.
export function Votacao() {
  const { abrir } = useVoto();
  const { votacaoAbre, votacaoFecha } = useParametros();
  const estado = estadoVotacao(votacaoAbre, votacaoFecha);

  return (
    <section id="votacao" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-verde px-6 py-12 sm:px-12 sm:py-16">
          <Arcos canto="bottom-right" className="-bottom-16 -right-16 -z-10 size-72 sm:size-[26rem]" />

          <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.25em] text-amarelo">
                <Mais className="size-3.5" /> Votação popular · {periodo(votacaoAbre, votacaoFecha)}
              </p>
              <h2 className="mt-4 text-4xl font-medium leading-[1.12] tracking-tight sm:text-5xl">
                Sua <span className="enfase">voz</span> escolhe a Agro e/ou Food e/ou Tech do Ano
              </h2>
              <div className="mt-5 flex flex-wrap gap-4">
                <TagVertical v="agro" />
                <TagVertical v="food" />
                <TagVertical v="tech" />
              </div>
              <p className="mt-6 max-w-xl text-lg font-light text-white/85">
                É a única categoria com voto aberto ao público. O voto popular compõe 20% da nota final; os outros
                80% vêm da avaliação técnica do COCITIEIS.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button size="lg" onClick={abrir}>
                  <Vote className="size-5" />
                  {estado === "aberta" ? "Votar Agora" : "Conhecer a votação"}
                </Button>
                <span className="text-sm text-white/75">
                  {estado === "antes" && `Abre em ${dia(votacaoAbre)}, à ${hora(votacaoAbre)}`}
                  {estado === "aberta" && `Aberta até ${dia(votacaoFecha)}, às ${hora(votacaoFecha)}`}
                  {estado === "encerrada" && "Votação encerrada"}
                </span>
              </div>
              <p className="mt-6 flex max-w-lg gap-2 text-sm text-white/75">
                <ShieldCheck className="size-4 shrink-0 text-amarelo" />
                Se a nota técnica do 1º colocado superar a do 2º em 10 pontos ou mais, o voto popular não inverte o
                resultado da avaliação técnica.
              </p>
            </div>

            {/* Regras que acendem em amarelo, uma a uma, ao entrar na tela */}
            <ol className="relative space-y-3">
              {REGRAS.map((r, i) => (
                <motion.li
                  key={r.titulo}
                  initial={{ opacity: 0, x: 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-4 rounded-2xl bg-fundo p-5"
                >
                  <motion.span
                    initial={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#ffffff" }}
                    whileInView={{ backgroundColor: "#ffcd00", color: "#012928" }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ delay: 0.4 + i * 0.12, duration: 0.5 }}
                    className="grid size-11 shrink-0 place-items-center rounded-xl"
                  >
                    <r.icone className="size-5" />
                  </motion.span>
                  <div>
                    <h3 className="font-semibold">{r.titulo}</h3>
                    <p className="mt-0.5 text-sm text-white/70">{r.texto}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
