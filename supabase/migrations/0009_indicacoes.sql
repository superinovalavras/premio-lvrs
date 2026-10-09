-- Formulário de indicação (09/10/2026). Fonte: ESPECIFICACAO_Plataforma_Premio_Lavras_Inovacao.pdf,
-- itens 2 e 3 (Anexo II, arts. 6º a 10, 37 do Regulamento).
--
-- Mesmo princípio das outras tabelas: o navegador não lê nem escreve nada daqui.
-- Tudo passa pelo servidor (service_role), que confere sessão, prazo e travas antes.
-- Os arquivos vão para o bucket privado "entidades", na pasta da instituição.
-- Rodar no SQL Editor do Supabase de produção. Idempotente.

create table if not exists indicacoes (
  id                  uuid primary key default gen_random_uuid(),
  entidade_id         uuid not null references entidades(id) on delete cascade,
  status              text not null default 'rascunho'
                      check (status in ('rascunho', 'enviada', 'desconsiderada')),
  category_id         uuid references categories(id),

  -- 2.1 Identificação
  indicado_nome       text,
  indicado_tipo       text check (indicado_tipo in ('pf', 'conjunto', 'instituicao')),
  indicado_documento  text check (indicado_documento ~ '^(\d{11}|\d{14})$'),  -- CPF ou CNPJ, só dígitos
  indicado_nascimento date,
  integrantes         jsonb not null default '[]',   -- [{nome, cpf, nascimento}] quando for conjunto
  aspecto_distinto    text,                          -- mesmo indicado em outra categoria (art. 6º, § 2º)

  -- 2.2 Vínculo com Lavras (art. 7º)
  vinculo_condicao    text check (vinculo_condicao in ('I', 'II', 'III')),
  vinculo_descricao   text,

  -- 2.3 A realização (Anexo II e art. 9º)
  titulo              text,
  resumo              text,
  problema            text,
  solucao             text,
  resultados          text,
  periodo_inicio      date,
  periodo_fim         date,
  beneficiarios       text,
  beneficiarios_qtd   int check (beneficiarios_qtd >= 0),

  -- 2.4 Contato do indicado (art. 10, § 1º)
  contato_nome        text,
  contato_email       text,
  contato_telefone    text,

  -- 2.5 Vínculos e conflitos (art. 9º, VII, e art. 23)
  conflito_indicador      boolean,
  conflito_indicador_desc text,
  conflito_conselho       boolean,
  conflito_conselho_desc  text,
  conflito_relacao        boolean,
  conflito_relacao_desc   text,

  submetido_em        timestamptz,   -- primeira submissão (carimbo do servidor): vale para a ordem (art. 8º, § 6º)
  versao              int not null default 0,
  criado_por          uuid references auth.users(id),
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);
create index if not exists indicacoes_entidade on indicacoes (entidade_id);
create index if not exists indicacoes_categoria on indicacoes (category_id, status);

-- Evidências (links e arquivos), evidência do vínculo, documentos comprobatórios e Anexo IV.
-- tipo: 'evidencia' | 'vinculo' | 'comprobatorio' | 'anexo_iv:<cpf>'
create table if not exists indicacao_documentos (
  id            uuid primary key default gen_random_uuid(),
  indicacao_id  uuid not null references indicacoes(id) on delete cascade,
  tipo          text not null,
  storage_path  text,
  nome_arquivo  text,
  tamanho       int,
  link          text,
  enviado_em    timestamptz not null default now(),
  check (storage_path is not null or link is not null)
);
create index if not exists indicacao_documentos_idx on indicacao_documentos (indicacao_id);

-- Cada envio guarda uma versão completa (spec 3.4: versionamento de cada indicação).
create table if not exists indicacao_versoes (
  id            bigint generated always as identity primary key,
  indicacao_id  uuid not null references indicacoes(id) on delete cascade,
  versao        int not null,
  dados         jsonb not null,
  autor_id      uuid,
  criado_em     timestamptz not null default now(),
  ip            text,
  unique (indicacao_id, versao)
);

alter table indicacoes           enable row level security;
alter table indicacao_documentos enable row level security;
alter table indicacao_versoes    enable row level security;
revoke all on indicacoes, indicacao_documentos, indicacao_versoes from anon, authenticated;
