-- ============================================================
-- Riparazione profili — ricrea i profili per gli account esistenti
-- Serve se la tabella "profiles" è stata svuotata/ricreata ma gli
-- account (auth.users) esistono ancora. Sicuro da eseguire sempre:
-- non tocca i profili già presenti.
-- ============================================================

insert into public.profiles (id, username)
select id, coalesce(raw_user_meta_data->>'username', split_part(email, '@', 1))
from auth.users
on conflict (id) do nothing;
