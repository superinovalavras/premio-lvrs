import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { VotoProvider } from "@/components/voto-context";
import { Hero } from "@/components/sections/hero";
import { Eixos } from "@/components/sections/eixos";
import { Categorias } from "@/components/sections/categorias";
import { Votacao } from "@/components/sections/votacao";
import { Cronograma } from "@/components/sections/cronograma";
import { Transparencia } from "@/components/sections/transparencia";
import { carregarFinalistas } from "@/lib/server/finalistas";

// Finalistas vêm do Supabase; revalida a cada 5 min para refletir o cadastro sem novo deploy.
export const revalidate = 300;

export default async function Home() {
  const { finalistas, exemplo } = await carregarFinalistas();

  return (
    <VotoProvider finalistas={finalistas} exemplo={exemplo}>
      <Header />
      <main>
        <Hero />
        <Eixos />
        <Categorias />
        <Votacao />
        <Cronograma />
        <Transparencia />
      </main>
      <Footer />
    </VotoProvider>
  );
}
