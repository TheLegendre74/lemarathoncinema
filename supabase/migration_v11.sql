-- MIGRATION V11 — Colonne flagged_18_pending pour la queue de validation admin
ALTER TABLE public.films
  ADD COLUMN IF NOT EXISTS flagged_18_pending boolean NOT NULL DEFAULT false;

-- Mettre en pending les films déjà marqués 18+ (ils n'ont jamais été validés manuellement)
UPDATE public.films SET flagged_18_pending = true WHERE flagged_18plus = true;
