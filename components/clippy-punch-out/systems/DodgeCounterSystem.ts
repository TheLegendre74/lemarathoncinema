import { CFG } from '../config'
import type { GameContext, DodgeDirection } from '../types'
import { REQUIRED_DODGE } from '../types'

export class DodgeCounterSystem {
  tryDodge(ctx: GameContext, direction: DodgeDirection, requiredDodge: typeof REQUIRED_DODGE): boolean {
    const ps = ctx.player.state
    if (ps.action !== 'idle' && ps.action !== 'guard') return false
    if (ps.cooldownRemaining > 0) return false
    if (ctx.player.stamina < CFG.player.dodge.staminaCost) return false
    if (ctx.player.isExhausted) return false

    const cs = ctx.clippy.state
    let isPerfect = false

    if (cs.action === 'telegraph' && cs.attack) {
      const correctDir = requiredDodge[cs.attack.side]
      if (direction !== correctDir) return false
      const startup = this.getAttackStartup(cs.attack.type)
      const remaining = startup - cs.timer
      isPerfect = remaining <= CFG.player.perfectDodge.windowMs && remaining >= 0
    } else if (cs.action === 'attack' && cs.attack) {
      const correctDir = requiredDodge[cs.attack.side]
      if (direction !== correctDir) return false
    }

    ps.action = 'dodge'
    ps.phase = null
    ps.timer = 0
    ps.dodgeDir = direction
    ps.isPerfectDodge = isPerfect
    ps.cooldownRemaining = CFG.player.dodge.cooldown
    return true
  }

  tryStarPunch(ctx: GameContext): boolean {
    if (ctx.player.stars < CFG.player.starPunch.starsRequired) return false
    const ps = ctx.player.state
    if (ps.action !== 'idle') return false
    if (ctx.player.isExhausted) return false

    ctx.player.stars = 0
    ps.action = 'starpunch'
    ps.phase = 'active'
    ps.timer = 0
    return true
  }

  updateDodge(ctx: GameContext, dt: number) {
    const ps = ctx.player.state
    if (ps.action !== 'dodge') return

    ps.timer += dt * 1000
    if (ps.timer >= CFG.player.dodge.totalMs) {
      ps.action = 'idle'
      ps.timer = 0
      ps.dodgeDir = null
      ps.isPerfectDodge = false
    }
  }

  isInvulnerable(ctx: GameContext): boolean {
    const ps = ctx.player.state
    return ps.action === 'dodge' && ps.timer <= CFG.player.dodge.invulnMs
  }

  private getAttackStartup(type: string): number {
    if (type === 'jab') return CFG.clippy.jab.startup
    if (type === 'hook') return CFG.clippy.hook.startup
    return CFG.clippy.charge.startup
  }
}
