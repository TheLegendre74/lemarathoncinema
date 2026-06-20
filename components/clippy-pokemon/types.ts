export type FilmType =
  | 'horreur' | 'action' | 'comedie' | 'drame'
  | 'sciencefiction' | 'fantastique' | 'thriller'
  | 'animation' | 'romance' | 'aventure'

export type MoveCategory = 'physique' | 'speciale' | 'statut'

export type StatusEffect = 'flinch' | 'paralysie' | 'sommeil' | 'confusion' | 'poison'

export type StatId = 'atk' | 'def' | 'spe' | 'vit' | 'precision' | 'esquive'

export interface StatMod {
  stat: StatId
  stages: number
  target: 'self' | 'opponent'
}

export interface MoveEffect {
  status?: StatusEffect
  statusChance?: number
  statMods?: StatMod[]
  multiHits?: [number, number]
  heal?: number
  drain?: number
  flinchChance?: number
  recoil?: number
  clearStages?: 'opponent' | 'self'
  selfKO?: boolean
}

export interface Move {
  id: string
  nom: string
  type: FilmType
  categorie: MoveCategory
  puissance: number
  precision: number
  pp: number
  priorite?: number
  critBonus?: number
  effet?: MoveEffect
  texte: string
}

export interface CombatantStats {
  pvMax: number
  atk: number
  def: number
  spe: number
  vit: number
}

export const EMPTY_STAGES: Record<StatId, number> = {
  atk: 0, def: 0, spe: 0, vit: 0, precision: 0, esquive: 0,
}

export interface FilmCombatant {
  filmId: number
  titre: string
  poster: string | null
  type1: FilmType
  type2?: FilmType
  moves: Move[]
  stats: CombatantStats
  pv: number
  currentPP: number[]
  status: StatusEffect | null
  statusTurns: number
  statStages: Record<StatId, number>
  isKO: boolean
}

export interface ClippyCombatant {
  nom: string
  stats: CombatantStats
  pv: number
  moves: Move[]
  formType: FilmType
  status: StatusEffect | null
  statusTurns: number
  statStages: Record<StatId, number>
}

export type BattleState =
  | 'INTRO' | 'PLAYER_TURN' | 'MOVE_SELECT' | 'FILM_SELECT'
  | 'EXECUTE_TURN' | 'MESSAGE_WAIT'
  | 'CHECK_KO' | 'SWITCH_FORCED'
  | 'VICTORY' | 'DEFEAT'

export interface TurnAction {
  source: 'player' | 'clippy'
  type: 'attack' | 'switch' | 'item' | 'pokeball'
  moveIndex?: number
  switchTo?: number
  itemId?: string
  itemTarget?: number
  priority: number
  speed: number
}

export interface FilmRow {
  id: number
  titre: string
  annee: number
  genre: string
  sousgenre: string | null
  poster: string | null
  realisateur: string
}
