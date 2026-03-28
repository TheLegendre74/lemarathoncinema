-- ══════════════════════════════════════════════════════════════
--  FLAG AGE RESTRICTION — À exécuter dans Supabase > SQL Editor
--  Classe les films -16 et -18 via flagged_18plus = true
--
--  Classification basée sur les certifications CNC (France) et
--  contenu : violence extrême, gore, sexualité, drogues, choc psychologique
-- ══════════════════════════════════════════════════════════════

-- Reset all flags first (clean slate)
update public.films set flagged_18plus = false;

-- ─── INTERDIT AUX MOINS DE 18 ANS (-18) ─────────────────────
-- Violence extrême, sexualité explicite, contenu très choquant
update public.films set flagged_18plus = true where titre in (
  'Orange mécanique',        -- Kubrick — violence + sexualité explicite, -18 CNC officiel
  'Requiem for a Dream',     -- Aronofsky — drogue + sexualité + autodestruction, -18 CNC
  'Oldboy'                   -- Park Chan-wook — violence extrême + twist incestueux, -18 CNC
);

-- ─── INTERDIT AUX MOINS DE 16 ANS (-16) ─────────────────────
-- Violence forte, drogue, thèmes adultes intenses
update public.films set flagged_18plus = true where titre in (
  'La Liste de Schindler',         -- Spielberg — génocide, violence, scènes très choquantes, -16
  'Scarface',                      -- De Palma — violence extrême, drogue, -16
  'Platoon',                       -- Stone — guerre, violence, atrocités, -16
  'Full Metal Jacket',             -- Kubrick — violence guerre, suicide, psychologique, -16
  'Goodfellas',                    -- Scorsese — crime, violence, drogue, -16
  'Le Silence des agneaux',        -- Demme — horreur psychologique, meurtre, -16
  'Reservoir Dogs',                -- Tarantino — violence graphique, torture, -16
  'Pulp Fiction',                  -- Tarantino — violence, drogue, viol, -16
  'Seven',                         -- Fincher — violence extrême, horreur, -16
  'Heat',                          -- Mann — violence, fusillades, -16
  'Braveheart',                    -- Gibson — violence guerre, torture, -16
  'Fargo',                         -- Coen — violence, meurtre graphique, -16
  'Trainspotting',                 -- Boyle — drogue, mort de nourrisson, violence, -16
  'Il faut sauver le soldat Ryan', -- Spielberg — violence guerre extrême (Omaha), -16
  'Fight Club',                    -- Fincher — violence, sexualité, contenu adulte, -16
  'American Beauty',               -- Mendes — sexualité, pédophilie implicite, -16
  'La Cité de Dieu',               -- Meirelles — violence extrême, drogue, -16
  'Kill Bill',                     -- Tarantino — violence graphique, gore, -16
  'Les Infiltrés',                 -- Scorsese — violence, drogue, -16
  'There Will Be Blood',           -- Anderson — violence, meurtre, -16
  'No Country for Old Men',        -- Coen — violence extrême, assassinats, -16
  'Django Unchained',              -- Tarantino — violence, racisme extrême, -16
  'Incendies',                     -- Villeneuve — viol, guerre, contenu très difficile, -16
  'Prisoners',                     -- Villeneuve — enlèvement, torture, violence, -16
  'Gone Girl',                     -- Fincher — violence, sexualité, manipulation, -16
  'Mad Max: Fury Road'             -- Miller — violence intense, post-apocalyptique, -16
);

-- ─── VÉRIFICATION ────────────────────────────────────────────
select id, titre, flagged_18plus
from public.films
where flagged_18plus = true
order by titre;
