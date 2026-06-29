import type { CardData, ClimaxData, ClippyTeams, GenreType, Rarity } from './types';
import type { WeatherType } from './types';
import { GENRE_WEATHER } from './weather';

let cardsCache: Record<number, CardData> | null = null;
let saisonCache: ClimaxData[] | null = null;
let clippyCache: ClippyTeams | null = null;

export async function loadCards(): Promise<Record<number, CardData>> {
  if (cardsCache) return cardsCache;
  const res = await fetch('/data/battle/cards.json');
  const raw: Record<string, CardData> = await res.json();
  cardsCache = {};
  for (const [k, v] of Object.entries(raw)) {
    cardsCache[parseInt(k)] = v;
  }
  return cardsCache;
}

export async function loadSaison(): Promise<ClimaxData[]> {
  if (saisonCache) return saisonCache;
  const res = await fetch('/data/battle/saison1.json');
  saisonCache = await res.json();
  return saisonCache!;
}

export async function loadClippyTeams(): Promise<ClippyTeams> {
  if (clippyCache) return clippyCache;
  const res = await fetch('/data/battle/clippy_teams.json');
  clippyCache = await res.json();
  return clippyCache!;
}

export function getCardList(cards: Record<number, CardData>): CardData[] {
  return Object.values(cards).sort((a, b) => a.num - b.num);
}

export function getClimaxMap(saison: ClimaxData[]): Map<number, ClimaxData> {
  const map = new Map<number, ClimaxData>();
  for (const c of saison) {
    map.set(c.num, c);
  }
  return map;
}

export function isOutsider(card: CardData): boolean {
  return card.rarity === 'RARE';
}

export function hasClimax(num: number, climaxMap: Map<number, ClimaxData>): boolean {
  return climaxMap.has(num);
}

export function getWeatherForCard(card: CardData): WeatherType {
  return GENRE_WEATHER[card.types[0]] ?? null;
}

export function countByRarity(nums: number[], cards: Record<number, CardData>): Record<Rarity, number> {
  const counts: Record<Rarity, number> = { 'LÉGENDAIRE': 0, 'ÉPIQUE': 0, 'DUPONTEL': 0, 'RARE': 0 };
  for (const n of nums) {
    const c = cards[n];
    if (c) counts[c.rarity]++;
  }
  return counts;
}

export interface FilterOptions {
  search?: string;
  types?: GenreType[];
  rarities?: Rarity[];
  weather?: WeatherType;
  climaxOnly?: boolean;
}

export function filterCards(
  allCards: CardData[],
  filters: FilterOptions,
  climaxMap: Map<number, ClimaxData>,
): CardData[] {
  return allCards.filter(card => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!card.name.toLowerCase().includes(q) && !card.year.includes(q)) return false;
    }
    if (filters.types && filters.types.length > 0) {
      if (!card.types.some(t => filters.types!.includes(t))) return false;
    }
    if (filters.rarities && filters.rarities.length > 0) {
      if (!filters.rarities.includes(card.rarity)) return false;
    }
    if (filters.weather) {
      if (GENRE_WEATHER[card.types[0]] !== filters.weather) return false;
    }
    if (filters.climaxOnly) {
      if (!climaxMap.has(card.num)) return false;
    }
    return true;
  });
}
