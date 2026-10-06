import { NextResponse, type NextRequest } from "next/server";
import { votoSchema, idadeEm, IDADE_MINIMA } from "@/lib/voto";
import { carregarParametros } from "@/lib/server/parametros";
import { hashCpf } from "@/lib/server/cpf-hash";
import { verificarTurnstile } from "@/lib/server/turnstile";
import { supabaseServico } from "@/lib/server/supabase";
import { MODO_TESTE } from "@/lib/server/ambiente";

// Respostas nunca carregam contagem, posição ou percentual — regra de sigilo do regulamento.
function erro(status: number, mensagem: string) {
  return NextResponse.json({ ok: false, mensagem }, { status });
}

const MENSAGENS: Record<string, [number, string]> = {
  fora_do_prazo: [403, "A votação popular está fora do período de votação."],
  finalista_invalido: [400, "Finalista inválido."],
  idade_minima: [400, `É preciso ter pelo menos ${IDADE_MINIMA} anos para votar.`],
  cpf_ja_votou: [409, "Este CPF já registrou um voto. Cada CPF vota uma única vez."],
};

export async function POST(req: NextRequest) {
  const agora = new Date();
  const preview =
    MODO_TESTE || (process.env.VOTACAO_FORCAR_ABERTA === "1" && process.env.NODE_ENV !== "production");
  const { votacaoAbre, votacaoFecha } = await carregarParametros();
  if (!preview && (agora < new Date(votacaoAbre) || agora > new Date(votacaoFecha))) {
    return erro(...MENSAGENS.fora_do_prazo);
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return erro(400, "Requisição inválida.");
  }

  const parsed = votoSchema.safeParse(json);
  if (!parsed.success) {
    return erro(400, parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const v = parsed.data;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await verificarTurnstile(v.turnstileToken, ip))) {
    return erro(403, "Não foi possível confirmar que você não é um robô. Tente novamente.");
  }

  const sb = supabaseServico();
  if (!sb) return erro(503, "A votação ainda não está disponível.");

  // Site oficial só aceita finalista oficial; o link de teste só aceita finalista de teste.
  const { data: fin } = await sb.from("finalists").select("is_test").eq("id", v.finalistaId).maybeSingle();
  if (!fin || fin.is_test !== MODO_TESTE) return erro(...MENSAGENS.finalista_invalido);

  let cpfHash: string;
  try {
    cpfHash = hashCpf(v.cpf);
  } catch (e) {
    console.error(e);
    return erro(503, "A votação ainda não está disponível.");
  }

  // Guarda a idade, não a data de nascimento: é o mínimo necessário para comprovar a regra.
  const { data, error } = await sb.rpc("cast_vote", {
    p_finalist_id: v.finalistaId,
    p_cpf_hash: cpfHash,
    p_name: v.nome,
    p_email: v.email,
    p_phone: v.celular,
    p_age: idadeEm(v.nascimento),
    p_relationship: v.vinculos,
  });

  if (error) {
    console.error("cast_vote", error.code, error.message);
    return erro(500, "Não foi possível registrar o voto agora. Tente novamente em instantes.");
  }
  if (data !== "ok") {
    const [status, mensagem] = MENSAGENS[data as string] ?? [400, "Voto não registrado."];
    return erro(status, mensagem);
  }

  return NextResponse.json({ ok: true });
}
