import "server-only";
import { createHash } from "node:crypto";
import { servico } from "./sessao";

// O banco guarda só o hash do token do convite; o link em si aparece uma vez, para a Secretaria.
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export type Convite =
  | { estado: "invalido" | "expirado" | "usado" | "inativo" }
  | { estado: "ok"; conviteId: string; avaliador: { id: string; nome: string; email: string; user_id: string | null } };

export async function carregarConvite(token: string): Promise<Convite> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return { estado: "invalido" };
  const sb = servico();
  const { data: c } = await sb
    .from("convites_avaliador")
    .select("id, avaliador_id, expira_em, usado_em, revogado_em")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!c || c.revogado_em) return { estado: "invalido" };
  if (c.usado_em) return { estado: "usado" };
  if (new Date(c.expira_em) < new Date()) return { estado: "expirado" };
  const { data: av } = await sb
    .from("avaliadores")
    .select("id, nome, email, user_id, ativo")
    .eq("id", c.avaliador_id)
    .maybeSingle();
  if (!av) return { estado: "invalido" };
  if (!av.ativo) return { estado: "inativo" };
  if (av.user_id) return { estado: "usado" };
  return { estado: "ok", conviteId: c.id, avaliador: { id: av.id, nome: av.nome, email: av.email, user_id: av.user_id } };
}
