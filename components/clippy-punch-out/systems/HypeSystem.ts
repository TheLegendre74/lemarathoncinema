import { CFG } from '../config'
import type { GameContext, HypeLevel } from '../types'

export class HypeSystem {
  update(ctx: GameContext, dt: number) {
    if (ctx.player.state.action === 'guard') {
      if (ctx.player.guardDuration > CFG.player.guard.hypeDropDelay) {
        this.remove(ctx, CFG.hype.losses.guardPerSec * dt)
      }
    }

    ctx.hype.level = this.getLevel(ctx.hype.value)
  }

  add(ctx: GameContext, amount: number) {
    ctx.hype.value = Math.min(CFG.hype.max, ctx.hype.value + amount)
    ctx.hype.level = this.getLevel(ctx.hype.value)
  }

  remove(ctx: GameContext, amount: number) {
    ctx.hype.value = Math.max(CFG.hype.min, ctx.hype.value - amount)
    ctx.hype.level = this.getLevel(ctx.hype.value)
  }

  onJabHit(ctx: GameContext)           { this.add(ctx, CFG.hype.gains.jabHit) }
  onHeavyHit(ctx: GameContext)         { this.add(ctx, CFG.hype.gains.heavyHit) }
  onPerfectDodge(ctx: GameContext)     { this.add(ctx, CFG.hype.gains.perfectDodge) }
  onPerfectCounter(ctx: GameContext)   { this.add(ctx, CFG.hype.gains.perfectCounter) }
  onCombo(ctx: GameContext)            { this.add(ctx, CFG.hype.gains.combo) }
  onJabMiss(ctx: GameContext)          { this.remove(ctx, CFG.hype.losses.jabMiss) }
  onHeavyMiss(ctx: GameContext)        { this.remove(ctx, CFG.hype.losses.heavyMiss) }
  onPlayerHit(ctx: GameContext)        { this.remove(ctx, CFG.hype.losses.playerHit) }

  getLevel(value: number): HypeLevel {
    if (value >= CFG.hype.thresholds.delirious) return 'delirious'
    if (value >= CFG.hype.thresholds.hostile) return 'neutral'
    return 'hostile'
  }
}
