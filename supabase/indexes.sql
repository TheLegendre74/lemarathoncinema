-- ═══════════════════════════════════════════════════════════════
--  INDEXES DE PERFORMANCE — Ciné Marathon
--  À exécuter dans le SQL Editor du dashboard Supabase
--  Chaque CREATE INDEX est idempotent (IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════

-- ── watched ──────────────────────────────────────────────────────
-- Requêtes : .eq('user_id', x) dans layout, films, page
-- Requêtes : .select('film_id') sans filtre pour les stats globales
CREATE INDEX IF NOT EXISTS idx_watched_user_id  ON watched(user_id);
CREATE INDEX IF NOT EXISTS idx_watched_film_id  ON watched(film_id);

-- ── ratings ──────────────────────────────────────────────────────
-- Requêtes : .eq('user_id', x) et select global pour stats
CREATE INDEX IF NOT EXISTS idx_ratings_user_id  ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_film_id  ON ratings(film_id);

-- ── negative_ratings ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_neg_ratings_user_id ON negative_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_neg_ratings_film_id ON negative_ratings(film_id);

-- ── profiles ─────────────────────────────────────────────────────
-- Requête rank : .gte('exp', x) → index sur exp en DESC
CREATE INDEX IF NOT EXISTS idx_profiles_exp ON profiles(exp DESC);

-- ── posts (forum) ────────────────────────────────────────────────
-- Requêtes : .eq('topic', x).order('created_at', ascending)
CREATE INDEX IF NOT EXISTS idx_posts_topic_created ON posts(topic, created_at ASC);

-- ── discovered_eggs ──────────────────────────────────────────────
-- Requêtes : .eq('user_id', x) dans layout + films
CREATE INDEX IF NOT EXISTS idx_eggs_user_id ON discovered_eggs(user_id);

-- ── votes ────────────────────────────────────────────────────────
-- Requêtes : .eq('user_id', x) et .eq('duel_id', x)
CREATE INDEX IF NOT EXISTS idx_votes_user_id  ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_duel_id  ON votes(duel_id);

-- ── duels ────────────────────────────────────────────────────────
-- Requête toggleWatched : .eq('winner_id', x)
-- Requête page : .eq('closed', false).order('created_at')
CREATE INDEX IF NOT EXISTS idx_duels_winner_id      ON duels(winner_id);
CREATE INDEX IF NOT EXISTS idx_duels_closed_created ON duels(closed, created_at DESC);

-- ── week_films ───────────────────────────────────────────────────
-- Requête : .eq('active', true) partout
CREATE INDEX IF NOT EXISTS idx_week_films_active ON week_films(active) WHERE active = true;

-- ── films ────────────────────────────────────────────────────────
-- Requête : .eq('saison', x) pour les counts
-- Requête : .eq('pending_admin_approval', false)
CREATE INDEX IF NOT EXISTS idx_films_saison   ON films(saison);
CREATE INDEX IF NOT EXISTS idx_films_pending  ON films(pending_admin_approval) WHERE pending_admin_approval = false;
