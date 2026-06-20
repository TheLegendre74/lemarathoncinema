import Phaser from 'phaser'
import { CFG } from './config'
import { REQUIRED_DODGE } from './types'
import type { GameContext, DodgeDirection, CombatEvent } from './types'
import { pickTaunt } from './data/taunts'

import { StaminaSystem } from './systems/StaminaSystem'
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
  gyroGranted?: boolean
  mobileMode?: 'gyro' | 'pointer'
}

export class PunchScene extends Phaser.Scene {
  private cfg!: PunchSceneConfig
  private ctx!: GameContext

  // Systems
  private staminaSys!: StaminaSystem
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
  private sprArena!: Phaser.GameObjects.Image
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
  private virtualMouseX = 0
  private virtualMouseY = 0
  private mouseDodgeCooldown = 0
  private mouseLeftClicked = false
  private mouseRightClicked = false

  // Volume
  private volume = 0.5
  private bgMusic: HTMLAudioElement | null = null
  private stunSound: Phaser.Sound.BaseSound | null = null

  private leanGraceTimer = 0
  private leanGraceDir: DodgeDirection | null = null
  private staminaWarningShown = false
  private eyePulse = 0
  private introTimer = 0
  private prevClippyAction = 'idle'
  private clippyScreenPos = { x: 0, y: 0 }

  // Glitch tell state
  private yellowFlashActive = false
  private yellowFlashTimer = 0
  private yellowFlashCount = 0
  private warningFired = false
  private yellowBlinkFired = false
  private chargeFreezeBlinkTimer = 0

  // Phase transition
  private prevCombatPhase = 1
  private wasExhausted = false

  constructor() { super({ key: 'Punch' }) }

  init(data: PunchSceneConfig) { this.cfg = data }

  // ── PRELOAD ──────────────────────────────────────────────────────────

  preload() {
    this.load.image('arena', '/arene-clippy-03.webp')
    this.load.image('evilClipy', '/evil-clippy.webp')
    this.load.image('cGloveGuardL', '/clippy-gant-garde-l.png')
    this.load.image('cGloveGuardR', '/clippy-gant-garde-r.png')
    this.load.image('cGlovePunchL', '/clippy-gant-punch-l.png')
    this.load.image('cGlovePunchR', '/clippy-gant-punch-r.png')
    this.load.audio('snd_hit', '/clippy-coup.mp3')
    this.load.audio('snd_miss', '/clippy-hit.mp3')
    this.load.audio('snd_parry', '/clippy-parry.mp3')
    this.load.audio('snd_swoosh', '/clippy-swoosh.wav')
    this.load.image(P_GLOVE_DEFAULT, '/gant-joueur.webp')
    this.load.image(P_GLOVE_LEFT, '/gant-joueur-gauche.webp')
    this.load.image(P_GLOVE_RIGHT, '/gant-joueur-droit.webp')

    this.load.audio('snd_guard_block', '/sfx/Coup/guard-block.wav')
    this.load.audio('snd_counter', '/sfx/Coup/counter.wav')
    this.load.audio('snd_stun', '/sfx/stun.mp3')
    this.load.audio('snd_hit_left', '/sfx/Coup/coup reçu gauche.wav')
    this.load.audio('snd_hit_right', '/sfx/Coup/coup reçu droite.wav')
    this.load.audio('snd_star_earned', '/sfx/star earned.mp3')
    this.load.audio('snd_stamina_low', '/sfx/stamina low.mp3')
    this.load.audio('snd_dodge', '/sfx/esquive.wav')
    this.load.audio('snd_glitch_jab', '/sfx/Glitch Jab.wav')
    this.load.audio('snd_glitch_hook', '/sfx/glitch hook.mp3')
    this.load.audio('snd_glitch_charge', '/sfx/glitch charge.wav')
    this.load.audio('snd_charge_freeze', '/sfx/charge freeze.mp3')
    this.load.audio('snd_attack_warning', '/sfx/attack warning.mp3')
    this.load.audio('snd_yellow_flash', '/sfx/yellow flash.mp3')
    this.load.audio('snd_crowd_boo1', '/sfx/Public/crowd-boo.wav')
    this.load.audio('snd_crowd_boo2', '/sfx/Public/crowd-boo 2.wav')
    this.load.audio('snd_crowd_cheer1', '/sfx/Public/crowd-cheer.wav')
    this.load.audio('snd_crowd_cheer2', '/sfx/Public/crowd cheer 2.wav')
    this.load.audio('snd_crowd_cheer3', '/sfx/Public/crowd cheer 3.wav')
    this.load.audio('snd_crowd_whistle', '/sfx/Public/public siffle.wav')
    this.load.audio('snd_rose_catch', '/sfx/rose catch.mp3')
    this.load.audio('snd_phase_transition', '/sfx/phase-transition .wav')

    this.load.image('proj_canette', '/sprites/public/canette.webp')
    this.load.image('proj_clavier', '/sprites/public/clavier.webp')
    this.load.image('proj_popcorn', '/sprites/public/popcorn.webp')
    this.load.image('proj_rose', '/sprites/public/rose.webp')
  }

  // ── CREATE ───────────────────────────────────────────────────────────

