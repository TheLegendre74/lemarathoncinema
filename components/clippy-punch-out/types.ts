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

export interface ClippyActionState {
  action: ClippyActionType
  attack: ClippyAttack | null
  timer: number
  recoveryDuration: number
  comboRemaining: number
  realAttack: ClippyAttack | null
  stunHitsRemaining: number
}

export interface ClippyPsyche {
  confidence: number
  panic: number
  fatigue: number
}

// ─── Game ────────────────────────────────────────────────────────────

export type GamePhase = 'intro' | 'tutorial' | 'combat' | 'win' | 'lose'
export type CombatPhase = 1 | 2 | 3
export type HypeLevel = 'hostile' | 'neutral' | 'delirious'
export type FrenzyState = 'inactive' | 'building' | 'active'

// ─── Projectiles ─────────────────────────────────────────────────────

export type ProjectileType = 'can' | 'mug' | 'keyboard' | 'mouse'

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
  side: 'left' | 'right'
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
  | 'guard_block' | 'hit' | 'counter_punch' | 'taunt_hit'
  | 'star_earned' | 'star_lost' | 'stun_start' | 'stun_hit'

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

  hype: {
    value: number
    level: HypeLevel
  }

  frenzy: {
    state: FrenzyState
    highHypeTimer: number
  }

  effects: EffectState
  projectiles: Projectile[]

  tutorial: {
    active: boolean
    step: number
  }
}
