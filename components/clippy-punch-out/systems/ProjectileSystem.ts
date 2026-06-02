import { CFG } from '../config'
import type { GameContext, Projectile, ProjectileType, DodgeDirection } from '../types'

export class ProjectileSystem {
  private pendingBoo = false
  private pendingRose = false

  onError(ctx: GameContext) {
    ctx.crowd.errorCount++
    ctx.crowd.successStreak = 0
    if (ctx.crowd.errorCount % CFG.crowd.errorThresholdProjectile === 0) {
      this.pendingBoo = true
    }
  }

  onSuccess(ctx: GameContext) {
    ctx.crowd.successStreak++
    if (ctx.crowd.successStreak >= CFG.crowd.successStreakRose) {
      this.pendingRose = true
      ctx.crowd.successStreak = 0
    }
  }

  update(ctx: GameContext, dt: number) {
    if (this.pendingBoo) {
      this.pendingBoo = false
      this.spawnHostile(ctx)
    }
    if (this.pendingRose) {
      this.pendingRose = false
      this.spawnRoseSquare(ctx)
    }

    if (ctx.roseSquare.active) {
      ctx.roseSquare.timer += dt * 1000
      if (ctx.roseSquare.timer >= CFG.projectiles.roseClickMs) {
        ctx.roseSquare.active = false
      }
    }

    for (let i = ctx.projectiles.length - 1; i >= 0; i--) {
      const p = ctx.projectiles[i]
      if (!p.active) continue
      p.progress += (dt * 1000) / p.duration

      if (!p.warned && p.progress >= 0.15) {
        p.warned = true
      }

      if (p.progress >= 1) {
        p.active = false
        ctx.projectiles.splice(i, 1)
      }
    }
  }

  checkHit(ctx: GameContext, proj: Projectile): 'hit' | 'dodged' | null {
    if (proj.progress < 0.85) return null

    const ps = ctx.player.state
    const dodging = ps.action === 'dodge' && ps.dodgeDir === proj.requiredDodge && ps.timer <= 300

    if (dodging) return 'dodged'

    if (ps.action === 'guard') {
      const reduced = Math.round(proj.damage * (1 - CFG.player.guard.damageReduction))
      ctx.player.hp = Math.max(0, ctx.player.hp - reduced)
    } else {
      ctx.player.hp = Math.max(0, ctx.player.hp - proj.damage)
    }
    return 'hit'
  }

  tryClickRose(ctx: GameContext, px: number, py: number): boolean {
    const r = ctx.roseSquare
    if (!r.active) return false
    const size = 60
    if (px >= r.x - size / 2 && px <= r.x + size / 2 &&
        py >= r.y - size / 2 && py <= r.y + size / 2) {
      r.active = false
      return true
    }
    return false
  }

  private spawnRoseSquare(ctx: GameContext) {
    ctx.roseSquare.active = true
    ctx.roseSquare.timer = 0
    ctx.roseSquare.x = 100 + Math.random() * 600
    ctx.roseSquare.y = 150 + Math.random() * 250
  }

  private spawnHostile(ctx: GameContext) {
    const type = this.pickHostileType()
    const cfg = CFG.projectiles.types[type]
    const directions: Array<{ side: 'left' | 'right' | 'top'; requiredDodge: DodgeDirection }> = [
      { side: 'left', requiredDodge: 'right' },
      { side: 'right', requiredDodge: 'left' },
      { side: 'top', requiredDodge: 'down' },
    ]
    const dir = directions[Math.floor(Math.random() * directions.length)]

    let startX: number, startY: number
    if (dir.side === 'left') {
      startX = -20; startY = 150 + Math.random() * 200
    } else if (dir.side === 'right') {
      startX = 820; startY = 150 + Math.random() * 200
    } else {
      startX = 200 + Math.random() * 400; startY = -20
    }

    ctx.projectiles.push({
      type,
      x: startX,
      y: startY,
      targetX: 400 + (Math.random() - 0.5) * 120,
      targetY: 350 + Math.random() * 80,
      progress: 0,
      duration: CFG.projectiles.warningMs + CFG.projectiles.travelMs,
      active: true,
      warned: false,
      damage: cfg.damage,
      side: dir.side,
      requiredDodge: dir.requiredDodge,
    })
  }

  private pickHostileType(): Exclude<ProjectileType, 'rose'> {
    const types = CFG.projectiles.types
    const entries = Object.entries(types) as [Exclude<ProjectileType, 'rose'>, { weight: number }][]
    const totalWeight = entries.reduce((sum, [, v]) => sum + v.weight, 0)
    let roll = Math.random() * totalWeight
    for (const [type, val] of entries) {
      roll -= val.weight
      if (roll <= 0) return type
    }
    return 'can'
  }
}
