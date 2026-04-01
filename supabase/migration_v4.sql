-- ══════════════════════════════════════════════════════════════
-- MIGRATION V4 — Marathon Leaderboard RPC
-- ══════════════════════════════════════════════════════════════

-- RPC: films watched AND rated during the marathon (pre = false)
-- Ranks by number of marathon films rated, then avg score descending
CREATE OR REPLACE FUNCTION marathon_leaderboard(limit_n integer DEFAULT 100)
RETURNS TABLE (
  id              uuid,
  pseudo          text,
  exp             integer,
  is_admin        boolean,
  avatar_url      text,
  marathon_films  bigint,
  avg_score       numeric
) LANGUAGE sql STABLE AS $$
  SELECT
    p.id,
    p.pseudo,
    p.exp,
    p.is_admin,
    p.avatar_url,
    COUNT(DISTINCT w.film_id)          AS marathon_films,
    ROUND(AVG(r.score)::numeric, 1)    AS avg_score
  FROM profiles p
  JOIN watched w ON w.user_id = p.id AND w.pre = false
  JOIN ratings r ON r.user_id = p.id  AND r.film_id = w.film_id
  GROUP BY p.id, p.pseudo, p.exp, p.is_admin, p.avatar_url
  ORDER BY marathon_films DESC, avg_score DESC NULLS LAST
  LIMIT limit_n;
$$;
