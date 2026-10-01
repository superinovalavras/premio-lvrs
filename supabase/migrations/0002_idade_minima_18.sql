-- Mudança de regra (01/10/2026): votação popular só para maiores de 18 anos (antes 16).
-- Rodar no SQL Editor do Supabase de produção. Idempotente.

alter table votes drop constraint if exists votes_voter_age_check;
alter table votes add constraint votes_voter_age_check check (voter_age >= 18);

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

  if p_age < 18 then
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
