// ── 13 types-genres + table de types — alignée sur engine2.py / brief §3 ──
import type { GenreType } from '../types'

export const ALL_TYPES: GenreType[] = [
  'Action', 'Animation', 'Aventure', 'Comédie', 'Crime',
  'Drame', 'Fantastique', 'Guerre', 'Horreur',
  'Romance', 'Science-Fiction', 'Thriller', 'Western',
]

export const TYPE_COLORS: Record<GenreType, number> = {
  'Action':          0xFF6600,
  'Animation':       0x4CAF50,
  'Aventure':        0x795548,
  'Comédie':         0xFFD700,
  'Crime':           0x37474F,
  'Drame':           0x1a237e,
  'Fantastique':     0x9C27B0,
  'Guerre':          0x556B2F,
  'Horreur':         0x8B0000,
  'Romance':         0xE91E63,
  'Science-Fiction': 0x00BCD4,
  'Thriller':        0x424242,
  'Western':         0xD2691E,
}

export const TYPE_COLORS_CSS: Record<GenreType, string> = {
  'Action':          '#FF6600',
  'Animation':       '#4CAF50',
  'Aventure':        '#795548',
  'Comédie':         '#FFD700',
  'Crime':           '#37474F',
  'Drame':           '#1a237e',
  'Fantastique':     '#9C27B0',
  'Guerre':          '#556B2F',
  'Horreur':         '#8B0000',
  'Romance':         '#E91E63',
  'Science-Fiction': '#00BCD4',
  'Thriller':        '#424242',
  'Western':         '#D2691E',
}

export const TYPE_LABELS: Record<GenreType, string> = {
  'Action':          'Action',
  'Animation':       'Animation',
  'Aventure':        'Aventure',
  'Comédie':         'Comédie',
  'Crime':           'Crime',
  'Drame':           'Drame',
  'Fantastique':     'Fantastique',
  'Guerre':          'Guerre',
  'Horreur':         'Horreur',
  'Romance':         'Romance',
  'Science-Fiction': 'Sci-Fi',
  'Thriller':        'Thriller',
  'Western':         'Western',
}

// ── Table d'efficacité des types ──
// Clé = type attaquant, valeur = { type défenseur: multiplicateur }
// Omis = ×1 (neutre). 0 = immunité.
// Immunités du brief §3 : Horreur→Comédie, Romance→Guerre, Crime→Animation
type TypeChart = Partial<Record<GenreType, Partial<Record<GenreType, number>>>>

export const TYPE_CHART: TypeChart = {
  'Action': {
    'Comédie': 2, 'Crime': 2, 'Thriller': 2,
    'Drame': 0.5, 'Romance': 0.5,
  },
  'Animation': {
    'Fantastique': 2,
    'Crime': 0.5, 'Horreur': 0.5,
  },
  'Aventure': {
    'Animation': 2, 'Horreur': 2,
    'Crime': 0.5, 'Guerre': 0.5,
  },
  'Comédie': {
    'Drame': 2,
    'Action': 0.5, 'Crime': 0.5, 'Guerre': 0.5,
  },
  'Crime': {
    'Comédie': 2, 'Aventure': 2,
    'Action': 0.5, 'Thriller': 0.5,
    'Animation': 0,
  },
  'Drame': {
    'Action': 2, 'Western': 2,
    'Comédie': 0.5, 'Horreur': 0.5,
  },
  'Fantastique': {
    'Science-Fiction': 2, 'Western': 2,
    'Aventure': 0.5, 'Horreur': 0.5,
  },
  'Guerre': {
    'Comédie': 0.5,
  },
  'Horreur': {
    'Animation': 2, 'Drame': 2,
    'Aventure': 0.5,
    'Comédie': 0,
  },
  'Romance': {
    'Drame': 2,
    'Action': 0.5, 'Crime': 0.5,
    'Guerre': 0,
  },
  'Science-Fiction': {
    'Fantastique': 2, 'Thriller': 2,
    'Aventure': 0.5, 'Comédie': 0.5,
  },
  'Thriller': {
    'Aventure': 2, 'Comédie': 2, 'Horreur': 2,
    'Action': 0.5,
  },
  'Western': {
  },
}

export function getTypeMult(atkType: string, defTypes: string[]): number {
  if (atkType === '—' || !atkType) return 1.0
  let mult = 1.0
  for (const dt of defTypes) {
    mult *= TYPE_CHART[atkType as GenreType]?.[dt as GenreType] ?? 1.0
  }
  return mult
}

export type EffectivenessLabel = 'immune' | 'resisted' | 'neutral' | 'supereffective'

export function getEffectivenessLabel(mult: number): EffectivenessLabel {
  if (mult === 0) return 'immune'
  if (mult < 0.9) return 'resisted'
  if (mult > 1.1) return 'supereffective'
  return 'neutral'
}

export function getEffectivenessText(mult: number): string {
  if (mult === 0) return 'Sans effet'
  if (mult < 0.9) return 'Peu efficace'
  if (mult > 1.1) return 'Super efficace !'
  return ''
}
