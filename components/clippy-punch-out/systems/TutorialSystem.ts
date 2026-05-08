import { CFG } from '../config'
import type { GameContext, AttackSide } from '../types'

interface TutStep {
  id: string
  title: string
  instruction: string
  hint: string
  missMsg: string
  clippyAttack: { type: 'jab' | 'hook' | 'charge'; side: AttackSide } | null
  expect: 'dodge_right' | 'dodge_left' | 'duck' | 'jab' | 'heavy' | 'guard' | 'counter'
}

const STEPS: TutStep[] = [
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
    instruction: 'Clippy est ouvert. Frappez-le !',
    hint: 'Clic droit = Jab, Clic gauche = Direct lourd',
    missMsg: 'Cliquez pour frapper !',
    clippyAttack: null,
    expect: 'jab',
  },
  {
    id: 'counter',
    title: 'ÉTAPE 5 — CONTRE PARFAIT',
    instruction: 'Esquivez puis contre-attaquez !',
    hint: 'Esquivez → puis clic droit pour contre-attaquer',
    missMsg: 'Esquivez d\'abord, puis clic droit !',
    clippyAttack: { type: 'hook', side: 'left' },
    expect: 'counter',
  },
]

export class TutorialSystem {
  private waitTimer = 0
  private showingResult = false
  private resultTimer = 0
  private stepSuccess = false

  get totalSteps() { return STEPS.length }

  getCurrentStep(ctx: GameContext): TutStep | null {
    if (!ctx.tutorial.active) return null
    return STEPS[ctx.tutorial.step] ?? null
  }

  getTitle(ctx: GameContext): string {
    const step = this.getCurrentStep(ctx)
    return step ? step.title : ''
  }

  getInstruction(ctx: GameContext): string {
    if (this.showingResult) {
      return this.stepSuccess ? 'Bravo !' : (this.getCurrentStep(ctx)?.missMsg ?? 'Raté !')
    }
    const step = this.getCurrentStep(ctx)
    return step ? step.hint : ''
  }

  update(ctx: GameContext, dt: number) {
    if (!ctx.tutorial.active) return

    if (this.showingResult) {
      this.resultTimer += dt * 1000
      if (this.resultTimer >= 1500) {
        this.showingResult = false
        this.resultTimer = 0
        if (this.stepSuccess) {
          ctx.tutorial.step++
          if (ctx.tutorial.step >= STEPS.length) {
            ctx.tutorial.active = false
            return
          }
        }
        this.waitTimer = 0
      }
      return
    }

    const step = this.getCurrentStep(ctx)
    if (!step) return

    if (step.clippyAttack) {
      this.waitTimer += dt * 1000
      if (this.waitTimer >= 1800 && ctx.clippy.state.action === 'idle') {
        ctx.clippy.state.action = 'telegraph'
        ctx.clippy.state.attack = step.clippyAttack
        ctx.clippy.state.timer = 0
        ctx.clippy.state.realAttack = null
      }
    }
  }

  onSuccess(ctx: GameContext) {
    this.stepSuccess = true
    this.showingResult = true
    this.resultTimer = 0
    this.waitTimer = 0
    ctx.clippy.state.action = 'idle'
    ctx.clippy.state.timer = 0
    ctx.clippy.state.attack = null
  }

  onFail(ctx: GameContext) {
    this.stepSuccess = false
    this.showingResult = true
    this.resultTimer = 0
    this.waitTimer = 0
    ctx.clippy.state.action = 'idle'
    ctx.clippy.state.timer = 0
    ctx.clippy.state.attack = null
  }

  shouldBlockDamage(ctx: GameContext): boolean {
    return ctx.tutorial.active && CFG.tutorial.noDamage
  }

  getAttackSpeedMult(): number {
    return CFG.tutorial.clippyAttackSpeed
  }
}
