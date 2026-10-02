-- Finalistas de teste (02/10/2026): permite um ambiente de teste com votação real
-- sem que os finalistas fictícios apareçam no site oficial.
-- O site oficial filtra is_test = false; o deploy de teste mostra só os de teste.
-- Rodar no SQL Editor do Supabase de produção. Idempotente.

alter table finalists add column if not exists is_test boolean not null default false;

-- A view ganha a coluna no fim (create or replace não permite reordenar colunas).
create or replace view public_finalists
with (security_invoker = false) as
  select f.id, f.category_id, f.name, f.summary, f.image_url, f.sort_order, f.is_test
  from finalists f;

grant select on public_finalists to anon, authenticated;
