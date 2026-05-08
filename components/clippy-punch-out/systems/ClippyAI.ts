import { CFG } from '../config'
import type {
  GameContext, ClippyAttackType, AttackSide, ClippyAttack, CombatPhase,
} from '../types'
import { FeintSystem } from './FeintSystem'

export class ClippyAI {
  private feintSys = new FeintSystem()
  private nextActionDelay = 0

  update(ctx: GameContext, dt: number) {
    const cs = ctx.clippy.state
    cs.timer += dt * 1000

    switch (cs.action) {
      case 'idle':
        ctx.clippy.idleDuration += dt * 1000
        if (ctx.clippy.idleDuration >= this.nextActionDelay) {
          this.decideAction(ctx)
        }
        break

      case 'telegraph':
      case 'feint_telegraph': {
        const startup = this.getStartup(cs.attack!.type, ctx)
        if (cs.timer >= startup) {
          if (cs.action === 'feint_telegraph') {
            cs.action = 'feint_cancel'
            cs.timer = 0
          } else {
            cs.action = 'attack'
            cs.timer = 0
          }
        }
        break
      }

      case 'feint_cancel':
        if (cs.timer >= CFG.feint.cancelDuration) {
          if (cs.realAttack) {
            cs.attack = cs.realAttack
            cs.realAttack = null
            cs.action = 'telegraph'
            cs.timer = 0
          } else {
            this.goIdle(ctx)
          }
        }
        break

      case 'attack':
        // Hit resolution handled by CombatSystem
        break

      case 'recovery':
        if (cs.timer >= cs.recoveryDuration) {
          if (cs.comboRemaining > 0) {
            cs.comboRemaining--
            this.startTelegraph(ctx, this.pickAttack(ctx))
          } else {
            this.goIdle(ctx)
          }
        }
        break

      case 'stunned':
        if (cs.timer >= CFG.combat.stunDuration) {
          this.goIdle(ctx)
        }
        break
    }

    this.decayPsyche(ctx, dt)
    this.updatePhase(ctx)
  }

  private decideAction(ctx: GameContext) {
    const attack = this.pickAttack(ctx)
    const comboLen = this.pickComboLength(ctx)

    if (this.feintSys.shouldFeint(ctx)) {
      const fakeAttack = this.pickFeintAttack(attack)
      ctx.clippy.state.attack = fakeAttack
      ctx.clippy.state.realAttack = attack
      ctx.clippy.state.action = 'feint_telegraph'
      ctx.clippy.state.timer = 0
      ctx.clippy.state.comboRemaining = comboLen - 1
    } else {
      ctx.clippy.state.comboRemaining = comboLen - 1
      this.startTelegraph(ctx, attack)
    }
  }

  private startTelegraph(ctx: GameContext, attack: ClippyAttack) {
    const cs = ctx.clippy.state
    cs.action = 'telegraph'
    cs.attack = attack
    cs.timer = 0
    cs.realAttack = null
  }

  private goIdle(ctx: GameContext) {
    ctx.clippy.state.action = 'idle'
    ctx.clippy.state.timer = 0
    ctx.clippy.state.attack = null
    ctx.clippy.state.realAttack = null
    ctx.clippy.idleDuration = 0

    const aggression = this.getAggression(ctx)
    const baseDelay = CFG.ai.idleBase + Math.random() * CFG.ai.idleRandom
    this.nextActionDelay = baseDelay * (1 - aggression * 0.5)

    if (ctx.clippy.psyche.fatigue >= CFG.ai.fatigue.bigPausesThreshold) {
      this.nextActionDelay *= 2.2
    }
  }

  private pickAttack(ctx: GameContext): ClippyAttack {
    const type = this.pickAttackType(ctx)
    const side = this.pickSide()
    return { type, side }
  }

  private pickAttackType(ctx: GameContext): ClippyAttackType {
    const phase = ctx.combatPhase
    const confidence = ctx.clippy.psyche.confidence
    const r = Math.random()

    if (phase === 1) {
      if (r < 0.55) return 'jab'
      if (r < 0.85) return 'hook'
      return 'charge'
    }

    if (phase === 2) {
      if (confidence >= CFG.ai.confidence.aggressiveThreshold) {
        if (r < 0.25) return 'jab'
        if (r < 0.60) return 'hook'
        return 'charge'
      }
      if (r < 0.40) return 'jab'
      if (r < 0.75) return 'hook'
      return 'charge'
    }

    // Phase 3 — chaotic
    if (r < 0.30) return 'jab'
    if (r < 0.60) return 'hook'
    return 'charge'
  }

