-- ═══════════════════════════════════════════════════════════════
--  Migration v25 — Ajout closed_at sur duels
--  Permet de limiter le bouton "vu pendant le duel" à 48h
--  après la clôture du duel.
--
--  À exécuter dans le SQL Editor du dashboard Supabase.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.duels ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- Backfill : les duels déjà fermés reçoivent created_at comme closed_at
-- (la fenêtre de 48h est donc déjà expirée pour tous les anciens duels)
UPDATE public.duels SET closed_at = created_at WHERE closed = true AND closed_at IS NULL;
