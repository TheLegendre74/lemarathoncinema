import type Phaser from 'phaser'
import { CFG } from '../config'
import type { GameContext } from '../types'

export class EffectsRenderer {
  private popups: Phaser.GameObjects.Text[] = []
  private spotAngle = 0
  private spotAngle2 = Math.PI
  private font = 'Impact, "Arial Black", "Bebas Neue", sans-serif'

  private blinkActive = false
  private blinkTimer = 0

  constructor(
    private scene: Phaser.Scene,
    private gFlash: Phaser.GameObjects.Graphics,
    private gSpots: Phaser.GameObjects.Graphics,
    private W: number,
    private H: number,
  ) {}

  update(ctx: GameContext, dt: number) {
    const e = ctx.effects

    e.shake *= 0.75
    if (Math.abs(e.shake) < 0.3) e.shake = 0

    e.flashAlpha = Math.max(0, e.flashAlpha - dt * 5)

    if (e.freezeMs > 0) {
      e.freezeMs -= dt * 1000
    }

    if (e.slowMoTimer > 0) {
      e.slowMoTimer -= dt * 1000
      if (e.slowMoTimer <= 0) {
        e.slowMo = 1
        e.slowMoTimer = 0
      }
    }

    if (this.blinkActive) {
      this.blinkTimer += dt * 1000
      if (this.blinkTimer >= CFG.tells.blinkDurationMs) {
        this.blinkActive = false
        this.blinkTimer = 0
      }
    }

    this.spotAngle += dt * 1.2
    this.spotAngle2 += dt * 0.9
  }

  draw(ctx: GameContext) {
    this.drawSpots(ctx)
    this.drawBlink()
    this.drawFlash(ctx)
  }

  private drawFlash(ctx: GameContext) {
    this.gFlash.clear()
    if (this.blinkActive) {
      this.gFlash.fillStyle(0x000000, CFG.tells.blinkAlpha)
      this.gFlash.fillRect(0, 0, this.W, this.H)
    }
    if (ctx.effects.flashAlpha > 0.01) {
      this.gFlash.fillStyle(ctx.effects.flashColor, Math.min(ctx.effects.flashAlpha, 0.55))
      this.gFlash.fillRect(0, 0, this.W, this.H)
    }
  }

  private drawBlink() {
    // blink overlay is drawn inside drawFlash
  }

  private drawSpots(_ctx: GameContext) {
    const g = this.gSpots
    g.clear()
    const W = this.W, H = this.H
    const spots = [
      { a: this.spotAngle,        col: 0xff2222, r: W * 0.35 },
      { a: this.spotAngle2,       col: 0x2244ff, r: W * 0.30 },
      { a: this.spotAngle + 2.1,  col: 0xffcc00, r: W * 0.25 },
      { a: this.spotAngle2 + 1.5, col: 0xff00ff, r: W * 0.20 },
    ]
    spots.forEach(({ a, col, r }) => {
      const sx = W / 2 + Math.cos(a) * W * 0.55
      const sy = H * 0.15
      const ex = W / 2 + Math.cos(a) * W * 0.4
      const ey = H
      g.lineStyle(r, col, 0.06)
      g.beginPath()
      g.moveTo(sx, sy)
      g.lineTo(ex, ey)
      g.strokePath()
    })
  }

  blink() {
    this.blinkActive = true
    this.blinkTimer = 0
  }

  flash(ctx: GameContext, color: number, alpha = 0.45) {
    ctx.effects.flashColor = color
    ctx.effects.flashAlpha = alpha
  }

  shake(ctx: GameContext, intensity = 18) {
    ctx.effects.shake = (Math.random() > 0.5 ? 1 : -1) * intensity
  }

  freezeFrame(ctx: GameContext, ms: number) {
    ctx.effects.freezeMs = ms
  }

  slowMo(ctx: GameContext, factor: number, durationMs: number) {
    ctx.effects.slowMo = factor
    ctx.effects.slowMoTimer = durationMs
  }

  popup(msg: string, color = '#ffffff', x?: number, y?: number) {
    const px = x ?? (Math.random() > 0.5
      ? Math.round(this.W * 0.82)
      : Math.round(this.W * 0.18))
    const py = y ?? Math.round(this.H * 0.45 + (Math.random() - 0.5) * this.H * 0.15)

    const t = this.scene.add.text(px, py, msg, {
      fontFamily: this.font,
      fontSize: '43px',
      color,
      stroke: '#000',
      strokeThickness: 8,
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(11).setAlpha(1)

    this.popups.push(t)
    this.scene.tweens.add({
      targets: t, y: py - 80, alpha: 0,
      duration: 1400, ease: 'Power2',
      onComplete: () => {
        this.popups = this.popups.filter(p => p !== t)
        t.destroy()
      },
    })
  }

  drawStunStars(g: Phaser.GameObjects.Graphics, cx: number, cy: number, count: number, time: number) {
    if (count <= 0) return
    const orbitR = 28
    const starR1 = 8
    const starR2 = 3.5
    for (let i = 0; i < count; i++) {
      const angle = (time * 0.005) + (i * Math.PI * 2) / count
      const sx = cx + Math.cos(angle) * orbitR
      const sy = cy - 30 + Math.sin(angle) * orbitR * 0.4
      g.fillStyle(0xffcc00, 0.9)
      this.drawStarShape(g, sx, sy, starR1, starR2)
    }
  }

  private drawStarShape(g: Phaser.GameObjects.Graphics, x: number, y: number, r1: number, r2: number) {
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? r1 : r2
      const a = (i * Math.PI / 5) - Math.PI / 2
      if (i === 0) g.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
      else g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a))
    }
    g.closePath(); g.fillPath()
  }

  getShakeX(ctx: GameContext): number {
    return ctx.effects.shake
  }

  cleanup() {
    this.popups.forEach(p => p.destroy())
    this.popups = []
  }
}
