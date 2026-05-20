-- Migration v26 : dance_scores multi-entries (3 best per player)
-- Ajoute un id serial et retire user_id comme PK pour permettre plusieurs scores par joueur

ALTER TABLE dance_scores DROP CONSTRAINT IF EXISTS dance_scores_pkey;
ALTER TABLE dance_scores ADD COLUMN IF NOT EXISTS id serial;
ALTER TABLE dance_scores ADD PRIMARY KEY (id);
CREATE INDEX IF NOT EXISTS idx_dance_scores_user_id ON dance_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_dance_scores_score ON dance_scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_dance_scores_survival ON dance_scores(survival_ms DESC);

-- Update RLS policies pour permettre INSERT (plus de upsert)
DROP POLICY IF EXISTS "own" ON dance_scores;
CREATE POLICY "insert_own" ON dance_scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own" ON dance_scores FOR DELETE USING (auth.uid() = user_id);
