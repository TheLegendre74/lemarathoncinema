-- Migration v21 : tamagotchi V3 — chasse, achievements, check-in quotidien

ALTER TABLE public.tamagotchi
  ADD COLUMN IF NOT EXISTS hunt_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_hunted timestamptz,
  ADD COLUMN IF NOT EXISTS last_checkin timestamptz,
  ADD COLUMN IF NOT EXISTS achievements text[] NOT NULL DEFAULT '{}';
