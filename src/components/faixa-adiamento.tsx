import { Mais } from "@/components/marca";
import { AVISO_ADIAMENTO, EDICAO_ADIADA } from "@/lib/edicao";

// Faixa de ponta a ponta logo abaixo do cabeçalho enquanto a edição está adiada (ver src/lib/edicao.ts).
// O pt-16 desconta o cabeçalho fixo.
export function FaixaAdiamento() {
  if (!EDICAO_ADIADA) return null;
  return (
    <section role="status" aria-label={AVISO_ADIAMENTO.selo} className="bg-amarelo pt-16 text-fundo">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.22em]">
          <Mais className="size-4" /> {AVISO_ADIAMENTO.selo}
        </p>
        <h2 className="mt-3 max-w-4xl text-3xl font-semibold leading-tight sm:text-5xl">{AVISO_ADIAMENTO.titulo}</h2>
        <p className="mt-4 max-w-3xl text-lg sm:text-xl">{AVISO_ADIAMENTO.texto}</p>
      </div>
    </section>
  );
}
