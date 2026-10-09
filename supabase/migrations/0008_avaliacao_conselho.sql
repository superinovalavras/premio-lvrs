-- Avaliação pelo COCITIEIS (08/10/2026): login dos conselheiros por convite, declaração de
-- impedimento, fichas de avaliação com nota por critério e votação nominal das honorárias.
-- Base: Regulamento, arts. 11, 13, 15 a 23 e Anexos I e III.
--
-- Mesmo princípio das outras tabelas: o navegador não lê nem escreve nada daqui.
-- Tudo passa pelo servidor (service_role), que confere sessão e permissão antes.
-- Rodar no SQL Editor do Supabase de produção. Idempotente.

-- ───────────── Concorrentes: indicados da pré-seleção e finalistas ─────────────
-- A tabela finalists passa a guardar os concorrentes de todas as categorias.
-- etapa = 'indicado' enquanto está na pré-seleção (art. 11); 'finalista' depois.
-- O site público só mostra etapa = 'finalista'.

alter table finalists add column if not exists etapa text not null default 'finalista';
alter table finalists drop constraint if exists finalists_etapa_check;
alter table finalists add constraint finalists_etapa_check check (etapa in ('indicado', 'finalista'));
alter table finalists add column if not exists material_path text;  -- PDF da indicação, bucket privado "avaliacao"
alter table finalists add column if not exists material_nome text;
alter table finalists add column if not exists material_link text;  -- ou link para o material

-- ───────────── Avaliadores (membros do COCITIEIS e suplentes) ─────────────

create table if not exists avaliadores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users(id) on delete set null,  -- preenchido quando aceita o convite
  nome        text not null,
  email       text not null,
  papel       text not null default 'titular' check (papel in ('titular', 'suplente')),
  instituicao text,
  ativo       boolean not null default true,
  is_test     boolean not null default false,  -- avaliador de teste: só enxerga rodadas de teste, e vice-versa
  criado_em   timestamptz not null default now(),
  criado_por  uuid references auth.users(id)
);
create unique index if not exists avaliadores_email_unico on avaliadores (lower(email));

-- Convite: link pessoal, de uso único, com validade. Guarda só o hash do token.
create table if not exists convites_avaliador (
  id           uuid primary key default gen_random_uuid(),
  avaliador_id uuid not null references avaliadores(id) on delete cascade,
  token_hash   text not null unique,
  expira_em    timestamptz not null,
  usado_em     timestamptz,
  revogado_em  timestamptz,
  criado_em    timestamptz not null default now(),
  criado_por   uuid references auth.users(id)
);
create index if not exists convites_avaliador_idx on convites_avaliador (avaliador_id);

-- Aceites do avaliador (Anexo III e aviso de privacidade), com data, hora e IP.
create table if not exists aceites_avaliador (
  id           uuid primary key default gen_random_uuid(),
  avaliador_id uuid not null references avaliadores(id) on delete cascade,
  declaracao   text not null,
  texto        text not null,
  aceito_em    timestamptz not null default now(),
  ip           text,
  user_agent   text
);

-- ───────────── Rodadas ─────────────
-- pre_selecao (art. 11), final (art. 15) ou honoraria (art. 13, turno 1 ou 2).
-- candidatos = retrato dos concorrentes no momento da abertura: todos os avaliadores
-- pontuam a mesma lista (art. 15, § 1º).

create table if not exists rodadas (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references categories(id) on delete cascade,
  tipo         text not null check (tipo in ('pre_selecao', 'final', 'honoraria')),
  turno        int not null default 1 check (turno in (1, 2)),
  candidatos   uuid[] not null,
  abre_em      timestamptz not null,
  fecha_em     timestamptz not null,
  encerrada_em timestamptz,          -- encerramento antecipado pela Secretaria
  is_test      boolean not null default false,
  criado_em    timestamptz not null default now(),
  criado_por   uuid references auth.users(id),
  check (fecha_em > abre_em),
  check (cardinality(candidatos) > 0)
);
create index if not exists rodadas_categoria on rodadas (category_id);

