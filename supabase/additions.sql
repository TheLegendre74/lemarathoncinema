-- ══════════════════════════════════════════════════════════════
--  ADDITIONS — À exécuter dans Supabase > SQL Editor > Run
--  Après schema.sql / functions.sql / seed.sql
-- ══════════════════════════════════════════════════════════════

-- ─── REPORTS (signalements de films) ─────────────────────────
create table if not exists public.reports (
  id          uuid default uuid_generate_v4() primary key,
  film_id     integer references public.films(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  reason      text not null,
  resolved    boolean default false not null,
  resolved_by uuid references public.profiles(id),
  created_at  timestamptz default now() not null,
  unique(film_id, user_id, resolved)   -- 1 signalement actif par user par film
);
alter table public.reports enable row level security;
create policy "Report insérable par connecté"    on public.reports for insert to authenticated with check (user_id = auth.uid());
create policy "Report lisible par son auteur"    on public.reports for select to authenticated using (user_id = auth.uid());
create policy "Report lisible par admin"         on public.reports for select to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Report modifiable par admin"      on public.reports for update to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- ─── SITE_CONFIG (configuration dynamique) ───────────────────
create table if not exists public.site_config (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz default now() not null
);
alter table public.site_config enable row level security;
create policy "Config lisible par tous"          on public.site_config for select using (true);
create policy "Config inserable par admin"       on public.site_config for insert to authenticated with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Config modifiable par admin"      on public.site_config for update to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
