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
          this.startSeries(ctx)
        }
        break

      case 'telegraph':
      case 'feint_telegraph': {
        const windUp = this.getWindUp(cs.attack!.type, ctx)
        if (cs.timer >= windUp) {
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
        break

      case 'recovery':
        if (cs.timer >= cs.recoveryDuration) {
          this.advanceSeries(ctx)
        }
        break

      case 'series_pause':
        if (cs.timer >= this.getSeriesPauseDelay(ctx)) {
          this.launchNextInSeries(ctx)
        }
        break

      case 'charge_recoil':
        if (cs.timer >= 300) {
          cs.action = 'charge_freeze'
          cs.timer = 0
        }
        break

      case 'charge_freeze':
        if (cs.timer >= CFG.charge.freezeMs) {
          cs.action = 'charge_rush'
          cs.timer = 0
        }
        break

      case 'charge_rush':
        break

      case 'stunned':
        if (cs.timer >= CFG.clippy.stun.durationMs || cs.stunHitsRemaining <= 0) {
          this.goIdle(ctx)
        }
        break

      case 'taunt':
        if (cs.timer >= CFG.clippy.taunt.duration) {
          this.goIdle(ctx)
        }
        break
    }

    this.decayPsyche(ctx, dt)
    this.updatePhase(ctx)
  }

  // ── Series management ────────────────────────────────────────────────

  private startSeries(ctx: GameContext) {
    if (ctx.totalTime - ctx.clippy.lastTauntTime >= CFG.clippy.taunt.minInterval
        && Math.random() < CFG.clippy.taunt.chance) {
      ctx.clippy.state.action = 'taunt'
      ctx.clippy.state.timer = 0
      ctx.clippy.lastTauntTime = ctx.totalTime
      return
    }

    const phase = ctx.combatPhase
    const min = phase === 1 ? CFG.series.comboMinP1 : CFG.series.comboMinP2
    const max = phase === 1 ? CFG.series.comboMaxP1 : CFG.series.comboMaxP2
    const total = min + Math.floor(Math.random() * (max - min + 1))

    ctx.series.total = total
    ctx.series.dodgedCount = 0
    ctx.series.currentIndex = 0
    ctx.series.active = true

    this.launchNextInSeries(ctx)
  }

  private advanceSeries(ctx: GameContext) {
    if (!ctx.series.active) {
      this.goIdle(ctx)
      return
    }

    ctx.series.currentIndex++

    if (ctx.series.currentIndex >= ctx.series.total) {
      this.endSeries(ctx)
      return
    }

    const cs = ctx.clippy.state
    cs.action = 'series_pause'
    cs.timer = 0
  }

  private endSeries(ctx: GameContext) {
    ctx.series.active = false
    const allDodged = ctx.series.dodgedCount >= ctx.series.total
    const maxHits = allDodged ? CFG.clippy.stun.hitsAllDodged : CFG.clippy.stun.hitsPartial
    this.stun(ctx, maxHits)
    if (allDodged) {
      ctx.player.stars = Math.min(3, ctx.player.stars + 1)
    }
  }

  private launchNextInSeries(ctx: GameContext) {
    const attack = this.pickAttack(ctx)

    if (attack.type === 'charge') {
      attack.side = 'body'
      this.startChargeSequence(ctx, attack)
      return
    }

    if (this.feintSys.shouldFeint(ctx)) {
      const fakeAttack = this.pickFeintAttack(attack)
      const cs = ctx.clippy.state
      cs.attack = fakeAttack
      cs.realAttack = attack
      cs.action = 'feint_telegraph'
      cs.timer = 0
      cs.comboRemaining = 0
    } else {
      this.startTelegraph(ctx, attack)
    }
  }

  private startChargeSequence(ctx: GameContext, attack: ClippyAttack) {
    const cs = ctx.clippy.state
    cs.attack = attack
    cs.action = 'charge_recoil'
    cs.timer = 0
    cs.realAttack = null
  }

  onSeriesDodgeSuccess(ctx: GameContext) {
    ctx.series.dodgedCount++
  }

  // ── Wind-up per phase ────────────────────────────────────────────────

  getWindUp(type: ClippyAttackType, ctx: GameContext): number {
    const phase = ctx.combatPhase
    if (type === 'jab') return phase === 1 ? CFG.windUp.jabP1 : CFG.windUp.jabP2
    if (type === 'hook') return phase === 1 ? CFG.windUp.hookP1 : CFG.windUp.hookP2
    return 300
  }

  private getSeriesPauseDelay(ctx: GameContext): number {
    return ctx.combatPhase === 1
      ? CFG.series.delayBetweenAttacksP1
      : CFG.series.delayBetweenAttacksP2
  }

  // ── Telegraph ────────────────────────────────────────────────────────

  private startTelegraph(ctx: GameContext, attack: ClippyAttack) {
    const cs = ctx.clippy.state
    cs.action = 'telegraph'
    cs.attack = attack
    cs.timer = 0
    cs.realAttack = null
  }

  goIdle(ctx: GameContext) {
    const cs = ctx.clippy.state
    cs.action = 'idle'
    cs.timer = 0
    cs.attack = null
    cs.realAttack = null
    cs.stunHitsRemaining = 0
    ctx.clippy.idleDuration = 0
    ctx.clippy.blinkFired = false
    ctx.series.active = false

    const phase = ctx.combatPhase
    const min = phase === 1 ? CFG.series.idleDelayMinP1 : CFG.series.idleDelayMinP2
    const max = phase === 1 ? CFG.series.idleDelayMaxP1 : CFG.series.idleDelayMaxP2
    this.nextActionDelay = min + Math.random() * (max - min)

    if (ctx.clippy.psyche.fatigue >= CFG.ai.fatigue.bigPausesThreshold) {
      this.nextActionDelay *= 2.2
    }
  }

  // ── Attack picking ───────────────────────────────────────────────────

  private pickAttack(ctx: GameContext): ClippyAttack {
    const dist = ctx.combatPhase === 1 ? CFG.distribution.p1 : CFG.distribution.p2
    const r = Math.random()
    let type: ClippyAttackType
    if (r < dist.jab) type = 'jab'
    else if (r < dist.jab + dist.hook) type = 'hook'
    else type = 'charge'

    const side = type === 'charge' ? 'body' as const : this.pickSide()
    return { type, side }
  }

  private pickSide(): AttackSide {
    const r = Math.random()
    if (r < 0.45) return 'left'
    if (r < 0.90) return 'right'
    return 'body'
  }

  private pickFeintAttack(real: ClippyAttack): ClippyAttack {
    const sides: AttackSide[] = ['left', 'right', 'body']
    const fakeSide = sides.filter(s => s !== real.side)
    return { type: real.type, side: fakeSide[Math.floor(Math.random() * fakeSide.length)] }
  }

  // ── Tells ────────────────────────────────────────────────────────────

  getTellAmplitude(ctx: GameContext): number {
    const conf = ctx.clippy.psyche.confidence
    if (conf >= CFG.tells.confidenceHighThreshold) return CFG.tells.amplitudeHighConf
    if (conf >= CFG.tells.confidenceMedThreshold) return CFG.tells.amplitudeMedConf
    return CFG.tells.amplitudeLowConf
  }

  getRecovery(type: ClippyAttackType, ctx: GameContext): number {
    const base = CFG.clippy[type].recovery
    let mult = 1
    if (ctx.clippy.psyche.panic >= CFG.ai.panic.slowRecoveryThreshold) mult *= 1.35
    if (ctx.clippy.psyche.panic >= CFG.ai.panic.bigOpeningsThreshold) mult *= 1.6
    return base * mult
  }

  getDamage(type: ClippyAttackType): number {
    return CFG.clippy[type].damage
  }

  // ── Stun ─────────────────────────────────────────────────────────────

  stun(ctx: GameContext, maxHits: number) {
    ctx.clippy.state.action = 'stunned'
    ctx.clippy.state.timer = 0
    ctx.clippy.state.stunHitsRemaining = maxHits
    ctx.clippy.state.comboRemaining = 0
    ctx.series.active = false
  }

  endStun(ctx: GameContext) { this.goIdle(ctx) }

  // ── Psyche callbacks ─────────────────────────────────────────────────

  onPlayerHit(ctx: GameContext) {
    ctx.clippy.psyche.confidence = Math.min(100, ctx.clippy.psyche.confidence + CFG.ai.confidence.onPlayerHit)
    ctx.clippy.missStreak = 0
  }

  onMissedAttack(ctx: GameContext) {
    ctx.clippy.psyche.fatigue = Math.min(100, ctx.clippy.psyche.fatigue + CFG.ai.fatigue.onMissedAttack)
    ctx.clippy.missStreak++
    if (ctx.clippy.missStreak >= 3) {
      ctx.clippy.psyche.panic = Math.min(100, ctx.clippy.psyche.panic + CFG.ai.panic.onMultipleMisses)
    }
  }

  private decayPsyche(ctx: GameContext, dt: number) {
    const p = ctx.clippy.psyche
    p.confidence = Math.max(0, p.confidence - dt * 0.8)
    p.panic = Math.max(0, p.panic - dt * 0.5)
    p.fatigue = Math.max(0, p.fatigue - dt * 0.3)
  }

  private updatePhase(ctx: GameContext) {
    const ratio = ctx.clippy.hp / CFG.clippy.maxHP
    ctx.combatPhase = ratio > CFG.phases.transitionThreshold ? 1 : 2
  }
}
