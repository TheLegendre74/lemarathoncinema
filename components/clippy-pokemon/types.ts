// ── Types Cinémon — alignés sur cards.json + engine2.py ──

export type GenreType =
  | 'Action' | 'Animation' | 'Aventure' | 'Comédie' | 'Crime'
  | 'Drame' | 'Fantastique' | 'Guerre' | 'Horreur'
  | 'Romance' | 'Science-Fiction' | 'Thriller' | 'Western'

export type MoveCategory = 'phys' | 'spe' | 'status'

export type Rarity = 'LÉGENDAIRE' | 'ÉPIQUE' | 'DUPONTEL' | 'RARE'

export type StatusId = 'poison' | 'poison_bad' | 'burn' | 'para' | 'sleep' | 'confusion'

export type StatId = 'Spec' | 'Tec' | 'Sce' | 'Prof' | 'Ryt'

export const ALL_STAT_IDS: StatId[] = ['Spec', 'Tec', 'Sce', 'Prof', 'Ryt']

export const STAT_LABELS: Record<StatId, string> = {
  Spec: 'Spectacle',
  Tec: 'Technique',
  Sce: 'Scénario',
  Prof: 'Profondeur',
  Ryt: 'Rythme',
}

export interface CardStats {
  Post: number  // Postérité → PV = Post × HP_MULT
  Spec: number  // Attaque physique
  Tec: number   // Défense physique
  Sce: number   // Attaque spéciale
  Prof: number  // Défense spéciale
  Ryt: number   // Vitesse
}

// ── Attaques ──

export interface MoveDisplay {
  name: string
  type: string
  cat: string
  pow: number | null
  acc: number
  effet: string
  full: string
}

export interface MoveEngine {
  name: string
  type: string       // genre type or '—' for typeless status moves
  cat: MoveCategory
  pow?: number
  acc?: number
  pri?: number
  pp: number
  eff?: string       // status move effect string
  sec?: [string, number]  // secondary effect [status, chance]
  recoil?: number
  self_drop?: [string, number][]
  self_hp?: number
  percent?: number
  pivot?: boolean
  flinch_speed?: boolean
}

// ── Passifs ──

export interface PassiveDisplay {
  name: string
  effet: string
}

export interface PassiveEngine {
  cat: string
  params: Record<string, any>
}

// ── Carte (données brutes de cards.json) ──

export interface CardData {
  num: number
  name: string
  year: string
  types: GenreType[]
  rarity: Rarity
  stats: CardStats
  bst: number
  moves: MoveDisplay[]
  moves_engine: MoveEngine[]
  equipped: string[]          // 4 noms d'attaques par défaut
  passive: PassiveDisplay
  passive_engine: PassiveEngine
}

export type CardsDB = Record<number, CardData>

// ── Combattant en combat ──

export interface FilmCombatant {
  num: number
  name: string
  types: GenreType[]
  rarity: Rarity
  bst: number
  baseStats: CardStats
  passive: PassiveDisplay
  passiveEngine: PassiveEngine

  maxHp: number
  hp: number
  base: Record<StatId, number>
  stages: Record<StatId, number>

  moves: MoveEngine[]          // les 4 équipées
  movesDisplay: MoveDisplay[]  // les 4 en version affichage
  ppLeft: number[]             // PP restants par move

  status: StatusId | null
  toxCounter: number
  sleepTurns: number
  confTurns: number
  tauntTurns: number
  isProtected: boolean
  protectStreak: number

  disguise: boolean
  firstTurn: boolean
  pivotPending: boolean
  recoverCount: number
  idleTurns: number
  dealtDamage: boolean

  // passive tracking
  dodgeUsed: boolean
  endureUsed: boolean
  lowhpDone: boolean
  entryDone: boolean

  // Climax (mega)
  mega: ClimaxData | null
  megaActive: boolean
  megaMult: number

  // derived
  isOutsider: boolean
  outsiderCombo: number  // nb of Rares entered on team side

  isAlive: boolean
}

export interface ClimaxData {
  affinity: string | null     // weather affinity or 'trickroom'
  boostedStats: StatId[]
  strongMult: number
  defaultMult: number
}

// ── Side state (hazards, screens, etc.) ──

export interface SideState {
  rocks: number
  spikes: number
  tspikes: number
  sticky: number
  reflect: number
  lightscreen: number
  monset: Set<number>
  underset: Set<number>
}

// ── Field state ──

export interface FieldState {
  weather: string | null
  weatherTurns: number
  weatherSetter: SideState | null
  trickRoom: number
}

// ── Turn action ──

export type TurnDecision =
  | { type: 'move'; move: MoveEngine; moveIndex: number }
  | { type: 'switch'; targetIndex: number }

// ── Battle state machine ──

export type BattlePhase =
  | 'TEAM_PREVIEW'
  | 'PLAYER_TURN'
  | 'MOVE_SELECT'
  | 'SWITCH_SELECT'
  | 'CLIMAX_PROMPT'
  | 'EXECUTE_TURN'
  | 'ANIMATION'
  | 'CHECK_KO'
  | 'FORCED_SWITCH'
  | 'VICTORY'
  | 'DEFEAT'

export interface BattleEvent {
  type: 'damage' | 'ko' | 'switch' | 'status' | 'weather' | 'boost'
       | 'heal' | 'miss' | 'immune' | 'crit' | 'supereffective' | 'resisted'
       | 'climax' | 'message' | 'recoil' | 'hazard' | 'faint'
  text: string
  data?: Record<string, any>
}

// ── Stage multiplier table (from engine2.py) ──

export const STAGE_MULT: Record<number, number> = {
  '-6': 0.25, '-5': 0.29, '-4': 0.33, '-3': 0.40,
  '-2': 0.50, '-1': 0.67,  '0': 1.00,
   '1': 1.50,  '2': 2.00,  '3': 2.50,
   '4': 3.00,  '5': 3.50,  '6': 4.00,
}

export function getStageMult(stage: number): number {
  const clamped = Math.max(-6, Math.min(6, stage))
  return STAGE_MULT[clamped] ?? 1.0
}

// ── Empty stages ──

export function emptyStages(): Record<StatId, number> {
  return { Spec: 0, Tec: 0, Sce: 0, Prof: 0, Ryt: 0 }
}
