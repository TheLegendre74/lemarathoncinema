export type GenreType =
  | 'Action' | 'Animation' | 'Aventure' | 'Comédie' | 'Crime'
  | 'Drame' | 'Fantastique' | 'Guerre' | 'Horreur' | 'Romance'
  | 'Science-Fiction' | 'Thriller' | 'Western';

export type Rarity = 'LÉGENDAIRE' | 'ÉPIQUE' | 'DUPONTEL' | 'RARE';

export type StatKey = 'Spec' | 'Tec' | 'Sce' | 'Prof' | 'Ryt';

export type WeatherType = 'sun' | 'rain' | 'sand' | 'snow' | null;

export type StatusType = 'poison' | 'poison_bad' | 'burn' | 'para' | 'sleep' | null;

export type MoveCategory = 'phys' | 'spe' | 'status';

export interface MoveDisplay {
  name: string;
  type: string;
  cat: string;
  pow: number | null;
  acc: number;
  effet: string;
  full: string;
}

export interface MoveEngine {
  name: string;
  type: string;
  cat: MoveCategory;
  pow?: number;
  acc?: number;
  pri?: number;
  pp?: number;
  eff?: string;
  percent?: number;
  recoil?: number;
  self_drop?: [string, number][];
  self_hp?: number;
  flinch_speed?: boolean;
  sec?: [string, number];
  pivot?: boolean;
}

export interface PassiveDisplay {
  name: string;
  effet: string;
}

export interface PassiveEngine {
  cat: string;
  params: Record<string, unknown>;
}

export interface CardData {
  num: number;
  name: string;
  year: string;
  types: GenreType[];
  rarity: Rarity;
  stats: {
    Post: number;
    Spec: number;
    Tec: number;
    Sce: number;
    Prof: number;
    Ryt: number;
  };
  bst: number;
  moves: MoveDisplay[];
  moves_engine: MoveEngine[];
  passive: PassiveDisplay;
  passive_engine: PassiveEngine;
  monument?: boolean;
}

export interface ClimaxData {
  num: number;
  name: string;
  genre: string;
  rarity: Rarity;
  role: string;
  affinite: string;
  climax: string;
}

export interface ClippyClimaxInfo {
  affinite: string;
  stats: StatKey[];
  fort: number;
  defaut: number;
  note: string;
}

export interface ClippyTeamFilm {
  num: number;
  name: string;
  types: GenreType[];
  rarity: Rarity;
  climax?: ClippyClimaxInfo;
}

export interface ClippyTeam {
  meta: string;
  veut: string;
  films: ClippyTeamFilm[];
}

export type ClippyTeams = Record<string, ClippyTeam>;

export type Difficulty = 'facile' | 'moyen' | 'difficile';

// ── État de combat (runtime) ──

export interface Side {
  rocks: number;
  spikes: number;
  tspikes: number;
  sticky: number;
  reflect: number;
  lightscreen: number;
  monset: Set<number>;
  monheal: boolean;
  underset: Set<number>;
}

export interface Field {
  weather: WeatherType;
  wturns: number;
  tr: number;
  wsetter: Side | null;
}

export type MegaInfo = [string | null, StatKey[], number, number] | null;

// ── Log de combat ──

export type BattleActionType = 'move' | 'switch' | 'faint' | 'weather' | 'status' | 'info';

export interface BattleLogEntry {
  turn: number;
  side: 'A' | 'B';
  action: BattleActionType;
  detail: string;
  hpA?: number;
  hpAmax?: number;
  hpB?: number;
  hpBmax?: number;
  weatherNow?: WeatherType;
}

export interface BattleResult {
  winner: 'A' | 'B' | 'draw';
  turns: number;
  log: BattleLogEntry[];
  aliveA: number;
  aliveB: number;
}

// ── Sélection d'équipe ──

export interface TeamSelection {
  films: number[];
  climaxCarrier: number | null;
}

// ── Combat interactif (machine à états) ──

export type BattlePhase = 'player_choice' | 'animating' | 'ko_replace' | 'ended';

export interface MonSnapshot {
  num: number;
  name: string;
  hp: number;
  maxhp: number;
  types: string[];
  status: string | null;
}

export interface BattleSnapshot {
  activeA: MonSnapshot | null;
  activeB: MonSnapshot | null;
  weather: WeatherType;
  tr: number;
  teamA: { num: number; name: string; hp: number; maxhp: number; alive: boolean; status: string | null }[];
  teamB: { num: number; name: string; hp: number; maxhp: number; alive: boolean; status: string | null }[];
}

export interface BattleEvent {
  message: string;
  snapshot: BattleSnapshot;
  isKO?: 'A' | 'B';
}

export type PlayerAction =
  | { type: 'move'; moveIndex: number; climax?: boolean }
  | { type: 'switch'; targetIndex: number }
  | { type: 'forfeit' };
