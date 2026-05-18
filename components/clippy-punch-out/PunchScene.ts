import Phaser from 'phaser'
import { CFG } from './config'
import { REQUIRED_DODGE, DODGE_KEY_IDX } from './types'
import type { GameContext, DodgeDirection, CombatEvent } from './types'
import { pickTaunt } from './data/taunts'

import { StaminaSystem } from './systems/StaminaSystem'
import { HypeSystem } from './systems/HypeSystem'
import { FrenzySystem } from './systems/FrenzySystem'
import { ClippyAI } from './systems/ClippyAI'
import { DodgeCounterSystem } from './systems/DodgeCounterSystem'
import { CombatSystem } from './systems/CombatSystem'
import { ProjectileSystem } from './systems/ProjectileSystem'
import { TutorialSystem } from './systems/TutorialSystem'
import { MobileInputSystem } from './systems/MobileInputSystem'

import { EffectsRenderer } from './rendering/EffectsRenderer'
import { GloveRenderer } from './rendering/GloveRenderer'
import { HUDRenderer } from './rendering/HUDRenderer'

const FONT = 'Impact, "Arial Black", "Bebas Neue", sans-serif'
const P_GLOVE_DEFAULT = 'pGloveDefault'
const P_GLOVE_LEFT = 'pGloveLeft'
const P_GLOVE_RIGHT = 'pGloveRight'

export interface PunchSceneConfig {
  onWin: () => void
  onLose: () => void
  initialHP?: number
  initialPlayerHP?: number
  skipTutorial?: boolean
}

export class PunchScene extends Phaser.Scene {
  private cfg!: PunchSceneConfig
  private ctx!: GameContext

  // Systems
  private staminaSys!: StaminaSystem
  private hypeSys!: HypeSystem
  private frenzySys!: FrenzySystem
  private clippyAI!: ClippyAI
  private dodgeSys!: DodgeCounterSystem
  private combatSys!: CombatSystem
  private projectileSys!: ProjectileSystem
  private tutorialSys!: TutorialSystem
  private mobileSys!: MobileInputSystem

  // Renderers
  private effectsR!: EffectsRenderer
  private gloveR!: GloveRenderer
  private hudR!: HUDRenderer

  // Dimensions
  private W = 800; private H = 520
  private CX = 400; private CY = 195

  // Phaser objects
  private sprClipy!: Phaser.GameObjects.Image
  private gHUD!: Phaser.GameObjects.Graphics
  private gFlash!: Phaser.GameObjects.Graphics
  private gBubble!: Phaser.GameObjects.Graphics
  private gKeys!: Phaser.GameObjects.Graphics
  private gSpots!: Phaser.GameObjects.Graphics
  private gProj!: Phaser.GameObjects.Graphics
  private gStun!: Phaser.GameObjects.Graphics

  private tBubble!: Phaser.GameObjects.Text
  private tNow!: Phaser.GameObjects.Text
  private tDmg!: Phaser.GameObjects.Text
  private tTut!: Phaser.GameObjects.Text
  private tTutInstr!: Phaser.GameObjects.Text
  private tAtkLabel!: Phaser.GameObjects.Text
  private tPHPL!: Phaser.GameObjects.Text
  private tCHPL!: Phaser.GameObjects.Text
  private tRound!: Phaser.GameObjects.Text
  private tK: Phaser.GameObjects.Text[] = []

  private kLeft!: Phaser.Input.Keyboard.Key
  private kRight!: Phaser.Input.Keyboard.Key
  private kDown!: Phaser.Input.Keyboard.Key
  private kSpace!: Phaser.Input.Keyboard.Key

  // Mouse controls
  private prevMouseX = 0
  private prevMouseY = 0
  private mouseDodgeCooldown = 0
  private mouseLeftClicked = false
  private mouseRightClicked = false

  // Volume
  private volume = 0.5
  private bgMusic: HTMLAudioElement | null = null

  private eyePulse = 0
  private introTimer = 0
  private prevClippyAction = 'idle'
  private prevBlinkFired = false
  private clippyScreenPos = { x: 0, y: 0 }

  constructor() { super({ key: 'Punch' }) }

  init(data: PunchSceneConfig) { this.cfg = data }

  // ── PRELOAD ──────────────────────────────────────────────────────────

  preload() {
    this.load.image('arena', '/arene-clippy-03.png')
    this.load.image('evilClipy', '/evil-clippy.png')
    this.load.image('cGloveGuardL', '/clippy-gant-garde-l.png')
    this.load.image('cGloveGuardR', '/clippy-gant-garde-r.png')
    this.load.image('cGlovePunchL', '/clippy-gant-punch-l.png')
    this.load.image('cGlovePunchR', '/clippy-gant-punch-r.png')
    this.load.audio('snd_hit', '/clippy-coup.mp3')
    this.load.audio('snd_miss', '/clippy-hit.mp3')
    this.load.audio('snd_parry', '/clippy-parry.mp3')
    this.load.audio('snd_swoosh', '/clippy-swoosh.wav')
    this.load.image(P_GLOVE_DEFAULT, '/gant-joueur.png')
    this.load.image(P_GLOVE_LEFT, '/gant-joueur-gauche.png')
    this.load.image(P_GLOVE_RIGHT, '/gant-joueur-droit.png')

    // Placeholder sounds — will be replaced with real assets later
    this.load.audio('snd_guard_block', '/sfx/guard-block.mp3')
    this.load.audio('snd_counter', '/sfx/counter.mp3')
    this.load.audio('snd_star_earned', '/sfx/star-earned.mp3')
    this.load.audio('snd_stun', '/sfx/stun.mp3')
    this.load.audio('snd_stamina_low', '/sfx/stamina-low.mp3')
  }

