import type Phaser from 'phaser'
import { CFG } from '../config'
import type { GameContext, DodgeDirection } from '../types'

interface HUDTexts {
  playerHP: Phaser.GameObjects.Text
  clippyHP: Phaser.GameObjects.Text
  round: Phaser.GameObjects.Text
  bubble: Phaser.GameObjects.Text
  now: Phaser.GameObjects.Text
  damage: Phaser.GameObjects.Text
  tutTitle: Phaser.GameObjects.Text
  tutInstr: Phaser.GameObjects.Text
  atkLabel: Phaser.GameObjects.Text
  keys: Phaser.GameObjects.Text[]
}

export class HUDRenderer {
  private BAR_Y = 28
  private BAR_H = 20
  private BAR_W = 0
  private STAM_H = 10
  private nowAlpha = 0

  constructor(
    private scene: Phaser.Scene,
    private gHUD: Phaser.GameObjects.Graphics,
    private gBubble: Phaser.GameObjects.Graphics,
    private gKeys: Phaser.GameObjects.Graphics,
    private texts: HUDTexts,
    private W: number,
    private H: number,
  ) {
    this.BAR_W = Math.round(W * 0.27)
  }

  draw(ctx: GameContext) {
    this.gHUD.clear()
    this.gBubble.clear()
    this.gKeys.clear()

    this.drawTopBar(ctx)
    this.drawPlayerHP(ctx)
    this.drawStamina(ctx)
    this.drawClippyHP(ctx)
    this.drawStars(ctx)
    this.drawBubble(ctx)
    this.drawProjectileWarnings(ctx)

    this.nowAlpha = Math.max(0, this.nowAlpha - ctx.dt * 2.2)
    this.texts.now.setAlpha(this.nowAlpha)
  }

  flashNow(text: string, color = '#ff2200') {
    this.texts.now.setText(text).setColor(color)
    this.nowAlpha = 1
  }

  setBubble(text: string) {
    this.texts.bubble.setText(text)
  }

  setRound(text: string, color = '#ffcc44') {
    this.texts.round.setText(text).setColor(color)
  }

  showDmg(amount: number) {
    this.texts.damage.setText(`-${amount}`).setAlpha(1)
    this.texts.damage.setPosition(14 + this.BAR_W + 12, this.BAR_Y + 4)
    this.scene.tweens.killTweensOf(this.texts.damage)
    this.scene.tweens.add({
      targets: this.texts.damage, y: this.BAR_Y - 18, alpha: 0,
      duration: 1200, ease: 'Power2',
    })
  }

  private drawTopBar(_ctx: GameContext) {
    const g = this.gHUD
    g.fillStyle(0x050510, 0.80)
    g.fillRoundedRect(0, 0, this.W, this.BAR_Y + this.BAR_H + this.STAM_H + 18, { tl: 0, tr: 0, bl: 8, br: 8 })
  }

  private drawPlayerHP(ctx: GameContext) {
    if (ctx.tutorial.active) return
    const g = this.gHUD
    const pct = Math.max(0, ctx.player.hp / CFG.player.maxHP)
    g.fillStyle(0x0d0d1e, 1).fillRoundedRect(14, this.BAR_Y, this.BAR_W, this.BAR_H, 5)
    if (pct > 0) {
      const col = pct > 0.5 ? 0x22cc55 : pct > 0.25 ? 0xffaa00 : 0xff2222
      g.fillStyle(col, 1)
      g.fillRoundedRect(14, this.BAR_Y, Math.round(this.BAR_W * pct), this.BAR_H, 5)
    }
    g.lineStyle(2, 0x111122, 0.9).strokeRoundedRect(14, this.BAR_Y, this.BAR_W, this.BAR_H, 5)
  }

  private drawStamina(ctx: GameContext) {
    if (ctx.tutorial.active) return
    const g = this.gHUD
    const y = this.BAR_Y + this.BAR_H + 4
    const pct = Math.max(0, ctx.player.stamina / CFG.player.maxStamina)
    const isExhausted = ctx.player.isExhausted

    g.fillStyle(0x0d0d1e, 1).fillRoundedRect(14, y, this.BAR_W, this.STAM_H, 3)
    if (pct > 0) {
      let col: number
      let alpha: number
      if (isExhausted) {
        col = 0xff2222
        alpha = 0.4 + Math.sin(ctx.totalTime * 0.012) * 0.4
      } else if (pct < 0.2) {
        col = 0xff6600
        alpha = 0.6 + Math.sin(ctx.totalTime * 0.008) * 0.3
      } else {
        col = 0xddaa22
        alpha = 1
      }
      g.fillStyle(col, alpha)
      g.fillRoundedRect(14, y, Math.round(this.BAR_W * pct), this.STAM_H, 3)
    }
    const borderCol = isExhausted ? 0xff2222 : 0x111122
    const borderAlpha = isExhausted ? 0.6 + Math.sin(ctx.totalTime * 0.012) * 0.3 : 0.7
    g.lineStyle(1, borderCol, borderAlpha).strokeRoundedRect(14, y, this.BAR_W, this.STAM_H, 3)
  }

