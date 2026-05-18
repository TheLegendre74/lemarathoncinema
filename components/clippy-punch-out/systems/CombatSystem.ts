import { CFG } from '../config'
import type { GameContext, CombatEvent } from '../types'
import { StaminaSystem } from './StaminaSystem'
import { HypeSystem } from './HypeSystem'
import { ClippyAI } from './ClippyAI'
import { DodgeCounterSystem } from './DodgeCounterSystem'

export class CombatSystem {
  public events: CombatEvent[] = []

  constructor(
    private stamina: StaminaSystem,
    private hype: HypeSystem,
    private ai: ClippyAI,
    private dodge: DodgeCounterSystem,
  ) {}

  update(ctx: GameContext, dt: number) {
    this.events = []
    this.updatePlayerAction(ctx, dt)
    this.updateCooldown(ctx, dt)
    this.updateCombo(ctx, dt)
    this.updateGuardDuration(ctx, dt)
    this.dodge.updateDodge(ctx, dt)
    this.checkClippyAttackHit(ctx)
  }

  tryJab(ctx: GameContext): boolean {
    const ps = ctx.player.state
    if (ps.action !== 'idle') return false
    if (ps.cooldownRemaining > 0) return false
    if (ctx.player.isExhausted) return false
    if (!this.stamina.canAfford(ctx, CFG.player.jab.staminaCost)) return false
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
    if (ctx.player.isExhausted) return false
    if (!this.stamina.canAfford(ctx, CFG.player.heavy.staminaCost)) return false
    ps.action = 'heavy'
    ps.phase = 'startup'
    ps.timer = 0
    ps.cooldownRemaining = CFG.player.heavy.cooldown
    return true
  }

