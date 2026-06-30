// ── Config d'équilibrage — §13 du brief ──
// Toutes les constantes vivent ici. Le moteur les lit, jamais codées en dur ailleurs.
// (départ) = magnitude à affiner en playtest. Les autres = validées.

export const BALANCE = {
  // ── Formule de base ──
  HP_MULT: 2.5,                 // PV = Postérité × HP_MULT — NE PAS toucher
  STAB: 1.5,                    // Same Type Attack Bonus
  CRIT_CHANCE: 1 / 16,          // probabilité critique
  CRIT_MULT: 1.5,               // multiplicateur critique
  RANDOM_MIN: 0.85,             // fourchette aléa dégâts
  RANDOM_MAX: 1.0,

  // ── Stages ──
  PER_TURN_CAP: 2,              // plafond des boosts/tour — validé

  // ── Équipe ──
  TEAM_SIZE: 6,                 // taille d'équipe
  PICK_SIZE: 4,                 // bring-6/pick-4
  CAP_LEGENDAIRE: 3,            // max Légendaires / équipe — validé

  // ── Outsider (synergie Rare) ──
  OUTSIDER_GATE: 2,             // nb de Rares pour activer la synergie — (départ) [updated from 3]
  OUTSIDER_SCALE: 0.11,         // bonus par Rare au-delà du gate — (départ) [updated from 0.13]

  // ── Météo d'équipe (Climax) ──
  WEATHER_TEAM_BUFF: 1.18,      // ×dégâts à l'équipe sous sa météo d'affinité — (départ)
  CLIMAX_STRONG: 0.20,          // forme forte du porteur
  CLIMAX_DEFAULT: 0.08,         // forme défaut
  CLIMAX_MALUS: 0.08,           // coût stats de base (films météo)
  CLIMAX_NEUTRAL: 0.10,         // Action — plat, sans malus

  // ── Légendaire entrée à froid ──
  LEG_COLD_FACTOR: 0.75,        // puissance Légendaire au tour d'arrivée — (départ)
  LEG_WARM: 1.08,               // bonus une fois "lancé" — (départ)

  // ── Anti-stall ──
  ANTISTALL_WALLBREAK: 0.05,    // casse-mur (ignore 5% de défense) — validé
  ANTISTALL_WALLBREAK_FACTOR: 0.95, // = 1 - ANTISTALL_WALLBREAK, applied to defense

  // ── Lutte (move de repli) ──
  STRUGGLE_POWER: 50,
  STRUGGLE_RECOIL: 0.25,

  // ── Météo mapping (genre → météo) ──
  GENRE_WEATHER: {
    'Comédie': 'sun',
    'Romance': 'sun',
    'Animation': 'sun',
    'Thriller': 'rain',
    'Crime': 'rain',
    'Horreur': 'rain',
    'Western': 'sand',
    'Aventure': 'sand',
    'Guerre': 'sand',
    'Drame': 'snow',
    'Science-Fiction': 'snow',
    'Fantastique': 'snow',
    'Action': null,
  } as Record<string, string | null>,

  // ── Clippy boss ──
  CLIPPY_CLIMAX_TURN: 1,        // tour d'éveil Climax auto (Moyen/Difficile)

  // ── Combat ──
  MAX_TURNS: 120,
  WEATHER_DURATION: 5,
  TRICK_ROOM_DURATION: 5,
  SUN_DAMAGE_MULT: 1.20,       // multiplicateur dégâts sous le soleil
} as const
