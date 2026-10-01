"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function carregarScript() {
  if (window.turnstile) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    let s = document.querySelector<HTMLScriptElement>(`script[src="${SRC}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => resolve());
    s.addEventListener("error", () => reject(new Error("turnstile")));
  });
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

// Cloudflare Turnstile — anti-robô sem quebra-cabeça para a maioria das pessoas.
export function Turnstile({ onToken }: { onToken: (t: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let id: string | undefined;
    let vivo = true;
    carregarScript()
      .then(() => {
        if (!vivo || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: "pt-br",
          theme: "dark",
          callback: (t: string) => onToken(t),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch(() => onToken(null));
    return () => {
      vivo = false;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, [onToken]);

  if (!TURNSTILE_SITE_KEY) {
    return (
      <p className="rounded-xl border border-dashed border-amarelo/40 p-3 text-xs text-amarelo/80">
        Verificação anti-robô desativada (NEXT_PUBLIC_TURNSTILE_SITE_KEY não configurada) — só aceitável em
        desenvolvimento.
      </p>
    );
  }
  return <div ref={ref} className="min-h-[65px]" />;
}
