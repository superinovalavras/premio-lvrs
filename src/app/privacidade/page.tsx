import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Mais } from "@/components/marca";

export const metadata: Metadata = { title: "Aviso de Privacidade · Prêmio Lavras de Inovação 2026" };

// Itens exigidos pela especificação (item 3.5): controlador, finalidade, base legal, operador,
// compartilhamentos, canal de direitos e prazo de retenção. Texto provisório até a revisão da Secretaria.
const SECOES: { titulo: string; corpo: React.ReactNode }[] = [
  {
    titulo: "Quem é o controlador",
    corpo: (
      <p>
        Município de Lavras, por meio da Superintendência Municipal de Políticas de Ciência, Tecnologia e Inovação —
        Secretaria do COCITIEIS. Av. Dr. Sylvio Menicucci, 1575, Presidente Kennedy, CEP 37203-696, Lavras-MG.
      </p>
    ),
  },
  {
    titulo: "Para que usamos os dados",
    corpo: (
      <ul>
        <li>Analisar o pedido de habilitação das instituições indicadoras (art. 8º do Regulamento).</li>
        <li>Receber e processar as indicações, inclusive a checagem de autoindicação e de impedimento.</li>
        <li>Garantir um voto por CPF na votação popular e permitir a auditoria do resultado.</li>
        <li>Comunicar decisões e etapas do Prêmio a quem participa.</li>
        <li>Manter o processo administrativo do Prêmio (art. 26 do Regulamento).</li>
      </ul>
    ),
  },
  {
    titulo: "Base legal",
    corpo: (
      <p>
        Execução de política pública pela administração municipal e cumprimento das regras da Lei Municipal nº
        3.813/2011 e do Regulamento do Prêmio (Lei nº 13.709/2018 — LGPD, art. 7º, incisos II e III, e art. 23).
      </p>
    ),
  },
  {
    titulo: "CPF",
    corpo: (
      <p>
        Coletado só onde é indispensável: do representante da instituição, do indicado pessoa física e de quem vota.
        Na votação popular, o CPF é transformado no servidor em um código criptográfico irreversível antes de ser
        guardado; ele nunca é exibido nem exportado.
      </p>
    ),
  },
  {
    titulo: "Quem opera o sistema",
    corpo: (
      <p>
        A plataforma é mantida pela Superintendência de Inovação, com os seguintes serviços contratados como
        operadores: Vercel (hospedagem), Supabase (banco de dados e arquivos), Resend (envio de e-mails) e Cloudflare
        (verificação anti-robô).
      </p>
    ),
  },
  {
    titulo: "Com quem compartilhamos",
    corpo: (
      <p>
        Com os membros do COCITIEIS, apenas os dados necessários para avaliar as indicações. Os dados não são vendidos
        nem publicados. O nome de um indicado só é divulgado depois de ele ser contatado (art. 10, § 1º, do
        Regulamento).
      </p>
    ),
  },
  {
    titulo: "Segurança",
    corpo: (
      <p>
        Transmissão em HTTPS, acesso separado por perfil, documentos em armazenamento privado e registro de auditoria
        de toda criação, alteração e decisão.
      </p>
    ),
  },
  {
    titulo: "Seus direitos",
    corpo: (
      <p>
        Você pode pedir confirmação, acesso, correção ou eliminação dos seus dados, entre outros direitos do art. 18
        da LGPD, junto à Superintendência, no endereço acima.
      </p>
    ),
  },
  {
    titulo: "Por quanto tempo guardamos",
    corpo: (
      <p>
        Pelo prazo do processo administrativo do Prêmio e conforme a tabela de temporalidade documental do Município.
        Ao fim do prazo, os dados são descartados de forma segura.
      </p>
    ),
  },
];

export default function Privacidade() {
  return (
    <main className="min-h-[100svh] bg-nevoa text-fundo">
      <header className="bg-fundo text-white">
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
          <Link href="/">
            <Image src="/marca/lvrs-pacto.png" alt="LVRS+" width={900} height={520} className="h-8 w-auto" />
          </Link>
          <p className="mt-10 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amarelo">
            <Mais className="size-3.5" /> Prêmio Lavras de Inovação 2026
          </p>
          <h1 className="mt-3 pb-10 text-4xl font-medium">
            Aviso de <span className="enfase">Privacidade</span>
          </h1>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="rounded-2xl border border-amarelo bg-amarelo/15 px-4 py-3 text-sm">
          Versão em revisão pela Secretaria do COCITIEIS.
        </p>
        <div className="mt-8 space-y-8">
          {SECOES.map((s) => (
            <section key={s.titulo} className="border-l-4 border-verde pl-5">
              <h2 className="text-lg font-semibold">{s.titulo}</h2>
              <div className="mt-2 font-light leading-relaxed text-fundo/85 [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
                {s.corpo}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-12 text-sm">
          <Link href="/" className="font-semibold text-verde underline underline-offset-4">
            ← Voltar ao site do Prêmio
          </Link>
        </p>
      </article>
    </main>
  );
}