  tryGuard(ctx: GameContext): boolean {
    const ps = ctx.player.state
    if (ps.action !== 'idle' && ps.action !== 'guard' && ps.action !== 'exhausted') return false
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
    this.ai.onComboTaken(ctx)
    this.ai.stun(ctx, CFG.clippy.stun.maxHits)
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

      case 'exhausted':
        break
    }
  }

  private returnToIdle(ctx: GameContext) {
    const ps = ctx.player.state
    ps.action = ctx.player.isExhausted ? 'exhausted' : 'idle'
    ps.phase = null
    ps.timer = 0
  }

  // ── Player hit resolution (the core change) ──────────────────────────

  private resolvePlayerHit(ctx: GameContext, type: 'jab' | 'heavy') {
    const cs = ctx.clippy.state
    const baseDamage = type === 'jab' ? CFG.player.jab.damage : CFG.player.heavy.damage
    const staminaCost = type === 'jab' ? CFG.player.jab.staminaCost : CFG.player.heavy.staminaCost

    switch (cs.action) {
      case 'idle':
      case 'feint_telegraph':
      case 'feint_cancel':
      case 'attack':
        this.guardBlock(ctx, staminaCost)
        return

      case 'telegraph': {
        const startup = this.ai.getStartup(cs.attack!.type, ctx)
        const center = startup / 2
        const half = CFG.player.counterPunch.windowMs / 2
        const inWindow = cs.timer >= center - half && cs.timer <= center + half

        if (inWindow) {
          const damage = Math.round(baseDamage * CFG.player.counterPunch.damageMultiplier)
          this.stamina.spend(ctx, staminaCost)
          this.stamina.restore(ctx, CFG.player.counterPunch.staminaGain)
          this.damageClippy(ctx, damage)
          this.hype.onCounterPunch(ctx)
          this.ai.onPerfectCounter(ctx)
          this.ai.stun(ctx, CFG.clippy.stun.maxHits)
          ctx.player.stars = Math.min(3, ctx.player.stars + 1)
          this.registerCombo(ctx)
          this.events.push({ type: 'counter_punch', damage })
          this.events.push({ type: 'star_earned' })
          this.events.push({ type: 'stun_start' })
        } else {
          this.guardBlock(ctx, staminaCost)
        }
        return
      }

      case 'recovery':
        this.stamina.spend(ctx, staminaCost)
        this.damageClippy(ctx, baseDamage)
        if (type === 'jab') this.hype.onJabHit(ctx)
        else this.hype.onHeavyHit(ctx)
        this.registerCombo(ctx)
        this.events.push({ type: 'hit', damage: baseDamage })
        return

      case 'stunned':
        if (cs.stunHitsRemaining <= 0) {
          this.guardBlock(ctx, staminaCost)
          return
        }
        this.stamina.spend(ctx, staminaCost)
        this.damageClippy(ctx, baseDamage)
        cs.stunHitsRemaining--
        if (type === 'jab') this.hype.onJabHit(ctx)
        else this.hype.onHeavyHit(ctx)
        this.registerCombo(ctx)
        this.events.push({ type: 'stun_hit', damage: baseDamage })
        if (cs.stunHitsRemaining <= 0) this.ai.endStun(ctx)
        return

      case 'taunt':
        this.stamina.spend(ctx, staminaCost)
        this.damageClippy(ctx, baseDamage)
        this.hype.onTauntHit(ctx)
        this.registerCombo(ctx)
        this.events.push({ type: 'taunt_hit', damage: baseDamage })
        return

      default:
        this.guardBlock(ctx, staminaCost)
    }
  }

  private guardBlock(ctx: GameContext, baseCost: number) {
    this.stamina.spendGuardBlock(ctx, baseCost)
    this.hype.onGuardBlock(ctx)
    if (ctx.player.stars > 0) {
      ctx.player.stars = Math.max(0, ctx.player.stars - CFG.clippy.guard.starLoss)
      this.events.push({ type: 'star_lost' })
    }
    this.events.push({ type: 'guard_block' })
    ctx.player.comboCount = 0
    ctx.player.comboTimer = 0
  }

  // ── Clippy attack hit check ──────────────────────────────────────────

  checkClippyAttackHit(ctx: GameContext) {
    const cs = ctx.clippy.state
    if (cs.action !== 'attack' || !cs.attack) return

    const attackType = cs.attack.type

    if (this.dodge.isInvulnerable(ctx)) {
      this.ai.onMissedAttack(ctx)

      if (ctx.player.state.isPerfectDodge) {
        const maxHits = (attackType === 'charge' && ctx.combatPhase === 3)
          ? CFG.clippy.stun.chargePhase3MaxHits
          : CFG.clippy.stun.maxHits
        this.ai.stun(ctx, maxHits)
        this.stamina.restore(ctx, CFG.player.dodge.staminaBonus)
        this.events.push({ type: 'stun_start' })
      } else {
        cs.action = 'recovery'
        cs.recoveryDuration = this.ai.getRecovery(attackType, ctx)
        cs.timer = 0
        this.stamina.restore(ctx, CFG.player.dodge.staminaBonus)
      }
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
      this.hype.onPlayerHit(ctx)
      cs.action = 'recovery'
      cs.recoveryDuration = this.ai.getRecovery(attackType, ctx)
      cs.timer = 0
      return
    }

    ctx.player.hp = Math.max(0, ctx.player.hp - damage)
    ps.action = 'stunned'
    ps.timer = 0
    ctx.player.comboCount = 0
    ctx.player.comboTimer = 0
    if (ctx.player.stars > 0) {
      ctx.player.stars--
      this.events.push({ type: 'star_lost' })
    }
    this.ai.onPlayerHit(ctx)
    this.hype.onPlayerHit(ctx)

    cs.action = 'recovery'
    cs.recoveryDuration = this.ai.getRecovery(attackType, ctx)
    cs.timer = 0
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private damageClippy(ctx: GameContext, amount: number) {
    ctx.clippy.hp = Math.max(0, ctx.clippy.hp - amount)
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
      if (ctx.player.comboTimer <= 0) { ctx.player.comboCount = 0; ctx.player.comboTimer = 0 }
    }
  }

  private updateGuardDuration(ctx: GameContext, dt: number) {
    if (ctx.player.state.action === 'guard') ctx.player.guardDuration += dt * 1000
  }
}
