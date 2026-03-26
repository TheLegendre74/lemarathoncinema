-- ══════════════════════════════════════════════════════════════
--  FONCTIONS RPC — Exécuter après schema.sql
-- ══════════════════════════════════════════════════════════════

-- Incrémenter l'EXP d'un joueur
create or replace function public.increment_exp(user_id uuid, amount integer)
returns void language sql security definer as $$
  update public.profiles
  set exp = exp + amount
  where id = user_id;
$$;

-- Décrémenter (retrait d'un film vu)
create or replace function public.decrement_exp(user_id uuid, amount integer)
returns void language sql security definer as $$
  update public.profiles
  set exp = greatest(0, exp - amount)
  where id = user_id;
$$;

-- Stats globales d'un film (% vus, note moyenne)
create or replace function public.film_stats(film_id_param integer)
returns table (
  watch_count bigint,
  user_count bigint,
  watch_pct numeric,
  avg_rating numeric,
  rating_count bigint
) language sql security definer as $$
  select
    (select count(*) from public.watched where film_id = film_id_param) as watch_count,
    (select count(*) from public.profiles) as user_count,
    case
      when (select count(*) from public.profiles) = 0 then 0
      else round(
        (select count(*) from public.watched where film_id = film_id_param)::numeric /
        (select count(*) from public.profiles)::numeric * 100
      )
    end as watch_pct,
    (select round(avg(score)::numeric, 1) from public.ratings where film_id = film_id_param) as avg_rating,
    (select count(*) from public.ratings where film_id = film_id_param) as rating_count;
$$;

-- Films les moins vus (pour génération duel)
create or replace function public.least_watched_films(limit_n integer default 10)
returns table (film_id integer, watch_pct numeric) language sql security definer as $$
  select
    f.id as film_id,
    case
      when (select count(*) from public.profiles) = 0 then 0
      else round(
        coalesce((select count(*) from public.watched w where w.film_id = f.id), 0)::numeric /
        (select count(*) from public.profiles)::numeric * 100
      )
    end as watch_pct
  from public.films f
  where f.saison = 1
  order by watch_pct asc
  limit limit_n;
$$;

-- Classement global
create or replace function public.leaderboard(limit_n integer default 50)
returns table (
  id uuid,
  pseudo text,
  exp integer,
  is_admin boolean,
  saison integer,
  watch_count bigint,
  vote_count bigint,
  rank bigint
) language sql security definer as $$
  select
    p.id, p.pseudo, p.exp, p.is_admin, p.saison,
    count(distinct w.film_id) as watch_count,
    count(distinct v.duel_id) as vote_count,
    rank() over (order by p.exp desc) as rank
  from public.profiles p
  left join public.watched w on w.user_id = p.id
  left join public.votes v on v.user_id = p.id
  group by p.id, p.pseudo, p.exp, p.is_admin, p.saison
  order by p.exp desc
  limit limit_n;
$$;
