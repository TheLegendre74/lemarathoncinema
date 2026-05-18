import { CFG } from '../config'
import type { GameContext } from '../types'

export class StaminaSystem {
  private _lowWarningFired = false

  update(ctx: GameContext, dt: number) {
    const p = ctx.player
    const action = p.state.action
    const frenzyActive = ctx.frenzy.state === 'active'

    if (p.isExhausted && action !== 'guard') {
      const regen = CFG.player.staminaRegen.exhausted * dt
      p.stamina = Math.min(CFG.player.maxStamina, p.stamina + this.applyRegenMult(regen, ctx))
      if (p.stamina >= CFG.player.exhaustedExitThreshold) {
        p.isExhausted = false
        p.state.action = 'idle'
        p.state.phase = null
        p.state.timer = 0
      }
      return
    }

    if (action === 'guard') {
      const overTime = p.guardDuration > CFG.player.guard.maxComfortMs
      const drainMult = overTime ? CFG.player.guard.penaltyDrainMult : 1
      const cost = CFG.player.guard.staminaCostPerSec * drainMult * dt
      p.stamina = Math.max(0, p.stamina - this.applyCostMult(cost, frenzyActive))
      if (p.stamina <= 0 && !p.isExhausted) {
        p.isExhausted = true
      }
      return
    }

    if (action === 'exhausted') {
      const regen = CFG.player.staminaRegen.exhausted * dt
      p.stamina = Math.min(CFG.player.maxStamina, p.stamina + this.applyRegenMult(regen, ctx))
      if (p.stamina >= CFG.player.exhaustedExitThreshold) {
        p.isExhausted = false
        p.state.action = 'idle'
        p.state.phase = null
        p.state.timer = 0
      }
      return
    }

    let rate: number
    if (action === 'idle') rate = CFG.player.staminaRegen.idle
    else rate = CFG.player.staminaRegen.moving

    const regen = rate * dt
    p.stamina = Math.min(CFG.player.maxStamina, p.stamina + this.applyRegenMult(regen, ctx))

    if (p.stamina < CFG.player.lowStaminaThreshold && !this._lowWarningFired) {
      this._lowWarningFired = true
    }
    if (p.stamina >= CFG.player.lowStaminaThreshold) this._lowWarningFired = false
  }

  canAfford(ctx: GameContext, cost: number): boolean {
    if (ctx.player.isExhausted) return false
    const effective = this.applyCostMult(cost, ctx.frenzy.state === 'active')
    return ctx.player.stamina >= effective
  }

  spend(ctx: GameContext, cost: number) {
    const effective = this.applyCostMult(cost, ctx.frenzy.state === 'active')
    ctx.player.stamina = Math.max(0, ctx.player.stamina - effective)
    if (ctx.player.stamina <= 0 && !ctx.player.isExhausted) {
      ctx.player.isExhausted = true
    }
  }

  spendGuardBlock(ctx: GameContext, baseCost: number) {
    this.spend(ctx, baseCost * CFG.clippy.guard.playerStaminaMult)
  }

  restore(ctx: GameContext, amount: number) {
    ctx.player.stamina = Math.min(CFG.player.maxStamina, ctx.player.stamina + amount)
    if (ctx.player.isExhausted && ctx.player.stamina >= CFG.player.exhaustedExitThreshold) {
      ctx.player.isExhausted = false
      if (ctx.player.state.action === 'exhausted') {
        ctx.player.state.action = 'idle'
        ctx.player.state.phase = null
        ctx.player.state.timer = 0
      }
    }
  }

  isLow(ctx: GameContext): boolean {
    return ctx.player.stamina < CFG.player.lowStaminaThreshold
  }

  consumeLowWarning(): boolean {
    if (this._lowWarningFired) { this._lowWarningFired = false; return true }
    return false
  }

  private applyCostMult(cost: number, frenzy: boolean): number {
    return frenzy ? cost * CFG.frenzy.staminaCostMult : cost
  }

  private applyRegenMult(regen: number, ctx: GameContext): number {
    let mult = 1
    if (ctx.hype.level === 'delirious') mult *= CFG.hype.deliriousRegenMult
    if (ctx.frenzy.state === 'active') mult *= CFG.frenzy.staminaRegenMult
    return regen * mult
  }
}
