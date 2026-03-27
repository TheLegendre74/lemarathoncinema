-- ══════════════════════════════════════════════════════════════
--  CINÉ MARATHON — Schéma PostgreSQL complet
--  1. Colle dans Supabase > SQL Editor > New query
--  2. Clique RUN
--  3. Fais pareil pour functions.sql, puis seed.sql
-- ══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ─── PROFILES ─────────────────────────────────────────────────
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  pseudo      text unique not null,
  exp         integer default 0 not null,
  is_admin    boolean default false not null,
  saison      integer default 1 not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);
alter table public.profiles enable row level security;
create policy "Profiles lisibles par tous" on public.profiles for select to authenticated using (true);
create policy "Profil modifiable par soi"  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Insert profil à la création" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- ─── FILMS ────────────────────────────────────────────────────
create table public.films (
  id            serial primary key,
  titre         text not null,
  annee         integer not null,
  realisateur   text not null,
  genre         text not null,
  sousgenre     text,
  poster        text,
  saison        integer default 1 not null,
  added_by      uuid references public.profiles(id),
  created_at    timestamptz default now() not null,
  tmdb_id       integer,
  flagged_18plus boolean default false not null,
  unique(titre, annee)
);
alter table public.films enable row level security;
create policy "Films lisibles par tous"    on public.films for select using (true);
create policy "Films ajoutables par connecté" on public.films for insert to authenticated with check (true);
create policy "Films supprimables par admin"  on public.films for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Films modifiables par admin"   on public.films for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- ─── WATCHED ──────────────────────────────────────────────────
create table public.watched (
  user_id    uuid references public.profiles(id) on delete cascade,
  film_id    integer references public.films(id) on delete cascade,
  pre        boolean default false,
  watched_at timestamptz default now() not null,
  primary key (user_id, film_id)
);
alter table public.watched enable row level security;
create policy "Watched lisible par tous connectés" on public.watched for select to authenticated using (true);
create policy "Watched ajouté par soi"             on public.watched for insert to authenticated with check (user_id = auth.uid());
create policy "Watched supprimé par soi"           on public.watched for delete to authenticated using (user_id = auth.uid());

-- ─── RATINGS ──────────────────────────────────────────────────
create table public.ratings (
  user_id  uuid references public.profiles(id) on delete cascade,
  film_id  integer references public.films(id) on delete cascade,
  score    integer not null check (score between 1 and 10),
  rated_at timestamptz default now() not null,
  primary key (user_id, film_id)
);
alter table public.ratings enable row level security;
create policy "Notes lisibles par tous"    on public.ratings for select to authenticated using (true);
create policy "Note ajoutée par soi"       on public.ratings for insert to authenticated with check (user_id = auth.uid());
create policy "Note modifiée par soi"      on public.ratings for update to authenticated using (user_id = auth.uid());
create policy "Note supprimée par soi"     on public.ratings for delete to authenticated using (user_id = auth.uid());

-- ─── DUELS ────────────────────────────────────────────────────
create table public.duels (
  id        serial primary key,
  film1_id  integer references public.films(id) not null,
  film2_id  integer references public.films(id) not null,
  week_num  integer not null,
  winner_id integer references public.films(id),
  closed    boolean default false,
  created_at timestamptz default now() not null
);
alter table public.duels enable row level security;
create policy "Duels lisibles par tous" on public.duels for select using (true);
create policy "Duels créés par admin"   on public.duels for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Duels modifiés par admin" on public.duels for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- ─── VOTES ────────────────────────────────────────────────────
create table public.votes (
  user_id     uuid references public.profiles(id) on delete cascade,
  duel_id     integer references public.duels(id) on delete cascade,
  film_choice integer references public.films(id) not null,
  voted_at    timestamptz default now() not null,
  primary key (user_id, duel_id)
);
alter table public.votes enable row level security;
create policy "Votes lisibles par tous connectés" on public.votes for select to authenticated using (true);
create policy "Vote ajouté par soi"               on public.votes for insert to authenticated with check (user_id = auth.uid());

-- ─── POSTS (forum) ────────────────────────────────────────────
create table public.posts (
  id         uuid default uuid_generate_v4() primary key,
  topic      text not null,
  user_id    uuid references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz default now() not null
);
alter table public.posts enable row level security;
create policy "Posts lisibles par tous connectés"     on public.posts for select to authenticated using (true);
create policy "Post ajouté par soi"                   on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy "Post supprimé par auteur ou admin"     on public.posts for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- ─── WEEK_FILMS ───────────────────────────────────────────────
create table public.week_films (
  id           serial primary key,
  film_id      integer references public.films(id) not null,
  session_time text,
  note         text,
  active       boolean default true,
  created_at   timestamptz default now() not null
);
alter table public.week_films enable row level security;
create policy "Week films lisibles par tous"     on public.week_films for select using (true);
create policy "Week film créé par admin"         on public.week_films for insert to authenticated
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin));
create policy "Week film modifié par admin"      on public.week_films for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin));

-- ─── TRIGGER : auto-create profile on signup ──────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, pseudo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'pseudo', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── TRIGGER : updated_at ─────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ─── INDEX ────────────────────────────────────────────────────
create index on public.watched(film_id);
create index on public.watched(user_id);
create index on public.ratings(film_id);
create index on public.posts(topic);
create index on public.posts(created_at desc);
create index on public.votes(duel_id);
create index on public.profiles(exp desc);
