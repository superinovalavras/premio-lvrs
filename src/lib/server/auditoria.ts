import "server-only";
import type { User } from "@supabase/supabase-js";
import { ipDaRequisicao, servico } from "./sessao";

// Trilha de auditoria (art. 26): toda criação, edição, decisão e exclusão, com autor, data, hora e IP.
// A tabela é só-inserção no banco (trigger bloqueia update/delete).
export async function auditar(
  autor: Pick<User, "id" | "email"> | null,
  acao: string,
  alvo: { tipo: string; id: string } | null,
  detalhes?: Record<string, unknown>,
) {
  const { error } = await servico()
    .from("auditoria")
    .insert({
      autor_id: autor?.id ?? null,
      autor_email: autor?.email ?? null,
      acao,
      alvo_tipo: alvo?.tipo ?? null,
      alvo_id: alvo?.id ?? null,
      detalhes: detalhes ?? null,
      ip: await ipDaRequisicao(),
    });
  if (error) console.error("auditoria", error.message);
}
