import { CFG } from '../config'
import type { GameContext } from '../types'

export class StaminaSystem {
  update(ctx: GameContext, dt: number) {
    const p = ctx.player
    const action = p.state.action
    const frenzyActive = ctx.frenzy.state === 'active'

    if (action === 'guard') {
      const overTime = ctx.player.guardDuration > CFG.player.guard.maxComfortMs
      const drainMult = overTime ? CFG.player.guard.penaltyDrainMult : 1
      const cost = CFG.player.guard.staminaCostPerSec * drainMult * dt
      p.stamina = Math.max(0, p.stamina - this.applyCostMult(cost, frenzyActive))
      const regen = CFG.player.staminaRegen.guarding * dt
      p.stamina = Math.min(CFG.player.maxStamina, p.stamina + this.applyRegenMult(regen, ctx))
      return
    }

    let rate: number
    if (action === 'idle') {
      rate = CFG.player.staminaRegen.idle
    } else {
      rate = CFG.player.staminaRegen.moving
    }

    const regen = rate * dt
    p.stamina = Math.min(CFG.player.maxStamina, p.stamina + this.applyRegenMult(regen, ctx))
  }

  canAfford(ctx: GameContext, cost: number): boolean {
    const effective = this.applyCostMult(cost, ctx.frenzy.state === 'active')
    return ctx.player.stamina >= effective
  }

  spend(ctx: GameContext, cost: number) {
    const effective = this.applyCostMult(cost, ctx.frenzy.state === 'active')
    ctx.player.stamina = Math.max(0, ctx.player.stamina - effective)
  }

  restore(ctx: GameContext, amount: number) {
    ctx.player.stamina = Math.min(CFG.player.maxStamina, ctx.player.stamina + amount)
  }

  isLow(ctx: GameContext): boolean {
    return ctx.player.stamina < CFG.player.lowStaminaThreshold
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
