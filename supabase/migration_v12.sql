-- Tamagotchi alien par joueur
CREATE TABLE IF NOT EXISTS public.tamagotchi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'egg',
  hunger int NOT NULL DEFAULT 20,
  happiness int NOT NULL DEFAULT 80,
  health int NOT NULL DEFAULT 100,
  age_hours int NOT NULL DEFAULT 0,
  name text NOT NULL DEFAULT 'Xeno',
  deaths int NOT NULL DEFAULT 0,
  last_fed timestamptz,
  last_played timestamptz,
  last_healed timestamptz,
  last_sync timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.tamagotchi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tamagotchi_own" ON public.tamagotchi
  FOR ALL USING (auth.uid() = user_id);
