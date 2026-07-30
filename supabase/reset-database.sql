-- ============================================================
-- ⛔ RESET TOTALE DEL DATABASE — CANCELLA TUTTI I DATI DEL GIOCO ⛔
--
-- Eseguire SOLO se vuoi davvero ripartire da zero: elimina gruppi,
-- scommesse, sfide, voti, punteggi e profili. NON si può annullare.
-- Gli account (username/password) sopravvivono: dopo il reset esegui
-- schema.sql e poi riparazione-profili.sql per ricollegarli.
--
-- Uso normale dell'app: NON serve mai eseguire questo file.
-- ============================================================

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
