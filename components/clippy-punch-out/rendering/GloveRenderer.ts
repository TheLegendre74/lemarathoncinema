import type Phaser from 'phaser'
import type { GameContext, ClippyAttackType } from '../types'

interface GloveSprites {
  cGuardL: Phaser.GameObjects.Image
  cGuardR: Phaser.GameObjects.Image
  cPunchL: Phaser.GameObjects.Image
  cPunchR: Phaser.GameObjects.Image
  pGuard: Phaser.GameObjects.Image
  pLeft: Phaser.GameObjects.Image
  pRight: Phaser.GameObjects.Image
}

interface GloveMetrics {
  gloveBaseY: number
  guardOffX: number
  gloveBaseScX: number
  gloveBaseScY: number
  punchBaseScX: number
  punchBaseScY: number
}

export class GloveRenderer {
  private sprites!: GloveSprites
  private metrics!: GloveMetrics
  private bounceT = 0
  private showoffT = 0
  private isShowoff = false

  constructor(
    private scene: Phaser.Scene,
    private W: number,
    private H: number,
    private CX: number,
    private CY: number,
  ) {}

  init(sprites: GloveSprites, metrics: GloveMetrics) {
    this.sprites = sprites
    this.metrics = metrics
  }

  update(ctx: GameContext, dt: number) {
    if (ctx.clippy.state.action === 'idle') {
      this.bounceT += dt * 3.5
    }
    if (this.isShowoff) this.showoffT += dt
  }

  resetGloves() {
    const s = this.sprites
    const m = this.metrics
    this.scene.tweens.killTweensOf(s.cGuardL)
    this.scene.tweens.killTweensOf(s.cGuardR)
    this.scene.tweens.killTweensOf(s.cPunchL)
    this.scene.tweens.killTweensOf(s.cPunchR)
    s.cPunchL.setVisible(false)
    s.cPunchR.setVisible(false)
    s.cGuardL.setVisible(true)
      .setPosition(this.CX + m.guardOffX, m.gloveBaseY)
      .setAngle(0).setScale(m.gloveBaseScX, m.gloveBaseScY).setAlpha(1)
    s.cGuardR.setVisible(true)
      .setPosition(this.CX - m.guardOffX, m.gloveBaseY)
      .setAngle(0).setScale(m.gloveBaseScX, m.gloveBaseScY).setAlpha(1)
  }

  animateTelegraph(ctx: GameContext, attackType: ClippyAttackType, durationMs: number) {
    const s = this.sprites
    const m = this.metrics
    const atk = ctx.clippy.state.attack
    if (!atk) return

    this.resetGloves()
    const side = atk.side

    const telGlove = side === 'left' ? s.cGuardL
      : side === 'right' ? s.cGuardR
      : s.cGuardL

    this.scene.tweens.killTweensOf(telGlove)

    if (attackType === 'charge') {
      // Big wind-up for charge
      this.scene.tweens.add({
        targets: telGlove,
        scaleX: m.gloveBaseScX * 1.3,
        scaleY: m.gloveBaseScY * 1.3,
        y: m.gloveBaseY - Math.round(this.H * 0.06),
        angle: side === 'left' ? -30 : side === 'right' ? 30 : 0,
        duration: Math.round(durationMs * 0.85),
        ease: 'Sine.easeInOut',
      })
    } else if (attackType === 'hook') {
      // Arm pulls back
      const pullX = side === 'left' ? Math.round(this.W * 0.06) : -Math.round(this.W * 0.06)
      this.scene.tweens.add({
        targets: telGlove,
        x: telGlove.x + pullX,
        angle: side === 'left' ? -20 : side === 'right' ? 20 : 0,
        y: m.gloveBaseY - 5,
        duration: Math.round(durationMs * 0.85),
        ease: 'Sine.easeInOut',
      })
    } else {
      // Jab — subtle twitch
      this.scene.tweens.add({
        targets: telGlove,
        y: m.gloveBaseY - 3,
        scaleX: m.gloveBaseScX * 1.05,
        scaleY: m.gloveBaseScY * 1.05,
        duration: Math.round(durationMs * 0.85),
        ease: 'Sine.easeInOut',
      })
    }
  }

  animateAttack(ctx: GameContext) {
    const s = this.sprites
    const m = this.metrics
    const atk = ctx.clippy.state.attack
    if (!atk) return

    const isLeft = atk.side === 'left'
    const isRight = atk.side === 'right'

    const atkGuard = isLeft ? s.cGuardL : isRight ? s.cGuardR : s.cGuardL
    const punchSprite = isLeft ? s.cPunchL : isRight ? s.cPunchR : s.cPunchL

    this.scene.tweens.killTweensOf(atkGuard)
    atkGuard.setVisible(false)
    punchSprite.setVisible(true)
      .setPosition(atkGuard.x, m.gloveBaseY)
      .setScale(m.punchBaseScX, m.punchBaseScY)
      .setAngle(0)

    const lungeX = isLeft ? -Math.round(this.W * 0.05) : isRight ? Math.round(this.W * 0.05) : 0
    const lungeY = Math.round(this.H * 0.12)
    const lungeScale = atk.type === 'charge' ? 1.6 : atk.type === 'hook' ? 1.4 : 1.25
    const lungeAngle = isLeft ? -12 : isRight ? 12 : 0

    this.scene.tweens.killTweensOf(punchSprite)
    this.scene.tweens.add({
      targets: punchSprite,
      x: this.CX + lungeX,
      y: m.gloveBaseY + lungeY,
      scaleX: m.punchBaseScX * lungeScale,
      scaleY: m.punchBaseScY * lungeScale,
      angle: lungeAngle,
      duration: atk.type === 'charge' ? 100 : 120,
      ease: 'Power3',
    })
  }

