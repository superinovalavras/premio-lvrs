-- Prêmio Lavras de Inovação 2026 — esquema, RLS e funções.
--
-- Princípios:
--  * O navegador (chave anon) só LÊ categorias e a vitrine pública dos finalistas.
--    Nunca lê votos, nunca lê nota técnica, nunca insere nada.
--  * O voto entra apenas pela rota /api/votar do Next (chave service_role, no servidor),
--    que valida Turnstile, idade, vínculo e CPF antes de chamar cast_vote().
--  * O CPF chega aqui já como HMAC-SHA256 (com segredo do servidor). O CPF em claro
--    não trafega para o banco e não é armazenado em lugar nenhum.
--  * Não existe função pública de contagem: o placar só é calculado por
--    compute_results(), executável apenas pelo service_role (apuração oficial).

create extension if not exists "pgcrypto";

-- ───────────────────────── Tabelas ─────────────────────────

create table if not exists categories (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  name             text not null,
  type             text not null check (type in ('competitive', 'special', 'honorary')),
  has_popular_vote boolean not null default false,
  description      text,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

-- Só uma categoria pode ter voto popular (regulamento: Agro e/ou Food e/ou Tech do Ano).
create unique index if not exists categories_single_popular_vote
  on categories (has_popular_vote) where has_popular_vote;

create table if not exists finalists (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid not null references categories(id) on delete cascade,
  name            text not null,
  summary         text not null,
  image_url       text,
  technical_score numeric(5,2) check (technical_score between 0 and 100), -- nota do COCITIEIS
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists votes (
  id                 uuid primary key default gen_random_uuid(),
  category_id        uuid not null references categories(id),
  finalist_id        uuid not null references finalists(id),
  cpf_hash           text not null,             -- HMAC-SHA256 do CPF (hex, 64 chars)
  voter_name         text not null,
  voter_email        text not null,
  voter_phone        text not null,
  voter_age          int  not null check (voter_age >= 16),
  voter_relationship text[] not null check (
    cardinality(voter_relationship) > 0
    and voter_relationship <@ array['reside', 'estuda', 'trabalha']
  ),
  created_at         timestamptz not null default now(),
  constraint votes_cpf_hash_format check (cpf_hash ~ '^[0-9a-f]{64}$'),
  constraint votes_one_per_cpf unique (category_id, cpf_hash)
);

create index if not exists votes_finalist_idx on votes (finalist_id);

-- ───────────────────────── RLS ─────────────────────────

alter table categories enable row level security;
alter table finalists  enable row level security;
alter table votes      enable row level security;

drop policy if exists "categorias são públicas" on categories;
create policy "categorias são públicas" on categories for select to anon, authenticated using (true);

-- finalists: sem policy para anon. A leitura pública passa pela view abaixo,
-- que omite technical_score.
-- votes: sem policy nenhuma. anon/authenticated não leem nem escrevem.

revoke all on votes from anon, authenticated;
revoke all on finalists from anon, authenticated;

create or replace view public_finalists
with (security_invoker = false) as
  select f.id, f.category_id, f.name, f.summary, f.image_url, f.sort_order
  from finalists f;

grant select on public_finalists to anon, authenticated;

-- ───────────────────────── Voto ─────────────────────────

-- Janela oficial: 06/11/2026 00:00 a 11/11/2026 23:59:59 (horário de Brasília).
-- Linha única. Em homologação, abra a janela editando esta linha — nunca em produção.
create table if not exists vote_window (
  id        boolean primary key default true check (id),
  opens_at  timestamptz not null,
  closes_at timestamptz not null
);
alter table vote_window enable row level security;
revoke all on vote_window from anon, authenticated;
insert into vote_window (opens_at, closes_at)
values ('2026-11-06 00:00:00-03', '2026-11-11 23:59:59-03')
on conflict (id) do nothing;

create or replace function cast_vote(
  p_finalist_id  uuid,
  p_cpf_hash     text,
  p_name         text,
  p_email        text,
  p_phone        text,
  p_age          int,
  p_relationship text[]
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category uuid;
begin
  if not exists (select 1 from vote_window w where now() between w.opens_at and w.closes_at) then
    return 'fora_do_prazo';
  end if;

  select f.category_id into v_category
  from finalists f
  join categories c on c.id = f.category_id
  where f.id = p_finalist_id and c.has_popular_vote;

  if v_category is null then
    return 'finalista_invalido';
  end if;

  if p_age < 16 then
    return 'idade_minima';
  end if;

  insert into votes (category_id, finalist_id, cpf_hash, voter_name, voter_email,
                     voter_phone, voter_age, voter_relationship)
  values (v_category, p_finalist_id, p_cpf_hash, p_name, p_email,
          p_phone, p_age, p_relationship);

  return 'ok';
exception
  when unique_violation then
    return 'cpf_ja_votou';
end;
$$;

revoke all on function cast_vote(uuid, text, text, text, text, int, text[]) from public, anon, authenticated;
grant execute on function cast_vote(uuid, text, text, text, text, int, text[]) to service_role;

-- ───────────────────────── Apuração (só service_role) ─────────────────────────
--
-- Nota final = 0,8 × nota técnica + 0,2 × nota popular normalizada.
-- Normalização adotada aqui: votos do finalista ÷ votos do mais votado × 100
-- (o mais votado recebe 100). CONFIRMAR com o texto do regulamento antes da apuração.
--
-- Trava dos 10 pontos: se a nota técnica do 1º colocado técnico superar a do 2º em
-- 10 pontos ou mais, o voto popular não inverte essa ordem — o 1º técnico vence.

create or replace function compute_results(p_category_id uuid)
returns table (
  finalist_id     uuid,
  name            text,
  technical_score numeric,
  votes           bigint,
  popular_score   numeric,
  final_score     numeric,
  rank_position   int,
  lock_applied    boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_first  numeric;
  v_second numeric;
  v_lock   boolean;
begin
  select max(f.technical_score) into v_first from finalists f where f.category_id = p_category_id;
  select f.technical_score into v_second
  from finalists f where f.category_id = p_category_id
  order by f.technical_score desc nulls last offset 1 limit 1;

  v_lock := v_first is not null and v_second is not null and (v_first - v_second) >= 10;

  return query
  with counts as (
    select f.id, f.name, coalesce(f.technical_score, 0) as tech, count(v.id) as n
    from finalists f
    left join votes v on v.finalist_id = f.id
    where f.category_id = p_category_id
    group by f.id
  ), scored as (
    select c.*,
           case when max(c.n) over () = 0 then 0
                else round(c.n::numeric / max(c.n) over () * 100, 2) end as pop
    from counts c
  ), ranked as (
    select s.*, round(0.8 * s.tech + 0.2 * s.pop, 2) as fin,
           (v_lock and s.tech = v_first) as tech_leader
    from scored s
  )
  select f.id, f.name, f.tech, f.n, f.pop, f.fin,
         (row_number() over (order by
            case when v_lock then (not f.tech_leader)::int else 0 end,
            f.fin desc, f.tech desc))::int,
         v_lock
  from ranked f
  order by 7;
end;
$$;

revoke all on function compute_results(uuid) from public, anon, authenticated;
grant execute on function compute_results(uuid) to service_role;

-- ───────────────────────── Categorias (11) ─────────────────────────

insert into categories (slug, name, type, has_popular_vote, sort_order) values
  ('empresa-inovadora',        'Empresa Inovadora',                    'competitive', false, 1),
  ('startup-revelacao',        'Startup Revelação',                    'competitive', false, 2),
  ('ciencia-que-vira-solucao', 'Ciência que Vira Solução',             'competitive', false, 3),
  ('agro-food-tech-do-ano',    'Agro e/ou Food e/ou Tech do Ano',      'competitive', true,  4),
  ('gestao-publica',           'Inovação na Gestão Pública',           'competitive', false, 5),
  ('educacao-talentos',        'Educação e Talentos do Futuro',        'competitive', false, 6),
  ('jovem-inovador',           'Jovem Inovador (15 a 29 anos)',        'competitive', false, 7),
  ('conexao-do-ano',           'Conexão do Ano',                       'competitive', false, 8),
  ('premio-lavras-lab',        'Prêmio Lavras Lab',                    'special',     false, 9),
  ('alysson-paolinelli',       'Prêmio Alysson Paolinelli',            'honorary',    false, 10),
  ('personalidade-do-ano',     'Personalidade do Ano',                 'honorary',    false, 11)
on conflict (slug) do nothing;
