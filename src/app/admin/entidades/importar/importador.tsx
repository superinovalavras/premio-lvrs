"use client";

import { useState, useTransition } from "react";
import { Download, FileUp, Loader2 } from "lucide-react";
import { readSheet } from "read-excel-file/browser";
import writeXlsxFile from "write-excel-file/browser";
import { importarPreCadastros, type LinhaPre } from "@/lib/server/acoes-admin";
import { CartaoAdmin, btnAmarelo, btnContorno } from "@/components/admin/ui";
import { INCISOS, cnpjValido, mascaraCnpj } from "@/lib/entidades";
import { somenteDigitos } from "@/lib/voto";
import { cn } from "@/lib/utils";
import { mensagemAcesso } from "../nova/form";

// Colunas do modelo. Ajustar aqui quando a lista final de dados chegar.
const COLUNAS = [
  "Razão social",
  "CNPJ",
  "Inciso (I_II, III, IV, V, VI ou VII)",
  "Nome do representante",
  "E-mail do representante",
  "Assento no COCITIEIS (sim/não)",
  "Conselheiro",
];

type Previa = LinhaPre & { linha: number; problema?: string };

function normalizar(v: unknown) {
  return v === null || v === undefined ? "" : String(v).trim();
}

function validar(l: LinhaPre, emails: Set<string>): string | undefined {
  if (l.razao_social.length < 3) return "Razão social vazia";
  if (l.cnpj && !cnpjValido(l.cnpj)) return "CNPJ inválido";
  if (l.inciso && !INCISOS.some((i) => i.id === l.inciso)) return "Inciso inválido";
  if (l.representante.length < 5) return "Nome do representante vazio";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(l.email)) return "E-mail inválido";
  if (emails.has(l.email)) return "E-mail repetido na planilha";
  return undefined;
}

