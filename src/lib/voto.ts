// Regras do eleitor — usadas no formulário (feedback imediato) e revalidadas no servidor.
import { z } from "zod";

export const IDADE_MINIMA = 18;
export const VINCULOS = ["reside", "estuda", "trabalha"] as const;
export type Vinculo = (typeof VINCULOS)[number];

export const VINCULO_LABEL: Record<Vinculo, string> = {
  reside: "Resido em Lavras",
  estuda: "Estudo em Lavras",
  trabalha: "Trabalho em Lavras",
};

export function somenteDigitos(v: string) {
  return v.replace(/\D/g, "");
}

export function cpfValido(valor: string) {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(cpf.slice(0, 9), 10) === Number(cpf[9]) && dv(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export function mascaraCpf(v: string) {
  const d = somenteDigitos(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function mascaraCelular(v: string) {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Idade na data de hoje em Brasília. `nascimento` no formato AAAA-MM-DD.
export function idadeEm(nascimento: string, hoje = new Date()) {
  const [a, m, d] = nascimento.split("-").map(Number);
  if (!a || !m || !d) return NaN;
  const [ha, hm, hd] = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" })
    .format(hoje)
    .split("-")
    .map(Number);
  let idade = ha - a;
  if (hm < m || (hm === m && hd < d)) idade--;
  return idade;
}

export const votoSchema = z.object({
  finalistaId: z.string().uuid("Finalista inválido."),
  nome: z.string().trim().min(5, "Informe o nome completo.").max(120)
    .refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome."),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(160),
  celular: z.string().transform(somenteDigitos)
    .refine((v) => /^\d{2}9\d{8}$/.test(v), "Celular inválido — use DDD + 9 dígitos."),
  nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento inválida.")
    .refine((v) => {
      const idade = idadeEm(v);
      return idade >= IDADE_MINIMA && idade <= 120;
    }, `É preciso ter pelo menos ${IDADE_MINIMA} anos para votar.`),
  cpf: z.string().refine(cpfValido, "CPF inválido."),
  vinculos: z.array(z.enum(VINCULOS)).min(1, "Declare pelo menos um vínculo com Lavras."),
  declaracao: z.literal(true, { message: "Confirme a declaração de vínculo." }),
  privacidade: z.literal(true, { message: "É preciso aceitar o aviso de privacidade." }),
  turnstileToken: z.string().optional(),
});

export type VotoInput = z.input<typeof votoSchema>;
