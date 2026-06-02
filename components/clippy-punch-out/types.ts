// ─── Attack & Direction ──────────────────────────────────────────────

export type AttackSide = 'left' | 'right' | 'body'
export type DodgeDirection = 'left' | 'right' | 'down'
export type ClippyAttackType = 'jab' | 'hook' | 'charge'

export interface ClippyAttack {
  type: ClippyAttackType
  side: AttackSide
}

export const REQUIRED_DODGE: Record<AttackSide, DodgeDirection> = {
  left: 'right',
  right: 'left',
  body: 'down',
}

export const DODGE_KEY_IDX: Record<DodgeDirection, number> = {
  left: 0,
  down: 1,
  right: 2,
}

// ─── Player ──────────────────────────────────────────────────────────

export type PlayerActionType =
  | 'idle' | 'jab' | 'heavy' | 'guard'
  | 'dodge' | 'stunned' | 'starpunch'
  | 'exhausted'

export type AttackPhase = 'startup' | 'active' | 'recovery'

export interface PlayerState {
  action: PlayerActionType
  phase: AttackPhase | null
  timer: number
  dodgeDir: DodgeDirection | null
  isPerfectDodge: boolean
  cooldownRemaining: number
}

// ─── Clippy ──────────────────────────────────────────────────────────

export type ClippyActionType =
  | 'idle' | 'telegraph' | 'attack' | 'recovery'
  | 'feint_telegraph' | 'feint_cancel' | 'stunned' | 'taunt' | 'down'
  | 'charge_recoil' | 'charge_freeze' | 'charge_rush'
  | 'series_pause'

export interface ClippyActionState {
  action: ClippyActionType
  attack: ClippyAttack | null
  timer: number
  recoveryDuration: number
  comboRemaining: number
  realAttack: ClippyAttack | null
  stunHitsRemaining: number
  stunDurationMs: number
}

export interface ClippyPsyche {
  confidence: number
  panic: number
  fatigue: number
}

// ─── Game ────────────────────────────────────────────────────────────

export type GamePhase = 'intro' | 'tutorial' | 'combat' | 'win' | 'lose'
export type CombatPhase = 1 | 2

// ─── Projectiles ─────────────────────────────────────────────────────

export type ProjectileType = 'can' | 'keyboard' | 'popcorn' | 'rose'

export interface Projectile {
  type: ProjectileType
  x: number
  y: number
  targetX: number
  targetY: number
  progress: number
  duration: number
  active: boolean
  warned: boolean
  damage: number
  side: 'left' | 'right' | 'top'
  requiredDodge: DodgeDirection
}

// ─── Effects ─────────────────────────────────────────────────────────

export interface EffectState {
  shake: number
  flashColor: number
  flashAlpha: number
  freezeMs: number
  slowMo: number
  slowMoTimer: number
}

// ─── Combat Events ──────────────────────────────────────────────────

export type CombatEventType =
  | 'guard_block' | 'hit' | 'stun_start' | 'stun_hit'
  | 'star_earned' | 'error' | 'success'
  | 'rose_catch' | 'phase_transition'

export interface CombatEvent {
  type: CombatEventType
  damage?: number
}

// ─── Game Context ────────────────────────────────────────────────────

export interface GameContext {
  gamePhase: GamePhase
  combatPhase: CombatPhase
  totalTime: number
  dt: number

  player: {
    hp: number
    stamina: number
    state: PlayerState
    stars: number
    lastPunchHand: 'left' | 'right'
    comboCount: number
    comboTimer: number
    guardDuration: number
    isExhausted: boolean
    exhaustedTimer: number
    leanTime: number
  }

  clippy: {
    hp: number
    state: ClippyActionState
    psyche: ClippyPsyche
    missStreak: number
    idleDuration: number
    blinkFired: boolean
    patternQueue: ClippyAttackType[]
    patternRepeats: number
    lastTauntTime: number
  }

  series: {
    total: number
    dodgedCount: number
    currentIndex: number
    active: boolean
  }

  crowd: {
    errorCount: number
    successStreak: number
  }

  effects: EffectState
  projectiles: Projectile[]
  phaseTransitioned: boolean

  tutorial: {
    active: boolean
    step: number
  }

  roseSquare: {
    active: boolean
    x: number
    y: number
    timer: number
  }
}
