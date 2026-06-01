import { CFG } from '../config'
import type { GameContext, Projectile, ProjectileType } from '../types'

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
      this.spawnRose(ctx)
    }

    for (let i = ctx.projectiles.length - 1; i >= 0; i--) {
      const p = ctx.projectiles[i]
      if (!p.active) continue
      p.progress += (dt * 1000) / p.duration

      if (!p.warned && p.progress >= 0.15) {
        p.warned = true
      }

      if (p.progress >= 1) {
        if (p.type === 'rose') {
          p.active = false
          ctx.projectiles.splice(i, 1)
        } else {
          p.active = false
          ctx.projectiles.splice(i, 1)
        }
      }
    }
  }

  checkHit(ctx: GameContext, proj: Projectile): 'hit' | 'rose_catch' | null {
    if (proj.progress < 0.85) return null

    const ps = ctx.player.state
    const dodging = ps.action === 'dodge' && ps.timer <= 180

    if (proj.type === 'rose') {
      if (!dodging) return 'rose_catch'
      return null
    }

    if (dodging) return null

    if (ps.action === 'guard') {
      const reduced = Math.round(proj.damage * (1 - CFG.player.guard.damageReduction))
      ctx.player.hp = Math.max(0, ctx.player.hp - reduced)
    } else {
      ctx.player.hp = Math.max(0, ctx.player.hp - proj.damage)
    }
    return 'hit'
  }

  private spawnHostile(ctx: GameContext) {
    const type = this.pickHostileType()
    const cfg = CFG.projectiles.types[type]
    const side = Math.random() > 0.5 ? 'right' as const : 'left' as const
    const startX = side === 'left' ? -20 : 820
    const startY = 100 + Math.random() * 150

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
      side,
    })
  }

  private spawnRose(ctx: GameContext) {
    const side = Math.random() > 0.5 ? 'right' as const : 'left' as const
    const startX = side === 'left' ? -20 : 820
    const startY = 100 + Math.random() * 100

    ctx.projectiles.push({
      type: 'rose',
      x: startX,
      y: startY,
      targetX: 400 + (Math.random() - 0.5) * 80,
      targetY: 370 + Math.random() * 60,
      progress: 0,
      duration: CFG.projectiles.roseTravelMs,
      active: true,
      warned: false,
      damage: 0,
      side,
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
