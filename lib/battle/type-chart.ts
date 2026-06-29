import type { GenreType } from './types';

// Table d'efficacité 13×13 fidèle à engine.py (SUP).
// 3 immunités du brief : Horreur→Comédie, Romance→Guerre, Crime→Animation.
// Valeurs : 2.0 = super-efficace, 0.5 = pas très efficace, 0 = immunité.
// Non listé = 1.0 (neutre).

type EffChart = Partial<Record<GenreType, Partial<Record<GenreType, number>>>>;

export const TYPE_CHART: EffChart = {
  'Action':          { 'Thriller': 2, 'Aventure': 2, 'Drame': 0.5, 'Romance': 0.5 },
  'Animation':       { 'Aventure': 2, 'Science-Fiction': 2, 'Comédie': 0.5, 'Horreur': 0.5 },
  'Aventure':        { 'Horreur': 2, 'Fantastique': 2, 'Action': 0.5, 'Animation': 0.5 },
  'Comédie':         { 'Drame': 2, 'Guerre': 2, 'Horreur': 0.5, 'Thriller': 0.5 },
  'Crime':           { 'Drame': 2, 'Thriller': 2, 'Comédie': 0.5, 'Animation': 0 },
  'Drame':           { 'Action': 2, 'Science-Fiction': 2, 'Comédie': 0.5, 'Fantastique': 0.5 },
  'Fantastique':     { 'Drame': 2, 'Romance': 2, 'Science-Fiction': 0.5, 'Thriller': 0.5 },
  'Guerre':          { 'Action': 2, 'Western': 2, 'Drame': 0.5, 'Comédie': 0.5 },
  'Horreur':         { 'Romance': 2, 'Science-Fiction': 2, 'Action': 0.5, 'Comédie': 0 },
  'Romance':         { 'Action': 2, 'Aventure': 2, 'Horreur': 0.5, 'Guerre': 0 },
  'Science-Fiction': { 'Fantastique': 2, 'Horreur': 2, 'Drame': 0.5, 'Animation': 0.5 },
  'Thriller':        { 'Comédie': 2, 'Romance': 2, 'Action': 0.5, 'Drame': 0.5 },
  'Western':         { 'Crime': 2, 'Aventure': 2, 'Action': 0.5, 'Science-Fiction': 0.5 },
};

export function typeMult(atkType: string, defTypes: string[]): number {
  let m = 1.0;
  for (const d of defTypes) {
    const chart = TYPE_CHART[atkType as GenreType];
    m *= chart?.[d as GenreType] ?? 1.0;
  }
  return m;
}

export const ALL_TYPES: GenreType[] = [
  'Action', 'Animation', 'Aventure', 'Comédie', 'Crime',
  'Drame', 'Fantastique', 'Guerre', 'Horreur', 'Romance',
  'Science-Fiction', 'Thriller', 'Western',
];

export const TYPE_COLORS: Record<GenreType, string> = {
  'Action':          '#FF6600',
  'Animation':       '#4CAF50',
  'Aventure':        '#795548',
  'Comédie':         '#FFD700',
  'Crime':           '#37474F',
  'Drame':           '#1a237e',
  'Fantastique':     '#9C27B0',
  'Guerre':          '#5D4037',
  'Horreur':         '#8B0000',
  'Romance':         '#E91E63',
  'Science-Fiction': '#00BCD4',
  'Thriller':        '#424242',
  'Western':         '#BF8040',
};

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
};
