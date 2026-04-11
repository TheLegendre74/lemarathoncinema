-- MIGRATION V10 — Badge actif sur le profil
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_badge text NULL;