  private pickSide(): AttackSide {
    const r = Math.random()
    if (r < 0.38) return 'left'
    if (r < 0.76) return 'right'
    return 'body'
  }

  private pickComboLength(ctx: GameContext): number {
    const aggression = this.getAggression(ctx)
    if (ctx.combatPhase === 1) return 1
    if (ctx.combatPhase === 2) return aggression > 0.6 ? 2 : 1
    return aggression > 0.7 ? 3 : 2
  }

  private pickFeintAttack(real: ClippyAttack): ClippyAttack {
    const sides: AttackSide[] = ['left', 'right', 'body']
    const fakeSide = sides.filter(s => s !== real.side)
    return {
      type: real.type,
      side: fakeSide[Math.floor(Math.random() * fakeSide.length)],
    }
  }

  getStartup(type: ClippyAttackType, ctx: GameContext): number {
    const base = CFG.clippy[type].startup
    let mult = 1

    if (ctx.clippy.psyche.confidence >= CFG.ai.confidence.speedThreshold) {
      mult *= 0.85
    }
    if (ctx.clippy.psyche.fatigue >= CFG.ai.fatigue.slowAttacksThreshold) {
      mult *= 1.25
    }

    return base * mult
  }

  getRecovery(type: ClippyAttackType, ctx: GameContext): number {
    const base = CFG.clippy[type].recovery
    let mult = 1

    if (ctx.clippy.psyche.panic >= CFG.ai.panic.slowRecoveryThreshold) {
      mult *= 1.35
    }
    if (ctx.clippy.psyche.panic >= CFG.ai.panic.bigOpeningsThreshold) {
      mult *= 1.6
    }

    return base * mult
  }

  getDamage(type: ClippyAttackType): number {
    return CFG.clippy[type].damage
  }

  private getAggression(ctx: GameContext): number {
    const conf = ctx.clippy.psyche.confidence / 100
    const panic = ctx.clippy.psyche.panic / 100
    const fatigue = ctx.clippy.psyche.fatigue / 100
    return Math.max(0, Math.min(1, conf * 0.5 + (1 - fatigue) * 0.3 + (1 - panic) * 0.2))
  }

  onPlayerHit(ctx: GameContext) {
    ctx.clippy.psyche.confidence = Math.min(100, ctx.clippy.psyche.confidence + CFG.ai.confidence.onPlayerHit)
    ctx.clippy.missStreak = 0
  }

  onPlayerHeavyMiss(ctx: GameContext) {
    ctx.clippy.psyche.confidence = Math.min(100, ctx.clippy.psyche.confidence + CFG.ai.confidence.onPlayerHeavyMiss)
  }

  onMissedAttack(ctx: GameContext) {
    ctx.clippy.psyche.fatigue = Math.min(100, ctx.clippy.psyche.fatigue + CFG.ai.fatigue.onMissedAttack)
    ctx.clippy.missStreak++
    if (ctx.clippy.missStreak >= 3) {
      ctx.clippy.psyche.panic = Math.min(100, ctx.clippy.psyche.panic + CFG.ai.panic.onMultipleMisses)
    }
  }

  onPerfectCounter(ctx: GameContext) {
    ctx.clippy.psyche.panic = Math.min(100, ctx.clippy.psyche.panic + CFG.ai.panic.onPerfectCounter)
  }

  onComboTaken(ctx: GameContext) {
    ctx.clippy.psyche.fatigue = Math.min(100, ctx.clippy.psyche.fatigue + CFG.ai.fatigue.onComboTaken)
    ctx.clippy.psyche.panic = Math.min(100, ctx.clippy.psyche.panic + CFG.ai.panic.onPlayerCombo)
  }

  stun(ctx: GameContext) {
    ctx.clippy.state.action = 'stunned'
    ctx.clippy.state.timer = 0
  }

  private decayPsyche(ctx: GameContext, dt: number) {
    const p = ctx.clippy.psyche
    p.confidence = Math.max(0, p.confidence - dt * 0.8)
    p.panic = Math.max(0, p.panic - dt * 0.5)
    p.fatigue = Math.max(0, p.fatigue - dt * 0.3)

    if (ctx.player.state.action === 'guard') {
      p.confidence = Math.min(100, p.confidence + CFG.ai.confidence.onPlayerGuardPerSec * dt)
    }
  }

  private updatePhase(ctx: GameContext) {
    const ratio = ctx.clippy.hp / CFG.clippy.maxHP
    if (ratio > CFG.phases.phase1) ctx.combatPhase = 1
    else if (ratio > CFG.phases.phase2) ctx.combatPhase = 2
    else ctx.combatPhase = 3
  }
}
