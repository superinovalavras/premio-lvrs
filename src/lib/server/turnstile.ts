import "server-only";

export async function verificarTurnstile(token: string | undefined, ip: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Sem chave só é aceitável em desenvolvimento local.
    return process.env.NODE_ENV !== "production";
  }
  if (!token) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!res.ok) return false;
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
