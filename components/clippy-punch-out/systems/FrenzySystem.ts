import { CFG } from '../config'
import type { GameContext } from '../types'

export class FrenzySystem {
  update(ctx: GameContext, dt: number) {
    const hype = ctx.hype.value
    const f = ctx.frenzy

    switch (f.state) {
      case 'inactive':
        if (hype >= CFG.frenzy.activationThreshold) {
          f.state = 'building'
          f.highHypeTimer = 0
        }
        break

      case 'building':
        if (hype < CFG.frenzy.activationThreshold) {
          f.state = 'inactive'
          f.highHypeTimer = 0
        } else {
          f.highHypeTimer += dt * 1000
          if (f.highHypeTimer >= CFG.frenzy.activationDuration) {
            f.state = 'active'
          }
        }
        break

      case 'active':
        ctx.clippy.psyche.panic = Math.min(100, ctx.clippy.psyche.panic + CFG.frenzy.panicPerSec * dt)
        if (hype < CFG.frenzy.activationThreshold) {
          f.state = 'inactive'
          f.highHypeTimer = 0
        }
        break
    }
  }
}
