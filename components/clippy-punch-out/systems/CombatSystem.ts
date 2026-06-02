import { CFG } from '../config'
import type { GameContext, CombatEvent } from '../types'
import { StaminaSystem } from './StaminaSystem'
import { ClippyAI } from './ClippyAI'
import { DodgeCounterSystem } from './DodgeCounterSystem'

export class CombatSystem {
  public events: CombatEvent[] = []

  constructor(
    private stamina: StaminaSystem,
    private ai: ClippyAI,
    private dodge: DodgeCounterSystem,
  ) {}

  update(ctx: GameContext, dt: number) {
    this.events = []
    this.updatePlayerAction(ctx, dt)
    this.updateCooldown(ctx, dt)
    this.dodge.updateDodge(ctx, dt)
    this.checkClippyAttackHit(ctx)
  }

  tryJab(ctx: GameContext): boolean {
    const ps = ctx.player.state
    if (ps.action !== 'idle') return false
    if (ps.cooldownRemaining > 0) return false
    if (!this.stamina.canAct(ctx)) return false
    ps.action = 'jab'
    ps.phase = 'startup'
    ps.timer = 0
    ps.cooldownRemaining = CFG.player.jab.cooldown
    return true
  }

  tryHeavy(ctx: GameContext): boolean {
    const ps = ctx.player.state
    if (ps.action !== 'idle') return false
    if (ps.cooldownRemaining > 0) return false
    if (!this.stamina.canAct(ctx)) return false
    ps.action = 'heavy'
    ps.phase = 'startup'
    ps.timer = 0
    ps.cooldownRemaining = CFG.player.heavy.cooldown
    return true
  }

  tryGuard(ctx: GameContext): boolean {
    const ps = ctx.player.state
    if (ps.action !== 'idle' && ps.action !== 'guard') return false
    if (ps.action !== 'guard') {
      ps.action = 'guard'
      ps.phase = 'startup'
      ps.timer = 0
      ctx.player.guardDuration = 0
    }
    return true
  }

  releaseGuard(ctx: GameContext) {
    const ps = ctx.player.state
    if (ps.action !== 'guard') return
    ps.phase = null
    ps.timer = 0
    ctx.player.guardDuration = 0
    ps.action = ctx.player.isExhausted ? 'exhausted' : 'idle'
  }

  applyStarPunch(ctx: GameContext) {
    this.damageClippy(ctx, CFG.player.starPunch.damage)
    this.ai.stun(ctx, CFG.clippy.stun.hitsAllDodged)
    this.events.push({ type: 'hit', damage: CFG.player.starPunch.damage })
    this.events.push({ type: 'stun_start' })
  }

  // ── Player action state machine ──────────────────────────────────────

  private updatePlayerAction(ctx: GameContext, dt: number) {
    const ps = ctx.player.state
    const dtMs = dt * 1000

    switch (ps.action) {
      case 'jab':
        ps.timer += dtMs
        if (ps.phase === 'startup' && ps.timer >= CFG.player.jab.startup) {
          ps.phase = 'active'; ps.timer = 0
          this.resolvePlayerHit(ctx, 'jab')
        } else if (ps.phase === 'active' && ps.timer >= CFG.player.jab.active) {
          ps.phase = 'recovery'; ps.timer = 0
        } else if (ps.phase === 'recovery' && ps.timer >= CFG.player.jab.recovery) {
          this.returnToIdle(ctx)
        }
        break

      case 'heavy':
        ps.timer += dtMs
        if (ps.phase === 'startup' && ps.timer >= CFG.player.heavy.startup) {
          ps.phase = 'active'; ps.timer = 0
          this.resolvePlayerHit(ctx, 'heavy')
        } else if (ps.phase === 'active' && ps.timer >= CFG.player.heavy.active) {
          ps.phase = 'recovery'; ps.timer = 0
        } else if (ps.phase === 'recovery' && ps.timer >= CFG.player.heavy.recovery) {
          this.returnToIdle(ctx)
        }
        break

      case 'guard':
        ps.timer += dtMs
        if (ps.phase === 'startup' && ps.timer >= CFG.player.guard.activation) {
          ps.phase = 'active'; ps.timer = 0
        }
        break

      case 'starpunch':
        ps.timer += dtMs
        if (ps.timer >= 600) this.returnToIdle(ctx)
        break

      case 'stunned':
        ps.timer += dtMs
        if (ps.timer >= CFG.combat.playerStunDuration) this.returnToIdle(ctx)
        break
    }
  }

