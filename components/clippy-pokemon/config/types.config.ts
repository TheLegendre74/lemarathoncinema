import type { FilmType } from '../types'
import { BALANCE } from './balance.config'

export const ALL_TYPES: FilmType[] = [
  'horreur', 'action', 'comedie', 'drame', 'sciencefiction',
  'fantastique', 'thriller', 'animation', 'romance', 'aventure',
]

export const TYPE_COLORS: Record<FilmType, number> = {
  horreur:        0x8B0000,
  action:         0xFF6600,
  comedie:        0xFFD700,
  drame:          0x1a237e,
  sciencefiction: 0x00BCD4,
  fantastique:    0x9C27B0,
  thriller:       0x424242,
  animation:      0x4CAF50,
  romance:        0xE91E63,
  aventure:       0x795548,
}

export const TYPE_COLORS_CSS: Record<FilmType, string> = {
  horreur:        '#8B0000',
  action:         '#FF6600',
  comedie:        '#FFD700',
  drame:          '#1a237e',
  sciencefiction: '#00BCD4',
  fantastique:    '#9C27B0',
  thriller:       '#424242',
  animation:      '#4CAF50',
  romance:        '#E91E63',
  aventure:       '#795548',
}

export const TYPE_NAMES: Record<FilmType, string> = {
  horreur:        'Horreur',
  action:         'Action',
  comedie:        'Comédie',
  drame:          'Drame',
  sciencefiction: 'Sci-Fi',
  fantastique:    'Fantastique',
  thriller:       'Thriller',
  animation:      'Animation',
  romance:        'Romance',
  aventure:       'Aventure',
}

export type Effectiveness = 0 | 0.5 | 1 | 2

export const TYPE_CHART: Partial<Record<FilmType, Partial<Record<FilmType, Effectiveness>>>> = {
  horreur:        { comedie: 2, romance: 2, animation: 2, action: 0.5, aventure: 0.5 },
  action:         { thriller: 2, aventure: 2, drame: 0.5, romance: 0.5 },
  comedie:        { drame: 2, animation: 2, horreur: 0.5, thriller: 0.5 },
  drame:          { action: 2, thriller: 2, sciencefiction: 2, comedie: 0.5, fantastique: 0.5 },
  sciencefiction: { fantastique: 2, horreur: 2, animation: 0.5, drame: 0.5 },
  fantastique:    { drame: 2, romance: 2, sciencefiction: 0.5, thriller: 0.5 },
  thriller:       { comedie: 2, romance: 2, action: 0.5, drame: 0.5 },
  animation:      { aventure: 2, sciencefiction: 2, comedie: 0.5, horreur: 0.5 },
  romance:        { action: 2, aventure: 2, horreur: 0.5, thriller: 0.5 },
  aventure:       { horreur: 2, fantastique: 2, action: 0.5, animation: 0.5 },
}

function mapChartValue(v: number): number {
  if (v === 2) return BALANCE.SUPER_EFFECTIVE_MULT
  if (v === 0.5) return BALANCE.NOT_EFFECTIVE_MULT
  return v
}

export function getEffectiveness(atkType: FilmType, defType1: FilmType, defType2?: FilmType): number {
  const raw1 = TYPE_CHART[atkType]?.[defType1] ?? 1
  const raw2 = defType2 ? (TYPE_CHART[atkType]?.[defType2] ?? 1) : 1
  return mapChartValue(raw1) * mapChartValue(raw2)
}
