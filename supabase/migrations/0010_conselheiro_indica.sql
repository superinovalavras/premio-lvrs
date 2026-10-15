-- Conselheiro indica, propostas honorárias e voto de minerva (15/10/2026).
-- Fonte: Regulamento aprovado pela Resolução COCITIEIS nº 03, de 6/10/2026 —
-- art. 8º (membros do COCITIEIS indicam), art. 13 (cada membro apresenta uma proposta honorária)
-- e decisão da Secretaria: empate na rodada final das honorárias se resolve pelo voto de minerva da Presidência.
--
-- Rodar no SQL Editor do Supabase de produção. Idempotente.

-- ───────────── Indicação feita por conselheiro (art. 8º, caput) ─────────────
-- A indicação passa a ter um dono: a instituição OU o conselheiro.
alter table indicacoes alter column entidade_id drop not null;
alter table indicacoes add column if not exists avaliador_id uuid references avaliadores(id) on delete cascade;
alter table indicacoes drop constraint if exists indicacoes_um_indicador;
alter table indicacoes add constraint indicacoes_um_indicador check ((entidade_id is null) <> (avaliador_id is null));
create index if not exists indicacoes_avaliador on indicacoes (avaliador_id);

-- O aceite da declaração do indicador também vale para o conselheiro.
alter table aceites alter column entidade_id drop not null;
alter table aceites add column if not exists avaliador_id uuid references avaliadores(id) on delete cascade;

-- ───────────── Propostas das categorias honorárias (art. 13 e Anexo I) ─────────────
-- Uma proposta por conselheiro em cada categoria honorária. A Secretaria transforma as propostas
-- em concorrentes da votação nominal.
create table if not exists propostas_honorarias (
  id             uuid primary key default gen_random_uuid(),
  avaliador_id   uuid not null references avaliadores(id) on delete cascade,
  category_id    uuid not null references categories(id),
  indicado_nome  text not null,
  indicado_tipo  text not null check (indicado_tipo in ('pf', 'instituicao')),
  trajetoria     text not null,
  contribuicao   text not null,
  vinculo        text not null,
  relevancia     text not null,
  justificativa  text not null,
  contato        text,
  link           text,
  enviada_em     timestamptz not null default now(),
  atualizada_em  timestamptz not null default now(),
  finalist_id    uuid references finalists(id) on delete set null,  -- preenchido quando vira concorrente
  is_test        boolean not null default false,
  unique (avaliador_id, category_id)
);
alter table propostas_honorarias enable row level security;
revoke all on propostas_honorarias from anon, authenticated;

-- ───────────── Voto de minerva da Presidência (empate na rodada final) ─────────────
alter table rodadas add column if not exists minerva_finalist_id uuid references finalists(id);
alter table rodadas add column if not exists minerva_em timestamptz;
alter table rodadas add column if not exists minerva_por uuid references auth.users(id);
