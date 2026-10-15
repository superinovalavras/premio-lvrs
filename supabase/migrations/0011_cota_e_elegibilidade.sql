-- Cota conjunta (art. 8º, § 7º, do Regulamento final de 15/10/2026): as indicações da instituição com
-- assento no COCITIEIS e as do seu representante somam para os limites de 2 por categoria e 6 no total.
-- O painel liga cada conselheiro à instituição cadastrada que ele representa.
--
-- Rodar no SQL Editor do Supabase de produção. Idempotente.

alter table avaliadores add column if not exists entidade_id uuid references entidades(id) on delete set null;
create index if not exists avaliadores_entidade on avaliadores (entidade_id);

-- ───────────── Análise de elegibilidade e reconsideração (art. 10 e art. 8º-A, III e IV) ─────────────
-- A Secretaria marca cada indicação enviada como apta ou inapta (com motivo), comunica indicador e indicado,
-- registra o pedido de reconsideração e a decisão. As aptas viram concorrentes ("indicado") da categoria.
alter table indicacoes add column if not exists analise              text check (analise in ('apta', 'inapta'));
alter table indicacoes add column if not exists analise_motivo       text;
alter table indicacoes add column if not exists analisada_em         timestamptz;
alter table indicacoes add column if not exists analisada_por        uuid references auth.users(id);
alter table indicacoes add column if not exists comunicada_em        timestamptz;
alter table indicacoes add column if not exists reconsideracao       text;          -- o pedido, como chegou pelo canal oficial
alter table indicacoes add column if not exists reconsideracao_em    timestamptz;   -- quando chegou
alter table indicacoes add column if not exists reconsideracao_decisao text check (reconsideracao_decisao in ('deferida', 'indeferida'));
alter table indicacoes add column if not exists reconsideracao_motivo  text;
alter table indicacoes add column if not exists reconsideracao_decidida_em timestamptz;
alter table indicacoes add column if not exists finalist_id          uuid references finalists(id) on delete set null;

-- ───────────── Votos recusados da participação popular (art. 19, § 6º) ─────────────
-- O relatório de apuração divulga totais de votos válidos e inválidos. Guarda só o motivo e a hora:
-- nenhum dado pessoal de quem tentou votar.
create table if not exists votos_recusados (
  id        bigint generated always as identity primary key,
  motivo    text not null check (motivo in ('dados_invalidos', 'robo', 'finalista_invalido', 'cpf_repetido', 'idade')),
  is_test   boolean not null default false,
  criado_em timestamptz not null default now()
);
alter table votos_recusados enable row level security;
revoke all on votos_recusados from anon, authenticated;