  // ── CREATE ───────────────────────────────────────────────────────────

  create() {
    this.W = this.scale.width
    this.H = this.scale.height
    this.CX = this.W / 2
    this.CY = Math.round(this.H * 0.375)
    const W = this.W, H = this.H

    // Context
    this.ctx = this.createContext()

    // Background
    this.add.image(W / 2, H / 2, 'arena').setDisplaySize(W, H)
    this.add.graphics().fillStyle(0x040412, 0.38).fillRect(0, 0, W, H)

    // Graphics layers
    this.gSpots = this.add.graphics().setDepth(1).setAlpha(0.35)
    this.gStun = this.add.graphics().setDepth(5)
    this.gProj = this.add.graphics().setDepth(6)
    this.gBubble = this.add.graphics().setDepth(8)
    this.gHUD = this.add.graphics().setDepth(8)
    this.gKeys = this.add.graphics().setDepth(9)
    this.gFlash = this.add.graphics().setDepth(10)

    // Clippy sprite
    const sc = Math.min(W / 800, H / 520)
    const clipW = Math.round(160 * sc)
    const clipH = Math.round(216 * sc)
    this.sprClipy = this.add.image(this.CX, this.CY, 'evilClipy')
      .setDisplaySize(clipW, clipH).setDepth(3)

    // Clippy gloves
    const guardLImg = this.textures.get('cGloveGuardL').getSourceImage() as HTMLImageElement
    const guardLAR = (guardLImg.naturalHeight || 420) / (guardLImg.naturalWidth || 400)
    const cGloveW = Math.round(clipW * 0.82)
    const cGloveH = Math.round(cGloveW * guardLAR)
    const gloveBaseY = this.CY + Math.round(clipH * 0.42)
    const guardOffX = Math.round(clipW * 0.38)

    const cGL = this.add.image(this.CX + guardOffX, gloveBaseY, 'cGloveGuardL')
      .setDisplaySize(cGloveW, cGloveH).setDepth(4)
    const cGR = this.add.image(this.CX - guardOffX, gloveBaseY, 'cGloveGuardR')
      .setDisplaySize(cGloveW, cGloveH).setDepth(4)

    const punchLImg = this.textures.get('cGlovePunchL').getSourceImage() as HTMLImageElement
    const punchLAR = (punchLImg.naturalHeight || 400) / (punchLImg.naturalWidth || 400)
    const cPunchW = Math.round(clipW * 0.88)
    const cPunchH = Math.round(cPunchW * punchLAR)
    const cPL = this.add.image(this.CX + guardOffX, gloveBaseY, 'cGlovePunchL')
      .setDisplaySize(cPunchW, cPunchH).setDepth(4).setVisible(false)
    const cPR = this.add.image(this.CX - guardOffX, gloveBaseY, 'cGlovePunchR')
      .setDisplaySize(cPunchW, cPunchH).setDepth(4).setVisible(false)

    // Player gloves
    const pGuardSrc = this.textures.get(P_GLOVE_DEFAULT).getSourceImage() as HTMLImageElement
    const pGuardRatio = pGuardSrc.naturalHeight && pGuardSrc.naturalWidth
      ? pGuardSrc.naturalHeight / pGuardSrc.naturalWidth : 0.38
    const pGuardH = Math.round(W * pGuardRatio * 0.527)
    const pGuardY = Math.round(H - pGuardH * 0.38)
    const pGuard = this.add.image(W / 2, pGuardY, P_GLOVE_DEFAULT)
      .setDisplaySize(W, pGuardH).setDepth(7)

    const gW2 = Math.round(W * 0.28)
    const gH2 = Math.round(gW2 * 1.15)
    const gY = Math.round(H * 0.82)
    const pLeft = this.add.image(Math.round(W * 0.10), gY, P_GLOVE_LEFT)
      .setDisplaySize(gW2, gH2).setDepth(7).setVisible(false)
    const pRight = this.add.image(Math.round(W * 0.90), gY, P_GLOVE_RIGHT)
      .setDisplaySize(gW2, gH2).setDepth(7).setVisible(false)

    // Texts
    const tf = { fontFamily: FONT, stroke: '#000', strokeThickness: 5 }
    const tfB = { ...tf, strokeThickness: 8 }

    this.tBubble = this.add.text(Math.round(W * 0.64), Math.round(H * 0.12), '', {
      ...tf, fontSize: '22px', color: '#ffffff', align: 'left',
      wordWrap: { width: Math.round(W * 0.30) },
    }).setOrigin(0, 0).setDepth(9)

    this.tNow = this.add.text(W / 2, Math.round(H * 0.44), '', {
      ...tfB, fontSize: '84px', color: '#ff2200', align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(11).setAlpha(0)

    this.tPHPL = this.add.text(16, 10, 'VOUS', {
      ...tf, fontSize: '23px', color: '#66dd88', fontStyle: 'bold',
    }).setDepth(9)

    this.tCHPL = this.add.text(W - 16, 10, 'CLIPPY', {
      ...tf, fontSize: '23px', color: '#dd6666', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(9)

    this.tRound = this.add.text(W / 2, 8, '', {
      ...tfB, fontSize: '24px', color: '#ffcc44', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(9)

    this.tDmg = this.add.text(0, 0, '', {
      ...tfB, fontSize: '38px', color: '#ff3333', fontStyle: 'bold',
    }).setDepth(12).setAlpha(0)

    this.tTut = this.add.text(W / 2, 54, '', {
      ...tfB, fontSize: '36px', color: '#88ccff', align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(9)

    this.tTutInstr = this.add.text(W / 2, 96, '', {
      ...tf, fontSize: '31px', color: '#ffcc88', align: 'center',
      wordWrap: { width: Math.round(W * 0.70) },
    }).setOrigin(0.5, 0).setDepth(9)

    this.tAtkLabel = this.add.text(Math.round(W / 2), Math.round(H * 0.50), 'ESQUIVE', {
      ...tf, fontSize: '19px', color: '#888899', align: 'center', strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(9).setAlpha(0)

    // Key indicators (desktop: mouse + keyboard)
    const keyLabels = ['← souris', '↓', 'souris →', 'clic D', 'clic G', '⎵']
    const kBoxW = Math.round(W * 0.09)
    const kBoxH = Math.round(H * 0.055)
    const kGap = Math.round(W * 0.010)
    const kTotalW = keyLabels.length * kBoxW + (keyLabels.length - 1) * kGap
    const kStartX = (W - kTotalW) / 2
    const kY2 = Math.round(H * 0.935)
    this.tK = keyLabels.map((lbl, i) => {
      const bx = kStartX + i * (kBoxW + kGap) + kBoxW / 2
      return this.add.text(bx, kY2, lbl, {
        fontFamily: FONT, fontSize: `${Math.round(H * 0.036)}px`,
        color: '#555577', align: 'center', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5, 0.5).setDepth(10)
    })

    // Keyboard
    const kb = this.input.keyboard!
    this.kLeft = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.kRight = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.kDown = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.kSpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // Mouse
    this.input.mouse?.disableContextMenu()
    this.prevMouseX = this.input.activePointer.x
    this.prevMouseY = this.input.activePointer.y

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) this.mouseLeftClicked = true
      if (pointer.rightButtonDown()) this.mouseRightClicked = true
    })

    // Volume
    try { this.volume = parseFloat(localStorage.getItem('clippy_volume') ?? '0.5') || 0.5 } catch {}
    this.applyVolume()
    this.input.on('wheel', (_p: any, _gx: any, _gy: any, _gz: any, dy: number) => {
      this.volume = Math.max(0, Math.min(1, this.volume - dy * 0.001))
      this.applyVolume()
      try { localStorage.setItem('clippy_volume', this.volume.toFixed(2)) } catch {}
    })

    // Init systems
    this.staminaSys = new StaminaSystem()
    this.hypeSys = new HypeSystem()
    this.frenzySys = new FrenzySystem()
    this.clippyAI = new ClippyAI()
    this.dodgeSys = new DodgeCounterSystem()
    this.combatSys = new CombatSystem(this.staminaSys, this.hypeSys, this.clippyAI, this.dodgeSys)
    this.projectileSys = new ProjectileSystem()
    this.tutorialSys = new TutorialSystem()
    this.mobileSys = new MobileInputSystem()
    this.mobileSys.init(W, H)

    // Touch input for mobile
    if (this.mobileSys.isMobile) {
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
        this.mobileSys.handlePointerDown(p.x, p.y, p.pointerId)
      })
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        this.mobileSys.handlePointerMove(p.x, p.y, p.pointerId)
      })
      this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
        this.mobileSys.handlePointerUp(p.x, p.y, p.pointerId)
      })
    }

    // Init renderers
    this.effectsR = new EffectsRenderer(this, this.gFlash, this.gSpots, W, H)
    this.gloveR = new GloveRenderer(this, W, H, this.CX, this.CY)
    this.gloveR.init(
      { cGuardL: cGL, cGuardR: cGR, cPunchL: cPL, cPunchR: cPR, pGuard, pLeft, pRight },
      { gloveBaseY, guardOffX, gloveBaseScX: cGL.scaleX, gloveBaseScY: cGL.scaleY, punchBaseScX: cPL.scaleX, punchBaseScY: cPL.scaleY },
    )

    this.hudR = new HUDRenderer(this, this.gHUD, this.gBubble, this.gKeys, {
      playerHP: this.tPHPL, clippyHP: this.tCHPL, round: this.tRound,
      bubble: this.tBubble, now: this.tNow, damage: this.tDmg,
      tutTitle: this.tTut, tutInstr: this.tTutInstr, atkLabel: this.tAtkLabel,
      keys: this.tK,
    }, W, H)

    this.startIntro()
  }

  // ── UPDATE ───────────────────────────────────────────────────────────

  update(time: number, delta: number) {
    const ctx = this.ctx

    // Freeze frame
    if (ctx.effects.freezeMs > 0) {
      this.effectsR.update(ctx, delta / 1000)
      this.effectsR.draw(ctx)
      this.hudR.draw(ctx)
      return
    }

    const rawDt = delta / 1000
    const dt = rawDt * ctx.effects.slowMo
    ctx.dt = dt
    ctx.totalTime += delta

    // Eye pulse
    const cs = ctx.clippy.state
    if (cs.action === 'telegraph' || cs.action === 'attack' || cs.action === 'feint_telegraph') {
      this.eyePulse = 0.5 + 0.5 * Math.sin(time * 0.009)
    } else {
      this.eyePulse = Math.max(0, this.eyePulse - rawDt * 4)
    }

    // Phase: intro
    if (ctx.gamePhase === 'intro') {
      this.introTimer += delta
      this.updateClippyVisuals(ctx, time)
      this.effectsR.update(ctx, rawDt)
      this.effectsR.draw(ctx)
      this.gloveR.update(ctx, rawDt)
      this.hudR.draw(ctx)
      return
    }

    // Phase: win/lose
    if (ctx.gamePhase === 'win' || ctx.gamePhase === 'lose') {
      this.effectsR.update(ctx, rawDt)
      this.effectsR.draw(ctx)
      this.hudR.draw(ctx)
      this.updateClippyVisuals(ctx, time)
      return
    }

    // 1. Input
    this.handleInput(ctx)

    // 2. Systems
    if (ctx.tutorial.active) {
      this.tutorialSys.update(ctx, dt)
      this.updateTutorialUI(ctx)
    }
    this.staminaSys.update(ctx, dt)
    if (!ctx.tutorial.active) {
      this.clippyAI.update(ctx, dt)
    }

    // 3. Blink detection
    if (ctx.clippy.blinkFired && !this.prevBlinkFired) {
      this.effectsR.blink()
    }
    this.prevBlinkFired = ctx.clippy.blinkFired

    // 4. Stamina low warning
    if (this.staminaSys.consumeLowWarning()) {
      this.snd('snd_stamina_low')
    }

    // 5. Detect Clippy state transitions (visuals/sounds)
    this.detectClippyTransitions(ctx)

    // 6. Combat resolution
    this.combatSys.update(ctx, dt)

    // 7. Process combat events → visual/sound feedback
    this.processCombatEvents(ctx)

    // 8. Meta systems
    this.hypeSys.update(ctx, dt)
    this.frenzySys.update(ctx, dt)
    if (!ctx.tutorial.active) {
      this.projectileSys.update(ctx, dt)
    }

    // 9. Win/lose check
    if (ctx.clippy.hp <= 0 && ctx.gamePhase === 'combat') {
      this.doWin()
    } else if (ctx.player.hp <= 0 && ctx.gamePhase === 'combat') {
      this.doLose()
    }

    // Render
    this.gloveR.update(ctx, rawDt)
    this.updateClippyVisuals(ctx, time)
    this.drawStunStars(ctx, time)
    this.effectsR.update(ctx, rawDt)
    this.effectsR.draw(ctx)
    this.hudR.draw(ctx)
    this.drawVolumeIndicator()
    this.drawProjectiles(ctx)
    this.drawMobileButtons()
  }

  // ── COMBAT EVENTS ────────────────────────────────────────────────────

  private processCombatEvents(ctx: GameContext) {
    const hpRatio = ctx.clippy.hp / CFG.clippy.maxHP

    for (const ev of this.combatSys.events) {
      switch (ev.type) {
        case 'guard_block':
          this.snd('snd_guard_block')
          this.effectsR.popup('BLOQUÉ', '#ff6644')
          this.gloveR.animateGuardBlock()
          this.hudR.setBubble(pickTaunt('guard_block', hpRatio))
          break

        case 'hit':
          this.snd('snd_hit')
          if (ev.damage) {
            this.effectsR.popup(`-${ev.damage}`, '#ff4444')
            this.effectsR.shake(ctx, 8)
          }
          break

        case 'counter_punch':
          this.snd('snd_counter')
          this.effectsR.flash(ctx, 0xffee22, 0.6)
          this.effectsR.shake(ctx, 25)
          this.effectsR.freezeFrame(ctx, 120)
          this.effectsR.slowMo(ctx, 0.4, 400)
          this.effectsR.popup('CONTRE PARFAIT !', '#ffee22')
          this.gloveR.animateCounterHit()
          this.hudR.setBubble(pickTaunt('counter', hpRatio))
          break

        case 'taunt_hit':
          this.snd('snd_hit')
          this.effectsR.shake(ctx, 12)
          if (ev.damage) this.effectsR.popup(`-${ev.damage}`, '#ff8844')
          this.hudR.setBubble(pickTaunt('hit', hpRatio))
          break

        case 'stun_start':
          this.snd('snd_stun')
          this.gloveR.resetGloves()
          break

        case 'stun_hit':
          this.snd('snd_hit')
          if (ev.damage) this.effectsR.popup(`-${ev.damage}`, '#ffaa44')
          this.effectsR.shake(ctx, 6)
          break

        case 'star_earned':
          this.snd('snd_star_earned')
          this.effectsR.popup('★', '#ffd700')
          break

        case 'star_lost':
          this.effectsR.popup('★ perdue', '#ff4444')
          break
      }
    }
  }

  // ── INPUT ────────────────────────────────────────────────────────────

  private handleInput(ctx: GameContext) {
    if (ctx.gamePhase === 'win' || ctx.gamePhase === 'lose') return

    let jPr = this.mouseRightClicked
    let kPr = this.mouseLeftClicked
    this.mouseRightClicked = false
    this.mouseLeftClicked = false

    const JD = Phaser.Input.Keyboard.JustDown
    let lPr = JD(this.kLeft)
    let rPr = JD(this.kRight)
    let dPr = JD(this.kDown)
    let spaceDown = this.kSpace.isDown

    // Mouse dodge detection
    const mouseX = this.input.activePointer.x
    const mouseY = this.input.activePointer.y
    const mouseDx = mouseX - this.prevMouseX
    const mouseDy = mouseY - this.prevMouseY
    this.prevMouseX = mouseX
    this.prevMouseY = mouseY
    const now = performance.now()
    if (now >= this.mouseDodgeCooldown) {
      if (Math.abs(mouseDx) >= CFG.player.mouse.swipeThreshold) {
        if (mouseDx < 0) lPr = true
        else rPr = true
        this.mouseDodgeCooldown = now + CFG.player.mouse.dodgeCooldownMs
      } else if (mouseDy >= CFG.player.mouse.swipeThreshold) {
        dPr = true
        this.mouseDodgeCooldown = now + CFG.player.mouse.dodgeCooldownMs
      }
    }

    // Mobile input
    this.mobileSys.update(ctx.dt)
    const mobileActions = this.mobileSys.consumeActions()
    for (const action of mobileActions) {
      if (!action) continue
      switch (action.type) {
        case 'dodge':
          if (action.dir === 'left') lPr = true
          else if (action.dir === 'right') rPr = true
          else if (action.dir === 'down') dPr = true
          break
        case 'jab': jPr = true; break
        case 'heavy': kPr = true; break
        case 'guard_start': spaceDown = true; break
        case 'guard_end': spaceDown = false; break
      }
    }
    if (this.mobileSys.isGuardHeld()) spaceDown = true

    const ps = ctx.player.state

    // Tutorial
    if (ctx.tutorial.active) {
      this.handleTutorialInput(ctx, lPr, rPr, dPr, jPr, kPr, spaceDown)
      return
    }

    // Star punch (left click when 3 stars + idle)
    if (kPr && ps.action === 'idle' && ctx.player.stars >= CFG.player.starPunch.starsRequired) {
      if (this.dodgeSys.tryStarPunch(ctx)) {
        this.onStarPunch(ctx)
        return
      }
    }

    // Jab (right click)
    if (jPr && this.combatSys.tryJab(ctx)) {
      ctx.player.lastPunchHand = ctx.player.lastPunchHand === 'right' ? 'left' : 'right'
      this.gloveR.punchGlove(ctx.player.lastPunchHand)
      return
    }

    // Heavy (left click, no star punch)
    if (kPr && this.combatSys.tryHeavy(ctx)) {
      ctx.player.lastPunchHand = ctx.player.lastPunchHand === 'right' ? 'left' : 'right'
      this.gloveR.punchGlove(ctx.player.lastPunchHand)
      return
    }

    // Guard
    if (spaceDown) {
      this.combatSys.tryGuard(ctx)
    } else if (ps.action === 'guard') {
      this.combatSys.releaseGuard(ctx)
    }

    // Dodge
    if (lPr) this.tryDodge(ctx, 'left')
    if (rPr) this.tryDodge(ctx, 'right')
    if (dPr) this.tryDodge(ctx, 'down')
  }

  private tryDodge(ctx: GameContext, dir: DodgeDirection) {
    if (this.dodgeSys.tryDodge(ctx, dir, REQUIRED_DODGE)) {
      this.staminaSys.spend(ctx, CFG.player.dodge.staminaCost)
      this.snd('snd_parry')
      this.effectsR.flash(ctx, 0x44ff88, 0.25)
      this.gloveR.resetGloves()

      if (ctx.player.state.isPerfectDodge) {
        this.effectsR.popup('PARFAIT !', '#44ff88')
        this.effectsR.freezeFrame(ctx, 80)
        this.effectsR.shake(ctx, 10)
        this.hypeSys.onPerfectDodge(ctx)
        this.hudR.setBubble(pickTaunt('dodge', ctx.clippy.hp / CFG.clippy.maxHP))
      } else {
        this.effectsR.popup('ESQUIVÉ', '#88ccff')
        this.hudR.setBubble(pickTaunt('dodge', ctx.clippy.hp / CFG.clippy.maxHP))
      }
    }
  }

  // ── TUTORIAL INPUT ───────────────────────────────────────────────────

  private handleTutorialInput(
    ctx: GameContext,
    lPr: boolean, rPr: boolean, dPr: boolean,
    jPr: boolean, kPr: boolean, _spaceDown: boolean,
  ) {
    const step = this.tutorialSys.getCurrentStep(ctx)
    if (!step) return

    const cs = ctx.clippy.state

    // Attack step
    if (step.expect === 'jab' || step.expect === 'heavy') {
      if (jPr || kPr) {
        this.tutorialSys.onSuccess(ctx)
        this.effectsR.popup('BIEN !', '#44ff88')
        this.effectsR.flash(ctx, 0x44ff88, 0.3)
      }
      return
    }

    // Guard step
    if (step.expect === 'guard') {
      if (_spaceDown) {
        this.tutorialSys.onSuccess(ctx)
        this.effectsR.popup('GARDÉ !', '#44ff88')
        this.effectsR.flash(ctx, 0x4488ff, 0.3)
      }
      return
    }

    // Dodge+Punish step (two-part)
    if (step.expect === 'dodge_punish') {
      if (this.tutorialSys.isDodgePunishWaitingHit()) {
        if (jPr || kPr) {
          this.tutorialSys.onSuccess(ctx)
          this.effectsR.popup('COMBO !', '#ffee22')
          this.effectsR.flash(ctx, 0xffee22, 0.4)
        }
        return
      }

      if (cs.action !== 'telegraph' && cs.action !== 'attack') return

      let pressed: DodgeDirection | null = null
      if (lPr) pressed = 'left'
      else if (rPr) pressed = 'right'
      else if (dPr) pressed = 'down'
      if (!pressed) return

      if (cs.attack) {
        const correctDir = REQUIRED_DODGE[cs.attack.side]
        if (pressed === correctDir) {
          this.tutorialSys.onDodgePunishDodge(ctx)
          this.effectsR.popup('ESQUIVÉ !', '#44ff88')
          this.effectsR.flash(ctx, 0x44ff88, 0.3)
          this.gloveR.resetGloves()
        } else {
          this.tutorialSys.onFail(ctx)
        }
      }
      return
    }

    // Simple dodge steps
    if (cs.action !== 'telegraph' && cs.action !== 'attack') return

    const expectedDodge = step.expect === 'dodge_right' ? 'right'
      : step.expect === 'dodge_left' ? 'left'
      : step.expect === 'duck' ? 'down' : null

    if (!expectedDodge) return

    let pressed: DodgeDirection | null = null
    if (lPr) pressed = 'left'
    else if (rPr) pressed = 'right'
    else if (dPr) pressed = 'down'
    if (!pressed) return

    if (pressed === expectedDodge) {
      this.tutorialSys.onSuccess(ctx)
      this.effectsR.popup('ESQUIVÉ !', '#44ff88')
      this.effectsR.flash(ctx, 0x44ff88, 0.3)
      this.gloveR.resetGloves()
    } else {
      this.tutorialSys.onFail(ctx)
    }
  }

  // ── CLIPPY STATE TRANSITIONS ───────────────────────────────────────

  private detectClippyTransitions(ctx: GameContext) {
    const cs = ctx.clippy.state
    const prev = this.prevClippyAction

    // Telegraph started
    if ((cs.action === 'telegraph' || cs.action === 'feint_telegraph') && prev !== cs.action) {
      if (cs.attack) {
        const amp = this.clippyAI.getTellAmplitude(ctx)
        const startup = this.clippyAI.getStartup(cs.attack.type, ctx)
        this.gloveR.animateTelegraph(ctx, cs.attack.type, startup, amp)
        this.hudR.setBubble('')

        if (cs.action === 'feint_telegraph') {
          this.hudR.setRound('FEINTE ?', '#ff8800')
        } else {
          const label = cs.attack.type === 'charge' ? 'CHARGE !'
            : cs.attack.type === 'hook' ? 'CROCHET' : ''
          this.hudR.setRound(label, cs.attack.type === 'charge' ? '#ff2222' : '#ffcc44')
        }
      }
    }

    // Attack fired
    if (cs.action === 'attack' && prev !== 'attack') {
      this.gloveR.animateAttack(ctx)
      this.snd('snd_swoosh')
      this.hudR.flashNow('!')
    }

    // Feint cancelled
    if (cs.action === 'feint_cancel' && prev !== 'feint_cancel') {
      this.gloveR.animateFeintCancel()
      this.hudR.setBubble(pickTaunt('feint', ctx.clippy.hp / CFG.clippy.maxHP))
    }

    // Taunt started
    if (cs.action === 'taunt' && prev !== 'taunt') {
      this.gloveR.setShowoff(true)
      this.sprClipy.setFlipX(true)
      this.hudR.setBubble(pickTaunt('taunt', ctx.clippy.hp / CFG.clippy.maxHP))
    }

    // Taunt ended
    if (prev === 'taunt' && cs.action !== 'taunt') {
      this.gloveR.setShowoff(false)
      this.sprClipy.setFlipX(false)
    }

    // Stunned started
    if (cs.action === 'stunned' && prev !== 'stunned') {
      this.gloveR.resetGloves()
    }

    // Back to idle
    if (cs.action === 'idle' && prev !== 'idle') {
      this.hudR.setBubble(pickTaunt('idle', ctx.clippy.hp / CFG.clippy.maxHP))
    }

    this.prevClippyAction = cs.action
  }

  // ── STAR PUNCH ───────────────────────────────────────────────────────

  private onStarPunch(ctx: GameContext) {
    this.combatSys.applyStarPunch(ctx)
    this.effectsR.flash(ctx, 0xffffff, 0.75)
    this.effectsR.shake(ctx, 30)
    this.effectsR.freezeFrame(ctx, 200)
    this.effectsR.slowMo(ctx, 0.3, 600)
    this.effectsR.popup('★ UPPERCUT ÉTOILE ★', '#ffd700')
    this.snd('snd_hit')
    this.gloveR.animateStarPunch()
    this.hudR.setBubble(pickTaunt('counter', ctx.clippy.hp / CFG.clippy.maxHP))
  }

  // ── GAME FLOW ────────────────────────────────────────────────────────

  private startIntro() {
    this.ctx.gamePhase = 'intro'
    this.gloveR.resetGloves()
    this.introTimer = 0

    try {
      const a = new Audio('/clippy-contre-humain.mp3')
      a.loop = true; a.volume = this.volume * 0.7
      a.play().catch(() => {})
      this.bgMusic = a
    } catch {}

    if (this.cfg.skipTutorial) {
      this.ctx.tutorial.active = false
      this.hudR.setBubble('On remet ça, déchet ?')
      this.hudR.setRound('ROUND 1', '#ffcc44')
      this.hudR.flashNow('FIGHT !', '#ff2200')
      this.effectsR.flash(this.ctx, 0xff4400, 0.5)
      this.time.delayedCall(1800, () => this.startCombat())
      return
    }

    const lines = [
      'PHASE 3 — LE RING',
      'Clippy vous affronte en combat direct.',
      'Un entraînement va commencer.',
    ]
    let i = 0
    this.hudR.setBubble(lines[0])
    const next = () => {
      i++
      if (i < lines.length) {
        this.hudR.setBubble(lines[i])
        this.time.delayedCall(1800, next)
      } else {
        this.startTutorial()
      }
    }
    this.time.delayedCall(1800, next)
  }

  private startTutorial() {
    this.ctx.gamePhase = 'tutorial'
    this.ctx.tutorial.active = true
    this.ctx.tutorial.step = 0
    this.updateTutorialUI(this.ctx)
  }

  private startCombat() {
    this.ctx.gamePhase = 'combat'
    this.ctx.clippy.state.action = 'idle'
    this.ctx.clippy.state.timer = 0
    this.ctx.clippy.idleDuration = 0
    this.hudR.setBubble(pickTaunt('idle', this.ctx.clippy.hp / CFG.clippy.maxHP))
    this.hudR.setRound('ROUND 1', '#ffcc44')
  }

  private doWin() {
    this.ctx.gamePhase = 'win'
    this.effectsR.flash(this.ctx, 0x44ff88, 0.6)
    this.effectsR.popup('K.O. !!!', '#44ff88')
    this.hudR.setBubble('Non... impossible... un trombone... vaincu...')
    this.gloveR.animateDefeat()
    try { this.bgMusic?.pause() } catch {}
    this.time.delayedCall(2200, () => this.cfg.onWin())
  }

  private doLose() {
    this.ctx.gamePhase = 'lose'
    this.effectsR.flash(this.ctx, 0xff2222, 0.6)
    this.effectsR.popup('K.O.', '#ff2222')
    this.hudR.setBubble('Clippy vous recommande de vous relever.')
    try { this.bgMusic?.pause() } catch {}
    this.time.delayedCall(2200, () => this.cfg.onLose())
  }

  // ── TUTORIAL UI ──────────────────────────────────────────────────────

  private updateTutorialUI(ctx: GameContext) {
    if (!ctx.tutorial.active) {
      this.tTut.setText('')
      this.tTutInstr.setText('')

      if (ctx.gamePhase === 'tutorial') {
        this.effectsR.flash(ctx, 0x44ccff, 0.35)
        this.hudR.setBubble('Bravo ! Clippy se prépare...')
        this.gloveR.setShowoff(true)
        this.sprClipy.setFlipX(true)

        this.time.delayedCall(2800, () => {
          this.gloveR.setShowoff(false)
          this.sprClipy.setFlipX(false)
          this.hudR.flashNow('FIGHT !', '#44ff88')
          this.effectsR.flash(ctx, 0xffffff, 0.55)
          this.time.delayedCall(2000, () => this.startCombat())
        })
      }
      return
    }

    const title = this.tutorialSys.getTitle(ctx)
    const instr = this.tutorialSys.getInstruction(ctx)
    this.tTut.setText(title)
    this.tTutInstr.setText(instr)
    this.hudR.setRound(`ENTRAÎNEMENT  ${ctx.tutorial.step + 1} / ${this.tutorialSys.totalSteps}`, '#88ccff')
  }

  // ── CLIPPY VISUALS ───────────────────────────────────────────────────

  private updateClippyVisuals(ctx: GameContext, time: number) {
    const shakeX = this.effectsR.getShakeX(ctx)
    const pos = this.gloveR.updateClippyPosition(ctx, shakeX)
    let cx = pos.cx
    let cy = pos.cy
    let angle = 0

    const cs = ctx.clippy.state
    this.sprClipy.clearTint()

    // Body tell animations during telegraph
    if ((cs.action === 'telegraph' || cs.action === 'feint_telegraph') && cs.attack) {
      const amp = this.clippyAI.getTellAmplitude(ctx)
      const startup = this.clippyAI.getStartup(cs.attack.type, ctx)
      const progress = Math.min(1, cs.timer / startup)

      if (cs.attack.type === 'charge') {
        cy -= Math.round(35 * amp * progress)
        const v = Math.round(80 * amp * progress)
        this.sprClipy.setTint(Phaser.Display.Color.GetColor(255, Math.max(175, 255 - v), Math.max(175, 255 - v)))
      } else if (cs.attack.type === 'hook') {
        const dir = cs.attack.side === 'left' ? 1 : cs.attack.side === 'right' ? -1 : 0
        angle = dir * 5 * amp * progress
        const v = Math.round(40 * amp * progress)
        this.sprClipy.setTint(Phaser.Display.Color.GetColor(255, Math.max(215, 255 - v), Math.max(215, 255 - v)))
      } else {
        cy -= Math.round(12 * amp * Math.sin(progress * Math.PI))
      }
    }

    this.sprClipy.setPosition(cx, cy)
    this.clippyScreenPos.x = cx
    this.clippyScreenPos.y = cy

    if (ctx.gamePhase === 'win') {
      this.sprClipy.angle = 30
      this.sprClipy.setTint(0x888888)
    } else if (cs.action === 'stunned') {
      this.sprClipy.angle = Math.sin(time * 0.025) * 6
      this.sprClipy.setTint(0xffee88)
    } else if (cs.action === 'taunt') {
      this.sprClipy.angle = Math.sin(time * 0.01) * 3
    } else if (this.eyePulse > 0.1 && cs.action !== 'telegraph' && cs.action !== 'feint_telegraph') {
      const v = Math.round(this.eyePulse * 80)
      this.sprClipy.setTint(Phaser.Display.Color.GetColor(255, 255 - v, 255 - v))
      this.sprClipy.angle = angle
    } else {
      this.sprClipy.angle = angle
    }

    // Clippy glove tracking during idle
    const glovesTrack = cs.action === 'idle' || ctx.gamePhase === 'intro'
    if (glovesTrack) {
      const gloves = this.gloveR.getGuardGloves()
      const m = (this.gloveR as any).metrics
      if (m) {
        gloves.cGuardL.setPosition(cx + m.guardOffX, m.gloveBaseY + (cy - this.CY))
        gloves.cGuardR.setPosition(cx - m.guardOffX, m.gloveBaseY + (cy - this.CY))
      }
    }
  }

  // ── STUN STARS ───────────────────────────────────────────────────────

  private drawStunStars(ctx: GameContext, time: number) {
    this.gStun.clear()
    const cs = ctx.clippy.state
    if (cs.action === 'stunned' && cs.stunHitsRemaining > 0) {
      this.effectsR.drawStunStars(
        this.gStun,
        this.clippyScreenPos.x,
        this.clippyScreenPos.y,
        cs.stunHitsRemaining,
        time,
      )
    }
  }

  // ── PROJECTILE RENDERING ─────────────────────────────────────────────

  private drawProjectiles(ctx: GameContext) {
    this.gProj.clear()
    for (const proj of ctx.projectiles) {
      if (!proj.active) continue
      const px = proj.x + (proj.targetX - proj.x) * proj.progress
      const py = proj.y + (proj.targetY - proj.y) * proj.progress

      let color: number
      let size: number
      switch (proj.type) {
        case 'can': color = 0xaaaaaa; size = 10; break
        case 'mug': color = 0x885533; size = 12; break
        case 'keyboard': color = 0x444466; size = 18; break
        case 'mouse': color = 0x666666; size = 8; break
      }

      this.gProj.fillStyle(color, 0.9)
      this.gProj.fillRoundedRect(px - size / 2, py - size / 2, size, size * 0.7, 3)
      this.gProj.lineStyle(1.5, 0xffffff, 0.4)
      this.gProj.strokeRoundedRect(px - size / 2, py - size / 2, size, size * 0.7, 3)

      if (proj.progress >= 0.85 && proj.active) {
        if (this.projectileSys.checkHit(ctx, proj)) {
          this.effectsR.shake(ctx, 8)
          this.effectsR.flash(ctx, 0xff6600, 0.3)
          this.effectsR.popup(`-${proj.damage}`, '#ff6600')
          proj.active = false
        }
      }
    }
  }

  // ── MOBILE BUTTONS ────────────────────────────────────────────────────

  private mobileTexts: Phaser.GameObjects.Text[] = []

  private drawMobileButtons() {
    if (!this.mobileSys.isMobile) return
    this.mobileSys.drawButtons(this.gKeys)

    const btns = this.mobileSys.getButtons()
    if (this.mobileTexts.length === 0 && btns.length > 0) {
      for (const btn of btns) {
        const t = this.add.text(
          btn.x + btn.w / 2, btn.y + btn.h / 2, btn.label,
          { fontFamily: FONT, fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 3, align: 'center' },
        ).setOrigin(0.5, 0.5).setDepth(10)
        this.mobileTexts.push(t)
      }
    }

    for (let i = 0; i < btns.length; i++) {
      const btn = btns[i]
      const t = this.mobileTexts[i]
      if (t) t.setAlpha(btn.pressed ? 1 : 0.7)
    }
  }

  // ── VOLUME INDICATOR ──────────────────────────────────────────────────

  private drawVolumeIndicator() {
    const g = this.gHUD
    const x = this.W - 14
    const y = Math.round(this.H * 0.50)
    const barH = 60
    const barW = 6
    const filled = Math.round(barH * this.volume)
    const label = this.volume <= 0 ? '🔇' : this.volume < 0.35 ? '🔈' : this.volume < 0.7 ? '🔉' : '🔊'

    g.fillStyle(0x0d0d1e, 0.7)
    g.fillRoundedRect(x - barW, y, barW, barH, 3)
    if (filled > 0) {
      g.fillStyle(0x88aacc, 0.8)
      g.fillRoundedRect(x - barW, y + barH - filled, barW, filled, 3)
    }

    if (!this.tVol) {
      this.tVol = this.add.text(x - barW / 2, y - 14, label, {
        fontFamily: FONT, fontSize: '14px', color: '#88aacc',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 0.5).setDepth(9)
    }
    this.tVol.setText(label)
  }

  private tVol: Phaser.GameObjects.Text | null = null

  // ── HELPERS ──────────────────────────────────────────────────────────

  private snd(key: string) {
    try { this.sound.play(key, { volume: this.volume }) } catch {}
  }

  private applyVolume() {
    if (this.bgMusic) this.bgMusic.volume = this.volume * 0.7
  }

  private createContext(): GameContext {
    return {
      gamePhase: 'intro',
      combatPhase: 1,
      totalTime: 0,
      dt: 0,

      player: {
        hp: this.cfg.initialPlayerHP ?? CFG.player.maxHP,
        stamina: CFG.player.maxStamina,
        state: {
          action: 'idle', phase: null, timer: 0,
          dodgeDir: null, isPerfectDodge: false, cooldownRemaining: 0,
        },
        stars: 0,
        lastPunchHand: 'right',
        comboCount: 0,
        comboTimer: 0,
        guardDuration: 0,
        isExhausted: false,
      },

      clippy: {
        hp: this.cfg.initialHP ?? CFG.clippy.maxHP,
        state: {
          action: 'idle', attack: null, timer: 0,
          recoveryDuration: 0, comboRemaining: 0, realAttack: null,
          stunHitsRemaining: 0,
        },
        psyche: { confidence: 0, panic: 0, fatigue: 0 },
        missStreak: 0,
        idleDuration: 0,
        blinkFired: false,
        patternQueue: [],
        patternRepeats: 0,
        lastTauntTime: 0,
      },

      hype: { value: CFG.hype.initial, level: 'neutral' },
      frenzy: { state: 'inactive', highHypeTimer: 0 },
      effects: { shake: 0, flashColor: 0, flashAlpha: 0, freezeMs: 0, slowMo: 1, slowMoTimer: 0 },
      projectiles: [],
      tutorial: { active: !(this.cfg.skipTutorial ?? false), step: 0 },
    }
  }

  // ── CLEANUP ──────────────────────────────────────────────────────────

  shutdown() {
    try { this.bgMusic?.pause(); this.bgMusic = null } catch {}
    this.effectsR.cleanup()
    this.mobileSys.destroy()
  }
}
