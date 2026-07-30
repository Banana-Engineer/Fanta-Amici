-- ============================================================
-- FantaAmici — Schema completo per Supabase
-- Incolla tutto questo file nel SQL Editor di Supabase e premi RUN.
-- Si può eseguire più volte: la sezione PULIZIA elimina e ricrea
-- tutto da zero (ATTENZIONE: cancella anche i dati del gioco!).
-- ============================================================

-- ---------- PULIZIA ----------

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.activities cascade;
drop table if exists public.challenges cascade;
drop table if exists public.votes cascade;
drop table if exists public.question_options cascade;
drop table if exists public.questions cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop table if exists public.profiles cascade;

drop type if exists public.question_type cascade;
drop type if exists public.question_status cascade;
drop type if exists public.challenge_status cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.log_challenge_insert() cascade;
drop function if exists public.is_member(uuid);
drop function if exists public.is_admin(uuid);
drop function if exists public.question_group(uuid);
drop function if exists public.has_voted(uuid);
drop function if exists public.can_vote(uuid);
drop function if exists public.votes_visible(uuid);
drop function if exists public.create_group(text);
drop function if exists public.join_group(text);
-- (create_question viene eliminata automaticamente dal drop del tipo question_type)
drop function if exists public.close_question(uuid);
drop function if exists public.resolve_question(uuid, uuid[], numeric);
drop function if exists public.set_question_points(uuid, numeric);
drop function if exists public.set_challenge_points(uuid, numeric);
drop function if exists public.award_challenge(uuid, uuid);
drop function if exists public.get_leaderboard(uuid);
drop function if exists public.get_my_groups();
drop function if exists public.delete_question(uuid);
drop function if exists public.delete_challenge(uuid);
drop function if exists public.set_question_title(uuid, text);
drop function if exists public.set_challenge_text(uuid, text, text);

-- ---------- TABELLE ----------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  admin_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create type public.question_type as enum ('true_false', 'single', 'multiple', 'number');
create type public.question_status as enum ('open', 'closed', 'resolved');

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  creator_id uuid not null references public.profiles(id),
  title text not null,
  qtype public.question_type not null,
  points numeric not null check (points > 0),
  expires_at timestamptz,
  status public.question_status not null default 'open',
  correct_number numeric,
  created_at timestamptz not null default now()
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  is_correct boolean not null default false,
  idx int not null default 0
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_ids uuid[],
  number_answer numeric,
  points_awarded numeric,
  created_at timestamptz not null default now(),
  unique (question_id, user_id)
);

create type public.challenge_status as enum ('active', 'completed');

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  creator_id uuid not null references public.profiles(id),
  title text not null,
  description text not null default '',
  points numeric not null check (points > 0),
  status public.challenge_status not null default 'active',
  winner_id uuid references public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------- PROFILO AUTOMATICO ALLA REGISTRAZIONE ----------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- FUNZIONI DI SUPPORTO (security definer: aggirano la RLS in modo controllato) ----------

create or replace function public.is_member(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from group_members where group_id = gid and user_id = auth.uid());
$$;

create or replace function public.is_admin(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from groups where id = gid and admin_id = auth.uid());
$$;

create or replace function public.question_group(qid uuid)
returns uuid language sql security definer stable set search_path = public as $$
  select group_id from questions where id = qid;
$$;

create or replace function public.has_voted(qid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from votes where question_id = qid and user_id = auth.uid());
$$;

create or replace function public.can_vote(qid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from questions q
    where q.id = qid
      and q.status = 'open'
      and (q.expires_at is null or q.expires_at > now())
      and public.is_member(q.group_id)
  );
$$;

-- I voti degli altri diventano visibili a tutti quando la votazione è finita
create or replace function public.votes_visible(qid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from questions q
    where q.id = qid
      and (q.status in ('closed', 'resolved')
           or (q.expires_at is not null and q.expires_at <= now()))
  );
$$;

