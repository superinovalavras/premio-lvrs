"use client";

/* eslint-disable @next/next/no-img-element -- prints estáticos do próprio painel */
import { useState } from "react";
import { cn } from "@/lib/utils";

export type Ponto = { x: number; y: number; legenda: string };
export type Tela = { imagem: string; pontos: Ponto[] };
export type Topico = { id: string; titulo: string; telas: Tela[] };

// Prints em 1366×860. As setas usam o mesmo sistema de coordenadas, então acompanham o tamanho da imagem.
const W = 1366;
const H = 860;

// Cada marcador fica na mesma altura do alvo, ao lado (seta horizontal);
// se encostar em outro marcador, desce ou sobe um pouco.
function posicionar(pontos: Ponto[]) {
  const pinos: { tx: number; ty: number; px: number; py: number }[] = [];
  for (const p of pontos) {
    const tx = (p.x / 100) * W;
    const ty = (p.y / 100) * H;
    const px = tx > 320 ? tx - 190 : tx + 190;
    let py = ty;
    for (let k = 1; k < 10 && pinos.some((o) => Math.hypot(o.px - px, o.py - py) < 64); k++) {
      py = Math.min(H - 34, Math.max(34, ty + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 64));
    }
    pinos.push({ tx, ty, px, py });
  }
  return pinos;
}

function Marcadores({ pontos, inicio }: { pontos: Ponto[]; inicio: number }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 size-full" aria-hidden>
      <defs>
        <marker id="ponta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" fill="#ffcd00" />
        </marker>
      </defs>
      {posicionar(pontos).map(({ tx, ty, px, py }, i) => {
        const ang = Math.atan2(ty - py, tx - px);
        const sx = px + Math.cos(ang) * 28;
        const sy = py + Math.sin(ang) * 28;
        const ex = tx - Math.cos(ang) * 30;
        const ey = ty - Math.sin(ang) * 30;
        return (
          <g key={i}>
            <circle cx={tx} cy={ty} r="26" fill="none" stroke="#ffcd00" strokeWidth="4" className="tut-pulso" />
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#ffcd00" strokeWidth="5" strokeLinecap="round" markerEnd="url(#ponta)" />
            <circle cx={px} cy={py} r="26" fill="#ffcd00" stroke="#012928" strokeWidth="4" />
            <text x={px} y={py + 10} textAnchor="middle" fontSize="28" fontWeight="700" fill="#012928" fontFamily="Poppins, sans-serif">
              {inicio + i}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Tutorial({ topicos }: { topicos: Topico[] }) {
  const [ativo, setAtivo] = useState(topicos[0]?.id);
  const t = topicos.find((x) => x.id === ativo) ?? topicos[0];
  if (!t) return null;
  // numeração contínua entre as telas do mesmo tópico
  const inicios = t.telas.map((_, j) => 1 + t.telas.slice(0, j).reduce((s, x) => s + x.pontos.length, 0));

  return (
    <div className="grid gap-5 xl:grid-cols-[230px_1fr] xl:items-start">
      <nav className="grid gap-1.5 xl:sticky xl:top-6" aria-label="Tópicos do tutorial">
        {topicos.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setAtivo(x.id)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-medium transition",
              x.id === t.id ? "bg-amarelo text-fundo" : "text-white/80 hover:bg-white/5",
            )}
          >
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold",
                x.id === t.id ? "bg-fundo text-amarelo" : "bg-white/10",
              )}
            >
              {i + 1}
            </span>
            {x.titulo}
          </button>
        ))}
      </nav>

      <div className="grid gap-6">
        {t.telas.map((tela, j) => {
          const inicio = inicios[j];
          return (
            <figure key={tela.imagem} className="grid gap-3">
              {t.telas.length > 1 && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amarelo">Tela {j + 1}</p>
              )}
              <div className="relative overflow-hidden rounded-2xl border border-white/15 shadow-2xl" style={{ aspectRatio: `${W} / ${H}` }}>
                <img src={tela.imagem} alt={`${t.titulo} — tela ${j + 1}`} className="absolute inset-0 size-full" />
                <Marcadores pontos={tela.pontos} inicio={inicio} />
              </div>
              <figcaption className="flex flex-wrap gap-x-6 gap-y-2">
                {tela.pontos.map((p, i) => (
                  <span key={i} className="flex items-center gap-2 text-sm">
                    <span className="grid size-6 place-items-center rounded-full bg-amarelo text-[12px] font-bold text-fundo">
                      {inicio + i}
                    </span>
                    {p.legenda}
                  </span>
                ))}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
