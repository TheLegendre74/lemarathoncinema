import { CFG } from '../config'
import type { GameContext, AttackSide, DodgeDirection } from '../types'
import { REQUIRED_DODGE } from '../types'

interface TutStep {
  id: string
  title: string
  instruction: string
  hint: string
  missMsg: string
  clippyAttack: { type: 'jab' | 'hook' | 'charge'; side: AttackSide } | null
  expect: 'none' | 'lean_right' | 'lean_left' | 'lean_down' | 'dodge_attack' | 'jab' | 'dodge_punish'
  autoAdvanceMs?: number
}

const TUT_WIND_UP = 3000

const STEPS: TutStep[] = [
  {
    id: 'intro',
    title: 'CONTRÔLES',
    instruction: 'Déplacez votre souris pour esquiver.\nRevenez au centre après chaque coup.',
    hint: '',
    missMsg: '',
    clippyAttack: null,
    expect: 'none',
    autoAdvanceMs: 4000,
  },
  {
    id: 'lean_right',
    title: 'ÉTAPE 1 — DROITE',
    instruction: 'Déplacez votre souris à DROITE de l\'écran.',
    hint: 'Bougez la souris vers la droite',
    missMsg: '',
    clippyAttack: null,
    expect: 'lean_right',
  },
  {
    id: 'lean_left',
    title: 'ÉTAPE 2 — GAUCHE',
    instruction: 'Déplacez votre souris à GAUCHE de l\'écran.',
    hint: 'Bougez la souris vers la gauche',
    missMsg: '',
    clippyAttack: null,
    expect: 'lean_left',
  },
  {
    id: 'lean_down',
    title: 'ÉTAPE 3 — BAS',
    instruction: 'Déplacez votre souris vers le BAS de l\'écran.',
    hint: 'Bougez la souris vers le bas',
    missMsg: '',
    clippyAttack: null,
    expect: 'lean_down',
  },
  {
    id: 'dodge_attack',
    title: 'ÉTAPE 4 — ESQUIVEZ !',
    instruction: 'Clippy attaque à gauche.\nSouris à DROITE quand il clignote JAUNE !',
    hint: 'Restez à droite pendant qu\'il frappe',
    missMsg: 'Raté ! Souris à droite quand il clignote.',
    clippyAttack: { type: 'hook', side: 'left' },
    expect: 'dodge_attack',
  },
  {
    id: 'attack',
    title: 'ÉTAPE 5 — FRAPPEZ',
    instruction: 'Clippy est étourdi ! Frappez-le !',
    hint: 'Clic droit = Jab, Clic gauche = Direct lourd',
    missMsg: 'Cliquez pour frapper !',
    clippyAttack: null,
    expect: 'jab',
  },
  {
    id: 'dodge_punish',
    title: 'ÉTAPE 6 — COMBO',
    instruction: 'Esquivez puis frappez Clippy étourdi !',
    hint: 'Souris à droite → attendez le coup → cliquez !',
    missMsg: 'Esquivez d\'abord, puis frappez !',
    clippyAttack: { type: 'hook', side: 'left' },
    expect: 'dodge_punish',
  },
  {
    id: 'crowd_info',
    title: 'LE PUBLIC',
    instruction: '3 esquives réussies → le public lance une ROSE.\nCliquez dessus pour récupérer de la stamina !\n3 erreurs → il jette des OBJETS à esquiver.\nLes objets clignotent ROUGE = esquivez !',
    hint: '',
    missMsg: '',
    clippyAttack: null,
    expect: 'none',
    autoAdvanceMs: 6000,
  },
]

export class TutorialSystem {
  private waitTimer = 0
  private showingResult = false
  private resultTimer = 0
  private stepSuccess = false
  private dodgePunishPhase: 0 | 1 = 0
  private autoAdvanceTimer = 0
  private leanHoldTimer = 0

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
        this.leanHoldTimer = 0
      }
      return
    }

    const lean = ctx.player.state.dodgeDir

    if (step.expect === 'lean_right' || step.expect === 'lean_left' || step.expect === 'lean_down') {
      const expected: DodgeDirection = step.expect === 'lean_right' ? 'right'
        : step.expect === 'lean_left' ? 'left' : 'down'
      if (lean === expected) {
        this.leanHoldTimer += dt * 1000
        if (this.leanHoldTimer >= 400) {
          this.onSuccess(ctx)
        }
      } else {
        this.leanHoldTimer = 0
      }
      return
    }

    if (step.expect === 'dodge_attack' || (step.expect === 'dodge_punish' && this.dodgePunishPhase === 0)) {
      if (step.clippyAttack) {
        this.waitTimer += dt * 1000
        const cs = ctx.clippy.state

        if (this.waitTimer >= 1800 && cs.action === 'idle') {
          cs.action = 'telegraph'
          cs.attack = step.clippyAttack
          cs.timer = 0
          cs.realAttack = null
        }

        if (cs.action === 'telegraph') {
          cs.timer += dt * 1000
          if (cs.timer >= TUT_WIND_UP) {
            const correctDir = REQUIRED_DODGE[step.clippyAttack.side]
            if (lean === correctDir) {
              if (step.expect === 'dodge_punish') {
                this.dodgePunishPhase = 1
                cs.action = 'stunned'
                cs.timer = 0
                cs.stunHitsRemaining = 3
                cs.stunDurationMs = 8000
                this.waitTimer = 0
              } else {
                this.onSuccess(ctx)
              }
            } else {
              this.onFail(ctx)
            }
          }
        }
      }
      return
    }
  }

  onPunch(ctx: GameContext) {
    const step = this.getCurrentStep(ctx)
    if (!step) return

    if (step.expect === 'jab') {
      this.onSuccess(ctx)
      return
    }

    if (step.expect === 'dodge_punish' && this.dodgePunishPhase === 1) {
      this.onSuccess(ctx)
      return
    }
  }

  private onSuccess(ctx: GameContext) {
    this.stepSuccess = true
    this.showingResult = true
    this.resultTimer = 0
    this.waitTimer = 0
    this.leanHoldTimer = 0
    if (ctx.clippy.state.action !== 'stunned') {
      ctx.clippy.state.action = 'idle'
      ctx.clippy.state.timer = 0
      ctx.clippy.state.attack = null
    }
  }

  private onFail(ctx: GameContext) {
    this.stepSuccess = false
    this.showingResult = true
    this.resultTimer = 0
    this.waitTimer = 0
    this.leanHoldTimer = 0
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
