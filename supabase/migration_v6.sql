-- ══════════════════════════════════════════════════════════════
-- MIGRATION V6 — Fix forum RLS + enable realtime
-- ══════════════════════════════════════════════════════════════

-- 1. Allow public SELECT on posts table (film/duel/semaine forums)
--    Previously only authenticated users could read — guests saw nothing
DROP POLICY IF EXISTS "posts_select"      ON posts;
DROP POLICY IF EXISTS "posts_public_read" ON posts;
CREATE POLICY "posts_public_read" ON posts FOR SELECT USING (true);

-- 2. Enable full replica identity on posts so realtime carries all columns
ALTER TABLE posts REPLICA IDENTITY FULL;

-- 3. Enable full replica identity on forum_posts for Le Salon realtime
ALTER TABLE forum_posts REPLICA IDENTITY FULL;

-- 4. Allow public SELECT on forum_posts (topics are public discussions)
DROP POLICY IF EXISTS "forum_posts_public_read" ON forum_posts;
CREATE POLICY "forum_posts_public_read" ON forum_posts FOR SELECT USING (true);