  animateFeintCancel() {
    this.resetGloves()
  }

  punchGlove(hand: 'left' | 'right') {
    const s = this.sprites
    const isLeft = hand === 'left'
    const glove = isLeft ? s.pLeft : s.pRight
    s.pGuard.setVisible(false)
    glove.setVisible(true).setFlipX(false)
    const gx = isLeft ? Math.round(this.W * 0.10) : Math.round(this.W * 0.90)
    const gy = Math.round(this.H * 0.82)
    const tx = isLeft ? Math.round(this.W * 0.38) : Math.round(this.W * 0.62)
    const ty = Math.round(this.H * 0.56)
    glove.setPosition(gx, gy)
    this.scene.tweens.killTweensOf(glove)
    this.scene.tweens.add({
      targets: glove, x: tx, y: ty, duration: 130, ease: 'Power2',
      onComplete: () => this.scene.tweens.add({
        targets: glove, x: gx, y: gy, duration: 300, ease: 'Power2',
        onComplete: () => { glove.setVisible(false); s.pGuard.setVisible(true) },
      }),
    })
  }

  animateStarPunch() {
    const s = this.sprites
    const m = this.metrics
    // Clippy gloves fly up
    this.scene.tweens.killTweensOf(s.cGuardL)
    this.scene.tweens.killTweensOf(s.cGuardR)
    s.cPunchL.setVisible(false)
    s.cPunchR.setVisible(false)
    s.cGuardL.setVisible(true)
    s.cGuardR.setVisible(true)

    this.scene.tweens.add({
      targets: s.cGuardL,
      y: m.gloveBaseY - Math.round(this.H * 0.14),
      scaleX: m.gloveBaseScX * 0.7, scaleY: m.gloveBaseScY * 0.7,
      angle: -25, duration: 300, ease: 'Power2',
    })
    this.scene.tweens.add({
      targets: s.cGuardR,
      y: m.gloveBaseY - Math.round(this.H * 0.14),
      scaleX: m.gloveBaseScX * 0.7, scaleY: m.gloveBaseScY * 0.7,
      angle: 25, duration: 300, ease: 'Power2',
    })

    // Player double uppercut
    const upperY = Math.round(this.H * 0.24)
    const guardY = Math.round(this.H * 0.82)
    s.pGuard.setVisible(false)
    const punches = [
      { g: s.pLeft, sx: Math.round(this.W * 0.10), px: Math.round(this.W * 0.38) },
      { g: s.pRight, sx: Math.round(this.W * 0.90), px: Math.round(this.W * 0.62) },
    ]
    punches.forEach(({ g, sx, px }) => {
      g.setVisible(true).setFlipX(false).setPosition(sx, guardY)
      this.scene.tweens.killTweensOf(g)
      this.scene.tweens.add({
        targets: g, x: px, y: upperY, duration: 180, ease: 'Power2',
        onComplete: () => this.scene.tweens.add({
          targets: g, x: sx, y: guardY, duration: 500, ease: 'Power2',
          onComplete: () => { g.setVisible(false); s.pGuard.setVisible(true) },
        }),
      })
    })
  }

  animateCounterHit() {
    const s = this.sprites
    this.scene.tweens.killTweensOf(s.cGuardL)
    this.scene.tweens.killTweensOf(s.cGuardR)
    this.scene.tweens.add({
      targets: [s.cGuardL, s.cGuardR],
      angle: { from: -15, to: 15 },
      duration: 120, yoyo: true, repeat: 2, ease: 'Sine.easeInOut',
      onComplete: () => { s.cGuardL.setAngle(0); s.cGuardR.setAngle(0) },
    })
  }

  updateClippyPosition(ctx: GameContext, shakeX: number): { cx: number; cy: number } {
    const showBounce = this.isShowoff ? Math.sin(this.showoffT * 8) * 14 : 0
    const bounceOff = ctx.clippy.state.action === 'idle'
      ? Math.sin(this.bounceT) * 9 : showBounce

    return {
      cx: this.CX + shakeX,
      cy: this.CY + bounceOff,
    }
  }

  setShowoff(on: boolean) {
    this.isShowoff = on
    if (on) this.showoffT = 0
  }

  animateDefeat() {
    const s = this.sprites
    const m = this.metrics
    s.cGuardL.setAngle(25).setAlpha(0.5)
    s.cGuardL.y = m.gloveBaseY + 20
    s.cGuardR.setAngle(-25).setAlpha(0.5)
    s.cGuardR.y = m.gloveBaseY + 20
  }

  getGuardGloves() { return this.sprites }
}