  private drawClippyHP(ctx: GameContext) {
    const g = this.gHUD
    const pct = Math.max(0, ctx.clippy.hp / CFG.clippy.maxHP)
    const x = this.W - 14 - this.BAR_W
    const filledW = Math.round(this.BAR_W * pct)
    g.fillStyle(0x0d0d1e, 1).fillRoundedRect(x, this.BAR_Y, this.BAR_W, this.BAR_H, 5)
    if (pct > 0) {
      g.fillStyle(0xee3333, 1).fillRoundedRect(x + this.BAR_W - filledW, this.BAR_Y, filledW, this.BAR_H, 5)
    }
    g.lineStyle(2, 0x111122, 0.9).strokeRoundedRect(x, this.BAR_Y, this.BAR_W, this.BAR_H, 5)

    if (ctx.combatPhase === 2 && !ctx.tutorial.active) {
      const bw = Math.round(this.W * 0.12)
      const bh = 16
      const bx = this.W / 2 - bw / 2
      const by = this.BAR_Y + this.BAR_H + this.STAM_H + 8
      g.fillStyle(0xff2222, 0.25).fillRoundedRect(bx, by, bw, bh, 4)
      g.lineStyle(1, 0xff2222, 0.6).strokeRoundedRect(bx, by, bw, bh, 4)
    }
  }

  private drawStars(ctx: GameContext) {
    if (ctx.tutorial.active) return
    const g = this.gHUD
    for (let i = 0; i < 3; i++) {
      g.fillStyle(i < ctx.player.stars ? 0xffcc00 : 0x1a1a2e, 1)
      this.drawStarShape(g, this.W / 2 - 30 + i * 30, this.BAR_Y + this.BAR_H / 2, 12, 5.5)
    }
  }

  private drawBubble(_ctx: GameContext) {
    const g = this.gBubble
    const text = this.texts.bubble.text
    if (!text) return

    const tb = this.texts.bubble.getBounds()
    const pad = 12
    const bx = tb.x - pad, by = tb.y - pad
    const bw = tb.width + pad * 2, bh = tb.height + pad * 2

    g.fillStyle(0x0c0c1a, 0.92)
    g.fillRoundedRect(bx, by, bw, bh, 10)
    g.lineStyle(1.5, 0x445566, 0.55)
    g.strokeRoundedRect(bx, by, bw, bh, 10)

    const tipX = bx - 1
    const tipY = by + bh * 0.35
    g.fillStyle(0x0c0c1a, 0.92)
    g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(tipX - 14, tipY + 8); g.lineTo(tipX, tipY + 16)
    g.closePath(); g.fillPath()
    g.lineStyle(1.5, 0x445566, 0.55)
    g.beginPath(); g.moveTo(tipX, tipY); g.lineTo(tipX - 14, tipY + 8); g.lineTo(tipX, tipY + 16)
    g.strokePath()
  }

  private drawAttackIndicator(ctx: GameContext) {
    const g = this.gHUD
    const cs = ctx.clippy.state
    const show = (cs.action === 'telegraph' || cs.action === 'attack'
      || cs.action === 'feint_telegraph') && cs.attack !== null
    if (!show) {
      this.texts.atkLabel.setAlpha(0)
      return
    }

    this.texts.atkLabel.setAlpha(1)
    const boxSz = Math.round(this.W * 0.14)
    const bx = Math.round(this.W / 2 - boxSz / 2)
    const by = Math.round(this.H * 0.52)
    const cx = bx + boxSz / 2
    const cy = by + boxSz / 2
    const radius = boxSz / 2 - 4

    const windUp = this.getWindUpMs(cs.attack!.type, ctx)
    const pct = Math.min(1, cs.timer / windUp)
    const ready = pct >= 1

    g.fillStyle(0x080814, 0.88)
    g.fillCircle(cx, cy, boxSz / 2)

    if (pct > 0) {
      const fillCol = ready ? 0x44ff88 : cs.action === 'feint_telegraph' ? 0xff8800 : 0xff2222
      g.fillStyle(fillCol, ready ? 0.55 : 0.35)
      g.beginPath(); g.moveTo(cx, cy)
      g.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2, false)
      g.closePath(); g.fillPath()
    }

    const borderCol = ready ? 0x44ff88 : 0xff2222
    g.lineStyle(3, borderCol, 0.8)
    g.strokeCircle(cx, cy, boxSz / 2)

