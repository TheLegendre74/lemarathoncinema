import { CFG } from '../config'
import type { GameContext } from '../types'

export class StaminaSystem {
  update(ctx: GameContext, dt: number) {
    const p = ctx.player
    if (ctx.tutorial.active) return

    if (p.isExhausted) {
      p.exhaustedTimer += dt * 1000
      if (p.exhaustedTimer >= CFG.player.stamina.exhaustedDurationMs) {
        p.isExhausted = false
        p.exhaustedTimer = 0
        if (p.state.action === 'exhausted') {
          p.state.action = 'idle'
          p.state.phase = null
          p.state.timer = 0
        }
      }
      return
    }

    p.stamina = Math.min(CFG.player.maxStamina, p.stamina + CFG.player.stamina.regenPerSec * dt)
  }

  canAct(ctx: GameContext): boolean {
    return !ctx.player.isExhausted
  }

  spendDodge(ctx: GameContext, isPerfect: boolean) {
    const cost = isPerfect ? CFG.player.stamina.costDodgePerfect : CFG.player.stamina.costDodge
    ctx.player.stamina = Math.max(0, ctx.player.stamina - cost)
    this.checkExhausted(ctx)
  }

  spendHitStun(ctx: GameContext) {
    ctx.player.stamina = Math.max(0, ctx.player.stamina - CFG.player.stamina.costHitStun)
    this.checkExhausted(ctx)
  }

  spendHitGuard(ctx: GameContext) {
    ctx.player.stamina = Math.max(0, ctx.player.stamina - CFG.player.stamina.costHitGuard)
    this.checkExhausted(ctx)
  }

  restoreRose(ctx: GameContext) {
    ctx.player.stamina = CFG.player.maxStamina
    if (ctx.player.isExhausted) {
      ctx.player.isExhausted = false
      ctx.player.exhaustedTimer = 0
      if (ctx.player.state.action === 'exhausted') {
        ctx.player.state.action = 'idle'
        ctx.player.state.phase = null
        ctx.player.state.timer = 0
      }
    }
  }

  private checkExhausted(ctx: GameContext) {
    if (ctx.player.stamina <= 0 && !ctx.player.isExhausted) {
      ctx.player.isExhausted = true
      ctx.player.exhaustedTimer = 0
      ctx.player.state.action = 'exhausted'
      ctx.player.state.phase = null
      ctx.player.state.timer = 0
    }
  }
}
