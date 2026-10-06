-- Aviso "Security Definer View" do Supabase (06/10/2026): o site passou a ler os finalistas
-- pelo servidor, então a view pública deixa de ser necessária e sai do caminho.
-- Rodar no SQL Editor DEPOIS do deploy que tira o uso da view. Idempotente.

revoke select on public_finalists from anon, authenticated;
alter view public_finalists set (security_invoker = true);
