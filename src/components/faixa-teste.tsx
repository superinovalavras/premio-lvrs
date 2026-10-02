// Aviso fixo no ambiente de teste, para ninguém confundir com o site oficial.
export function FaixaTeste() {
  if (process.env.NEXT_PUBLIC_AMBIENTE_TESTE !== "1") return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-[60] bg-amarelo px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.15em] text-fundo"
    >
      Ambiente de teste · finalistas fictícios · os votos daqui serão apagados
    </div>
  );
}
