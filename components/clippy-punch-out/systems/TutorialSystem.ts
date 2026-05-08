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
    hint: 'Appuyez D ou →',
    missMsg: 'Raté ! Essayez D ou → pour esquiver à droite.',
    clippyAttack: { type: 'hook', side: 'left' },
    expect: 'dodge_right',
  },
  {
    id: 'dodge_left',
    title: 'ÉTAPE 2 — ESQUIVE GAUCHE',
    instruction: 'Clippy attaque à droite. Esquivez à GAUCHE.',
    hint: 'Appuyez A ou ←',
    missMsg: 'Essayez A ou ← pour esquiver à gauche.',
    clippyAttack: { type: 'hook', side: 'right' },
    expect: 'dodge_left',
  },
  {
    id: 'duck',
    title: 'ÉTAPE 3 — BAISSEZ-VOUS',
    instruction: 'Clippy vise le corps. Baissez-vous !',
    hint: 'Appuyez S ou ↓',
    missMsg: 'Pour le corps : S ou ↓.',
    clippyAttack: { type: 'hook', side: 'body' },
    expect: 'duck',
  },
  {
    id: 'attack',
    title: 'ÉTAPE 4 — ATTAQUEZ',
    instruction: 'Clippy est ouvert. Frappez-le !',
    hint: 'J = Jab rapide, K = Direct lourd',
    missMsg: 'Appuyez J ou K pour frapper !',
    clippyAttack: null,
    expect: 'jab',
  },
  {
    id: 'counter',
    title: 'ÉTAPE 5 — CONTRE PARFAIT',
    instruction: 'Esquivez au dernier moment, puis frappez !',
    hint: 'Esquivez tard → puis J pour contre-attaquer',
    missMsg: 'Esquivez juste avant l\'impact, puis J !',
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