export function Importador() {
  const [previa, setPrevia] = useState<Previa[] | null>(null);
  const [arquivo, setArquivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Awaited<ReturnType<typeof importarPreCadastros>> | null>(null);
  const [pendente, iniciar] = useTransition();

  async function baixarModelo() {
    await writeXlsxFile(
      [
        COLUNAS.map((c) => ({ value: c, fontWeight: "bold" as const })),
        ["Instituição Exemplo Ltda", "11.222.333/0001-81", "VII", "Nome Sobrenome", "representante@exemplo.com.br", "não", ""],
      ],
      { columns: COLUNAS.map(() => ({ width: 30 })) },
    ).toFile("modelo-pre-cadastro-premio-2026.xlsx");
  }

  async function ler(f: File) {
    setErro(null);
    setResultado(null);
    try {
      const linhas = await readSheet(f);
      const dados = linhas.slice(1).filter((r) => r.some((c) => normalizar(c)));
      const vistos = new Set<string>();
      const lidas: Previa[] = dados.map((r, i) => {
        const assento = normalizar(r[5]).toLowerCase();
        const l: LinhaPre = {
          razao_social: normalizar(r[0]),
          cnpj: somenteDigitos(normalizar(r[1])),
          inciso: normalizar(r[2]).toUpperCase().replace(/\s*E\s*/, "_"),
          representante: normalizar(r[3]),
          email: normalizar(r[4]).toLowerCase(),
          assento: assento.startsWith("s") ? "sim" : assento.startsWith("n") ? "nao" : "",
          conselheiro: normalizar(r[6]),
        };
        const problema = validar(l, vistos);
        vistos.add(l.email);
        return { ...l, linha: i + 2, problema };
      });
      setPrevia(lidas);
      setArquivo(f.name);
      if (!lidas.length) setErro("A planilha não tem linhas preenchidas abaixo do cabeçalho.");
    } catch {
      setErro("Não foi possível ler o arquivo. Use o modelo em .xlsx.");
    }
  }

  const prontas = previa?.filter((p) => !p.problema) ?? [];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <CartaoAdmin>
          <h2 className="font-semibold">1. Baixe o modelo</h2>
          <p className="mt-1 text-[13px] text-white/70">Uma linha por instituição. Colunas: {COLUNAS.join(" · ")}.</p>
          <button type="button" onClick={baixarModelo} className={cn(btnContorno, "mt-4")}>
            <Download className="size-4" /> Baixar modelo (.xlsx)
          </button>
        </CartaoAdmin>
        <CartaoAdmin className="border-dashed">
          <h2 className="font-semibold">2. Envie a planilha preenchida</h2>
          <p className="mt-1 text-[13px] text-white/70">{arquivo ? `${arquivo} · ${previa?.length ?? 0} linhas lidas` : "Arquivo .xlsx"}</p>
          <label className={cn(btnContorno, "mt-4 cursor-pointer")}>
            <FileUp className="size-4" /> {arquivo ? "Trocar arquivo" : "Escolher arquivo"}
            <input type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && ler(e.target.files[0])} />
          </label>
        </CartaoAdmin>
      </div>

      {erro && <p className="rounded-xl border border-vermelho bg-vermelho/15 p-3 text-sm">{erro}</p>}

      {previa && previa.length > 0 && !resultado && (
        <CartaoAdmin className="overflow-x-auto">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">3. Confira</h2>
            <div className="flex gap-2 text-[11px] font-semibold uppercase tracking-[0.1em]">
              <span className="rounded-lg bg-verde/35 px-2.5 py-0.5 text-[#8ff0bd]">{prontas.length} prontas</span>
              {previa.length - prontas.length > 0 && (
                <span className="rounded-lg bg-vermelho/25 px-2.5 py-0.5 text-[#ff8a8f]">{previa.length - prontas.length} com problema</span>
              )}
            </div>
          </div>
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.16em] text-white/55">
                <th className="py-2 pr-3">Linha</th>
                <th className="py-2 pr-3">Instituição</th>
                <th className="py-2 pr-3">CNPJ</th>
                <th className="py-2 pr-3">Representante</th>
                <th className="py-2 pr-3">E-mail</th>
                <th className="py-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {previa.map((p) => (
                <tr key={p.linha} className="border-t border-white/10">
                  <td className="py-2.5 pr-3">{p.linha}</td>
                  <td className="py-2.5 pr-3">{p.razao_social}</td>
                  <td className="py-2.5 pr-3">{mascaraCnpj(p.cnpj)}</td>
                  <td className="py-2.5 pr-3">{p.representante}</td>
                  <td className="py-2.5 pr-3">{p.email}</td>
                  <td className="py-2.5">
                    {p.problema ? <span className="text-[#ff8a8f]">{p.problema}</span> : <span className="text-[#8ff0bd]">Pronta</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className={btnAmarelo}
              disabled={!prontas.length || pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await importarPreCadastros(prontas.map((p) => ({ razao_social: p.razao_social, cnpj: p.cnpj, inciso: p.inciso, representante: p.representante, email: p.email, assento: p.assento, conselheiro: p.conselheiro })));
                  setResultado(r.map((x, i) => ({ ...x, linha: prontas[i].linha })));
                })
              }
            >
              {pendente && <Loader2 className="size-4 animate-spin" />} Criar {prontas.length} acessos
            </button>
            {previa.length > prontas.length && (
              <span className="text-[13px] text-white/60">As linhas com problema ficam de fora; corrija e importe de novo.</span>
            )}
          </div>
        </CartaoAdmin>
      )}

      {resultado && (
        <CartaoAdmin>
          <h2 className="font-semibold">
            {resultado.filter((r) => r.ok).length} de {resultado.length} acessos criados
          </h2>
          <p className="mt-1 text-[13px] text-white/70">
            Senha provisória de todos: 123456 (48 horas). Copie a mensagem de cada um para enviar.
          </p>
          <ul className="mt-4 divide-y divide-white/10 text-sm">
            {resultado.map((r) => {
              const p = prontas.find((x) => x.linha === r.linha);
              return (
                <li key={r.linha} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="w-16 text-white/55">Linha {r.linha}</span>
                  <span className="min-w-0 flex-1">
                    {p?.razao_social} · {r.email}
                  </span>
                  {r.ok ? (
                    <button
                      type="button"
                      className={cn(btnContorno, "px-3 py-1.5 text-xs")}
                      onClick={() => navigator.clipboard.writeText(mensagemAcesso(p?.representante ?? "", r.email ?? ""))}
                    >
                      Copiar mensagem
                    </button>
                  ) : (
                    <span className="text-[#ff8a8f]">{r.erro}</span>
                  )}
                </li>
              );
            })}
          </ul>
          <button type="button" className={cn(btnContorno, "mt-4")} onClick={() => { setPrevia(null); setResultado(null); setArquivo(""); }}>
            Importar outra planilha
          </button>
        </CartaoAdmin>
      )}
    </div>
  );
}
