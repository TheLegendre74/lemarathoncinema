-- ══════════════════════════════════════════════════════════════
--  FIX: faux démarrage du marathon le 2026-04-20
--  Le marathon doit démarrer le 2026-05-01T00:00:00
--  Ce script :
--    1. Remet la date marathon à 2026-05-01 dans site_config
--    2. Repasse en pré-marathon tous les films "vu pendant marathon"
--       marqués entre le 2026-04-20 et le 2026-05-01
--    3. Déduit l'EXP correspondant de chaque profil concerné
-- ══════════════════════════════════════════════════════════════

BEGIN;

-- 1. Correction de la date dans site_config
INSERT INTO site_config (key, value)
  VALUES ('marathon_start', '2026-05-01T00:00:00')
  ON CONFLICT (key) DO UPDATE SET value = '2026-05-01T00:00:00';

-- 2. Déduire l'EXP (5 pts/film) pour chaque user concerné
UPDATE profiles p
SET exp = GREATEST(0, COALESCE(p.exp, 0) - (
  SELECT COUNT(*) * 5
  FROM watched w
  WHERE w.user_id = p.id
    AND w.pre = false
    AND w.watched_at >= '2026-04-20T00:00:00+00'
    AND w.watched_at <  '2026-05-01T00:00:00+00'
))
WHERE EXISTS (
  SELECT 1 FROM watched w
  WHERE w.user_id = p.id
    AND w.pre = false
    AND w.watched_at >= '2026-04-20T00:00:00+00'
    AND w.watched_at <  '2026-05-01T00:00:00+00'
);

-- 3. Repasser les vues marathon du faux démarrage en pré-marathon
UPDATE watched
SET pre = true
WHERE pre = false
  AND watched_at >= '2026-04-20T00:00:00+00'
  AND watched_at <  '2026-05-01T00:00:00+00';

COMMIT;

-- Vérification (à lancer séparément après le commit)
-- SELECT COUNT(*) FROM watched WHERE pre = false AND watched_at >= '2026-04-20' AND watched_at < '2026-05-01';
-- SELECT value FROM site_config WHERE key = 'marathon_start';
