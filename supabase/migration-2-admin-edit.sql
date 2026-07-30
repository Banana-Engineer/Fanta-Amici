-- ============================================================
-- Migrazione 2 — Strumenti admin: elimina/modifica scommesse e sfide
-- Incolla questo file nel SQL Editor di Supabase e premi RUN.
-- È SICURO sul database in uso: aggiunge solo funzioni, non tocca i dati.
-- (Non rieseguire mai schema.sql su un database attivo: cancellerebbe tutto!)
-- ============================================================

-- L'admin elimina una scommessa (spariscono anche opzioni e voti, via cascade)
create or replace function public.delete_question(p_question uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  q record;
begin
  select * into q from questions where id = p_question;
  if not found then raise exception 'Quesito non trovato'; end if;
  if not public.is_admin(q.group_id) then raise exception 'Solo l''amministratore può eliminare una scommessa'; end if;
  delete from questions where id = p_question;
  insert into activities (group_id, message)
  values (q.group_id, 'L''admin ha eliminato la scommessa "' || q.title || '"');
end $$;

-- L'admin elimina una sfida (se era completata, i punti del vincitore decadono)
create or replace function public.delete_challenge(p_challenge uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  select * into c from challenges where id = p_challenge;
  if not found then raise exception 'Sfida non trovata'; end if;
  if not public.is_admin(c.group_id) then raise exception 'Solo l''amministratore può eliminare una sfida'; end if;
  delete from challenges where id = p_challenge;
  insert into activities (group_id, message)
  values (c.group_id, 'L''admin ha eliminato la sfida "' || c.title || '"');
end $$;

-- L'admin modifica il testo di una scommessa
create or replace function public.set_question_title(p_question uuid, p_title text)
returns void language plpgsql security definer set search_path = public as $$
declare
  q record;
begin
  select * into q from questions where id = p_question;
  if not found then raise exception 'Quesito non trovato'; end if;
  if not public.is_admin(q.group_id) then raise exception 'Solo l''amministratore può modificare il testo'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'Il testo non può essere vuoto'; end if;
  update questions set title = trim(p_title) where id = p_question;
  insert into activities (group_id, message)
  values (q.group_id, 'L''admin ha modificato il testo della scommessa "' || trim(p_title) || '"');
end $$;

-- L'admin modifica titolo e descrizione di una sfida
create or replace function public.set_challenge_text(p_challenge uuid, p_title text, p_description text)
returns void language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  select * into c from challenges where id = p_challenge;
  if not found then raise exception 'Sfida non trovata'; end if;
  if not public.is_admin(c.group_id) then raise exception 'Solo l''amministratore può modificare il testo'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'Il titolo non può essere vuoto'; end if;
  update challenges
  set title = trim(p_title), description = coalesce(trim(p_description), '')
  where id = p_challenge;
  insert into activities (group_id, message)
  values (c.group_id, 'L''admin ha modificato il testo della sfida "' || trim(p_title) || '"');
end $$;
