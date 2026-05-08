import { CFG } from '../config'
import type { GameContext } from '../types'
import { StaminaSystem } from './StaminaSystem'
import { HypeSystem } from './HypeSystem'
import { ClippyAI } from './ClippyAI'
import { DodgeCounterSystem } from './DodgeCounterSystem'

export class CombatSystem {
  constructor(
    private stamina: StaminaSystem,
    private hype: HypeSystem,
    private ai: ClippyAI,
    private dodge: DodgeCounterSystem,
  ) {}

  update(ctx: GameContext, dt: number) {
    this.updatePlayerAction(ctx, dt)
    this.updateCooldown(ctx, dt)
    this.updateCombo(ctx, dt)
    this.updateGuardDuration(ctx, dt)
    this.dodge.updateDodge(ctx, dt)
    this.dodge.updateCounterWindow(ctx, dt)
    this.checkClippyAttackHit(ctx)
  }

  tryJab(ctx: GameContext): boolean {
    const ps = ctx.player.state
    if (ps.action !== 'idle') return false
    if (ps.cooldownRemaining > 0) return false
    if (!this.stamina.canAfford(ctx, CFG.player.jab.staminaCost)) return false

    this.stamina.spend(ctx, CFG.player.jab.staminaCost)
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
    if (!this.stamina.canAfford(ctx, CFG.player.heavy.staminaCost)) return false

    this.stamina.spend(ctx, CFG.player.heavy.staminaCost)
    ps.action = 'heavy'
    ps.phase = 'startup'
    ps.timer = 0
    ps.cooldownRemaining = CFG.player.heavy.cooldown
    return true
  }

  tryGuard(ctx: GameContext): boolean {
    const ps = ctx.player.state
    if (ps.action !== 'idle' && ps.action !== 'guard') return false
    if (ctx.player.stamina <= 0) return false

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
    ps.action = 'idle'
    ps.phase = null
    ps.timer = 0
    ctx.player.guardDuration = 0
  }

  private updatePlayerAction(ctx: GameContext, dt: number) {
    const ps = ctx.player.state
    const dtMs = dt * 1000

    switch (ps.action) {
      case 'jab':
        ps.timer += dtMs
        if (ps.phase === 'startup' && ps.timer >= CFG.player.jab.startup) {
          ps.phase = 'active'
          ps.timer = 0
          this.checkPlayerAttackHit(ctx, 'jab')
        } else if (ps.phase === 'active' && ps.timer >= CFG.player.jab.active) {
          ps.phase = 'recovery'
          ps.timer = 0
        } else if (ps.phase === 'recovery' && ps.timer >= CFG.player.jab.recovery) {
          ps.action = 'idle'
          ps.phase = null
          ps.timer = 0
        }
        break

      case 'heavy':
        ps.timer += dtMs
        if (ps.phase === 'startup' && ps.timer >= CFG.player.heavy.startup) {
          ps.phase = 'active'
          ps.timer = 0
          this.checkPlayerAttackHit(ctx, 'heavy')
        } else if (ps.phase === 'active' && ps.timer >= CFG.player.heavy.active) {
          ps.phase = 'recovery'
          ps.timer = 0
        } else if (ps.phase === 'recovery' && ps.timer >= CFG.player.heavy.recovery) {
          ps.action = 'idle'
          ps.phase = null
          ps.timer = 0
        }
        break

      case 'guard':
        ps.timer += dtMs
        if (ps.phase === 'startup' && ps.timer >= CFG.player.guard.activation) {
          ps.phase = 'active'
          ps.timer = 0
        }
        if (ctx.player.stamina <= 0) {
          this.releaseGuard(ctx)
        }
        break

      case 'counter':
        ps.timer += dtMs
        if (ps.timer >= 300) {
          ps.action = 'idle'
          ps.phase = null
          ps.timer = 0
        }
        break

      case 'starpunch':
        ps.timer += dtMs
        if (ps.timer >= 600) {
          ps.action = 'idle'
          ps.phase = null
          ps.timer = 0
        }
        break

      case 'stunned':
        ps.timer += dtMs
        if (ps.timer >= CFG.combat.stunDuration) {
          ps.action = 'idle'
          ps.phase = null
          ps.timer = 0
        }
        break
    }
  }

