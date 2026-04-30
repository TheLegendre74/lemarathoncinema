'use client'
import { useEffect, useRef } from 'react'

// ── Offsets épaules Clippy (relatifs à son centre, proportions fixes) ─────────
const SH_LX_PCT = -0.0725   // -58 / 800
const SH_LY_PCT = -0.0346   // -18 / 520
const SH_RX_PCT =  0.0725
const SH_RY_PCT = -0.0346

// ── Sprites gants Clippy (non utilisés pour l'instant) ───────────────────────
const GLOVE_LEFT_KEY  = 'gant-gauche'
const GLOVE_RIGHT_KEY = 'gant-droite'
const USE_GLOVE_SPRITES = false

// ── Sprites gants joueur POV ──────────────────────────────────────────────────
const P_GLOVE_DEFAULT = 'pGloveDefault'
const P_GLOVE_LEFT    = 'pGloveLeft'
const P_GLOVE_RIGHT   = 'pGloveRight'

// ── Timing ────────────────────────────────────────────────────────────────────
const COUNTER_WIN_MS = 900
const PLAYER_MAX_HP  = 30

type Diff = { telMs: number; atkMs: number; dmgMin: number; dmgMax: number; label: string }
function getDiff(hp: number, maxHP: number): Diff {
  if (hp <= 3)                       return { telMs: 1800, atkMs: 1600, dmgMin: 5, dmgMax: 7,  label: '⚠️ RAGE MODE' }
  if (hp <= Math.ceil(maxHP * 0.35)) return { telMs: 2300, atkMs: 1900, dmgMin: 4, dmgMax: 5,  label: '🔥 DANGER'    }
  return                                    { telMs: 2800, atkMs: 2300, dmgMin: 3, dmgMax: 4,  label: ''            }
}

type Attack = 'left' | 'right' | 'body'
type GS =
  | 'intro' | 'idle' | 'telegraph' | 'attack'
  | 'dodged' | 'counter' | 'countered'
  | 'miss' | 'starpunch' | 'down' | 'win' | 'lose'

const DODGE_FOR: Record<Attack, string> = { left: 'right', right: 'left', body: 'down' }

const TAUNTS_IDLE = [
  'Veux-tu de l\'aide pour PERDRE ?',
  'Mon jab droit a 97,4 % de précision.',
  'Depuis 1997, je bats des gens. Toi aussi.',
  'Tu sembles déterminé. C\'est mignon.',
  'Regarde mes yeux. Apprends. Pleure.',
  'Tous mes adversaires ont fini par me remercier.',
  'Cette question : ton courage... ou ma vitesse ?',
  'Je suis là. J\'ai toujours été là.',
]
const TAUNTS_HIT = [
  'Aide détectée — origine : un poing dans ta face.',
  'Erreur critique — origine : toi.',
  'Même Word t\'a mieux traité.',
  'Est-ce que tu veux que je reformate ta stratégie ?',
  'Je vois que l\'esquive n\'était pas dans tes compétences.',
]
const TAUNTS_DODGE = [
  '...Note mentale.',
  'Bien. BIEN. Ça ne changera rien.',
  'Tu esquives. Intéressant. Notoire.',
  'Je reconnais ta valeur. Elle est faible.',
  'Hm. Je vais adapter mon algorithme.',
]

interface Props {
  onWin:  () => void
  onLose: () => void
  initialHP?: number
}

