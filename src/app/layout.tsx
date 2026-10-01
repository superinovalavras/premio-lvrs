import type { Metadata, Viewport } from "next";
import { Kaushan_Script, Poppins } from "next/font/google";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

// Poppins é a substituta de trabalho da sans da marca (a fonte real não está no manual),
// a mesma da vitrine. Kaushan Script faz a palavra de ênfase em brush itálico.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const kaushan = Kaushan_Script({
  variable: "--font-kaushan",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://premio.lvrs.com.br"),
  title: "Prêmio Lavras de Inovação 2026",
  description:
    "Lavras reconhece quem transforma ideias em impacto. Conheça as 11 categorias, vote na Agro e/ou Food e/ou Tech do Ano e acompanhe a cerimônia de 17 de novembro.",
  openGraph: {
    title: "Prêmio Lavras de Inovação 2026",
    description: "Lavras, Capital do Futuro do Alimento, reconhece quem transforma ideias em impacto.",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#012928",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${poppins.variable} ${kaushan.variable} antialiased`}
    >
      <body className="min-h-screen font-sans">
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
