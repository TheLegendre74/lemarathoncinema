import { CFG } from '../config'
import type { GameContext, Projectile, ProjectileType } from '../types'

export class ProjectileSystem {
  private spawnTimer = 0

  update(ctx: GameContext, dt: number) {
    if (ctx.hype.level !== 'hostile') {
      this.spawnTimer = 0
      return
    }

    this.spawnTimer += dt * 1000

    const interval = this.getInterval(ctx.hype.value)
    if (interval > 0 && this.spawnTimer >= interval) {
      this.spawnTimer = 0
      this.spawn(ctx)
    }

    for (let i = ctx.projectiles.length - 1; i >= 0; i--) {
      const p = ctx.projectiles[i]
      if (!p.active) continue

      p.progress += (dt * 1000) / p.duration

      if (!p.warned && p.progress >= 0.15) {
        p.warned = true
      }

      p.x = p.x + (p.targetX - p.x) * (p.progress / 1)
      p.y = p.y + (p.targetY - p.y) * (p.progress / 1)

      if (p.progress >= 1) {
        p.active = false
        ctx.projectiles.splice(i, 1)
      }
    }
  }

  spawn(ctx: GameContext) {
    const type = this.pickType()
    const cfg = CFG.projectiles.types[type]
    const side = Math.random() > 0.5 ? 'right' as const : 'left' as const
    const startX = side === 'left' ? -20 : 820
    const startY = 100 + Math.random() * 150

    const proj: Projectile = {
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
      side,
    }

    ctx.projectiles.push(proj)
  }

  checkHit(ctx: GameContext, proj: Projectile): boolean {
    if (proj.progress < (CFG.projectiles.warningMs / proj.duration)) return false

    const ps = ctx.player.state
    if (ps.action === 'dodge' && ps.timer <= CFG.player.dodge.invulnMs) return false

    const hitZone = proj.progress >= 0.85
    if (!hitZone) return false

    if (ps.action === 'guard') {
      const reduced = Math.round(proj.damage * (1 - CFG.player.guard.damageReduction))
      ctx.player.hp = Math.max(0, ctx.player.hp - reduced)
    } else {
      ctx.player.hp = Math.max(0, ctx.player.hp - proj.damage)
    }

    return true
  }

  private getInterval(hype: number): number {
    for (const range of CFG.projectiles.intervals) {
      if (hype >= range.hypeMin && hype <= range.hypeMax) return range.ms
    }
    return 0
  }

  private pickType(): ProjectileType {
    const types = CFG.projectiles.types
    const entries = Object.entries(types) as [ProjectileType, { weight: number }][]
    const totalWeight = entries.reduce((sum, [, v]) => sum + v.weight, 0)
    let roll = Math.random() * totalWeight
    for (const [type, val] of entries) {
      roll -= val.weight
      if (roll <= 0) return type
    }
    return 'can'
  }
}