-- ───────────── Declaração de impedimento por categoria (art. 23 e Anexo III) ─────────────

create table if not exists declaracoes_avaliador (
  id           uuid primary key default gen_random_uuid(),
  avaliador_id uuid not null references avaliadores(id) on delete cascade,
  category_id  uuid not null references categories(id) on delete cascade,
  is_test      boolean not null default false,
  impedido     boolean not null,
  hipotese     text,                 -- I a IV do art. 23, § 1º, ou 'indicou' (§ 2º)
  finalist_id  uuid references finalists(id) on delete set null,
  motivo       text,
  origem       text not null default 'avaliador' check (origem in ('avaliador', 'secretaria')),
  declarado_em timestamptz not null default now(),
  ip           text,
  user_agent   text,
  unique (avaliador_id, category_id, is_test)
);

-- ───────────── Fichas de avaliação (art. 15) ─────────────

create table if not exists fichas (
  id                uuid primary key default gen_random_uuid(),
  rodada_id         uuid not null references rodadas(id) on delete cascade,
  avaliador_id      uuid not null references avaliadores(id) on delete cascade,
  status            text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'invalidada')),
  enviada_em        timestamptz,
  ip                text,
  user_agent        text,
  invalidada_em     timestamptz,
  invalidada_motivo text,
  atualizada_em     timestamptz not null default now(),
  unique (rodada_id, avaliador_id)
);

create table if not exists fichas_notas (
  ficha_id    uuid not null references fichas(id) on delete cascade,
  finalist_id uuid not null references finalists(id) on delete restrict,
  criterio    text not null,
  nota        numeric(3,1) not null check (nota between 0 and 10),
  comentario  text,
  primary key (ficha_id, finalist_id, criterio)
);

-- Ficha enviada não muda mais (art. 15, § 5º): só pode ser invalidada.
create or replace function fichas_trava_status() returns trigger language plpgsql as $$
begin
  if old.status = 'enviada' and new.status not in ('enviada', 'invalidada') then
    raise exception 'ficha enviada não volta a rascunho';
  end if;
  if old.status = 'invalidada' and new.status <> 'invalidada' then
    raise exception 'ficha invalidada não pode ser reativada';
  end if;
  return new;
end $$;
drop trigger if exists fichas_trava on fichas;
create trigger fichas_trava before update on fichas
  for each row execute function fichas_trava_status();

create or replace function fichas_notas_trava() returns trigger language plpgsql as $$
begin
  if (select status from fichas where id = new.ficha_id) <> 'rascunho' then
    raise exception 'ficha já enviada: notas não podem ser alteradas';
  end if;
  return new;
end $$;
drop trigger if exists fichas_notas_trava on fichas_notas;
create trigger fichas_notas_trava before insert or update on fichas_notas
  for each row execute function fichas_notas_trava();

-- ───────────── Votação nominal das honorárias (art. 13) ─────────────
-- finalist_id nulo = abstenção (não entra nos votos válidos).

create table if not exists votos_honorarios (
  rodada_id         uuid not null references rodadas(id) on delete cascade,
  avaliador_id      uuid not null references avaliadores(id) on delete cascade,
  finalist_id       uuid references finalists(id) on delete restrict,
  votado_em         timestamptz not null default now(),
  ip                text,
  user_agent        text,
  invalidado_em     timestamptz,
  invalidado_motivo text,
  primary key (rodada_id, avaliador_id)
);

-- ───────────── RLS: tudo fechado para o navegador ─────────────

alter table avaliadores           enable row level security;
alter table convites_avaliador    enable row level security;
alter table aceites_avaliador     enable row level security;
alter table rodadas               enable row level security;
alter table declaracoes_avaliador enable row level security;
alter table fichas                enable row level security;
alter table fichas_notas          enable row level security;
alter table votos_honorarios      enable row level security;

revoke all on avaliadores, convites_avaliador, aceites_avaliador, rodadas, declaracoes_avaliador,
  fichas, fichas_notas, votos_honorarios
  from anon, authenticated;

-- ───────────── Storage: material das indicações (privado) ─────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avaliacao', 'avaliacao', false, 20971520, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
