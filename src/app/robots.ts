import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Áreas com login ou de uso interno: não aparecem na busca.
      disallow: ["/admin", "/avaliacao", "/entidade", "/entrar", "/convite", "/trocar-senha", "/api"],
    },
    sitemap: "https://premio.lvrs.com.br/sitemap.xml",
  };
}
