-- ══════════════════════════════════════════════════════════════
-- MIGRATION V5 — Cross-season data preservation
-- ══════════════════════════════════════════════════════════════

-- 1. Colonne saison_exp dans profiles (EXP saison courante)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS saison_exp integer NOT NULL DEFAULT 0;

-- 2. Table d'archives de fin de saison
CREATE TABLE IF NOT EXISTS season_archives (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  saison        integer     NOT NULL,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  pseudo        text        NOT NULL,
  avatar_url    text,
  exp_total     integer     NOT NULL DEFAULT 0,
  exp_saison    integer     NOT NULL DEFAULT 0,
  films_watched bigint      NOT NULL DEFAULT 0,
  films_marathon bigint     NOT NULL DEFAULT 0,
  rank_global   integer     NOT NULL DEFAULT 0,
  archived_at   timestamptz DEFAULT now()
);

ALTER TABLE season_archives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "archives_public_read" ON season_archives FOR SELECT USING (true);
CREATE POLICY "archives_admin_all"   ON season_archives FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE INDEX IF NOT EXISTS season_archives_saison_idx ON season_archives(saison);

-- 3. Mise à jour des RPCs exp pour inclure saison_exp
CREATE OR REPLACE FUNCTION public.increment_exp(user_id uuid, amount integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles
  SET exp = exp + amount,
      saison_exp = saison_exp + amount
  WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.decrement_exp(user_id uuid, amount integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.profiles
  SET exp = GREATEST(0, exp - amount),
      saison_exp = GREATEST(0, saison_exp - amount)
  WHERE id = user_id;
$$;

-- 4. RPC end_season : archive le classement courant puis reset saison_exp
CREATE OR REPLACE FUNCTION public.end_season(saison_num integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  -- Archive le classement actuel
  INSERT INTO season_archives
    (saison, user_id, pseudo, avatar_url, exp_total, exp_saison, films_watched, films_marathon, rank_global)
  SELECT
    saison_num,
    p.id,
    p.pseudo,
    p.avatar_url,
    p.exp,
    p.saison_exp,
    COUNT(DISTINCT w.film_id)               AS films_watched,
    COUNT(DISTINCT wm.film_id)              AS films_marathon,
    ROW_NUMBER() OVER (ORDER BY p.exp DESC) AS rank_global
  FROM profiles p
  LEFT JOIN watched w  ON w.user_id  = p.id
  LEFT JOIN watched wm ON wm.user_id = p.id AND wm.pre = false
  GROUP BY p.id, p.pseudo, p.avatar_url, p.exp, p.saison_exp;

  -- Remet saison_exp à zéro pour tout le monde
  UPDATE public.profiles SET saison_exp = 0;
$$;

-- 5. Mise à jour du leaderboard pour inclure saison_exp
CREATE OR REPLACE FUNCTION leaderboard(limit_n integer DEFAULT 100)
RETURNS TABLE (
  id          uuid,
  pseudo      text,
  exp         integer,
  saison_exp  integer,
  is_admin    boolean,
  avatar_url  text,
  watch_count bigint,
  vote_count  bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    p.id,
    p.pseudo,
    p.exp,
    p.saison_exp,
    p.is_admin,
    p.avatar_url,
    COUNT(DISTINCT w.film_id)  AS watch_count,
    COUNT(DISTINCT v.duel_id)  AS vote_count
  FROM profiles p
  LEFT JOIN watched w ON w.user_id = p.id
  LEFT JOIN votes   v ON v.user_id = p.id
  GROUP BY p.id, p.pseudo, p.exp, p.saison_exp, p.is_admin, p.avatar_url
  ORDER BY p.exp DESC
  LIMIT limit_n;
$$;
