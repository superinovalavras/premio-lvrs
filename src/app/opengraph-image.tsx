import { ImageResponse } from "next/og";
import { EDICAO_ADIADA } from "@/lib/edicao";

// Prévia do link no WhatsApp, Instagram e buscadores (1200x630).
export const alt = "Prêmio Lavras de Inovação";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "#012928",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", width: 120, height: 12, background: "#ffcd00", borderRadius: 6, marginBottom: 48 }} />
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>Prêmio Lavras</div>
        <div style={{ display: "flex", fontSize: 84, fontWeight: 700, lineHeight: 1.05, color: "#ffcd00" }}>
          de Inovação{EDICAO_ADIADA ? "" : " 2026"}
        </div>
        <div style={{ display: "flex", fontSize: 34, marginTop: 40, opacity: 0.85 }}>
          Lavras reconhece quem transforma ideias em impacto.
        </div>
        <div style={{ display: "flex", fontSize: 28, marginTop: "auto", opacity: 0.7 }}>premio.lvrs.com.br · LVRS+</div>
      </div>
    ),
    size,
  );
}