  private checkPlayerAttackHit(ctx: GameContext, type: 'jab' | 'heavy') {
    const cs = ctx.clippy.state
    const canHit = cs.action === 'idle' || cs.action === 'recovery'
      || cs.action === 'telegraph' || cs.action === 'feint_telegraph'
      || cs.action === 'stunned'

    if (!canHit) {
      if (type === 'jab') this.hype.onJabMiss(ctx)
      else this.hype.onHeavyMiss(ctx)
      this.ai.onPlayerHeavyMiss(ctx)
      return
    }

    const damage = type === 'jab' ? CFG.player.jab.damage : CFG.player.heavy.damage
    this.damageClippy(ctx, damage)

    if (type === 'jab') this.hype.onJabHit(ctx)
    else this.hype.onHeavyHit(ctx)

    this.registerCombo(ctx)
    this.ai.stun(ctx)
  }

  applyCounter(ctx: GameContext) {
    const damage = CFG.player.perfectCounter.damage
    this.damageClippy(ctx, damage)
    this.stamina.restore(ctx, CFG.player.perfectCounter.staminaGain)
    this.hype.onPerfectCounter(ctx)
    this.ai.onPerfectCounter(ctx)
    this.ai.stun(ctx)
    this.registerCombo(ctx)
  }

  applyStarPunch(ctx: GameContext) {
    this.damageClippy(ctx, CFG.player.starPunch.damage)
    this.ai.onComboTaken(ctx)
    this.ai.stun(ctx)
  }

  private damageClippy(ctx: GameContext, amount: number) {
    ctx.clippy.hp = Math.max(0, ctx.clippy.hp - amount)
  }

  private checkClippyAttackHit(ctx: GameContext) {
    const cs = ctx.clippy.state
    if (cs.action !== 'attack' || !cs.attack) return

    cs.action = 'recovery'
    cs.recoveryDuration = this.ai.getRecovery(cs.attack.type, ctx)
    cs.timer = 0

    if (this.dodge.isInvulnerable(ctx)) {
      this.ai.onMissedAttack(ctx)
      return
    }

    const ps = ctx.player.state
    if (ps.action === 'dodge') {
      this.ai.onMissedAttack(ctx)
      return
    }

    const damage = this.ai.getDamage(cs.attack.type)

    if (ps.action === 'guard' && ps.phase === 'active') {
      const reduced = Math.round(damage * (1 - CFG.player.guard.damageReduction))
      ctx.player.hp = Math.max(0, ctx.player.hp - reduced)
      this.ai.onPlayerHit(ctx)
      this.hype.onPlayerHit(ctx)
      return
    }

    ctx.player.hp = Math.max(0, ctx.player.hp - damage)
    ctx.player.state.action = 'stunned'
    ctx.player.state.timer = 0
    ctx.player.comboCount = 0
    ctx.player.comboTimer = 0
    this.ai.onPlayerHit(ctx)
    this.hype.onPlayerHit(ctx)
  }

  private registerCombo(ctx: GameContext) {
    ctx.player.comboCount++
    ctx.player.comboTimer = CFG.combat.comboWindowMs

    if (ctx.player.comboCount >= 3) {
      this.hype.onCombo(ctx)
      this.ai.onComboTaken(ctx)
    }
  }

  private updateCooldown(ctx: GameContext, dt: number) {
    if (ctx.player.state.cooldownRemaining > 0) {
      ctx.player.state.cooldownRemaining = Math.max(0, ctx.player.state.cooldownRemaining - dt * 1000)
    }
  }

  private updateCombo(ctx: GameContext, dt: number) {
    if (ctx.player.comboTimer > 0) {
      ctx.player.comboTimer -= dt * 1000
      if (ctx.player.comboTimer <= 0) {
        ctx.player.comboCount = 0
        ctx.player.comboTimer = 0
      }
    }
  }

  private updateGuardDuration(ctx: GameContext, dt: number) {
    if (ctx.player.state.action === 'guard') {
      ctx.player.guardDuration += dt * 1000
    }
  }
}
