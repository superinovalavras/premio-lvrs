import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileSpreadsheet,
  FileText,
  Home,
  Inbox,
  LayoutGrid,
  LogOut,
  Medal,
  UserPlus,
  Users,
} from "lucide-react";
import { exigirAdmin, servico } from "@/lib/server/sessao";
import { sair } from "@/lib/server/acoes-conta";
import { NavAdmin } from "./nav";
import { AvisoPendencias } from "./aviso-pendencias";
import { MenuCelular } from "./menu-celular";
import { INDICACAO_POR_INSTITUICAO } from "@/lib/edicao";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const admin = await exigirAdmin();
  const { count } = await servico().from("entidades").select("id", { count: "exact", head: true }).eq("status", "em_analise");

  // Telas das instituições indicadoras: fora do menu enquanto a indicação por instituições estiver desligada.
  const SO_INSTITUICOES = ["/admin/entidades", "/admin/entidades/nova", "/admin/entidades/importar"];
  const todos = [
    { href: "/admin/tutorial", rotulo: "Tutorial", icone: <BookOpen className="size-[18px]" /> },
    { grupo: "Prêmio" },
    { href: "/admin/premio", rotulo: "Datas e cronograma", icone: <CalendarDays className="size-[18px]" /> },
    { href: "/admin/finalistas", rotulo: "Finalistas", icone: <Medal className="size-[18px]" /> },
    { href: "/admin/categorias", rotulo: "Categorias", icone: <LayoutGrid className="size-[18px]" /> },
    { href: "/admin/documentos", rotulo: "Documentos", icone: <FileText className="size-[18px]" /> },
    { grupo: "Indicadores" },
    { href: "/admin/entidades", rotulo: "Instituições", icone: <Building2 className="size-[18px]" />, badge: count ?? 0 },
    { href: "/admin/indicacoes", rotulo: "Indicações", icone: <Inbox className="size-[18px]" /> },
    { href: "/admin/entidades/nova", rotulo: "Pré-cadastrar", icone: <UserPlus className="size-[18px]" /> },
    { href: "/admin/entidades/importar", rotulo: "Importar planilha", icone: <FileSpreadsheet className="size-[18px]" /> },
    { grupo: "Avaliação do Conselho" },
    { href: "/admin/avaliacao", rotulo: "Categorias e rodadas", icone: <ClipboardCheck className="size-[18px]" /> },
    { href: "/admin/avaliadores", rotulo: "Avaliadores", icone: <Users className="size-[18px]" /> },
    { grupo: "Em breve" },
    { rotulo: "Votação ao vivo", icone: <BarChart3 className="size-[18px]" /> },
  ];
  const itens = INDICACAO_POR_INSTITUICAO ? todos : todos.filter((x) => !("href" in x && x.href && SO_INSTITUICOES.includes(x.href)));

  // O mesmo conteúdo serve ao menu lateral (computador) e à gaveta do celular.
  const conteudoMenu = (
    <>
      <Link href="/admin" className="mb-4 flex items-center gap-2.5 border-b border-white/10 px-2 pb-4">
        <Image src="/marca/lvrs-pacto.png" alt="LVRS+" width={900} height={520} className="h-[30px] w-auto" />
        <span className="text-[9.5px] uppercase leading-snug tracking-[0.2em] text-white/75">
          Painel do Prêmio
          <br />
          Lavras de Inovação <b className="font-semibold text-amarelo">2026</b>
        </span>
      </Link>
      <NavAdmin itens={itens} />
      <div className="mt-5 space-y-1 border-t border-white/10 px-2.5 pt-4 text-xs text-white/60">
        <p className="truncate" title={admin.email}>
          {admin.email}
        </p>
        <Link href="/" className="flex min-h-9 items-center gap-1.5 hover:text-amarelo">
          <Home className="size-3.5" /> Ver o site
        </Link>
        <form action={sair}>
          <button className="flex min-h-9 items-center gap-1.5 hover:text-amarelo">
            <LogOut className="size-3.5" /> Sair
          </button>
        </form>
      </div>
    </>
  );
  const telas = itens.flatMap((x) => ("href" in x && x.href ? [{ href: x.href, rotulo: x.rotulo }] : []));

  return (
    <div className="grid min-h-[100svh] bg-fundo text-white lg:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-white/10 bg-chrome px-3.5 py-5 lg:sticky lg:top-0 lg:block lg:h-[100svh] lg:overflow-auto">
        {conteudoMenu}
      </aside>
      <MenuCelular telas={telas}>{conteudoMenu}</MenuCelular>
      <main className="min-w-0 px-4 py-7 sm:px-9 sm:pb-16">
        {!process.env.TURNSTILE_SECRET_KEY && (
          <p className="mb-6 rounded-2xl border border-amarelo/60 bg-amarelo/10 px-4 py-3 text-sm">
            <b className="font-semibold text-amarelo">Anti-robô desligado.</b> A votação funciona, mas sem proteção contra robôs. Configure
            o Cloudflare Turnstile antes da votação oficial.
          </p>
        )}
        {children}
      </main>
      <AvisoPendencias />
    </div>
  );
}
