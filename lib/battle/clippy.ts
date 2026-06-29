import type { CardData, ClimaxData, ClippyTeams, ClippyTeamFilm, Difficulty, MegaInfo, MoveEngine } from './types';
import type { StatKey } from './types';

const CLIPPY_ARCHETYPE_ORDER = ['HO', 'Stall', 'Balance', 'Neige', 'Distorsion'];

export function getClippyTeamKey(sessionSeed: number): string {
  return CLIPPY_ARCHETYPE_ORDER[sessionSeed % CLIPPY_ARCHETYPE_ORDER.length];
}

export function getClippyTeam(
  teams: ClippyTeams,
  difficulty: Difficulty,
  sessionSeed: number,
): { key: string; films: ClippyTeamFilm[]; meta: string } {
  const key = getClippyTeamKey(sessionSeed);
  const team = teams[key];
  return { key, films: team.films, meta: team.meta };
}

export function buildClippyMon(
  film: ClippyTeamFilm,
  cards: Record<number, CardData>,
  difficulty: Difficulty,
): [number, string, MoveEngine[], MegaInfo] {
  const card = cards[film.num];
  if (!card) throw new Error(`Card ${film.num} not found`);

  const ability = card.passive?.name ?? '';
  const moves = card.moves_engine;

  let mega: MegaInfo = null;
  if (film.climax && (difficulty === 'moyen' || difficulty === 'difficile')) {
    const aff = film.climax.affinite === 'neutre' ? null : film.climax.affinite;
    mega = [
      aff,
      film.climax.stats,
      film.climax.fort,
      film.climax.defaut,
    ];
  }

  return [film.num, ability, moves, mega];
}

export function getClippyDifficultyLabel(d: Difficulty): string {
  switch (d) {
    case 'facile': return 'Facile';
    case 'moyen': return 'Moyen';
    case 'difficile': return 'Difficile';
  }
}

export function getClippyDifficultyDesc(d: Difficulty): string {
  switch (d) {
    case 'facile': return 'Équipes en Rares/Épiques, sans Climax';
    case 'moyen': return 'Équipes archétypes, Climax activé';
    case 'difficile': return 'Équipes optimisées, avantage météo';
  }
}

export function generateSessionSeed(): number {
  return Math.floor(Date.now() / (1000 * 60 * 60));
}

export function nextRotation(seed: number): number {
  return (seed + 1) % CLIPPY_ARCHETYPE_ORDER.length;
}

export function buildPlayerMon(
  num: number,
  cards: Record<number, CardData>,
  climaxMap: Map<number, ClimaxData>,
  isClimaxCarrier: boolean,
): [number, string, MoveEngine[], MegaInfo] {
  const card = cards[num];
  if (!card) throw new Error(`Card ${num} not found`);

  const ability = card.passive?.name ?? '';
  const moves = card.moves_engine;

  let mega: MegaInfo = null;
  if (isClimaxCarrier) {
    const climax = climaxMap.get(num);
    if (climax) {
      const aff = climax.affinite === 'neutre' ? null : climax.affinite;
      const statsStr = climax.climax;
      const stats = statsStr.split('+') as StatKey[];
      mega = [aff, stats, 1.20, 1.08];
    }
  }

  return [num, ability, moves, mega];
}
