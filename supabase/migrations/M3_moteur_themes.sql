-- M3 — moteur de thèmes (avant les tests de la phase 5)

create table if not exists public.season_weeks (
  id         bigserial primary key,
  saison     int  not null check (saison >= 1),
  semaine    int  not null check (semaine between 1 and 12),
  theme      text not null,
  date_debut date not null check (extract(isodow from date_debut) = 1),
  created_at timestamptz not null default now(),
  unique (saison, semaine),
  unique (date_debut)
);
alter table public.season_weeks enable row level security;
drop policy if exists "season_weeks lisible par tous" on public.season_weeks;
create policy "season_weeks lisible par tous" on public.season_weeks for select using (true);
grant select on public.season_weeks to anon, authenticated;
grant all on public.season_weeks to service_role;
grant usage, select on sequence public.season_weeks_id_seq to service_role;

alter table public.profiles
  add column if not exists radio_music  boolean not null default false,
  add column if not exists radio_volume int     not null default 40,
  add column if not exists theme_eggs   boolean not null default true,
  add column if not exists sursauts     boolean,
  add column if not exists son_horreur  boolean;
alter table public.profiles drop constraint if exists profiles_radio_volume_bornes;
alter table public.profiles add constraint profiles_radio_volume_bornes check (radio_volume between 0 and 100);

grant update (radio_music, radio_volume, theme_eggs, sursauts, son_horreur) on public.profiles to authenticated;

revoke insert, update, delete on public.discovered_eggs from anon, authenticated;