  private returnToIdle(ctx: GameContext) {
    const ps = ctx.player.state
    ps.action = ctx.player.isExhausted ? 'exhausted' : 'idle'
    ps.phase = null
    ps.timer = 0
  }

  // ── Player hit resolution — Clippy invulnerable outside stun ────────

  private resolvePlayerHit(ctx: GameContext, type: 'jab' | 'heavy') {
    const cs = ctx.clippy.state
    const baseDamage = type === 'jab' ? CFG.player.jab.damage : CFG.player.heavy.damage

    if (cs.action === 'stunned' && cs.stunHitsRemaining > 0) {
      this.stamina.spendHitStun(ctx)
      this.stamina.rewardHitStun(ctx)
      this.damageClippy(ctx, baseDamage)
      cs.stunHitsRemaining--
      this.events.push({ type: 'stun_hit', damage: baseDamage })
      this.events.push({ type: 'success' })
      if (cs.stunHitsRemaining <= 0) this.ai.endStun(ctx)
      return
    }

    this.stamina.spendHitGuard(ctx)
    ctx.player.hp = Math.max(0, ctx.player.hp - CFG.clippy.counterPunchDamage)
    this.events.push({ type: 'guard_block' })
    this.events.push({ type: 'error' })
  }

  // ── Clippy attack hit check ──────────────────────────────────────────

  checkClippyAttackHit(ctx: GameContext) {
    const cs = ctx.clippy.state
    if (cs.action !== 'attack' && cs.action !== 'charge_rush') return
    if (!cs.attack) return

    const attackType = cs.attack.type

    if (this.dodge.isInvulnerable(ctx)) {
      this.ai.onMissedAttack(ctx)
      cs.action = 'recovery'
      cs.recoveryDuration = this.ai.getRecovery(attackType, ctx)
      cs.timer = 0
      return
    }

    const ps = ctx.player.state
    if (ps.action === 'dodge') {
      this.ai.onMissedAttack(ctx)
      cs.action = 'recovery'
      cs.recoveryDuration = this.ai.getRecovery(attackType, ctx)
      cs.timer = 0
      return
    }

    const damage = this.ai.getDamage(attackType)

    if (ps.action === 'guard' && ps.phase === 'active') {
      const reduced = Math.round(damage * (1 - CFG.player.guard.damageReduction))
      ctx.player.hp = Math.max(0, ctx.player.hp - reduced)
      this.ai.onPlayerHit(ctx)
      cs.action = 'recovery'
      cs.recoveryDuration = this.ai.getRecovery(attackType, ctx)
      cs.timer = 0
      return
    }

    ctx.player.hp = Math.max(0, ctx.player.hp - damage)
    ps.action = 'stunned'
    ps.timer = 0
    if (ctx.player.stars > 0) {
      ctx.player.stars--
    }
    this.ai.onPlayerHit(ctx)
    cs.action = 'recovery'
    cs.recoveryDuration = this.ai.getRecovery(attackType, ctx)
    cs.timer = 0
  }

  private damageClippy(ctx: GameContext, amount: number) {
    ctx.clippy.hp = Math.max(0, ctx.clippy.hp - amount)
  }

  private updateCooldown(ctx: GameContext, dt: number) {
    if (ctx.player.state.cooldownRemaining > 0) {
      ctx.player.state.cooldownRemaining = Math.max(0, ctx.player.state.cooldownRemaining - dt * 1000)
    }
  }
}
