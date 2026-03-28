-- ══════════════════════════════════════════════════════════════
--  MIGRATION — À exécuter dans Supabase > SQL Editor > Run
--  Ajoute la colonne flagged_16plus pour distinguer -16 et -18
-- ══════════════════════════════════════════════════════════════

alter table public.films
  add column if not exists flagged_16plus boolean not null default false;

-- Puis exécuter flag_age_restricted_v2.sql pour mettre à jour les flags
