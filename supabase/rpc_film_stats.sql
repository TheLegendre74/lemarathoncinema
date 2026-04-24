-- ═══════════════════════════════════════════════════════════════
--  RPC get_film_stats — Stats agrégées par film en 1 seule requête
--  Remplace 3 requêtes globales (watched + ratings + negative_ratings)
--
--  À exécuter dans le SQL Editor du dashboard Supabase
--  AVANT de déployer le code correspondant dans films/page.tsx
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_film_stats()
RETURNS TABLE(
  film_id      integer,
  watch_count  bigint,
  pos_scores   integer[],
  neg_scores   integer[]
)
LANGUAGE sql STABLE
AS $$
  SELECT
    f.id                                                    AS film_id,
    COALESCE(w.cnt, 0)                                      AS watch_count,
    COALESCE(r.scores,  ARRAY[]::integer[])                 AS pos_scores,
    COALESCE(nr.scores, ARRAY[]::integer[])                 AS neg_scores
  FROM films f
  LEFT JOIN (
    SELECT film_id, COUNT(*)::bigint AS cnt
    FROM watched
    GROUP BY film_id
  ) w  ON w.film_id  = f.id
  LEFT JOIN (
    SELECT film_id, array_agg(score) AS scores
    FROM ratings
    GROUP BY film_id
  ) r  ON r.film_id  = f.id
  LEFT JOIN (
    SELECT film_id, array_agg(score) AS scores
    FROM negative_ratings
    GROUP BY film_id
  ) nr ON nr.film_id = f.id
  WHERE f.pending_admin_approval = false
$$;

-- Vérification rapide après création :
-- SELECT * FROM get_film_stats() LIMIT 5;
