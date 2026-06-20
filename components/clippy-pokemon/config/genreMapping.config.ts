import type { FilmType } from '../types'

const GENRE_MAP: Record<string, FilmType> = {
  'horreur':          'horreur',
  'épouvante':        'horreur',
  'epouvante':        'horreur',
  'horror':           'horreur',
  'slasher':          'horreur',
  'zombie':           'horreur',
  'gore':             'horreur',

  'action':           'action',
  'guerre':           'action',
  'war':              'action',
  'sport':            'action',
  'arts martiaux':    'action',
  'superhéros':       'action',
  'super-héros':      'action',

  'comédie':          'comedie',
  'comedie':          'comedie',
  'comedy':           'comedie',
  'comique':          'comedie',
  'parodie':          'comedie',
  'musical':          'comedie',
  'musique':          'comedie',

  'drame':            'drame',
  'drama':            'drame',
  'dramatique':       'drame',
  'biopic':           'drame',
  'historique':       'drame',
  'histoire':         'drame',
  'documentaire':     'drame',

  'science-fiction':  'sciencefiction',
  'science fiction':  'sciencefiction',
  'sf':               'sciencefiction',
  'sci-fi':           'sciencefiction',
  'cyberpunk':        'sciencefiction',
  'kaiju':            'sciencefiction',
  'mecha':            'sciencefiction',

  'fantastique':      'fantastique',
  'fantasy':          'fantastique',
  'fantaisie':        'fantastique',
  'féerique':         'fantastique',
  'surnaturel':       'fantastique',

  'thriller':         'thriller',
  'suspense':         'thriller',
  'policier':         'thriller',
  'polar':            'thriller',
  'mystère':          'thriller',
  'mystere':          'thriller',
  'mystery':          'thriller',
  'crime':            'thriller',
  'noir':             'thriller',
  'espionnage':       'thriller',
  'survival':         'thriller',

  'animation':        'animation',
  'animé':            'animation',
  'anime':            'animation',
  'dessin animé':     'animation',
  'famille':          'animation',
  'family':           'animation',

  'romance':          'romance',
  'romantique':       'romance',
  'romantic':         'romance',
  'amour':            'romance',

  'aventure':         'aventure',
  'adventure':        'aventure',
  'western':          'aventure',
  'pirate':           'aventure',
  'exploration':      'aventure',
}

export function mapGenreToType(genre: string): FilmType {
  return GENRE_MAP[genre.toLowerCase().trim()] ?? 'drame'
}

export function mapFilmTypes(genre: string, sousgenre: string | null): { type1: FilmType; type2?: FilmType } {
  const type1 = mapGenreToType(genre)
  if (!sousgenre) return { type1 }
  const type2 = mapGenreToType(sousgenre)
  if (type2 === type1) return { type1 }
  return { type1, type2 }
}