  create() {
    this.W = this.scale.width
    this.H = this.scale.height
    this.CX = this.W / 2
    this.CY = Math.round(this.H * 0.375)
    const W = this.W, H = this.H

    this.ctx = this.createContext()

    this.sprArena = this.add.image(W / 2, H / 2, 'arena').setDisplaySize(W * 1.3, H * 1.1)
    this.add.graphics().fillStyle(0x040412, 0.38).fillRect(0, 0, W, H)

    this.gSpots = this.add.graphics().setDepth(1).setAlpha(0.35)
    this.gStun = this.add.graphics().setDepth(5)
    this.gProj = this.add.graphics().setDepth(6)
    this.gBubble = this.add.graphics().setDepth(8)
    this.gHUD = this.add.graphics().setDepth(8)
    this.gKeys = this.add.graphics().setDepth(9)
    this.gFlash = this.add.graphics().setDepth(10)

    const sc = Math.min(W / 800, H / 520)
    const clipW = Math.round(160 * sc)
    const clipH = Math.round(216 * sc)
    this.sprClipy = this.add.image(this.CX, this.CY, 'evilClipy')
      .setDisplaySize(clipW, clipH).setDepth(3)

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
      .setDisplaySize(cPunchW, cPunchH).setDepth(8).setVisible(false)
    const cPR = this.add.image(this.CX - guardOffX, gloveBaseY, 'cGlovePunchR')
      .setDisplaySize(cPunchW, cPunchH).setDepth(8).setVisible(false)

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

    this.tAtkLabel = this.add.text(0, 0, '', {
      ...tf, fontSize: '1px', color: '#000000',
    }).setDepth(0).setAlpha(0)

    this.tK = []

    const kb = this.input.keyboard!
    this.kLeft = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
    this.kRight = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
    this.kDown = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.kSpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    this.input.mouse?.disableContextMenu()
    this.prevMouseX = this.input.activePointer.x
    this.prevMouseY = this.input.activePointer.y
    this.virtualMouseX = W / 2
    this.virtualMouseY = H / 2

    if (!this.mobileSys.isMobile) this.game.canvas.style.cursor = 'none'

    if (!this.mobileSys.isMobile) {
      this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.leftButtonDown()) this.mouseLeftClicked = true
        if (pointer.rightButtonDown()) this.mouseRightClicked = true
      })
    }

    try { this.volume = parseFloat(localStorage.getItem('clippy_volume') ?? '0.5') || 0.5 } catch {}
    this.applyVolume()
    this.input.on('wheel', (_p: any, _gx: any, _gy: any, _gz: any, dy: number) => {
      this.volume = Math.max(0, Math.min(1, this.volume - dy * 0.001))
      this.applyVolume()
      try { localStorage.setItem('clippy_volume', this.volume.toFixed(2)) } catch {}
    })

    this.staminaSys = new StaminaSystem()
    this.clippyAI = new ClippyAI()
    this.dodgeSys = new DodgeCounterSystem()
    this.combatSys = new CombatSystem(this.staminaSys, this.clippyAI, this.dodgeSys)
    this.projectileSys = new ProjectileSystem()
    this.tutorialSys = new TutorialSystem()
    this.mobileSys = new MobileInputSystem()
    const mMode = this.cfg.mobileMode ?? 'pointer'
    this.mobileSys.init(W, H, this.cfg.gyroGranted ?? false, mMode)
    if (this.mobileSys.isMobile) {
      this.tutorialSys.setMode(mMode === 'gyro' ? 'gyro' : 'pointer')
      this.input.addPointer(2)
    }

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

    const cs = ctx.clippy.state
    if (cs.action === 'telegraph' || cs.action === 'attack' || cs.action === 'feint_telegraph') {
      this.eyePulse = 0.5 + 0.5 * Math.sin(time * 0.009)
    } else {
      this.eyePulse = Math.max(0, this.eyePulse - rawDt * 4)
    }

    if (ctx.gamePhase === 'intro') {
      this.introTimer += delta
      this.updateClippyVisuals(ctx, time)
      this.effectsR.update(ctx, rawDt)
      this.effectsR.draw(ctx)
      this.gloveR.update(ctx, rawDt)
      this.hudR.draw(ctx)
      return
    }

    if (ctx.gamePhase === 'win' || ctx.gamePhase === 'lose') {
      this.effectsR.update(ctx, rawDt)
      this.effectsR.draw(ctx)
      this.hudR.draw(ctx)
      this.updateClippyVisuals(ctx, time)
      return
    }

    this.handleInput(ctx)

    if (ctx.tutorial.active) {
      this.tutorialSys.update(ctx, dt)
      this.updateTutorialUI(ctx)
    }
    this.staminaSys.update(ctx, dt)
    if (ctx.player.isExhausted && !this.wasExhausted) {
      this.snd('snd_stamina_low')
    }
    this.wasExhausted = ctx.player.isExhausted
    if (!ctx.tutorial.active) {
      this.clippyAI.update(ctx, dt)
    }

    this.detectClippyTransitions(ctx)
    this.updateTellTiming(ctx, rawDt)

    this.combatSys.update(ctx, dt)
    this.processCombatEvents(ctx)

    if (ctx.clippy.state.action !== 'stunned' && this.stunSound) {
      this.stunSound.stop(); this.stunSound.destroy(); this.stunSound = null
    }

    if (!ctx.tutorial.active) {
      this.projectileSys.update(ctx, dt)
    }

    this.checkPhaseTransition(ctx)

    if (ctx.clippy.hp <= 0 && ctx.gamePhase === 'combat') {
      this.doWin()
    } else if (ctx.player.hp <= 0 && ctx.gamePhase === 'combat') {
      this.doLose()
    }

    this.gloveR.update(ctx, rawDt)
    const dodgeOff = this.gloveR.getDodgeOffset()
    this.sprArena.x = this.W / 2 + dodgeOff.x * 0.7
    this.updateClippyVisuals(ctx, time)
    this.drawStunStars(ctx, time)
    this.effectsR.update(ctx, rawDt)
    this.effectsR.draw(ctx)
    this.hudR.draw(ctx)
    this.drawDodgeArrow(ctx)
    this.drawVolumeIndicator()
    this.drawProjectiles(ctx)
    this.drawMobileButtons()
    this.drawCustomCursor()
  }

  // ── TELL TIMING (universal timing sequence) ─────────────────────────

  private updateTellTiming(ctx: GameContext, dt: number) {
    const cs = ctx.clippy.state

    if (cs.action === 'telegraph' && cs.attack) {
      const windUp = this.clippyAI.getWindUp(cs.attack.type, ctx)
      const blinkStart = Math.max(0, windUp - CFG.yellowBlink.startBeforeMs)

      if (!this.yellowBlinkFired && cs.timer >= blinkStart) {
        this.yellowBlinkFired = true
        this.startYellowFlash()
        this.snd('snd_yellow_flash')
        this.snd('snd_attack_warning')
      }
    }

    if (this.yellowFlashActive) {
      this.yellowFlashTimer += dt * 1000
      if (this.yellowFlashTimer >= 100) {
        this.yellowFlashTimer = 0
        this.yellowFlashCount++
        if (this.yellowFlashCount >= 10) {
          this.yellowFlashActive = false
          this.sprClipy.clearTint()
        } else {
          if (this.yellowFlashCount % 2 === 0) {
            this.sprClipy.setTint(0xFFFF00)
          } else {
            this.sprClipy.clearTint()
          }
        }
      }
    }

    if (cs.action !== 'telegraph') {
      this.yellowBlinkFired = false
    }

    if (cs.action === 'charge_freeze' && !this.yellowFlashActive) {
      this.chargeFreezeBlinkTimer += dt * 1000
      if (this.chargeFreezeBlinkTimer >= CFG.charge.blinkIntervalMs) {
        this.chargeFreezeBlinkTimer -= CFG.charge.blinkIntervalMs
        const tinted = (this.sprClipy.tintTopLeft & 0xFFFF00) === 0xFFFF00
        if (tinted) this.sprClipy.clearTint()
        else this.sprClipy.setTint(0xFFFF00)
      }
    }

    if (cs.action !== 'telegraph') {
      this.warningFired = false
    }
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
          break

        case 'stun_hit': {
          const hand = ctx.player.lastPunchHand
          this.snd(hand === 'left' ? 'snd_hit_left' : 'snd_hit_right')
          if (ev.damage) this.effectsR.popup(`-${ev.damage}`, '#ffaa44')
          this.effectsR.shake(ctx, 4)
          break
        }

        case 'star_earned':
          this.snd('snd_star_earned')
          this.effectsR.popup('★', '#ffd700')
          break

        case 'error':
          if (!ctx.tutorial.active) {
            const willBoo = (ctx.crowd.errorCount + 1) % CFG.crowd.errorThresholdProjectile === 0
            this.projectileSys.onError(ctx)
            if (willBoo) {
              this.sndRandom(['snd_crowd_boo1', 'snd_crowd_boo2'])
            }
          }
          break

        case 'success':
          if (!ctx.tutorial.active) {
            const willRose = ctx.crowd.successStreak + 1 >= CFG.crowd.successStreakRose
            this.projectileSys.onSuccess(ctx)
            if (willRose) {
              this.sndRandom(['snd_crowd_cheer1', 'snd_crowd_cheer2', 'snd_crowd_cheer3'])
            }
          }
          break

        case 'rose_catch':
          this.snd('snd_rose_catch')
          this.snd('snd_crowd_whistle')
          this.staminaSys.restoreRose(ctx)
          this.effectsR.popup('+STAMINA', '#44ff88')
          break

        case 'phase_transition':
          this.snd('snd_phase_transition')
          this.effectsR.shake(ctx, 12)
          this.effectsR.flash(ctx, 0xff2222, 0.5)
          this.hudR.setBubble(pickTaunt('rage', hpRatio))
          this.hudR.setRound('PHASE 2', '#ff2222')
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

    const touchX = Phaser.Math.Clamp(this.input.activePointer.x, 0, this.W)
    const touchY = Phaser.Math.Clamp(this.input.activePointer.y, 0, this.H)

    if ((jPr || kPr) && this.tryVolumeClick(
      this.mobileSys.isMobile ? touchX : this.virtualMouseX,
      this.mobileSys.isMobile ? touchY : this.virtualMouseY,
    )) {
      jPr = false; kPr = false
    }

    if ((jPr || kPr) && ctx.roseSquare.active) {
      const px = this.mobileSys.isMobile ? touchX : this.virtualMouseX
      const py = this.mobileSys.isMobile ? touchY : this.virtualMouseY
      if (this.projectileSys.tryClickRose(ctx, px, py)) {
        this.staminaSys.restoreRose(ctx)
        this.snd('snd_rose_catch')
        this.snd('snd_crowd_whistle')
        this.effectsR.popup('+STAMINA MAX', '#44ff88')
        this.effectsR.flash(ctx, 0x44ff88, 0.3)
        jPr = false; kPr = false
      }
    }

    let spaceDown = this.kSpace.isDown

    this.mobileSys.update(ctx.dt)
    const mobileActions = this.mobileSys.consumeActions()
    for (const action of mobileActions) {
      if (!action) continue
      switch (action.type) {
        case 'jab': jPr = true; break
        case 'heavy': kPr = true; break
        case 'guard_start': spaceDown = true; break
        case 'guard_end': spaceDown = false; break
      }
    }
    if (this.mobileSys.isGuardHeld()) spaceDown = true

    let leanDir: DodgeDirection | null = null

    if (this.mobileSys.isMobile) {
      leanDir = this.mobileSys.getLeanDir()

      if (leanDir !== null) {
        this.leanGraceDir = leanDir
        this.leanGraceTimer = 0
      } else if (this.leanGraceDir !== null) {
        this.leanGraceTimer += ctx.dt * 1000
        if (this.leanGraceTimer < CFG.player.lean.graceMs) {
          leanDir = this.leanGraceDir
        } else {
          this.leanGraceDir = null
        }
      }
    } else {
      this.virtualMouseX = Phaser.Math.Clamp(this.input.activePointer.x, 0, this.W)
      this.virtualMouseY = Phaser.Math.Clamp(this.input.activePointer.y, 0, this.H)
      const mouseX = this.virtualMouseX
      const mouseY = this.virtualMouseY
      this.prevMouseX = mouseX
      this.prevMouseY = mouseY
      const th = CFG.player.lean.zoneThreshold
      const relX = (mouseX - this.W / 2) / (this.W / 2)
      const relY = (mouseY - this.H / 2) / (this.H / 2)

      if (Math.abs(relX) > Math.abs(relY) && Math.abs(relX) > th) {
        leanDir = relX < 0 ? 'left' : 'right'
      } else if (relY > th) {
        leanDir = 'down'
      }

      if (leanDir !== null) {
        this.leanGraceDir = leanDir
        this.leanGraceTimer = 0
      } else if (this.leanGraceDir !== null) {
        this.leanGraceTimer += ctx.dt * 1000
        if (this.leanGraceTimer < CFG.player.lean.graceMs) {
          leanDir = this.leanGraceDir
        } else {
          this.leanGraceDir = null
        }
      }
    }

    ctx.player.state.dodgeDir = leanDir

    if (leanDir !== null && ctx.player.stamina > 0 && !ctx.tutorial.active) {
      ctx.player.leanTime += ctx.dt
      const drainRate = CFG.player.lean.baseDrainPerSec * (1 + ctx.player.leanTime)
      ctx.player.stamina = Math.max(0, ctx.player.stamina - drainRate * ctx.dt)
      if (ctx.player.leanTime >= 1.5 && !this.staminaWarningShown) {
        this.staminaWarningShown = true
        this.effectsR.popup('/!\\ Stamina !', '#ffaa22')
      }
      if (ctx.player.stamina <= 0) {
        ctx.player.state.dodgeDir = null
        leanDir = null
        this.leanGraceDir = null
        this.snd('snd_stamina_low')
      }
    } else if (leanDir === null) {
      ctx.player.leanTime = 0
      this.staminaWarningShown = false
    }

    const ps = ctx.player.state

    if (ctx.tutorial.active) {
      this.handleTutorialInput(ctx, false, false, false, jPr, kPr, spaceDown)
      return
    }

    if (kPr && ps.action === 'idle' && ctx.player.stars >= CFG.player.starPunch.starsRequired) {
      if (this.dodgeSys.tryStarPunch(ctx)) {
        this.onStarPunch(ctx)
        return
      }
    }

    if (jPr && this.combatSys.tryJab(ctx)) {
      ctx.player.lastPunchHand = ctx.player.lastPunchHand === 'right' ? 'left' : 'right'
      this.gloveR.punchGlove(ctx.player.lastPunchHand)
      return
    }

    if (kPr && this.combatSys.tryHeavy(ctx)) {
      ctx.player.lastPunchHand = ctx.player.lastPunchHand === 'right' ? 'left' : 'right'
      this.gloveR.punchGlove(ctx.player.lastPunchHand)
      return
    }

    if (spaceDown) {
      this.combatSys.tryGuard(ctx)
    } else if (ps.action === 'guard') {
      this.combatSys.releaseGuard(ctx)
    }
  }

  private tryDodge(ctx: GameContext, dir: DodgeDirection) {
    const cs = ctx.clippy.state
    const isAttacking = cs.action === 'telegraph' || cs.action === 'attack'
      || cs.action === 'charge_freeze' || cs.action === 'charge_rush'

    if (isAttacking && cs.attack) {
      const correctDir = REQUIRED_DODGE[cs.attack.side]
      if (dir !== correctDir) {
        this.applyCounterPunch(ctx)
        return
      }
    }

    if (this.dodgeSys.tryDodge(ctx, dir, REQUIRED_DODGE)) {
      let isPerfect = false
      if (isAttacking && cs.attack) {
        if (cs.action === 'charge_freeze') {
          isPerfect = true
          this.clippyAI.onSeriesDodgeSuccess(ctx)
          this.clippyAI.stun(ctx, CFG.clippy.stun.hitsChargePerfect)
          this.combatSys.events.push({ type: 'stun_start' })
          this.combatSys.events.push({ type: 'star_earned' })
          ctx.player.stars = Math.min(3, ctx.player.stars + 1)
          this.combatSys.events.push({ type: 'success' })
        } else if (cs.action === 'attack' || cs.action === 'charge_rush') {
          isPerfect = true
          cs.action = 'recovery'
          cs.recoveryDuration = this.clippyAI.getRecovery(cs.attack!.type, ctx)
          cs.timer = 0
          this.clippyAI.onSeriesDodgeSuccess(ctx)
          this.clippyAI.onMissedAttack(ctx)
          this.combatSys.events.push({ type: 'success' })
        } else {
          const windUp = this.clippyAI.getWindUp(cs.attack.type, ctx)
          const blinkStart = Math.max(0, windUp - CFG.yellowBlink.startBeforeMs)
          const blinkEnd = blinkStart + CFG.yellowBlink.durationMs

          if (cs.timer >= blinkStart && cs.timer <= blinkEnd + 200) {
            isPerfect = true
          } else {
            this.applyCounterPunch(ctx)
            return
          }
        }
      }

      this.staminaSys.spendDodge(ctx, isPerfect)
      ctx.player.state.isPerfectDodge = isPerfect
      this.snd('snd_dodge')
      this.effectsR.flash(ctx, 0x44ff88, 0.25)
      this.gloveR.resetGloves()

      if (isPerfect) {
        this.effectsR.popup('PARFAIT !', '#44ff88')
        this.effectsR.freezeFrame(ctx, 80)
        this.effectsR.shake(ctx, 10)
        this.hudR.setBubble(pickTaunt('dodge', ctx.clippy.hp / CFG.clippy.maxHP))
      } else {
        this.effectsR.popup('ESQUIVÉ', '#88ccff')
        this.hudR.setBubble(pickTaunt('dodge', ctx.clippy.hp / CFG.clippy.maxHP))
      }
    }
  }

  private applyCounterPunch(ctx: GameContext) {
    ctx.player.hp = Math.max(0, ctx.player.hp - CFG.clippy.counterPunchDamage)
    this.effectsR.popup(`-${CFG.clippy.counterPunchDamage}`, '#ff4444')
    this.effectsR.shake(ctx, 6)
    this.snd('snd_hit')
    ctx.player.state.action = 'stunned'
    ctx.player.state.timer = 0
    this.combatSys.events.push({ type: 'error' })
  }

  // ── TUTORIAL INPUT ───────────────────────────────────────────────────

  private handleTutorialInput(
    ctx: GameContext,
    _lPr: boolean, _rPr: boolean, _dPr: boolean,
    jPr: boolean, kPr: boolean, _spaceDown: boolean,
  ) {
    if (jPr || kPr) {
      const step = this.tutorialSys.getCurrentStep(ctx)
      if (step && (step.expect === 'jab' || (step.expect === 'dodge_punish' && this.tutorialSys.isDodgePunishWaitingHit()))) {
        ctx.player.lastPunchHand = ctx.player.lastPunchHand === 'right' ? 'left' : 'right'
        this.gloveR.punchGlove(ctx.player.lastPunchHand)
        this.tutorialSys.onPunch(ctx)
        const label = step.expect === 'jab' ? 'BIEN !' : 'COMBO !'
        const color = step.expect === 'jab' ? '#44ff88' : '#ffee22'
        this.effectsR.popup(label, color)
        this.effectsR.flash(ctx, step.expect === 'jab' ? 0x44ff88 : 0xffee22, 0.4)
      }
    }
  }

  // ── CLIPPY STATE TRANSITIONS ───────────────────────────────────────

  private detectClippyTransitions(ctx: GameContext) {
    const cs = ctx.clippy.state
    const prev = this.prevClippyAction

    if ((cs.action === 'telegraph' || cs.action === 'feint_telegraph') && prev !== cs.action) {
      if (cs.attack) {
        const amp = this.clippyAI.getTellAmplitude(ctx)
        const windUp = this.clippyAI.getWindUp(cs.attack.type, ctx)
        this.gloveR.animateTelegraph(ctx, cs.attack.type, windUp, amp)
        this.hudR.setBubble('')

        const glitchSnd = cs.attack.type === 'jab' ? 'snd_glitch_jab'
          : cs.attack.type === 'hook' ? 'snd_glitch_hook' : 'snd_glitch_jab'
        this.snd(glitchSnd)

        if (cs.action === 'feint_telegraph') {
          void 0
        } else {
          void 0
        }
      }
    }

    if (cs.action === 'charge_recoil' && prev !== 'charge_recoil') {
      this.snd('snd_glitch_charge')
      this.hudR.setBubble('')
    }

    if (cs.action === 'charge_freeze' && prev !== 'charge_freeze') {
      this.snd('snd_charge_freeze')
      this.chargeFreezeBlinkTimer = 0
      this.startYellowFlash()
      this.snd('snd_yellow_flash')
    }

    if (cs.action === 'charge_rush' && prev !== 'charge_rush') {
      this.gloveR.animateAttack(ctx)
      this.snd('snd_swoosh')
    }

    if (cs.action === 'attack' && prev !== 'attack') {
      this.gloveR.animateAttack(ctx)
      this.snd('snd_swoosh')
    }

    if (cs.action === 'feint_cancel' && prev !== 'feint_cancel') {
      this.gloveR.animateFeintCancel()
      this.hudR.setBubble(pickTaunt('feint', ctx.clippy.hp / CFG.clippy.maxHP))
    }

    if (cs.action === 'taunt' && prev !== 'taunt') {
      this.gloveR.setShowoff(true)
      this.sprClipy.setFlipX(true)
      this.hudR.setBubble(pickTaunt('taunt', ctx.clippy.hp / CFG.clippy.maxHP))
    }

    if (prev === 'taunt' && cs.action !== 'taunt') {
      this.gloveR.setShowoff(false)
      this.sprClipy.setFlipX(false)
    }

    if (cs.action === 'stunned' && prev !== 'stunned') {
      if (this.stunSound) { this.stunSound.stop(); this.stunSound.destroy() }
      this.stunSound = this.sound.add('snd_stun', { volume: this.volume })
      this.stunSound.play()
      this.effectsR.popup('ÉTOURDI !', '#ffee22')
      this.gloveR.resetGloves()
    }

    if (prev === 'attack' || prev === 'charge_rush') {
      if (cs.action !== 'attack' && cs.action !== 'charge_rush') {
        this.gloveR.resetGloves()
      }
    }

    if (cs.action === 'idle' && prev !== 'idle') {
      this.gloveR.resetGloves()
      this.hudR.setBubble(pickTaunt('idle', ctx.clippy.hp / CFG.clippy.maxHP))
    }

    this.prevClippyAction = cs.action
  }

  private startYellowFlash() {
    this.yellowFlashActive = true
    this.yellowFlashTimer = 0
    this.yellowFlashCount = 0
    this.sprClipy.setTint(0xFFFF00)
  }

  // ── PHASE TRANSITION ────────────────────────────────────────────────

  private checkPhaseTransition(ctx: GameContext) {
    if (ctx.combatPhase === 2 && this.prevCombatPhase === 1 && !ctx.phaseTransitioned) {
      ctx.phaseTransitioned = true
      this.combatSys.events.push({ type: 'phase_transition' })
      this.effectsR.freezeFrame(ctx, 500)
    }
    if (ctx.combatPhase === 3 && this.prevCombatPhase !== 3 && !ctx.rageTransitioned) {
      ctx.rageTransitioned = true
      this.snd('snd_phase_transition')
      this.effectsR.shake(ctx, 20)
      this.effectsR.flash(ctx, 0xff0000, 0.7)
      this.effectsR.freezeFrame(ctx, 600)
      this.hudR.setBubble(pickTaunt('rage', ctx.clippy.hp / CFG.clippy.maxHP))
      this.hudR.setRound('RAGE MODE', '#ff0000')
      this.hudR.flashNow('RAGE !', '#ff0000')
    }
    this.prevCombatPhase = ctx.combatPhase
  }

  // ── STAR PUNCH ───────────────────────────────────────────────────────

  private onStarPunch(ctx: GameContext) {
    this.combatSys.applyStarPunch(ctx)
    this.effectsR.flash(ctx, 0xffffff, 0.75)
    this.effectsR.shake(ctx, 30)
    this.effectsR.freezeFrame(ctx, 200)
    this.effectsR.slowMo(ctx, 0.3, 600)
    this.effectsR.popup('★ UPPERCUT ÉTOILE ★', '#ffd700')
    this.snd('snd_counter')
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
    this.ctx.clippy.state.attack = null
    this.ctx.clippy.state.realAttack = null
    this.ctx.clippy.state.stunHitsRemaining = 0
    this.ctx.clippy.state.stunDurationMs = 0
    this.ctx.clippy.idleDuration = 0
    this.ctx.series.active = false
    if (this.stunSound) { this.stunSound.stop(); this.stunSound.destroy(); this.stunSound = null }
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

    if (!this.yellowFlashActive && cs.action !== 'charge_freeze') {
      this.sprClipy.clearTint()
    }

    if ((cs.action === 'telegraph' || cs.action === 'feint_telegraph') && cs.attack) {
      const amp = this.clippyAI.getTellAmplitude(ctx)
      const windUp = this.clippyAI.getWindUp(cs.attack.type, ctx)
      const progress = Math.min(1, cs.timer / windUp)

      if (cs.attack.type === 'hook') {
        const dir = cs.attack.side === 'left' ? 1 : cs.attack.side === 'right' ? -1 : 0
        angle = dir * 4 * amp * progress
      } else if (cs.attack.type === 'jab') {
        const dir = cs.attack.side === 'left' ? -1 : 1
        if (cs.timer < 50) {
          cx += dir * 8 * amp
        }
      }
    }

    if (cs.action === 'charge_recoil') {
      const amp = this.clippyAI.getTellAmplitude(ctx)
      const progress = Math.min(1, cs.timer / 300)
      cy -= Math.round(CFG.charge.recoilPx * amp * progress)
    }

    if (cs.action === 'charge_freeze') {
      const amp = this.clippyAI.getTellAmplitude(ctx)
      cy -= Math.round(CFG.charge.recoilPx * amp)
    }

    if (cs.action === 'charge_rush') {
      cy += Math.round(20 * Math.min(1, cs.timer / 100))
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
    } else if (this.eyePulse > 0.1 && cs.action !== 'telegraph' && cs.action !== 'feint_telegraph'
               && !this.yellowFlashActive && cs.action !== 'charge_freeze') {
      const v = Math.round(this.eyePulse * 80)
      this.sprClipy.setTint(Phaser.Display.Color.GetColor(255, 255 - v, 255 - v))
      this.sprClipy.angle = angle
    } else {
      this.sprClipy.angle = angle
    }

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

  private projSprites: Phaser.GameObjects.Image[] = []
  private roseSprite: Phaser.GameObjects.Image | null = null

  private getProjTextureKey(type: string): string {
    switch (type) {
      case 'can': return 'proj_canette'
      case 'keyboard': return 'proj_clavier'
      case 'popcorn': return 'proj_popcorn'
      default: return 'proj_canette'
    }
  }

  private drawProjectiles(ctx: GameContext) {
    this.gProj.clear()

    if (ctx.roseSquare.active) {
      const r = ctx.roseSquare
      if (!this.roseSprite) {
        this.roseSprite = this.add.image(r.x, r.y, 'proj_rose').setDepth(6)
      }
      this.roseSprite.setVisible(true).setPosition(r.x, r.y)
      const pulse = 0.9 + 0.1 * Math.sin(r.timer * 0.015)
      this.roseSprite.setDisplaySize(96 * pulse, 96 * pulse)
      this.gProj.lineStyle(3, 0xff88aa, 0.7)
      this.gProj.strokeRoundedRect(r.x - 50, r.y - 50, 100, 100, 10)
    } else if (this.roseSprite) {
      this.roseSprite.setVisible(false)
    }

    while (this.projSprites.length < ctx.projectiles.length) {
      const spr = this.add.image(0, 0, 'proj_canette').setDepth(6).setVisible(false)
      this.projSprites.push(spr)
    }

    for (let i = 0; i < this.projSprites.length; i++) {
      const proj = ctx.projectiles[i]
      const spr = this.projSprites[i]
      if (!proj || !proj.active) { spr.setVisible(false); continue }

      const px = proj.x + (proj.targetX - proj.x) * proj.progress
      const py = proj.y + (proj.targetY - proj.y) * proj.progress

      const minSize = 16
      const maxSize = 96
      const size = minSize + (maxSize - minSize) * proj.progress

      spr.setTexture(this.getProjTextureKey(proj.type))
      spr.setVisible(true).setPosition(px, py).setDisplaySize(size, size)

      const dodgeZone = proj.progress >= 0.6
      if (dodgeZone) {
        const blinkPhase = Math.floor(proj.progress * 20) % 2 === 0
        spr.setTint(blinkPhase ? 0xff3333 : 0xffffff)
      } else {
        spr.clearTint()
      }

      if (proj.progress >= 0.85 && proj.active) {
        const result = this.projectileSys.checkHit(ctx, proj)
        if (result === 'hit') {
          this.effectsR.shake(ctx, 8)
          this.effectsR.flash(ctx, 0xff6600, 0.3)
          this.effectsR.popup(`-${proj.damage}`, '#ff6600')
          this.snd('snd_hit')
          proj.active = false
          spr.setVisible(false)
        } else if (result === 'dodged') {
          this.staminaSys.rewardProjectileDodge(ctx)
          const stRatio = ctx.player.stamina / CFG.player.maxStamina
          if (stRatio >= CFG.projectiles.dodgeRewardHPThreshold) {
            this.effectsR.popup('+HP', '#44ff88')
          } else {
            this.effectsR.popup('+STAMINA', '#44aaff')
          }
          this.effectsR.flash(ctx, 0x44aaff, 0.2)
          this.snd('snd_dodge')
          proj.active = false
          spr.setVisible(false)
        }
      }
    }
  }

  // ── MOBILE BUTTONS ────────────────────────────────────────────────────

  private mobileTexts: Phaser.GameObjects.Text[] = []

  private drawMobileButtons() {
    if (!this.mobileSys.isMobile) return

    this.mobileSys.drawMobileHUD(this.gKeys, this.W, this.H)

    if (this.mobileTexts.length === 0) {
      const mode = this.mobileSys.mobileMode
      if (mode === 'gyro' && this.mobileSys.gyroEnabled) {
        const tapH = Math.round(this.H * 0.08)
        const tapY = Math.round(this.H - tapH - 6)
        const cx = this.W / 2
        const halfW = Math.round(this.W * 0.44)
        const tL = this.add.text(
          cx - halfW / 2 - 8, tapY + tapH / 2, 'JAB',
          { fontFamily: FONT, fontSize: '18px', color: '#88aacc', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 2, align: 'center' },
        ).setOrigin(0.5, 0.5).setDepth(10)
        const tR = this.add.text(
          cx + halfW / 2 + 8, tapY + tapH / 2, 'LOURD',
          { fontFamily: FONT, fontSize: '18px', color: '#cc8866', fontStyle: 'bold',
            stroke: '#000', strokeThickness: 2, align: 'center' },
        ).setOrigin(0.5, 0.5).setDepth(10)
        this.mobileTexts.push(tL, tR)
      } else if (mode === 'pointer') {
        const btns = this.mobileSys.getPointerButtons()
        const colors: Record<string, string> = { jab: '#88ccff', guard: '#88ee88', heavy: '#ff8866' }
        for (const btn of btns) {
          const txt = this.add.text(
            btn.x + btn.w / 2, btn.y + btn.h / 2, btn.label,
            { fontFamily: FONT, fontSize: '20px', color: colors[btn.id] ?? '#fff', fontStyle: 'bold',
              stroke: '#000', strokeThickness: 3, align: 'center' },
          ).setOrigin(0.5, 0.5).setDepth(10)
          this.mobileTexts.push(txt)
        }
      }
    }
  }

  // ── VOLUME INDICATOR ──────────────────────────────────────────────────

  private drawVolumeIndicator() {
    const g = this.gHUD
    const x = this.W - 18
    const y = Math.round(this.H * 0.45)
    const barH = 80
    const barW = 14
    const filled = Math.round(barH * this.volume)
    const label = this.volume <= 0 ? '🔇' : this.volume < 0.35 ? '🔈' : this.volume < 0.7 ? '🔉' : '🔊'

    g.fillStyle(0x0d0d1e, 0.7)
    g.fillRoundedRect(x - barW, y, barW, barH, 4)
    if (filled > 0) {
      g.fillStyle(0x88aacc, 0.8)
      g.fillRoundedRect(x - barW, y + barH - filled, barW, filled, 4)
    }
    g.lineStyle(1, 0x88aacc, 0.4)
    g.strokeRoundedRect(x - barW, y, barW, barH, 4)

    if (!this.tVol) {
      this.tVol = this.add.text(x - barW / 2, y - 14, label, {
        fontFamily: FONT, fontSize: '16px', color: '#88aacc',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5, 0.5).setDepth(9)
    }
    this.tVol.setText(label)
  }

  private tryVolumeClick(mx: number, my: number): boolean {
    const x = this.W - 18
    const y = Math.round(this.H * 0.45)
    const barH = 80
    const barW = 14
    const hitPad = 15
    if (mx >= x - barW - hitPad && mx <= x + hitPad &&
        my >= y - hitPad && my <= y + barH + hitPad) {
      const clickY = Phaser.Math.Clamp(my, y, y + barH)
      this.volume = 1 - (clickY - y) / barH
      this.applyVolume()
      try { localStorage.setItem('clippy_volume', this.volume.toFixed(2)) } catch {}
      return true
    }
    return false
  }

  private tVol: Phaser.GameObjects.Text | null = null

  private drawDodgeArrow(ctx: GameContext) {
    const cs = ctx.clippy.state
    if (cs.action !== 'telegraph' && cs.action !== 'attack'
        && cs.action !== 'charge_recoil' && cs.action !== 'charge_freeze'
        && cs.action !== 'charge_rush') return
    if (!cs.attack) return

    const g = this.gHUD
    const cx = this.clippyScreenPos.x
    const cy = this.clippyScreenPos.y
    const correctDir = REQUIRED_DODGE[cs.attack.side]
    const pulse = 0.7 + 0.3 * Math.sin(ctx.totalTime * 0.008)

    const arrowSize = 27
    const offset = 65

    g.fillStyle(0xffcc00, pulse)
    g.lineStyle(2, 0xff8800, pulse)

    if (correctDir === 'right') {
      const ax = cx - offset
      const ay = cy
      g.beginPath()
      g.moveTo(ax + arrowSize, ay)
      g.lineTo(ax - arrowSize * 0.5, ay - arrowSize * 0.7)
      g.lineTo(ax - arrowSize * 0.5, ay + arrowSize * 0.7)
      g.closePath(); g.fillPath(); g.strokePath()
    } else if (correctDir === 'left') {
      const ax = cx + offset
      const ay = cy
      g.beginPath()
      g.moveTo(ax - arrowSize, ay)
      g.lineTo(ax + arrowSize * 0.5, ay - arrowSize * 0.7)
      g.lineTo(ax + arrowSize * 0.5, ay + arrowSize * 0.7)
      g.closePath(); g.fillPath(); g.strokePath()
    } else {
      const ax = cx
      const ay = cy - offset
      g.beginPath()
      g.moveTo(ax, ay + arrowSize)
      g.lineTo(ax - arrowSize * 0.7, ay - arrowSize * 0.5)
      g.lineTo(ax + arrowSize * 0.7, ay - arrowSize * 0.5)
      g.closePath(); g.fillPath(); g.strokePath()
    }
  }

  private drawCustomCursor() {
    if (this.mobileSys.isMobile) return
    const g = this.gHUD
    const mx = this.virtualMouseX
    const my = this.virtualMouseY
    const s = 8
    g.lineStyle(2, 0xffffff, 0.8)
    g.beginPath()
    g.moveTo(mx - s, my); g.lineTo(mx + s, my)
    g.moveTo(mx, my - s); g.lineTo(mx, my + s)
    g.strokePath()
    g.fillStyle(0xffffff, 0.5)
    g.fillCircle(mx, my, 3)
  }

  // ── HELPERS ──────────────────────────────────────────────────────────

  private snd(key: string) {
    try { this.sound.play(key, { volume: this.volume }) } catch {}
  }

  private sndRandom(keys: string[]) {
    const key = keys[Math.floor(Math.random() * keys.length)]
    this.snd(key)
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
        exhaustedTimer: 0,
        leanTime: 0,
      },

      clippy: {
        hp: this.cfg.initialHP ?? CFG.clippy.maxHP,
        state: {
          action: 'idle', attack: null, timer: 0,
          recoveryDuration: 0, comboRemaining: 0, realAttack: null,
          stunHitsRemaining: 0,
          stunDurationMs: 0,
        },
        psyche: { confidence: 0, panic: 0, fatigue: 0 },
        missStreak: 0,
        idleDuration: 0,
        blinkFired: false,
        patternQueue: [],
        patternRepeats: 0,
        lastTauntTime: 0,
      },

      series: {
        total: 0,
        dodgedCount: 0,
        currentIndex: 0,
        active: false,
      },

      crowd: {
        errorCount: 0,
        successStreak: 0,
      },

      effects: { shake: 0, flashColor: 0, flashAlpha: 0, freezeMs: 0, slowMo: 1, slowMoTimer: 0 },
      projectiles: [],
      phaseTransitioned: false,
      rageTransitioned: false,
      tutorial: { active: !(this.cfg.skipTutorial ?? false), step: 0 },
      roseSquare: { active: false, x: 0, y: 0, timer: 0 },
    }
  }

  // ── CLEANUP ──────────────────────────────────────────────────────────

  shutdown() {
    try { this.bgMusic?.pause(); this.bgMusic = null } catch {}
    if (this.stunSound) { try { this.stunSound.stop(); this.stunSound.destroy() } catch {} this.stunSound = null }
    try { this.game.canvas.style.cursor = 'default' } catch {}
    this.effectsR.cleanup()
    this.mobileSys.destroy()
  }
}
