// ── Fichier de config d'équilibrage unique (§13 du brief) ──
// Toutes les constantes ici, éditables à chaud pour le playtest.
// Le moteur lit TOUT depuis cet objet — jamais codé en dur ailleurs.

export const BATTLE_CONFIG = {
  // ── Formule de base (verrouillé) ──
  HP_MULT: 2.5,
  STAB_MULT: 1.5,
  CRIT_RATE: 1 / 16,
  CRIT_MULT: 1.5,
  RANDOM_MIN: 0.85,
  RANDOM_MAX: 1.0,
  MAX_TURNS: 120,

  // ── Deckbuilding ──
  CAP_LEGENDAIRE: 3,
  TEAM_SIZE: 6,
  PICK_SIZE: 4,

  // ── Outsider / synergie Rares (départ — à tuner en playtest) ──
  OUTSIDER_GATE: 3,
  OUTSIDER_SCALE: 0.13,

  // ── Climax & Météo (départ — à tuner en playtest) ──
  WEATHER_TEAM_BUFF: 0.18,
  CLIMAX_STRONG: 0.20,
  CLIMAX_DEFAULT: 0.08,
  CLIMAX_MALUS: 0.08,
  CLIMAX_NEUTRAL: 0.10,
  WEATHER_TURNS: 5,

  // ── Légendaire entrée à froid (départ — à tuner en playtest) ──
  LEG_COLD_FACTOR: 0.75,
  LEG_WARM: 1.08,

  // ── Passifs ──
  PER_TURN_CAP: 2,

  // ── Anti-stall (verrouillé) ──
  ANTISTALL_WALLBREAK: 0.05,
  ANTISTALL_HEAL_DECAY: 0.25,
  ANTISTALL_HEAL_FLOOR: 0.30,

  // ── Stages ──
  STAGE_MIN: -6,
  STAGE_MAX: 6,
  STAGE_TABLE: {
    '-6': 0.25, '-5': 0.29, '-4': 0.33, '-3': 0.40, '-2': 0.50, '-1': 0.67,
    '0': 1.0,
    '1': 1.50, '2': 2.00, '3': 2.50, '4': 3.00, '5': 3.50, '6': 4.00,
  } as Record<string, number>,

  // ── Combat ──
  SUN_WEATHER_BOOST: 1.20,

  // ── Boss Clippy ──
  CLIPPY_AWAKEN_TURN: 1,
} as const;

export type BattleConfig = typeof BATTLE_CONFIG;