-- ---------- ROW LEVEL SECURITY ----------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.votes enable row level security;
alter table public.challenges enable row level security;
alter table public.activities enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated using (true);

create policy groups_select on public.groups
  for select to authenticated using (public.is_member(id));

create policy group_members_select on public.group_members
  for select to authenticated using (public.is_member(group_id));

create policy questions_select on public.questions
  for select to authenticated using (public.is_member(group_id));

create policy question_options_select on public.question_options
  for select to authenticated using (public.is_member(public.question_group(question_id)));

-- Segretezza del voto: vedi i voti altrui solo dopo aver votato tu stesso
-- (oppure quando la votazione è chiusa/scaduta/risolta). I voti non si
-- possono né modificare né cancellare: nessuna policy di update/delete.
create policy votes_select on public.votes
  for select to authenticated using (
    user_id = auth.uid()
    or public.has_voted(question_id)
    or public.votes_visible(question_id)
  );

create policy votes_insert on public.votes
  for insert to authenticated with check (
    user_id = auth.uid() and public.can_vote(question_id)
  );

create policy challenges_select on public.challenges
  for select to authenticated using (public.is_member(group_id));

create policy challenges_insert on public.challenges
  for insert to authenticated with check (
    public.is_member(group_id)
    and creator_id = auth.uid()
    and status = 'active'
    and winner_id is null
  );

create policy activities_select on public.activities
  for select to authenticated using (public.is_member(group_id));

-- ---------- ATTIVITÀ AUTOMATICA PER LE SFIDE ----------

create or replace function public.log_challenge_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into activities (group_id, message)
  values (new.group_id,
          (select username from profiles where id = new.creator_id)
          || ' ha creato la sfida "' || new.title || '"');
  return new;
end $$;

create trigger on_challenge_created
  after insert on public.challenges
  for each row execute function public.log_challenge_insert();

-- ---------- FUNZIONI DELL'APP (RPC) ----------

