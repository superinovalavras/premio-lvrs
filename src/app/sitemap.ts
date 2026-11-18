import type { MetadataRoute } from "next";

const BASE = "https://premio.lvrs.com.br";

// Só as páginas públicas. Painel, avaliação e área da entidade ficam de fora (ver robots.ts).
const PAGINAS = ["", "/como-indicar", "/como-votar", "/conselho", "/cadastro", "/privacidade"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGINAS.map((p) => ({ url: `${BASE}${p}` }));
}
