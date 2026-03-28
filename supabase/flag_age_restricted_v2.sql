-- ══════════════════════════════════════════════════════════════
--  FLAG AGE RESTRICTION v2 — Catégories -16 et -18 DISTINCTES
--  À exécuter APRÈS add_flagged_16plus.sql
-- ══════════════════════════════════════════════════════════════

-- Reset
update public.films set flagged_18plus = false, flagged_16plus = false;

-- ─── INTERDIT AUX MOINS DE 18 ANS ────────────────────────────
-- Violence extrême, sexualité explicite, contenu très choquant
-- Classification CNC officielle -18 / NC-17 / X
update public.films set flagged_18plus = true, flagged_16plus = false
where titre in (
  'Orange mécanique',      -- Kubrick — violence extrême + sexualité explicite, -18 CNC
  'Requiem for a Dream',   -- Aronofsky — drogue + sexualité + autodestruction, -18 CNC
  'Oldboy'                 -- Park Chan-wook — violence extrême + twist incestueux, -18 CNC
);

-- ─── INTERDIT AUX MOINS DE 16 ANS ────────────────────────────
-- Violence forte, drogue, thèmes adultes intenses
-- Classification CNC -16 / R (US)
update public.films set flagged_16plus = true, flagged_18plus = false
where titre in (
  'La Liste de Schindler',          -- Spielberg — génocide, violence choquante
  'Scarface',                       -- De Palma — violence extrême, drogue
  'Platoon',                        -- Stone — guerre, violence, atrocités
  'Full Metal Jacket',              -- Kubrick — violence guerre, suicide, psychologique
  'Goodfellas',                     -- Scorsese — crime, violence, drogue
  'Le Silence des agneaux',         -- Demme — horreur psychologique, meurtre
  'Reservoir Dogs',                 -- Tarantino — violence graphique, torture
  'Pulp Fiction',                   -- Tarantino — violence, drogue, viol
  'Seven',                          -- Fincher — violence extrême, horreur
  'Heat',                           -- Mann — violence, fusillades
  'Braveheart',                     -- Gibson — violence guerre, torture
  'Fargo',                          -- Coen — violence, meurtre graphique
  'Trainspotting',                  -- Boyle — drogue, mort de nourrisson, violence
  'Il faut sauver le soldat Ryan',  -- Spielberg — violence guerre extrême (Omaha)
  'Fight Club',                     -- Fincher — violence, sexualité, contenu adulte
  'American Beauty',                -- Mendes — sexualité, thèmes adultes
  'La Cité de Dieu',                -- Meirelles — violence extrême, drogue
  'Kill Bill',                      -- Tarantino — violence graphique, gore
  'Les Infiltrés',                  -- Scorsese — violence, drogue
  'There Will Be Blood',            -- Anderson — violence, meurtre
  'No Country for Old Men',         -- Coen — violence extrême, assassinats
  'Django Unchained',               -- Tarantino — violence, racisme extrême
  'Incendies',                      -- Villeneuve — viol, guerre, contenu très difficile
  'Prisoners',                      -- Villeneuve — enlèvement, torture, violence
  'Gone Girl',                      -- Fincher — violence, sexualité, manipulation
  'Mad Max: Fury Road'              -- Miller — violence intense, post-apocalyptique
);

-- ─── VÉRIFICATION ────────────────────────────────────────────
select id, titre,
  case when flagged_18plus then '-18' when flagged_16plus then '-16' else 'Tout public' end as restriction
from public.films
where flagged_18plus or flagged_16plus
order by flagged_18plus desc, titre;
