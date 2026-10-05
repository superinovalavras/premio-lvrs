// Formatação de datas no horário de Brasília — usada no site e no painel.
const TZ = "America/Sao_Paulo";

const parte = (iso: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, ...o }).format(new Date(iso));

export const dia = (iso: string) => parte(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
export const diaCurto = (iso: string) => parte(iso, { day: "2-digit", month: "2-digit" });
export const extenso = (iso: string) => parte(iso, { day: "numeric", month: "long", year: "numeric" });

// "0h", "19h", "23h59"
export function hora(iso: string) {
  const [h, m] = parte(iso, { hour: "2-digit", minute: "2-digit", hour12: false }).split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

// "06 a 11/11" ou "28/10 a 02/11"
export function periodo(abre: string, fecha: string) {
  const a = diaCurto(abre);
  const f = diaCurto(fecha);
  return a.slice(3) === f.slice(3) ? `${a.slice(0, 2)} a ${f}` : `${a} a ${f}`;
}
