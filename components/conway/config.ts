// Conway V2 — configuration centrale
// Modifier ici pour ajuster visuels, vitesse, densité, anti-stagnation.

export const CONWAY_CONFIG = {
  CELL_SIZE: 8, // px par cellule (carré)

  COLORS: {
    background: '#05050a',
    // Cellules — nuances par âge
    cellNew:    '#a7f3d0', // vient de naître (flash clair)
    cellYoung:  '#6ee7b7', // jeune
    cellAdult:  '#4ade80', // adulte (couleur de référence)
    cellOld:    '#22c55e', // ancienne, stable
    cellAncient:'#15803d', // très ancienne — settled
    // Trail (cellule mourante qui s'éteint)
    cellTrail:  '#4ade80', // même couleur, opacité réduite
  },

  // Délais en ms entre chaque génération
  SPEEDS: {
    slow: 220,
    normal: 80,
    fast: 16,
  } as const,

  DEFAULT_SPEED: 'normal' as const,

  // Proportion de cellules vivantes lors d'un seed aléatoire
  RANDOM_DENSITY: 0.28,

  // ─── Anti-stagnation ─────────────────────────────────────────────────────
  ANTI_STAGNATION: {
    // Ratio de cellules qui doivent changer par tick pour être considéré "actif"
    ACTIVITY_THRESHOLD: 0.003,
    // Nombre de ticks consécutifs sous le seuil avant d'injecter un spark
    QUIET_TICKS: 10,
    // Ratio minimum de cellules vivantes avant spark d'urgence
    MIN_ALIVE_RATIO: 0.008,
  },

  // ─── Rendu visuel ────────────────────────────────────────────────────────
  RENDER: {
    TRAIL_INITIAL: 0.75,  // opacité initiale d'une cellule qui vient de mourir
    TRAIL_DECAY:   0.14,  // décrémentation par tick (disparaît en ~5 ticks)
    // Seuils d'âge pour la coloration (en générations)
    AGE_YOUNG:   3,
    AGE_ADULT:  12,
    AGE_OLD:    35,
    // AGE_ANCIENT = tout ce qui dépasse AGE_OLD
  },

  // ─── Pinceau souris ──────────────────────────────────────────────────────
  BRUSH: {
    DRAW_RADIUS:  2,    // rayon en cellules pour l'outil Dessiner
    ERASE_RADIUS: 2,    // rayon pour l'outil Effacer
    SPARK_RADIUS: 5,    // rayon pour l'outil Étincelle
    SPARK_DENSITY: 0.5, // densité aléatoire lors d'un spark manuel
  },
} as const

export type SpeedKey = keyof typeof CONWAY_CONFIG.SPEEDS
export type DrawTool = 'draw' | 'erase' | 'spark'
