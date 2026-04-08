-- ══════════════════════════════════════════════════════════════
-- MIGRATION V7 — Film requests (ajout manuel sans TMDB)
-- ══════════════════════════════════════════════════════════════

-- Colonne pour les films soumis sans correspondance TMDB automatique
-- → visibles uniquement par l'admin, qui peut approuver ou rejeter
ALTER TABLE public.films
  ADD COLUMN IF NOT EXISTS pending_admin_approval boolean NOT NULL DEFAULT false;
