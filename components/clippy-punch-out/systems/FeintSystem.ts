import { CFG } from '../config'
import type { GameContext } from '../types'

export class FeintSystem {
  private lastFeintTime = 0
  private feintCooldown = 4000

  shouldFeint(ctx: GameContext): boolean {
    if (ctx.totalTime - this.lastFeintTime < this.feintCooldown) return false
    if (ctx.combatPhase === 1 && ctx.clippy.psyche.confidence < 30) return false

    const chance = ctx.clippy.psyche.confidence >= CFG.feint.confidenceThreshold
      ? CFG.feint.highConfidenceChance
      : CFG.feint.baseChance

    if (Math.random() < chance) {
      this.lastFeintTime = ctx.totalTime
      this.feintCooldown = 3000 + Math.random() * 3000
      return true
    }
    return false
  }
}
