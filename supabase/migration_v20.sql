-- Migration v20 : tamagotchi V2 — sommeil, maladie, XP, streak

ALTER TABLE public.tamagotchi
  ADD COLUMN IF NOT EXISTS energy int NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_sleeping bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sick bool NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS xp int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS care_streak int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_care_date date;
