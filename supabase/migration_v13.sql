-- Fight Club easter egg — leaderboard global
CREATE TABLE IF NOT EXISTS public.fightclub_scores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pseudo     text NOT NULL,
  score      int NOT NULL,
  difficulty text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fightclub_scores ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "fc_scores_select" ON public.fightclub_scores
  FOR SELECT USING (true);

-- Insertion ouverte (nom tapé à la main, pas de données sensibles)
CREATE POLICY "fc_scores_insert" ON public.fightclub_scores
  FOR INSERT WITH CHECK (char_length(pseudo) <= 12 AND score >= 0);
