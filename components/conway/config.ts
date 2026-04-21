// Conway V3 — configuration centrale

export const CONWAY_CONFIG = {
  CELL_SIZE: 8,

  COLORS: {
    background: '#05050a',
    cellNew:    '#c4fce0', // flash à la naissance
    cellYoung:  '#6ee7b7',
    cellAdult:  '#4ade80',
    cellOld:    '#22c55e',
    cellAncient:'#15803d',
    cellTrail:  '#4ade80',
  },

  SPEEDS: {
    slow: 220,
    normal: 80,
    fast: 16,
  } as const,

  DEFAULT_SPEED: 'normal' as const,

  RANDOM_DENSITY: 0.28,

  // ─── Anti-stagnation ─────────────────────────────────────────────────────
  ANTI_STAGNATION: {
    ACTIVITY_THRESHOLD: 0.003,
    QUIET_TICKS: 6,           // réduit de 10 → 6 (réaction plus rapide)
    MIN_ALIVE_RATIO: 0.008,
    SPARKS_COUNT: 3,          // sparks simultanés dispersés sur la grille
  },

  // ─── Noise thermique — bruit de fond invisible ────────────────────────────
  // Empêche la stabilisation totale. 4 flips sur ~32K cellules = 0.012%
  NOISE: {
    FLIPS_PER_TICK: 4,
  },

  // ─── Spaceship factory — mouvement littéral ───────────────────────────────
  MOBILITY: {
    SPAWN_INTERVAL_MIN: 12,  // ticks minimum entre deux lancements
    SPAWN_INTERVAL_MAX: 24,
    SHIPS_PER_SPAWN: 2,      // vaisseaux lancés par événement
  },

  // ─── Cycle de règles ─────────────────────────────────────────────────────
  // Conway (55 ticks) → HighLife B36/S23 (15 ticks) → Conway...
  // Le passage de règle détruit les structures stables — relance garantie
  RULE_CYCLE: {
    CONWAY_TICKS: 55,
    HIGHLIFE_TICKS: 15,
  },

  // ─── Bridge / fusion guidée ──────────────────────────────────────────────
  // Toutes les N ticks, seed le point médian entre deux cellules vivantes distantes
  BRIDGE: {
    INTERVAL: 7,
    MIN_DIST: 8,
    MAX_DIST: 40,
  },

  // ─── Rendu visuel ────────────────────────────────────────────────────────
  RENDER: {
    TRAIL_INITIAL: 0.75,
    TRAIL_DECAY:   0.14,
    AGE_YOUNG:   3,
    AGE_ADULT:  12,
    AGE_OLD:    35,
  },

  // ─── Pinceau souris ──────────────────────────────────────────────────────
  BRUSH: {
    DRAW_RADIUS:  2,
    ERASE_RADIUS: 2,
    SPARK_RADIUS: 5,
    SPARK_DENSITY: 0.5,
  },
} as const

export type SpeedKey  = keyof typeof CONWAY_CONFIG.SPEEDS
export type DrawTool  = 'draw' | 'erase' | 'spark'