-- Crea un gruppo e aggiunge il creatore come admin e primo membro
create or replace function public.create_group(p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  gid uuid;
begin
  if auth.uid() is null then raise exception 'Devi essere loggato'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Il nome del gruppo è obbligatorio'; end if;
  insert into groups (name, admin_id) values (trim(p_name), auth.uid()) returning id into gid;
  insert into group_members (group_id, user_id) values (gid, auth.uid());
  insert into activities (group_id, message)
  values (gid, 'Il gruppo "' || trim(p_name) || '" è stato creato');
  return gid;
end $$;

-- Entra in un gruppo tramite codice di invito
create or replace function public.join_group(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  g record;
begin
  if auth.uid() is null then raise exception 'Devi essere loggato'; end if;
  select * into g from groups where upper(code) = upper(trim(p_code));
  if not found then raise exception 'Link di invito non valido'; end if;
  if not exists (select 1 from group_members where group_id = g.id and user_id = auth.uid()) then
    insert into group_members (group_id, user_id) values (g.id, auth.uid());
    insert into activities (group_id, message)
    values (g.id, (select username from profiles where id = auth.uid()) || ' si è unito al gruppo');
  end if;
  return g.id;
end $$;

-- Crea un quesito con le sue opzioni (operazione atomica)
create or replace function public.create_question(
  p_group_id uuid,
  p_title text,
  p_qtype public.question_type,
  p_points numeric,
  p_expires_at timestamptz,
  p_options text[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  qid uuid;
  i int;
begin
  if not public.is_member(p_group_id) then raise exception 'Non fai parte di questo gruppo'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'Il titolo è obbligatorio'; end if;
  if p_points is null or p_points <= 0 then raise exception 'Il valore in punti deve essere maggiore di zero'; end if;
  if p_qtype = 'number' then
    if p_options is not null and cardinality(p_options) > 0 then
      raise exception 'Un quesito numerico non ha opzioni';
    end if;
  elsif p_options is null or cardinality(p_options) < 2 then
    raise exception 'Servono almeno 2 opzioni di risposta';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'La data di scadenza deve essere nel futuro';
  end if;

  insert into questions (group_id, creator_id, title, qtype, points, expires_at)
  values (p_group_id, auth.uid(), trim(p_title), p_qtype, p_points, p_expires_at)
  returning id into qid;

  if p_options is not null then
    for i in 1 .. cardinality(p_options) loop
      insert into question_options (question_id, label, idx) values (qid, trim(p_options[i]), i);
    end loop;
  end if;

  insert into activities (group_id, message)
  values (p_group_id, (select username from profiles where id = auth.uid())
          || ' ha creato la scommessa "' || trim(p_title) || '"');
  return qid;
end $$;

-- L'admin chiude manualmente la votazione
create or replace function public.close_question(p_question uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  q record;
begin
  select * into q from questions where id = p_question;
  if not found then raise exception 'Quesito non trovato'; end if;
  if not public.is_admin(q.group_id) then raise exception 'Solo l''amministratore può chiudere la votazione'; end if;
  if q.status <> 'open' then raise exception 'La votazione è già chiusa'; end if;
  update questions set status = 'closed' where id = p_question;
  insert into activities (group_id, message)
  values (q.group_id, 'La votazione per "' || q.title || '" è stata chiusa');
end $$;

-- L'admin inserisce la risposta corretta: il sistema calcola e assegna i punti
create or replace function public.resolve_question(
  p_question uuid,
  p_correct_options uuid[] default null,
  p_correct_number numeric default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  q record;
  total_opts int;
  min_dist numeric;
  n_winners int;
begin
  select * into q from questions where id = p_question;
  if not found then raise exception 'Quesito non trovato'; end if;
  if not public.is_admin(q.group_id) then raise exception 'Solo l''amministratore può risolvere un quesito'; end if;
  if q.status = 'resolved' then raise exception 'Quesito già risolto'; end if;

  if q.qtype in ('true_false', 'single', 'multiple') then
    if p_correct_options is null or cardinality(p_correct_options) = 0 then
      raise exception 'Seleziona almeno una risposta corretta';
    end if;
    update question_options set is_correct = (id = any(p_correct_options))
    where question_id = p_question;

    select count(*) into total_opts from question_options where question_id = p_question;

    if q.qtype = 'multiple' then
      -- punteggio = punti * (opzioni corrette selezionate / opzioni totali)
      update votes v
      set points_awarded = round(q.points * (
            select count(distinct o) from unnest(v.option_ids) o
            where o = any(p_correct_options)
          )::numeric / total_opts, 2)
      where v.question_id = p_question;
    else
      -- vero/falso e scelta singola: tutto o niente
      update votes v
      set points_awarded = case when v.option_ids[1] = any(p_correct_options) then q.points else 0 end
      where v.question_id = p_question;
    end if;
  else
    -- quesito numerico: vince chi è più vicino; in caso di parità i punti si dividono
    if p_correct_number is null then raise exception 'Inserisci il numero corretto'; end if;
    update questions set correct_number = p_correct_number where id = p_question;

    select min(abs(number_answer - p_correct_number)) into min_dist
    from votes where question_id = p_question and number_answer is not null;

    if min_dist is not null then
      select count(*) into n_winners
      from votes where question_id = p_question and abs(number_answer - p_correct_number) = min_dist;

      update votes v
      set points_awarded = case
            when abs(v.number_answer - p_correct_number) = min_dist then round(q.points / n_winners, 2)
            else 0
          end
      where v.question_id = p_question;
    end if;
  end if;

  update questions set status = 'resolved' where id = p_question;
  insert into activities (group_id, message)
  values (q.group_id, 'La scommessa "' || q.title || '" è stata risolta: punti assegnati!');
end $$;

-- L'admin modifica il valore in punti di un quesito
create or replace function public.set_question_points(p_question uuid, p_points numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  q record;
begin
  select * into q from questions where id = p_question;
  if not found then raise exception 'Quesito non trovato'; end if;
  if not public.is_admin(q.group_id) then raise exception 'Solo l''amministratore può modificare i punti'; end if;
  if q.status = 'resolved' then raise exception 'Il quesito è già stato risolto'; end if;
  if p_points is null or p_points <= 0 then raise exception 'Il valore deve essere maggiore di zero'; end if;
  update questions set points = p_points where id = p_question;
  insert into activities (group_id, message)
  values (q.group_id, 'L''admin ha cambiato il valore di "' || q.title || '" a ' || p_points || ' punti');
end $$;

-- L'admin modifica il valore in punti di una sfida
create or replace function public.set_challenge_points(p_challenge uuid, p_points numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  select * into c from challenges where id = p_challenge;
  if not found then raise exception 'Sfida non trovata'; end if;
  if not public.is_admin(c.group_id) then raise exception 'Solo l''amministratore può modificare i punti'; end if;
  if c.status = 'completed' then raise exception 'La sfida è già stata completata'; end if;
  if p_points is null or p_points <= 0 then raise exception 'Il valore deve essere maggiore di zero'; end if;
  update challenges set points = p_points where id = p_challenge;
  insert into activities (group_id, message)
  values (c.group_id, 'L''admin ha cambiato il valore della sfida "' || c.title || '" a ' || p_points || ' punti');
end $$;

-- L'admin assegna la sfida al vincitore
create or replace function public.award_challenge(p_challenge uuid, p_winner uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  c record;
  winner_name text;
begin
  select * into c from challenges where id = p_challenge;
  if not found then raise exception 'Sfida non trovata'; end if;
  if not public.is_admin(c.group_id) then raise exception 'Solo l''amministratore può assegnare la sfida'; end if;
  if c.status = 'completed' then raise exception 'La sfida è già stata completata'; end if;
  if not exists (select 1 from group_members where group_id = c.group_id and user_id = p_winner) then
    raise exception 'Il vincitore deve essere un membro del gruppo';
  end if;
  update challenges set status = 'completed', winner_id = p_winner, completed_at = now()
  where id = p_challenge;
  select username into winner_name from profiles where id = p_winner;
  insert into activities (group_id, message)
  values (c.group_id, winner_name || ' ha completato la sfida "' || c.title || '" (+' || c.points || ' punti)');
end $$;

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

-- Classifica del gruppo: punti dai quesiti risolti + sfide vinte
create or replace function public.get_leaderboard(p_group uuid)
returns table (user_id uuid, username text, total_points numeric, is_admin boolean)
language sql security definer stable set search_path = public as $$
  select m.user_id,
         p.username,
         coalesce(qs.pts, 0) + coalesce(cs.pts, 0) as total_points,
         (g.admin_id = m.user_id) as is_admin
  from group_members m
  join profiles p on p.id = m.user_id
  join groups g on g.id = m.group_id
  left join (
    select v.user_id, sum(v.points_awarded) as pts
    from votes v
    join questions q on q.id = v.question_id
    where q.group_id = p_group
    group by v.user_id
  ) qs on qs.user_id = m.user_id
  left join (
    select c.winner_id as user_id, sum(c.points) as pts
    from challenges c
    where c.group_id = p_group and c.status = 'completed'
    group by c.winner_id
  ) cs on cs.user_id = m.user_id
  where m.group_id = p_group
    and public.is_member(p_group)
  order by total_points desc, p.username asc;
$$;

-- I gruppi dell'utente loggato (per la home)
create or replace function public.get_my_groups()
returns table (id uuid, name text, code text, is_admin boolean, member_count bigint)
language sql security definer stable set search_path = public as $$
  select g.id, g.name, g.code,
         (g.admin_id = auth.uid()) as is_admin,
         (select count(*) from group_members m2 where m2.group_id = g.id) as member_count
  from groups g
  join group_members m on m.group_id = g.id and m.user_id = auth.uid()
  order by g.created_at desc;
$$;
