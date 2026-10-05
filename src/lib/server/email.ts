import "server-only";
import { servico } from "./sessao";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://premio.lvrs.com.br";

// Todo e-mail disparado fica registrado (spec, item 3.4), inclusive os que não saíram.
export async function enviarEmail(m: {
  para: string;
  assunto: string;
  tipo: string;
  entidadeId?: string | null;
  titulo: string;
  paragrafos: string[];
  botao?: { texto: string; url: string };
}) {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE ?? "Prêmio Lavras de Inovação <premio@lvrs.com.br>";
  const registro = { para: m.para, assunto: m.assunto, tipo: m.tipo, entidade_id: m.entidadeId ?? null };

  if (!chave) {
    await servico().from("emails_enviados").insert({ ...registro, status: "sem_configuracao" });
    return { ok: false as const };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: remetente, to: [m.para], subject: m.assunto, html: html(m), text: texto(m) }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    await servico()
      .from("emails_enviados")
      .insert({
        ...registro,
        status: res.ok ? "enviado" : "falhou",
        provedor_id: data.id ?? null,
        erro: res.ok ? null : (data.message ?? `HTTP ${res.status}`),
      });
    return { ok: res.ok };
  } catch (e) {
    await servico()
      .from("emails_enviados")
      .insert({ ...registro, status: "falhou", erro: String(e) });
    return { ok: false as const };
  }
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function texto(m: { titulo: string; paragrafos: string[]; botao?: { texto: string; url: string } }) {
  return [m.titulo, "", ...m.paragrafos, ...(m.botao ? ["", `${m.botao.texto}: ${m.botao.url}`] : [])].join("\n");
}

// HTML simples, com tabelas, para abrir bem em qualquer cliente de e-mail. Cores da marca LVRS+.
function html(m: { titulo: string; paragrafos: string[]; botao?: { texto: string; url: string } }) {
  const ps = m.paragrafos
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#012928">${esc(p)}</p>`)
    .join("");
  const botao = m.botao
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr><td style="background:#ffcd00;border-radius:10px"><a href="${esc(m.botao.url)}" style="display:inline-block;padding:13px 22px;font-weight:600;font-size:15px;color:#012928;text-decoration:none">${esc(m.botao.texto)}</a></td></tr></table>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f3f6f5;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f6f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#012928;padding:22px 28px"><img src="${SITE}/marca/lvrs-pacto.png" alt="LVRS+" height="34" style="display:block"/></td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#0d8049;font-weight:bold">Prêmio Lavras de Inovação 2026</p>
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#012928">${esc(m.titulo)}</h1>
${ps}${botao}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e3eae8;font-size:12px;color:#5b6f6e">Superintendência de Inovação de Lavras · Secretaria do COCITIEIS · mensagem automática</td></tr>
</table></td></tr></table></body></html>`;
}

export const URL_SITE = SITE;
