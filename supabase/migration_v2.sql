-- ══════════════════════════════════════════════════════════════
--  MIGRATION v2 — Vérification TMDB + colonnes films
--  Colle dans Supabase > SQL Editor > New query, puis RUN
-- ══════════════════════════════════════════════════════════════

-- Ajout des colonnes TMDB sur la table films
alter table public.films
  add column if not exists tmdb_id       integer,
  add column if not exists flagged_18plus boolean default false not null;

-- Politique update pour les admins (nécessaire pour approuver les films flaggés)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'films' and policyname = 'Films modifiables par admin'
  ) then
    execute $p$
      create policy "Films modifiables par admin" on public.films for update to authenticated
        using (exists (select 1 from public.profiles where id = auth.uid() and is_admin))
    $p$;
  end if;
end $$;
