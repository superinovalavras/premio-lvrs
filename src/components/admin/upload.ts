"use client";

import { createClient } from "@supabase/supabase-js";
import { prepararUploadPublico } from "@/lib/server/acoes-parametros";
import { prepararUploadMaterial } from "@/lib/server/acoes-avaliacao-admin";

// Envia direto para o Storage público com URL assinada pelo servidor.
export async function enviarArquivoPublico(pasta: "documentos" | "finalistas", f: File) {
  const prep = await prepararUploadPublico(pasta, f.name, f.size, f.type);
  if (!prep.ok) return prep;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await sb.storage.from("publico").uploadToSignedUrl(prep.caminho, prep.token, f, { contentType: f.type });
  if (error) return { ok: false as const, erro: "Falha no envio do arquivo. Tente de novo." };
  return { ok: true as const, caminho: prep.caminho };
}

// Material das indicações (PDF) vai para o bucket privado "avaliacao"; só o servidor gera link de leitura.
export async function enviarMaterial(f: File) {
  const prep = await prepararUploadMaterial(f.name, f.size, f.type);
  if (!prep.ok) return prep;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await sb.storage.from("avaliacao").uploadToSignedUrl(prep.caminho, prep.token, f, { contentType: f.type });
  if (error) return { ok: false as const, erro: "Falha no envio do arquivo. Tente de novo." };
  return { ok: true as const, caminho: prep.caminho };
}
