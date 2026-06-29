import type { GenreType, WeatherType } from './types';

export const GENRE_WEATHER: Record<GenreType, WeatherType> = {
  'Comédie':         'sun',
  'Romance':         'sun',
  'Animation':       'sun',
  'Thriller':        'rain',
  'Crime':           'rain',
  'Horreur':         'rain',
  'Western':         'sand',
  'Aventure':        'sand',
  'Guerre':          'sand',
  'Drame':           'snow',
  'Science-Fiction': 'snow',
  'Fantastique':     'snow',
  'Action':          null,
};

export const WEATHER_LABELS: Record<string, string> = {
  sun:  'Plein Soleil',
  rain: 'Sous la Pluie',
  sand: 'Vent de Sable',
  snow: 'Chute de Neige',
};

export const WEATHER_CLUSTERS: Record<string, GenreType[]> = {
  sun:  ['Comédie', 'Romance', 'Animation'],
  rain: ['Thriller', 'Crime', 'Horreur'],
  sand: ['Western', 'Aventure', 'Guerre'],
  snow: ['Drame', 'Science-Fiction', 'Fantastique'],
};

export function getWeatherForGenre(genre: GenreType): WeatherType {
  return GENRE_WEATHER[genre];
}

export function isInWeatherCluster(genre: GenreType, weather: WeatherType): boolean {
  if (!weather) return false;
  return GENRE_WEATHER[genre] === weather;
}
