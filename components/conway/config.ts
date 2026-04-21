// Conway V4 — configuration centrale

export const CONWAY_CONFIG = {
  CELL_SIZE: 8,

  COLORS: {
    background: '#05050a',
    cellNew:     '#c4fce0', // naissance (faible énergie) — blanc-vert vif
    cellYoung:   '#6ee7b7',
    cellAdult:   '#4ade80',
    cellOld:     '#22c55e',
    cellAncient: '#15803d', // haute énergie — vert sombre, cellule ancrée
    cellTrail:   '#4ade80',
  },

  SPEEDS: {
    slow:   180,
    normal:  70,
    fast:    16,
  } as const,

  DEFAULT_SPEED: 'normal' as const,

  // ─── Moteur énergétique ─────────────────────────────────────────────────────
  // Chaque cellule porte une énergie ∈ [0, 1].
  // Vivant si energy > ALIVE_THRESHOLD. Mort progressif visible dans le trail.
  ECO: {
    ALIVE_THRESHOLD:      0.35,
    BIRTH_GAIN:           0.07,   // born à T + 0.07 = 0.42 → couleur "new"
    SURVIVE_GAIN:         0.02,   // gain/tick si 2-3 voisins
    ISOLATION_COST:       0.04,   // perte/tick si 0-1 voisins
    OVERPOP_COST:         0.07,   // perte/tick si 4+ voisins
    METABOLISM:           0.002,  // perte basale
    ENERGY_DECAY:         0.03,   // décroissance post-mort (trail)
    RESILIENCE_PER_LEVEL: 0.18,   // bonus de résilience par niveau de complexité
  },

  // ─── Fusion ─────────────────────────────────────────────────────────────────
  // Une fusion est possible entre deux amas vivants proches qui réunissent
  // des conditions de compatibilité. Contact ≠ fusion.
  FUSION: {
    ENERGY_MIN:      0.62,  // énergie minimale des deux cellules
    NEIGHBOR_MIN:    3,     // min de voisins vivants (confirmation d'amas)
    PROB_BASE:       0.004, // proba de base par paire éligible/tick
    MAX_COMPLEXITY:  7,     // niveau max de complexité
    MAX_DIFF:        2,     // écart max de complexité autorisé
    COOLDOWN_BASE:   30,    // ticks de cooldown = niveau × COOLDOWN_BASE
    ENERGY_BOOST:    0.12,  // boost d'énergie au moment de la fusion
    PASS_INTERVAL:   1,     // appliquer la passe de fusion tous les N ticks
  },

  // ─── Anti-stagnation ────────────────────────────────────────────────────────
  ANTI_STAGNATION: {
    ACTIVITY_THRESHOLD: 0.0012, // variation d'énergie moyenne/cellule/tick
    QUIET_TICKS:        22,     // patient avant d'intervenir
    MIN_ALIVE_RATIO:    0.005,
    SPARKS_COUNT:       1,      // une seule injection à la fois
  },

  // ─── Seed structuré ─────────────────────────────────────────────────────────
  SEED: {
    ISLAND_FACTOR: 0.80, // N îlots ≈ (cols*rows / 250) * factor
    MIN_DIST:      14,   // distance min entre centres d'îlots
    BASE_DENSITY:  0.06, // bruit de fond sparse sous les îlots
  },

  // ─── Mobilité (spaceship factory) ───────────────────────────────────────────
  MOBILITY: {
    SPAWN_INTERVAL_MIN: 35,
    SPAWN_INTERVAL_MAX: 70,
    SHIPS_PER_SPAWN:    1,
  },

  // ─── Rendu — seuils énergie pour la palette ──────────────────────────────────
  RENDER: {
    TRAIL_DECAY: 0.10,
    E_NEW:   0.48, // [T..E_NEW]    → cellNew   (blanc-vert, naissances)
    E_YOUNG: 0.62, // [E_NEW..YOUNG] → cellYoung
    E_ADULT: 0.78, // [YOUNG..ADULT] → cellAdult
    E_OLD:   0.92, // [ADULT..OLD]   → cellOld
                   // [OLD..1.0]     → cellAncient
  },

  // ─── Pinceau souris ──────────────────────────────────────────────────────────
  BRUSH: {
    DRAW_RADIUS:   2,
    ERASE_RADIUS:  2,
    SPARK_RADIUS:  5,
    SPARK_DENSITY: 0.40,
  },
} as const

export type SpeedKey = keyof typeof CONWAY_CONFIG.SPEEDS
export type DrawTool = 'draw' | 'erase' | 'spark'
