-- M1 : additive, l'ancien code continue de marcher.
-- À exécuter AVANT les tests de la phase 1A.

-- Échéance des duels : mercredi 20 h (Paris) qui suit la création, pour les duels encore ouverts.
alter table public.duels add column if not exists closes_at timestamptz;

update public.duels d
set closes_at = (
      date_trunc('week', d.created_at at time zone 'Europe/Paris') + interval '2 days 20 hours'
      + case when (d.created_at at time zone 'Europe/Paris')
                  >= date_trunc('week', d.created_at at time zone 'Europe/Paris') + interval '2 days 20 hours'
             then interval '7 days' else interval '0 days' end
    ) at time zone 'Europe/Paris'
where d.closes_at is null and d.closed = false;

create index if not exists duels_ouverts_echeance on public.duels (closes_at) where closed = false;

-- Montant d'EXP réellement crédité pour chaque visionnage.
alter table public.watched add column if not exists exp_awarded int not null default 0;

-- Rattrapage : ce que l'ancien code a réellement crédité (variables Vercel ; défauts 5, 10, 15 : adapter).
-- a) vainqueur d'un duel regardé dans les 48 h après la clôture → EXP_DUEL_WIN
update public.watched w set exp_awarded = 15
from public.duels d
where w.pre = false and w.exp_awarded = 0
  and d.winner_id = w.film_id and d.closed_at is not null
  and w.watched_at >= d.closed_at and w.watched_at < d.closed_at + interval '48 hours';
-- b) film de la semaine regardé dans les 9 jours après son annonce → EXP_FDLS
update public.watched w set exp_awarded = 10
from public.week_films f
where w.pre = false and w.exp_awarded = 0
  and f.film_id = w.film_id
  and w.watched_at >= f.created_at and w.watched_at < f.created_at + interval '9 days';
-- c) tous les autres visionnages marathon → EXP_FILM
update public.watched set exp_awarded = 5 where pre = false and exp_awarded = 0;
