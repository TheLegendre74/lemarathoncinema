-- Migration v19 : tamagotchi vivant — crottes + limite caresses quotidiennes

ALTER TABLE public.tamagotchi
  ADD COLUMN IF NOT EXISTS poop_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS caresses_today int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_caresse_date date;
