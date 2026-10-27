// TEMPORÁRIO (27/10/2026): mede a latência entre a função da Vercel e o Supabase. Remover depois.
export const dynamic = "force-dynamic";
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const tempos: number[] = [];
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    await fetch(`${url}/auth/v1/health`, { cache: "no-store", headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } });
    tempos.push(Math.round(performance.now() - t));
  }
  return Response.json({ regiao: process.env.VERCEL_REGION ?? null, ms: tempos });
}
