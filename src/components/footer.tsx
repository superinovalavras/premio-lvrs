/* eslint-disable @next/next/no-img-element -- SVGs da marca com raster embutido, iguais aos da vitrine */
import Image from "next/image";
import { Arcos } from "./marca";

export function Footer() {
  return (
    <footer className="pb-10">
      {/* faixa verde com arcos — a peça "Juntos em busca de um futuro melhor" do manual */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative isolate flex flex-col gap-8 overflow-hidden rounded-[2rem] bg-verde px-6 py-10 sm:flex-row sm:items-center sm:px-12">
          <Arcos canto="bottom-right" className="-bottom-24 -right-24 -z-10 size-80 sm:-bottom-32 sm:size-[28rem]" />
          <p className="text-2xl font-medium leading-snug sm:text-3xl">
            Juntos em busca
            <br />
            de um futuro melhor.
          </p>
          <Image src="/marca/lvrs-pacto.png" alt="LVRS+ Pacto Lavras pela Inovação" width={900} height={520} className="h-20 w-auto sm:ml-10 sm:h-24" />
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-7xl px-4 sm:px-6">
        <p className="mb-6 text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-white/60">
          Realização e apoio
        </p>
        {/* Ordem definida para todo material: Prefeitura sempre primeiro */}
        <div className="flex flex-wrap items-center justify-center gap-10 lg:gap-14">
          <img src="/marca/logo-governo-lavras.svg" alt="Governo de Lavras" className="h-14 object-contain lg:h-16" />
          <img src="/marca/logo-lvrs.svg" alt="LVRS+ Pacto Lavras pela Inovação" className="h-12 object-contain lg:h-14" />
          <img src="/marca/logo-vale-ipes.svg" alt="Vale dos Ipês" className="h-14 object-contain lg:h-16" />
        </div>
        <p className="mt-10 text-center text-xs text-white/70">
          Prêmio Lavras de Inovação 2026 · Superintendência de Inovação de Lavras · Lavras, Capital do Futuro do
          Alimento
        </p>
      </div>
    </footer>
  );
}
