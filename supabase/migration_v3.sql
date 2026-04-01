-- ══════════════════════════════════════════════════════════════
-- MIGRATION V3 — Forum, News, Avatars, Recommendations, Tipiak
-- ══════════════════════════════════════════════════════════════

-- 1. AVATARS (profiles)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. NEWS TABLE
CREATE TABLE IF NOT EXISTS news (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text        NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  content     text        NOT NULL CHECK (length(content) BETWEEN 1 AND 5000),
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  pinned      boolean     DEFAULT false
);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_public_read"   ON news FOR SELECT USING (true);
CREATE POLICY "news_admin_insert"  ON news FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "news_admin_delete"  ON news FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "news_admin_update"  ON news FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 3. FORUM TOPICS
CREATE TABLE IF NOT EXISTS forum_topics (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text        NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  description text,
  created_by  uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  pinned      boolean     DEFAULT false,
  is_social   boolean     DEFAULT false
);

ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_topics_public_read"   ON forum_topics FOR SELECT USING (true);
CREATE POLICY "forum_topics_auth_insert"   ON forum_topics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "forum_topics_admin_delete"  ON forum_topics FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "forum_topics_admin_update"  ON forum_topics FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 4. FORUM POSTS
CREATE TABLE IF NOT EXISTS forum_posts (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id    uuid        NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  content     text        NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forum_posts_public_read"   ON forum_posts FOR SELECT USING (true);
CREATE POLICY "forum_posts_auth_insert"   ON forum_posts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "forum_posts_author_delete" ON forum_posts FOR DELETE USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS forum_posts_topic_id_idx ON forum_posts(topic_id);
CREATE INDEX IF NOT EXISTS forum_posts_created_at_idx ON forum_posts(created_at DESC);

-- 5. RECOMMENDATION FILMS
CREATE TABLE IF NOT EXISTS recommendation_films (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  niveau        text        NOT NULL CHECK (niveau IN ('debutant', 'intermediaire', 'confirme')),
  titre         text        NOT NULL,
  annee         integer,
  realisateur   text,
  description   text,
  poster        text,
  tmdb_id       integer,
  position      integer     DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE recommendation_films ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reco_public_read"  ON recommendation_films FOR SELECT USING (true);
CREATE POLICY "reco_admin_all"    ON recommendation_films FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 6. SOCIAL TOPIC (Le Salon — crée automatiquement)
INSERT INTO forum_topics (title, description, is_social, pinned)
VALUES (
  'Le Salon',
  'Discussion libre entre tous les membres du marathon. Parlez cinéma, échangez vos impressions, recommandez des films !',
  true,
  true
)
ON CONFLICT DO NOTHING;

-- 7. MARATHON_RULES config key (empty — admin fills it in)
INSERT INTO site_config (key, value) VALUES ('MARATHON_RULES', '')
ON CONFLICT (key) DO NOTHING;

-- 8. TIPIAK_LINKS config key (JSON array — admin fills it in)
INSERT INTO site_config (key, value) VALUES ('TIPIAK_LINKS', '[]')
ON CONFLICT (key) DO NOTHING;

-- 9. Grant leaderboard function access to avatars
-- (leaderboard RPC — if you want avatars in classement, re-create it)
-- Optional: update leaderboard function to include avatar_url
CREATE OR REPLACE FUNCTION leaderboard(limit_n integer DEFAULT 100)
RETURNS TABLE (
  id          uuid,
  pseudo      text,
  exp         integer,
  is_admin    boolean,
  avatar_url  text,
  watch_count bigint,
  vote_count  bigint
) LANGUAGE sql STABLE AS $$
  SELECT
    p.id,
    p.pseudo,
    p.exp,
    p.is_admin,
    p.avatar_url,
    COUNT(DISTINCT w.film_id)  AS watch_count,
    COUNT(DISTINCT v.duel_id)  AS vote_count
  FROM profiles p
  LEFT JOIN watched w ON w.user_id = p.id
  LEFT JOIN votes   v ON v.user_id = p.id
  GROUP BY p.id, p.pseudo, p.exp, p.is_admin, p.avatar_url
  ORDER BY p.exp DESC
  LIMIT limit_n;
$$;
