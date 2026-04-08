-- MIGRATION V8 — Synopsis des films
ALTER TABLE public.films
  ADD COLUMN IF NOT EXISTS overview text NULL;