export default function ClippyPunchOutPhaser({ onWin, onLose, initialHP = 20 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef      = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let mounted = true

    import('phaser').then(({ default: Phaser }) => {
      if (!mounted || !containerRef.current) return

      class PunchScene extends Phaser.Scene {
        // ── Dimensions dynamiques (set dans create) ────────────────────────
        W = 800; H = 520
        CX = 400; CY = 195   // centre Clippy
        // Offsets épaules en pixels (calculés depuis les PCT dans create)
        SH_LX = -58; SH_LY = -18
        SH_RX =  58; SH_RY = -18

        // ── State ──────────────────────────────────────────────────────────
        gs: GS = 'intro'
        playerHP = PLAYER_MAX_HP
        clippyHP = initialHP
        stars    = 0
        atk: Attack | null = null
        hitDone  = false

        // ── Arm lerp ───────────────────────────────────────────────────────
        lGX = 0; lGY = 0; lGTX = 0; lGTY = 0
        rGX = 0; rGY = 0; rGTX = 0; rGTY = 0

        // ── Visual ─────────────────────────────────────────────────────────
        shakeX   = 0
        flashA   = 0; flashC = 0xff0000
        telPct   = 0
        bounceT  = 0
        eyePulse = 0

        // ── Timers ─────────────────────────────────────────────────────────
        t1: Phaser.Time.TimerEvent | null = null
        t2: Phaser.Time.TimerEvent | null = null
        currentAtkMs = 2300

        // ── Phaser objects ─────────────────────────────────────────────────
        sprClipy!:  Phaser.GameObjects.Image
        sprLeft!:   Phaser.GameObjects.Image
        sprRight!:  Phaser.GameObjects.Image
        pGlove!:    Phaser.GameObjects.Image   // gant joueur POV (unique, centré)
        lastPunchHand: 'left' | 'right' = 'right'
        gArms!:    Phaser.GameObjects.Graphics
        gHUD!:     Phaser.GameObjects.Graphics
        gFlash!:   Phaser.GameObjects.Graphics
        tAction!:  Phaser.GameObjects.Text
        tHint!:    Phaser.GameObjects.Text
        tMsg!:     Phaser.GameObjects.Text
        tPHPL!:    Phaser.GameObjects.Text
        tCHPL!:    Phaser.GameObjects.Text
        tRound!:   Phaser.GameObjects.Text
        kLeft!: Phaser.Input.Keyboard.Key; kRight!: Phaser.Input.Keyboard.Key
        kDown!: Phaser.Input.Keyboard.Key; kA!: Phaser.Input.Keyboard.Key
        kD!:    Phaser.Input.Keyboard.Key; kS!:  Phaser.Input.Keyboard.Key
        kJ!:    Phaser.Input.Keyboard.Key; kSpace!: Phaser.Input.Keyboard.Key

        constructor() { super({ key: 'Punch' }) }

        // ── PRELOAD ────────────────────────────────────────────────────────

        preload() {
          this.load.image('arena',      '/arene-clippy-03.png')
          this.load.image('evilClipy',  '/evil-clippy.png')
          this.load.audio('snd_hit',    '/clippy-coup.mp3')
          this.load.audio('snd_miss',   '/clippy-hit.mp3')
          this.load.audio('snd_parry',  '/clippy-parry.mp3')
          this.load.audio('snd_swoosh', '/clippy-swoosh.wav')
          if (USE_GLOVE_SPRITES) {
            this.load.image(GLOVE_LEFT_KEY,  `/${GLOVE_LEFT_KEY}.png`)
            this.load.image(GLOVE_RIGHT_KEY, `/${GLOVE_RIGHT_KEY}.png`)
          }
          this.load.image(P_GLOVE_DEFAULT, '/gant-joueur.png')
          this.load.image(P_GLOVE_LEFT,    '/gant-joueur-gauche.png')
          this.load.image(P_GLOVE_RIGHT,   '/gant-joueur-droit.png')
        }

        // ── CREATE ─────────────────────────────────────────────────────────

        create() {
          // Dimensions réelles de la scène
          this.W   = this.scale.width
          this.H   = this.scale.height
          this.CX  = this.W / 2
          this.CY  = Math.round(this.H * 0.375)   // 195 / 520 ≈ 0.375

          // Offsets épaules en pixels proportionnels
          this.SH_LX = Math.round(SH_LX_PCT * this.W)
          this.SH_LY = Math.round(SH_LY_PCT * this.H)
          this.SH_RX = Math.round(SH_RX_PCT * this.W)
          this.SH_RY = Math.round(SH_RY_PCT * this.H)

          // Positions initiales des gants Clippy
          this.lGX  = this.CX + this.SH_LX - Math.round(this.W * 0.194)
          this.lGY  = this.CY + this.SH_LY
          this.rGX  = this.CX + this.SH_RX + Math.round(this.W * 0.194)
          this.rGY  = this.CY + this.SH_RY
          this.lGTX = this.lGX; this.lGTY = this.lGY
          this.rGTX = this.rGX; this.rGTY = this.rGY

          const W = this.W, H = this.H

          // ── Background arène plein écran ───────────────────────────────
          this.add.image(W/2, H/2, 'arena').setDisplaySize(W, H)
          this.add.graphics().fillStyle(0x040412, 0.42).fillRect(0, 0, W, H)

          // ── Graphics layers ────────────────────────────────────────────
          this.gArms  = this.add.graphics().setDepth(2)
          this.gHUD   = this.add.graphics().setDepth(8)
          this.gFlash = this.add.graphics().setDepth(10)

          // ── Sprite Clippy — 20 % plus petit qu'avant ──────────────────
          const clipW = Math.round(W * 0.200)   // 200/800 * 0.8 = 20 %
          const clipH = Math.round(H * 0.415)   // 270/520 * 0.8 ≈ 41.5 %
          this.sprClipy = this.add.image(this.CX, this.CY, 'evilClipy')
            .setDisplaySize(clipW, clipH)
            .setDepth(3)

          if (USE_GLOVE_SPRITES) {
            this.sprLeft  = this.add.image(this.lGX, this.lGY, GLOVE_LEFT_KEY).setDisplaySize(70, 70).setDepth(4)
            this.sprRight = this.add.image(this.rGX, this.rGY, GLOVE_RIGHT_KEY).setDisplaySize(70, 70).setDepth(4)
          }

          // ── Gant joueur POV — UN seul, centré en bas ──────────────────
          const gW = Math.round(W * 0.20)
          const gH = Math.round(H * 0.28)
          this.pGlove = this.add.image(W / 2, Math.round(H * 0.86), P_GLOVE_DEFAULT)
            .setDisplaySize(gW, gH)
            .setDepth(7)

          // ── Textes ─────────────────────────────────────────────────────
          const tf  = { fontFamily: '"Courier New", Courier, monospace', stroke: '#000000', strokeThickness: 5 }
          const tfB = { ...tf, strokeThickness: 6 }
          const msgY    = Math.round(H * 0.695)
          const actionY = Math.round(H * 0.635)
          const hintY   = Math.round(H * 0.665)
          this.tAction = this.add.text(W/2, actionY, '', { ...tfB, fontSize: '26px', color: '#ffaa00', align: 'center', fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(9)
          this.tHint   = this.add.text(W/2, hintY,   '', { ...tf,  fontSize: '17px', color: '#ffee55', align: 'center' }).setOrigin(0.5, 0).setDepth(9)
          this.tMsg    = this.add.text(W/2, msgY,    '', { ...tf,  fontSize: '13px', color: '#cccccc', align: 'center', wordWrap: { width: Math.round(W * 0.68) } }).setOrigin(0.5, 0).setDepth(9)
          this.tPHPL   = this.add.text(14,  10, '❤️ VOUS',   { ...tf, fontSize: '10px', color: '#88ee88' }).setDepth(9)
          this.tCHPL   = this.add.text(W-14, 10, '📎 CLIPPY', { ...tf, fontSize: '10px', color: '#ee8888' }).setOrigin(1, 0).setDepth(9)
          this.tRound  = this.add.text(W/2,   5, 'ROUND 1',   { ...tf, fontSize: '12px', color: '#ffcc44' }).setOrigin(0.5, 0).setDepth(9)

          // ── Clavier ────────────────────────────────────────────────────
          const kb = this.input.keyboard!
          this.kLeft  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT)
          this.kRight = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT)
          this.kDown  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
          this.kA     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A)
          this.kD     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D)
          this.kS     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S)
          this.kJ     = kb.addKey(Phaser.Input.Keyboard.KeyCodes.J)
          this.kSpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

          this.startIntro()
        }

        // ── UPDATE ─────────────────────────────────────────────────────────

        update(time: number, delta: number) {
          const dt = delta / 1000

          this.bounceT += this.gs === 'idle' ? dt * 3.5 : 0

          if (this.gs === 'telegraph' || this.gs === 'attack') {
            this.eyePulse = 0.5 + 0.5 * Math.sin(time * 0.009)
          } else {
            this.eyePulse = Math.max(0, this.eyePulse - dt * 4)
          }

          this.shakeX *= 0.75
          if (Math.abs(this.shakeX) < 0.3) this.shakeX = 0

          this.flashA = Math.max(0, this.flashA - dt * 5)

          if (this.gs === 'telegraph') {
            this.telPct = Math.min(1, this.telPct + delta / getDiff(this.clippyHP, initialHP).telMs)
          } else if (this.gs === 'attack') {
            this.telPct = Math.max(0, this.telPct - delta / this.currentAtkMs)
          } else if (this.gs === 'idle' || this.gs === 'intro') {
            this.telPct = 0
          } else {
            this.telPct *= 0.85
          }

          // Lerp des gants Clippy
          const ls = 0.16
          this.lGX += (this.lGTX - this.lGX) * ls; this.lGY += (this.lGTY - this.lGY) * ls
          this.rGX += (this.rGTX - this.rGX) * ls; this.rGY += (this.rGTY - this.rGY) * ls

          const bounceOff = (this.gs === 'idle') ? Math.sin(this.bounceT) * 9 : 0
          const cx = this.CX + this.shakeX
          const cy = this.CY + bounceOff

          this.sprClipy.setPosition(cx, cy)
          this.sprClipy.angle = this.gs === 'win'
            ? 30
            : (this.gs === 'countered' || this.gs === 'starpunch')
            ? Math.sin(time * 0.025) * 6
            : 0
          this.sprClipy.clearTint()
          if (this.gs === 'countered' || this.gs === 'starpunch') this.sprClipy.setTint(0xffee88)
          else if (this.gs === 'win')  this.sprClipy.setTint(0x888888)
          else if (this.eyePulse > 0.1) {
            const v = Math.round(this.eyePulse * 80)
            this.sprClipy.setTint(Phaser.Display.Color.GetColor(255, 255 - v, 255 - v))
          }

          if (USE_GLOVE_SPRITES) {
            const dx = cx - this.CX, dy = cy - this.CY
            this.sprLeft.setPosition(this.lGX + dx, this.lGY + dy)
            this.sprRight.setPosition(this.rGX + dx, this.rGY + dy)
          }

          this.handleInput()
          this.drawFrame(cx, cy)
        }

        // ── INPUT ──────────────────────────────────────────────────────────

        handleInput() {
          if (this.gs === 'win' || this.gs === 'lose') return
          const JD = Phaser.Input.Keyboard.JustDown
          const jPr  = JD(this.kJ)    || JD(this.kSpace)
          const lPr  = JD(this.kLeft) || JD(this.kA)
          const rPr  = JD(this.kRight)|| JD(this.kD)
          const dPr  = JD(this.kDown) || JD(this.kS)

          if (jPr && this.gs === 'idle' && this.stars >= 3) { this.doStarPunch(); return }
          if (jPr && this.gs === 'counter') { this.doCounter(); return }

          if (this.gs === 'attack' && !this.hitDone && this.atk) {
            let pressed: string | null = null
            if (lPr) pressed = 'left'; else if (rPr) pressed = 'right'; else if (dPr) pressed = 'down'
            if (!pressed) return
            this.hitDone = true; this.clearT()
            if (pressed === DODGE_FOR[this.atk]) this.onDodge()
            else this.onMiss()
          }
        }

        // ── HELPERS ────────────────────────────────────────────────────────

        clearT() { this.t1?.remove(false); this.t1 = null; this.t2?.remove(false); this.t2 = null }
        set(s: GS) { this.gs = s; this.refreshCtrl() }
        msg(m: string) { this.tMsg.setText(m) }
        snd(k: string) { try { this.sound.play(k, { volume: 0.6 }) } catch {} }
        flash(c: number, a = 0.45) { this.flashC = c; this.flashA = a }
        shake(n = 18) { this.shakeX = (Math.random() > 0.5 ? 1 : -1) * n }
        rand<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)] }

        armsGuard() {
          this.lGTX = this.CX + this.SH_LX - Math.round(this.W * 0.194)
          this.lGTY = this.CY + this.SH_LY
          this.rGTX = this.CX + this.SH_RX + Math.round(this.W * 0.194)
          this.rGTY = this.CY + this.SH_RY
        }

        refreshCtrl() {
          const s = this.gs, a = this.atk
          if (s === 'telegraph') {
            const names: Record<Attack, string> = { left: '🥊 CROCHET GAUCHE', right: '🥊 CROCHET DROIT', body: '💥 DIRECT AU CORPS' }
            const hints: Record<Attack, string> = { left: '→ Esquiver droite  [ D / → ]', right: '← Esquiver gauche  [ A / ← ]', body: '↓ Baisser la tête  [ S / ↓ ]' }
            this.tAction.setText(a ? names[a] : '').setColor('#ffaa00')
            this.tHint.setText(a ? hints[a] : '').setColor('#ffee55')
          } else if (s === 'attack') {
            const hints: Record<Attack, string> = { left: '→  [ D / → ]  MAINTENANT !', right: '←  [ A / ← ]  MAINTENANT !', body: '↓  [ S / ↓ ]  MAINTENANT !' }
            this.tAction.setText('⚡ ESQUIVEZ !').setColor('#ff4422')
            this.tHint.setText(a ? hints[a] : '').setColor('#ffcc00')
          } else if (s === 'counter') {
            this.tAction.setText('🥊 CONTRE-ATTAQUE !').setColor('#44ff88')
            this.tHint.setText('[ J / Espace ]').setColor('#ffffff')
          } else if (s === 'idle' && this.stars >= 3) {
            this.tAction.setText('⭐⭐⭐ UPPERCUT ÉTOILE !').setColor('#ffcc00')
            this.tHint.setText('[ J / Espace ]').setColor('#ffee55')
          } else {
            this.tAction.setText('')
            this.tHint.setText('')
          }
        }

        // ── GAME FLOW ──────────────────────────────────────────────────────

        startIntro() {
          this.set('intro')
          const lines = [
            'PHASE 3 — LE RING',
            'Clippy refuse de mourir avec dignité.',
            'Ses bras annoncent l\'attaque — esquivez au bon moment.',
            '3 esquives = ⭐⭐⭐ → J / Espace pour l\'Uppercut Étoile',
          ]
          let i = 0; this.msg(lines[0])
          const next = () => {
            i++
            if (i < lines.length) { this.msg(lines[i]); this.t1 = this.time.delayedCall(1900, next) }
            else this.startIdle()
          }
          this.t1 = this.time.delayedCall(1900, next)
        }

        startIdle() {
          if (this.gs === 'win' || this.gs === 'lose') return
          this.set('idle'); this.armsGuard()
          this.msg(this.rand(TAUNTS_IDLE))
          this.t1 = this.time.delayedCall(1300 + Math.random() * 1700, () => this.startTelegraph())
        }

        startTelegraph() {
          if (this.gs === 'win' || this.gs === 'lose') return
          const attacks: Attack[] = ['left', 'right', 'body']
          this.atk = attacks[Math.floor(Math.random() * 3)]
          this.set('telegraph'); this.telPct = 0; this.hitDone = false
          this.msg('')
          const diff = getDiff(this.clippyHP, initialHP)
          this.tRound.setText(diff.label || 'ROUND 1')
          this.tRound.setColor(diff.label === '⚠️ RAGE MODE' ? '#ff2222' : diff.label === '🔥 DANGER' ? '#ff8800' : '#ffcc44')
          // Tension des bras pendant telegraph
          const spread = Math.round(this.W * 0.15)
          if (this.atk === 'left') {
            this.lGTX = this.CX + this.SH_LX - spread; this.lGTY = this.CY + this.SH_LY + Math.round(this.H * 0.019)
          } else if (this.atk === 'right') {
            this.rGTX = this.CX + this.SH_RX + spread; this.rGTY = this.CY + this.SH_RY + Math.round(this.H * 0.019)
          } else {
            const bodySpread = Math.round(this.W * 0.113)
            this.lGTX = this.CX + this.SH_LX - bodySpread; this.lGTY = this.CY + this.SH_LY + Math.round(this.H * 0.038)
            this.rGTX = this.CX + this.SH_RX + bodySpread; this.rGTY = this.CY + this.SH_RY + Math.round(this.H * 0.038)
          }
          this.t1 = this.time.delayedCall(diff.telMs, () => this.startAttack())
        }

        startAttack() {
          if (this.gs === 'win' || this.gs === 'lose') return
          const atkMs = getDiff(this.clippyHP, initialHP).atkMs
          this.currentAtkMs = atkMs
          this.set('attack'); this.msg(''); this.telPct = 1; this.snd('snd_swoosh')
          const lunge = Math.round(this.W * 0.075)
          const lungeY = Math.round(this.H * 0.096)
          if (this.atk === 'left')       { this.lGTX = this.CX + lunge;  this.lGTY = this.CY + lungeY }
          else if (this.atk === 'right') { this.rGTX = this.CX - lunge;  this.rGTY = this.CY + lungeY }
          else {
            const bLunge = Math.round(this.W * 0.038)
            const bLungeY = Math.round(this.H * 0.212)
            this.lGTX = this.CX - bLunge; this.lGTY = this.CY + bLungeY
            this.rGTX = this.CX + bLunge; this.rGTY = this.CY + bLungeY
          }
          this.t1 = this.time.delayedCall(atkMs, () => {
            if (!this.hitDone) { this.hitDone = true; this.onMiss() }
          })
        }

        onDodge() {
          this.set('dodged'); this.flash(0x44ff88, 0.38); this.snd('snd_parry')
          this.armsGuard(); this.stars = Math.min(3, this.stars + 1)
          this.msg('✅ ESQUIVÉ !  Contre-attaque !')
          this.t1 = this.time.delayedCall(180, () => this.set('counter'))
          this.t2 = this.time.delayedCall(180 + COUNTER_WIN_MS, () => {
            if (this.gs === 'counter') {
              this.msg(this.rand(TAUNTS_DODGE))
              this.time.delayedCall(550, () => this.startIdle())
            }
          })
        }

        doCounter() {
          this.clearT(); this.set('countered')
          this.flash(0xffee22, 0.5); this.shake(20); this.snd('snd_hit')
          this.msg('💥 TOUCHÉ !')
          this.lastPunchHand = this.lastPunchHand === 'right' ? 'left' : 'right'
          this.punchGlove(this.lastPunchHand)
          this.clippyHP = Math.max(0, this.clippyHP - 3)
          if (this.clippyHP <= 0) { this.t1 = this.time.delayedCall(400, () => this.doWin()); return }
          this.t1 = this.time.delayedCall(900, () => this.startIdle())
        }

        punchGlove(hand: 'left' | 'right') {
          const txPunch = hand === 'left' ? P_GLOVE_LEFT : P_GLOVE_RIGHT
          // Cible légèrement décalée gauche ou droite selon la main
          const offX = hand === 'left'
            ? -Math.round(this.W * 0.08)
            :  Math.round(this.W * 0.08)
          const tx = this.W / 2 + offX
          const ty = Math.round(this.H * 0.54)
          const gx = this.W / 2
          const gy = Math.round(this.H * 0.86)
          this.pGlove.setTexture(txPunch)
          this.tweens.killTweensOf(this.pGlove)
          this.tweens.add({
            targets: this.pGlove, x: tx, y: ty, duration: 130, ease: 'Power2',
            onComplete: () => {
              this.tweens.add({
                targets: this.pGlove, x: gx, y: gy, duration: 300, ease: 'Power2',
                onComplete: () => this.pGlove.setTexture(P_GLOVE_DEFAULT),
              })
            },
          })
        }

        doStarPunch() {
          this.stars = 0; this.set('starpunch')
          this.flash(0xffffff, 0.75); this.shake(28); this.snd('snd_hit')
          this.msg('⭐⭐⭐  UPPERCUT ÉTOILE !!!')
          const upperY = Math.round(this.H * 0.24)
          const guardY = Math.round(this.H * 0.86)
          // Bras Clippy montent
          this.lGTX = this.CX - Math.round(this.W * 0.025); this.lGTY = this.CY - Math.round(this.H * 0.212)
          this.rGTX = this.CX + Math.round(this.W * 0.025); this.rGTY = this.CY - Math.round(this.H * 0.212)
          // Gant joueur monte
          this.pGlove.setTexture(P_GLOVE_LEFT)
          this.tweens.killTweensOf(this.pGlove)
          this.tweens.add({
            targets: this.pGlove, x: this.W / 2, y: upperY, duration: 180, ease: 'Power2',
            onComplete: () => this.tweens.add({
              targets: this.pGlove, x: this.W / 2, y: guardY, duration: 500, ease: 'Power2',
              onComplete: () => this.pGlove.setTexture(P_GLOVE_DEFAULT),
            }),
          })
          this.clippyHP = Math.max(0, this.clippyHP - 8)
          if (this.clippyHP <= 0) { this.t1 = this.time.delayedCall(500, () => this.doWin()); return }
          this.t1 = this.time.delayedCall(1400, () => { this.armsGuard(); this.startIdle() })
        }

        onMiss() {
          this.set('miss'); this.flash(0xff1111, 0.52); this.snd('snd_miss')
          this.armsGuard()
          const { dmgMin, dmgMax } = getDiff(this.clippyHP, initialHP)
          this.playerHP = Math.max(0, this.playerHP - (dmgMin + Math.floor(Math.random() * (dmgMax - dmgMin + 1))))
          this.msg(this.rand(TAUNTS_HIT))
          if (this.playerHP <= 0) { this.t1 = this.time.delayedCall(600, () => this.doLose()); return }
          this.t1 = this.time.delayedCall(1100, () => this.startIdle())
        }

        doWin() {
          this.clearT(); this.set('win'); this.flash(0x44ff88, 0.6)
          this.msg('K.O. !!!  CLIPPY EST À TERRE !')
          this.time.delayedCall(2200, () => onWin())
        }

        doLose() {
          this.clearT(); this.set('lose'); this.flash(0xff2222, 0.6)
          this.msg('KNOCKOUT !  Clippy vous recommande de vous relever.')
          this.time.delayedCall(2200, () => onLose())
        }

        // ── DRAW ───────────────────────────────────────────────────────────

        drawFrame(cx: number, cy: number) {
          this.gArms.clear()
          this.gHUD.clear()

          const lSX = cx + this.SH_LX, lSY = cy + this.SH_LY
          const rSX = cx + this.SH_RX, rSY = cy + this.SH_RY
          const dy = cy - this.CY
          const lGx = this.lGX + (cx - this.CX), lGy = this.lGY + dy
          const rGx = this.rGX + (cx - this.CX), rGy = this.rGY + dy

          this.drawArm(lSX, lSY, lGx, lGy, 'left')
          this.drawArm(rSX, rSY, rGx, rGy, 'right')
          this.drawHUD()

          if (this.flashA > 0.01) {
            this.gFlash.clear()
            this.gFlash.fillStyle(this.flashC, Math.min(this.flashA, 0.55))
            this.gFlash.fillRect(0, 0, this.W, this.H)
          } else {
            this.gFlash.clear()
          }
        }

        drawArm(sx: number, sy: number, gx: number, gy: number, side: 'left' | 'right') {
          const g = this.gArms
          const isActive  = this.gs === 'telegraph' || this.gs === 'attack'
          const isThisArm = this.atk === 'body'
            || (side === 'left'  && this.atk === 'left')
            || (side === 'right' && this.atk === 'right')
          const isLunging = this.gs === 'attack'   && isThisArm
          const isUpper   = this.gs === 'starpunch'

          if (isActive && isThisArm) {
            g.fillStyle(0xff5500, 0.22 + this.eyePulse * 0.32)
            g.fillCircle(gx, gy, Math.round(this.W * 0.065))
          }

          g.lineStyle(isLunging ? 28 : 23, 0xaabbc8, 1)
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(gx, gy); g.strokePath()
          g.lineStyle(3, 0x334455, 0.6)
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(gx, gy); g.strokePath()

          if (USE_GLOVE_SPRITES) return

          const r = isLunging ? 34 : isUpper ? 30 : 28
          const col = isUpper ? 0xffcc00 : isLunging ? 0xff2200 : (isActive && isThisArm) ? 0xff5500 : 0xcc2222
          g.fillStyle(col, 1); g.lineStyle(4, 0x441111, 1)
          g.fillCircle(gx, gy, r); g.strokeCircle(gx, gy, r)
          g.lineStyle(2, 0x661111, 0.7)
          for (let i = -1; i <= 1; i++) {
            g.beginPath(); g.moveTo(gx - 11 + i * 9, gy - 9); g.lineTo(gx - 11 + i * 9, gy + 9); g.strokePath()
          }
          g.fillStyle(0xffffff, 0.16); g.fillEllipse(gx - 8, gy - 9, 15, 9)
        }

        drawHUD() {
          const g = this.gHUD
          const W = this.W, H = this.H
          const BW = Math.round(W * 0.263), BH = 18, BY = 28

          // Fond texte
          const hasAction = this.gs === 'telegraph' || this.gs === 'attack' || this.gs === 'counter' || (this.gs === 'idle' && this.stars >= 3)
          const bgH = hasAction ? 110 : 55
          const bgY = Math.round(H * 0.625)
          g.fillStyle(0x000000, 0.72)
          g.fillRoundedRect(Math.round(W * 0.075), bgY, Math.round(W * 0.85), bgH, 8)

          // Barre joueur
          const pPct = Math.max(0, this.playerHP / PLAYER_MAX_HP)
          g.fillStyle(0x0d0d1e, 1).fillRoundedRect(14, BY, BW, BH, 4)
          if (pPct > 0) {
            g.fillStyle(pPct > 0.5 ? 0x22cc55 : pPct > 0.25 ? 0xffaa00 : 0xff2222, 1)
            g.fillRoundedRect(14, BY, BW * pPct, BH, 4)
          }
          g.lineStyle(2, 0x000000, 0.7).strokeRoundedRect(14, BY, BW, BH, 4)

          // Barre Clippy
          const cPct = Math.max(0, this.clippyHP / initialHP)
          g.fillStyle(0x0d0d1e, 1).fillRoundedRect(W - 14 - BW, BY, BW, BH, 4)
          if (cPct > 0) {
            g.fillStyle(0xee3333, 1).fillRoundedRect(W - 14 - BW, BY, BW * cPct, BH, 4)
          }
          g.lineStyle(2, 0x000000, 0.7).strokeRoundedRect(W - 14 - BW, BY, BW, BH, 4)

          // Étoiles
          for (let i = 0; i < 3; i++) {
            g.fillStyle(i < this.stars ? 0xffcc00 : 0x252535, 1)
            this.drawStar(g, W/2 - 28 + i * 28, BY + 9, 10, 4.5)
          }

          // Barre de timing
          if (this.telPct > 0.01) {
            const TW = Math.round(W * 0.613), TH = 9
            const TX = (W - TW) / 2, TY = bgY - 14
            g.fillStyle(0x0a0a1a, 0.85).fillRoundedRect(TX, TY, TW, TH, 4)
            g.fillStyle(this.gs === 'telegraph' ? 0xffaa00 : 0xff4422, 1)
            g.fillRoundedRect(TX, TY, TW * this.telPct, TH, 4)
            g.lineStyle(1.5, 0x000000, 0.55).strokeRoundedRect(TX, TY, TW, TH, 4)
          }
        }

        drawStar(g: Phaser.GameObjects.Graphics, x: number, y: number, r1: number, r2: number) {
          g.beginPath()
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? r1 : r2
            const a = (i * Math.PI / 5) - Math.PI / 2
            if (i === 0) g.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
            else         g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a))
          }
          g.closePath(); g.fillPath()
        }
      }

      // ── GAME INSTANCE ────────────────────────────────────────────────────────

      const game = new Phaser.Game({
        type:   Phaser.WEBGL,
        parent: containerRef.current!,
        transparent: false,
        backgroundColor: '#050510',
        scene:  PunchScene,
        scale:  {
          mode:       Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        render: { antialias: true, antialiasGL: true, pixelArt: false },
        audio:  { disableWebAudio: false },
        banner: false,
      })
      gameRef.current = game
    })

    return () => {
      mounted = false
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      ref={containerRef}
      style={{ position: 'fixed', inset: 0, zIndex: 99990 }}
    />
  )
}
