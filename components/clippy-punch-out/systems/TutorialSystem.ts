import { CFG } from '../config'
import type { GameContext, AttackSide } from '../types'

interface TutStep {
  id: string
  title: string
  instruction: string
  hint: string
  missMsg: string
  clippyAttack: { type: 'jab' | 'hook' | 'charge'; side: AttackSide } | null
  expect: 'none' | 'dodge_right' | 'dodge_left' | 'duck' | 'jab' | 'heavy' | 'guard' | 'dodge_punish'
  autoAdvanceMs?: number
}

const STEPS: TutStep[] = [
  {
    id: 'intro_stun',
    title: 'RÈGLE D\'OR',
    instruction: 'Clippy n\'est touchable QUE quand des étoiles\ntournent au-dessus de sa tête.\nEsquive toutes ses attaques pour l\'étourdir !',
    hint: '',
    missMsg: '',
    clippyAttack: null,
    expect: 'none',
    autoAdvanceMs: 3000,
  },
  {
    id: 'dodge_right',
    title: 'ÉTAPE 1 — ESQUIVE DROITE',
    instruction: 'Clippy attaque à gauche. Esquivez à DROITE.',
    hint: 'Bougez la souris vers la droite ou →',
    missMsg: 'Raté ! Bougez la souris à droite ou →.',
    clippyAttack: { type: 'hook', side: 'left' },
    expect: 'dodge_right',
  },
  {
    id: 'dodge_left',
    title: 'ÉTAPE 2 — ESQUIVE GAUCHE',
    instruction: 'Clippy attaque à droite. Esquivez à GAUCHE.',
    hint: 'Bougez la souris vers la gauche ou ←',
    missMsg: 'Bougez la souris à gauche ou ←.',
    clippyAttack: { type: 'hook', side: 'right' },
    expect: 'dodge_left',
  },
  {
    id: 'duck',
    title: 'ÉTAPE 3 — BAISSEZ-VOUS',
    instruction: 'Clippy vise le corps. Baissez-vous !',
    hint: 'Bougez la souris vers le bas ou ↓',
    missMsg: 'Descendez la souris ou ↓ pour esquiver.',
    clippyAttack: { type: 'hook', side: 'body' },
    expect: 'duck',
  },
  {
    id: 'attack',
    title: 'ÉTAPE 4 — ATTAQUEZ',
    instruction: 'Clippy est étourdi. Frappez-le !',
    hint: 'Clic droit = Jab, Clic gauche = Direct lourd',
    missMsg: 'Cliquez pour frapper !',
    clippyAttack: null,
    expect: 'jab',
  },
  {
    id: 'dodge_punish',
    title: 'ÉTAPE 5 — ESQUIVE + PUNITION',
    instruction: 'Esquivez puis frappez Clippy sonné !',
    hint: 'Esquivez → puis clic droit ou gauche',
    missMsg: 'Esquivez d\'abord, puis frappez !',
    clippyAttack: { type: 'hook', side: 'left' },
    expect: 'dodge_punish',
  },
]

export class TutorialSystem {
  private waitTimer = 0
  private showingResult = false
  private resultTimer = 0
  private stepSuccess = false
  private dodgePunishPhase: 0 | 1 = 0
  private autoAdvanceTimer = 0

  get totalSteps() { return STEPS.length }

  getCurrentStep(ctx: GameContext): TutStep | null {
    if (!ctx.tutorial.active) return null
    return STEPS[ctx.tutorial.step] ?? null
  }

  getTitle(ctx: GameContext): string {
    return this.getCurrentStep(ctx)?.title ?? ''
  }

  getInstruction(ctx: GameContext): string {
    if (this.showingResult) {
      return this.stepSuccess ? 'Bravo !' : (this.getCurrentStep(ctx)?.missMsg ?? 'Raté !')
    }
    const step = this.getCurrentStep(ctx)
    if (!step) return ''
    if (step.expect === 'dodge_punish' && this.dodgePunishPhase === 1) return 'Maintenant frappez-le !'
    return step.expect === 'none' ? step.instruction : step.hint
  }

  isDodgePunishWaitingHit(): boolean { return this.dodgePunishPhase === 1 }

  update(ctx: GameContext, dt: number) {
    if (!ctx.tutorial.active) return

    const step = this.getCurrentStep(ctx)
    if (!step) return

    if (step.expect === 'none') {
      this.autoAdvanceTimer += dt * 1000
      if (this.autoAdvanceTimer >= (step.autoAdvanceMs ?? 3000)) {
        this.autoAdvanceTimer = 0
        ctx.tutorial.step++
        if (ctx.tutorial.step >= STEPS.length) { ctx.tutorial.active = false }
        this.waitTimer = 0
      }
      return
    }

    if (this.showingResult) {
      this.resultTimer += dt * 1000
      if (this.resultTimer >= 1500) {
        this.showingResult = false
        this.resultTimer = 0
        if (this.stepSuccess) {
          ctx.tutorial.step++
          this.dodgePunishPhase = 0
          if (ctx.tutorial.step >= STEPS.length) { ctx.tutorial.active = false; return }
        }
        this.waitTimer = 0
      }
      return
    }

    if (step.clippyAttack && this.dodgePunishPhase === 0) {
      this.waitTimer += dt * 1000
      if (this.waitTimer >= 1800 && ctx.clippy.state.action === 'idle') {
        ctx.clippy.state.action = 'telegraph'
        ctx.clippy.state.attack = step.clippyAttack
        ctx.clippy.state.timer = 0
        ctx.clippy.state.realAttack = null
      }
    }
  }

  onDodgePunishDodge(ctx: GameContext) {
    this.dodgePunishPhase = 1
    ctx.clippy.state.action = 'stunned'
    ctx.clippy.state.timer = 0
    ctx.clippy.state.stunHitsRemaining = 3
    ctx.clippy.state.stunDurationMs = 5000
    this.waitTimer = 0
  }

  onSuccess(ctx: GameContext) {
    this.stepSuccess = true
    this.showingResult = true
    this.resultTimer = 0
    this.waitTimer = 0
    if (ctx.clippy.state.action !== 'stunned') {
      ctx.clippy.state.action = 'idle'
      ctx.clippy.state.timer = 0
      ctx.clippy.state.attack = null
    }
  }

  onFail(ctx: GameContext) {
    this.stepSuccess = false
    this.showingResult = true
    this.resultTimer = 0
    this.waitTimer = 0
    ctx.clippy.state.action = 'idle'
    ctx.clippy.state.timer = 0
    ctx.clippy.state.attack = null
    this.dodgePunishPhase = 0
  }

  shouldBlockDamage(ctx: GameContext): boolean {
    return ctx.tutorial.active && CFG.tutorial.noDamage
  }

  getAttackSpeedMult(): number {
    return CFG.tutorial.clippyAttackSpeed
  }
}
