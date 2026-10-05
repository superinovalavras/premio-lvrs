-- Cadastro das entidades indicadoras (05/10/2026).
-- Fonte: ESPECIFICACAO_Plataforma_Premio_Lavras_Inovacao.pdf, item 1 (art. 2º-B da Lei 3.813/2011
-- e art. 8º do Regulamento).
--
-- Mesmo princípio da votação: o navegador não lê nem escreve nenhuma destas tabelas.
-- Tudo passa pelo servidor (chave service_role), que confere sessão e permissão antes.
-- Por isso RLS ligado e nenhuma policy para anon/authenticated.
-- Rodar no SQL Editor do Supabase de produção. Idempotente.

-- ───────────── Administradores (Secretaria Executiva) ─────────────

create table if not exists admins (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text not null,
  criado_em timestamptz not null default now()
);

-- ───────────── Entidade ─────────────

create table if not exists entidades (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid unique references auth.users(id) on delete set null, -- conta do representante titular
  status             text not null default 'rascunho'
                     check (status in ('rascunho', 'em_analise', 'pendente_ajuste', 'deferido', 'indeferido')),
  inciso             text check (inciso in ('I_II', 'III', 'IV', 'V', 'VI', 'VII')),
  razao_social       text,
  nome_fantasia      text,
  cnpj               text check (cnpj ~ '^\d{14}$'),
  unidade_municipal  text,                -- órgão municipal sem CNPJ próprio usa o da Prefeitura e informa a unidade
  natureza_juridica  text,
  endereco           text,
  data_constituicao  date,
  site               text,
  assento_cocitieis  boolean,
  conselheiro_nome   text,                -- vínculo provisório até o cadastro de conselheiros (spec, item 4)
  criterios_vii      text[] not null default '{}',
  pre_cadastrado     boolean not null default false,
  submetido_em       timestamptz,         -- primeira submissão (carimbo do servidor)
  decidido_em        timestamptz,
  decidido_por       uuid references auth.users(id),
  motivo             text,                -- motivo do indeferimento ou do pedido de ajuste
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);

-- CNPJ único na base; órgãos municipais repetem o CNPJ da Prefeitura e se distinguem pela unidade.
create unique index if not exists entidades_cnpj_unico
  on entidades (cnpj, coalesce(lower(unidade_municipal), ''))
  where cnpj is not null;

-- ───────────── Representantes (titular e suplente) ─────────────

create table if not exists representantes (
  id           uuid primary key default gen_random_uuid(),
  entidade_id  uuid not null references entidades(id) on delete cascade,
  papel        text not null check (papel in ('titular', 'suplente')),
  nome         text,
  cpf          text check (cpf ~ '^\d{11}$'),
  cargo        text,
  email        text,
  telefone     text,
  atualizado_em timestamptz not null default now(),
  unique (entidade_id, papel)
);

-- ───────────── Documentos (arquivos no Storage ou links) ─────────────

create table if not exists entidade_documentos (
  id            uuid primary key default gen_random_uuid(),
  entidade_id   uuid not null references entidades(id) on delete cascade,
  tipo          text not null,            -- ex.: cartao_cnpj, ato_designacao_titular, criterio:incubacao
  storage_path  text,                     -- bucket "entidades"
  nome_arquivo  text,
  tamanho       int,
  link          text,
  enviado_em    timestamptz not null default now(),
  check (storage_path is not null or link is not null)
);
create index if not exists entidade_documentos_entidade on entidade_documentos (entidade_id);

-- ───────────── Aceites das declarações (data, hora e IP) ─────────────

create table if not exists aceites (
  id           uuid primary key default gen_random_uuid(),
  entidade_id  uuid not null references entidades(id) on delete cascade,
  user_id      uuid references auth.users(id),
  declaracao   text not null,             -- regulamento, impedimento, veracidade, privacidade
  texto        text not null,             -- o texto exato aceito
  aceito_em    timestamptz not null default now(),
  ip           text,
  user_agent   text
);

-- ───────────── Trilha de auditoria (art. 26) — só inserção ─────────────

create table if not exists auditoria (
  id          bigint generated always as identity primary key,
  em          timestamptz not null default now(),
  autor_id    uuid,
  autor_email text,
  acao        text not null,
  alvo_tipo   text,
  alvo_id     text,
  detalhes    jsonb,
  ip          text
);
create index if not exists auditoria_alvo on auditoria (alvo_tipo, alvo_id);

-- Imutável: ninguém altera nem apaga, nem o service_role.
create or replace function auditoria_imutavel() returns trigger language plpgsql as $$
begin
  raise exception 'auditoria é imutável';
end $$;
drop trigger if exists auditoria_sem_update on auditoria;
create trigger auditoria_sem_update before update or delete on auditoria
  for each row execute function auditoria_imutavel();

-- ───────────── Registro de e-mails disparados ─────────────

create table if not exists emails_enviados (
  id           bigint generated always as identity primary key,
  em           timestamptz not null default now(),
  para         text not null,
  assunto      text not null,
  tipo         text not null,
  entidade_id  uuid references entidades(id) on delete set null,
  status       text not null,             -- enviado | falhou | sem_configuracao
  provedor_id  text,
  erro         text
);

-- ───────────── RLS: tudo fechado para o navegador ─────────────

alter table admins             enable row level security;
alter table entidades          enable row level security;
alter table representantes     enable row level security;
alter table entidade_documentos enable row level security;
alter table aceites            enable row level security;
alter table auditoria          enable row level security;
alter table emails_enviados    enable row level security;

revoke all on admins, entidades, representantes, entidade_documentos, aceites, auditoria, emails_enviados
  from anon, authenticated;

-- ───────────── Storage: bucket privado para os documentos ─────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('entidades', 'entidades', false, 10485760,
        array['application/pdf', 'image/png', 'image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
