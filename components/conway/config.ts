// Conway's Game of Life — configuration centrale
// Modifier ici pour ajuster visuels, vitesse, densité sans toucher à la logique.

export const CONWAY_CONFIG = {
  CELL_SIZE: 8, // px par cellule (carré)

  COLORS: {
    background: '#05050a',
    cell: '#4ade80',          // vert vif principal
    cellDim: '#1a7a3a',       // futur: cellules vieillissantes
    grid: 'rgba(74,222,128,0.04)', // lignes grille très subtiles
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
} as const

export type SpeedKey = keyof typeof CONWAY_CONFIG.SPEEDS
