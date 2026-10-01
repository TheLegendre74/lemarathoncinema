-- M2 — verrou de sécurité
-- APRÈS la mise en ligne du code de la phase 1A (sinon l'ancien code en production casse).
-- Adapter les types d'arguments de increment_exp/decrement_exp aux résultats de l'audit (requête 4).

-- 1. EXP : seules les actions serveur (clé service) créditent ou retirent.
revoke execute on function public.increment_exp(uuid, integer) from public, anon, authenticated;
revoke execute on function public.decrement_exp(uuid, integer) from public, anon, authenticated;
grant  execute on function public.increment_exp(uuid, integer) to service_role;
grant  execute on function public.decrement_exp(uuid, integer) to service_role;

-- 2. Visionnages : écriture par le serveur seulement (la lecture reste ouverte).
revoke insert, update, delete on public.watched from anon, authenticated;

-- 3. Profils : le joueur ne modifie que ses propres réglages, colonne par colonne.
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (pseudo, avatar_url, active_badge, tutorial_seen)
  on public.profiles to authenticated;

-- 4. Si M3 est déjà passée (M2 relancée plus tard) : rendre au joueur ses réglages de radio et de l'Horreur.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'theme_eggs') then
    grant update (radio_music, radio_volume, theme_eggs) on public.profiles to authenticated;
  end if;
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'son_horreur') then
    grant update (sursauts, son_horreur) on public.profiles to authenticated;
  end if;
end $$;
