"use client";

import { motion } from "framer-motion";
import { Clock, Download, FileText, LockKeyhole } from "lucide-react";
import { Titulo } from "@/components/titulo";
import { useParametros } from "@/components/parametros-context";
import { dia } from "@/lib/datas";

const privacidade = (gala: string) => [
  {
    titulo: "Para que usamos o CPF",
    texto:
      "Exclusivamente para garantir um voto por pessoa e permitir auditoria da votação. Ele não é usado para nenhuma outra finalidade.",
  },
  {
    titulo: "Como ele é guardado",
    texto:
      "O CPF é convertido no servidor em um código criptográfico irreversível (HMAC-SHA256) antes de ser salvo. O número em si não é armazenado.",
  },
  {
    titulo: "Os demais dados",
    texto:
      "Nome, e-mail, celular, idade e vínculo com Lavras servem para conferir a elegibilidade e auditar o resultado. Não são publicados nem compartilhados.",
  },
  {
    titulo: "Sigilo do resultado",
    texto:
      `Não há placar parcial nem percentuais. Os vencedores só são conhecidos no anúncio oficial da cerimônia, em ${dia(gala)}.`,
  },
];

export function Transparencia() {
  const { documentos: DOCUMENTOS, galaEm } = useParametros();
  const PRIVACIDADE = privacidade(galaEm);
  return (
    <section id="transparencia" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Titulo
          selo="Central de transparência"
          titulo={
            <>
              Documentos e <span className="enfase">privacidade</span>
            </>
          }
          texto="As regras do prêmio e o tratamento dos seus dados, à vista de todos."
        />

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {DOCUMENTOS.map((d, i) => {
            const conteudo = (
              <>
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-amarelo transition-colors group-hover:bg-amarelo group-hover:text-fundo">
                  <FileText className="size-5" />
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{d.titulo}</h3>
                  <p className="mt-1 text-sm font-light text-white/75">{d.descricao}</p>
                </div>
                {d.href ? (
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-amarelo">
                    <Download className="size-4" /> PDF
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-white/60">
                    <Clock className="size-3.5" /> Em breve
                  </span>
                )}
              </>
            );
            const cls =
              "group flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition-colors sm:p-6";
            return (
              <motion.div
                key={d.titulo}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                {d.href ? (
                  <a href={d.href} download className={`${cls} hover:border-amarelo/50`}>
                    {conteudo}
                  </a>
                ) : (
                  <div className={cls} aria-disabled>
                    {conteudo}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <motion.div
          id="privacidade"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7 }}
          className="mt-6 scroll-mt-24 rounded-3xl bg-chrome p-6 sm:p-10"
        >
          <div className="flex items-center gap-3">
            <LockKeyhole className="size-6 text-amarelo" />
            <h3 className="text-2xl font-medium sm:text-3xl">Aviso de Privacidade</h3>
          </div>
          <p className="mt-3 max-w-3xl font-light text-white/80">
            Tratamento de dados pessoais conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), com base no
            regulamento do Prêmio Lavras de Inovação 2026.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {PRIVACIDADE.map((p) => (
              <div key={p.titulo} className="border-l-4 border-amarelo pl-4">
                <h4 className="font-semibold text-white">{p.titulo}</h4>
                <p className="mt-1.5 text-sm font-light text-white/80">{p.texto}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
