-- Acesso do conselheiro pelo nome completo (16/10/2026). O e-mail passa a ser opcional:
-- serve só para recuperar a senha. A conta de login usa um e-mail técnico interno.
--
-- Rodar no SQL Editor do Supabase de produção. Idempotente.

alter table avaliadores alter column email drop not null;
