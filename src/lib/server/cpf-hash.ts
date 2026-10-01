import "server-only";
import { createHmac } from "node:crypto";
import { somenteDigitos } from "@/lib/voto";

// SHA-256 puro de CPF é reversível por força bruta (são só ~10⁹ combinações).
// Por isso o hash é HMAC-SHA256 com um segredo que existe apenas no servidor:
// sem ele, a tabela de votos não permite recuperar nenhum CPF.
export function hashCpf(cpf: string) {
  const segredo = process.env.CPF_HASH_SECRET;
  if (!segredo || segredo.length < 32) {
    throw new Error("CPF_HASH_SECRET ausente ou curto (mínimo 32 caracteres).");
  }
  return createHmac("sha256", segredo).update(somenteDigitos(cpf)).digest("hex");
}