    const sz = Math.round(boxSz * 0.22)
    const side = cs.attack!.side
    const dir: DodgeDirection = side === 'left' ? 'right' : side === 'right' ? 'left' : 'down'
    g.fillStyle(ready ? 0x44ff88 : 0xffffff, ready ? 1 : 0.9)
    g.beginPath()
    if (dir === 'left') {
      g.moveTo(cx - sz, cy); g.lineTo(cx + sz * 0.5, cy - sz * 0.8); g.lineTo(cx + sz * 0.5, cy + sz * 0.8)
    } else if (dir === 'right') {
      g.moveTo(cx + sz, cy); g.lineTo(cx - sz * 0.5, cy - sz * 0.8); g.lineTo(cx - sz * 0.5, cy + sz * 0.8)
    } else {
      g.moveTo(cx, cy + sz); g.lineTo(cx - sz * 0.8, cy - sz * 0.5); g.lineTo(cx + sz * 0.8, cy - sz * 0.5)
    }
    g.closePath(); g.fillPath()
  }

  private drawKeyHints(ctx: GameContext) {
    const g = this.gKeys
    const keys = this.texts.keys
    const keyLabels = ['A/←', 'S/↓', 'D/→', 'J', 'K', '⎵']
    const kBoxW = Math.round(this.W * 0.08)
    const kBoxH = Math.round(this.H * 0.055)
    const kGap = Math.round(this.W * 0.012)
    const kTotalW = keyLabels.length * kBoxW + (keyLabels.length - 1) * kGap
    const kStartX = (this.W - kTotalW) / 2
    const kY = Math.round(this.H * 0.935)

    const activeIdx = this.getActiveKeyIdx(ctx)
    const activeCol = this.getActiveKeyColor(ctx)

    for (let i = 0; i < keyLabels.length; i++) {
      const bx = kStartX + i * (kBoxW + kGap)
      const isActive = activeIdx === i

      if (isActive) {
        g.fillStyle(activeCol, 0.30)
        g.fillRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
        g.lineStyle(2.5, activeCol, 0.90)
        g.strokeRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
        const hexCol = activeCol === 0xff2222 ? '#ff4444'
          : activeCol === 0x44ff88 ? '#44ff88' : '#ffcc44'
        keys[i]?.setColor(hexCol)
      } else {
        g.fillStyle(0x0a0a14, 0.75)
        g.fillRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
        g.lineStyle(1.5, 0x334466, 0.50)
        g.strokeRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
        keys[i]?.setColor('#555577')
      }
    }
  }

  private drawProjectileWarnings(ctx: GameContext) {
    const g = this.gHUD
    for (const proj of ctx.projectiles) {
      if (!proj.warned || !proj.active) continue
      const wx = proj.side === 'left' ? 30 : this.W - 30
      const wy = Math.round(this.H * 0.4)
      const col = proj.type === 'rose' ? 0x44ff88 : 0xff4400
      g.fillStyle(col, 0.6 + Math.sin(ctx.totalTime * 0.012) * 0.3)
      g.fillTriangle(wx, wy - 15, wx - 10, wy + 10, wx + 10, wy + 10)
    }
  }

  private getActiveKeyIdx(ctx: GameContext): number {
    const cs = ctx.clippy.state
    const ps = ctx.player.state

    if (cs.action === 'telegraph' || cs.action === 'attack' || cs.action === 'feint_telegraph') {
      if (cs.attack) {
        const side = cs.attack.side
        if (side === 'left') return 2
        if (side === 'right') return 0
        return 1
      }
    }

    if (cs.action === 'charge_freeze' || cs.action === 'charge_rush') return 1

    if (cs.action === 'stunned' && cs.stunHitsRemaining > 0) return 3

    if (ps.action === 'idle' && ctx.player.stars >= CFG.player.starPunch.starsRequired) return 3

    return -1
  }

  private getActiveKeyColor(ctx: GameContext): number {
    const cs = ctx.clippy.state
    if (cs.action === 'stunned' && cs.stunHitsRemaining > 0) return 0x44ff88
    if (cs.action === 'telegraph' || cs.action === 'attack') return 0xff2222
    if (cs.action === 'charge_freeze' || cs.action === 'charge_rush') return 0xff2222
    if (ctx.player.stars >= CFG.player.starPunch.starsRequired) return 0xffcc00
    return 0xff2222
  }

  private getWindUpMs(type: string, ctx: GameContext): number {
    const p = ctx.combatPhase
    if (type === 'jab') return p === 1 ? CFG.windUp.jabP1 : CFG.windUp.jabP2
    if (type === 'hook') return p === 1 ? CFG.windUp.hookP1 : CFG.windUp.hookP2
    return 300
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
}
