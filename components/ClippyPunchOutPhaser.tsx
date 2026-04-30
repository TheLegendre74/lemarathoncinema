'use client'
import { useEffect, useRef } from 'react'

// ── Offsets épaules Clippy (proportions fixes) ────────────────────────────────
const SH_LX_PCT = -0.0725
const SH_LY_PCT = -0.0346
const SH_RX_PCT =  0.0725
const SH_RY_PCT = -0.0346

// ── Sprites gants joueur POV ──────────────────────────────────────────────────
const P_GLOVE_DEFAULT = 'pGloveDefault'
const P_GLOVE_LEFT    = 'pGloveLeft'
const P_GLOVE_RIGHT   = 'pGloveRight'

// ── Timing (tutoriel = délais généreux) ───────────────────────────────────────
const COUNTER_WIN_MS  = 1500   // fenêtre de contre
const PLAYER_MAX_HP   = 30

// ── Séquence tutoriel : 5 attaques scriptées ──────────────────────────────────
const TUT_SEQUENCE: Attack[] = ['left', 'right', 'body', 'left', 'right']
const TUT_TOTAL = 5

// ── Messages tutoriel par étape ───────────────────────────────────────────────
const TUT_MSGS: Record<number, { pre: string; hint: string; miss: string }> = {
  0: {
    pre:  'ÉTAPE 1 — Clippy balance un CROCHET GAUCHE. Ses bras l\'annoncent.',
    hint: 'Esquivez à DROITE → appuyez D ou →',
    miss: 'Raté ! En entraînement vous ne perdez pas de vie. Réessayez.',
  },
  1: {
    pre:  'ÉTAPE 2 — CROCHET DROIT cette fois. L\'autre côté !',
    hint: 'Esquivez à GAUCHE → appuyez A ou ←',
    miss: 'Pas grave ! Lisez le type d\'attaque et réagissez.',
  },
  2: {
    pre:  'ÉTAPE 3 — DIRECT AU CORPS. Il vise le bas.',
    hint: 'Baissez la tête → appuyez S ou ↓',
    miss: 'Presque ! Pour le corps il faut appuyer S ou ↓.',
  },
  3: {
    pre:  'ÉTAPE 4 — Esquivez PUIS contre-attaquez avec J ou Espace !',
    hint: 'Esquivez d\'abord, puis J / Espace pour frapper',
    miss: 'N\'oubliez pas : esquiver ouvre la fenêtre de contre !',
  },
  4: {
    pre:  'ÉTAPE 5/5 — Dernier entraînement. Montrez ce que vous savez faire !',
    hint: 'Esquivez au bon moment et contre-attaquez',
    miss: 'Presque ! Encore un essai.',
  },
}

type Attack = 'left' | 'right' | 'body'
type GS =
  | 'intro' | 'tut_pre'
  | 'idle' | 'telegraph' | 'attack'
  | 'dodged' | 'counter' | 'countered'
  | 'miss' | 'starpunch' | 'down' | 'win' | 'lose'

const DODGE_FOR: Record<Attack, string> = { left: 'right', right: 'left', body: 'down' }

type Diff = { telMs: number; atkMs: number; dmgMin: number; dmgMax: number; label: string }
function getDiff(hp: number, maxHP: number): Diff {
  // pct = 1 (plein HP, facile) → 0 (presque mort, dur)
  const pct   = Math.max(0, Math.min(1, hp / maxHP))
  // Fenêtre d'esquive : 1500 ms (facile) → 800 ms (max vitesse), linéaire
  const atkMs = Math.round(800 + 700 * pct)
  // Dégâts : croissent avec la difficulté
  const dmgMin = 1
  const dmgMax = 1
  const label  = pct <= 0.15 ? '⚠️ RAGE MODE' : pct <= 0.35 ? '🔥 DANGER' : ''
  return { telMs: 1000, atkMs, dmgMin, dmgMax, label }
}
// Tutoriel : flèche 2 s, fenêtre 2 s pour apprendre sans pression
const TUT_DIFF: Diff = { telMs: 2000, atkMs: 2000, dmgMin: 0, dmgMax: 0, label: 'ENTRAÎNEMENT' }

const TAUNTS_IDLE = [
  'Veux-tu de l\'aide pour PERDRE ?',
  'Mon jab droit a 97,4 % de précision.',
  'Depuis 1997, je bats des gens. Toi aussi.',
  'Tu sembles déterminé. C\'est mignon.',
  'Regarde mes yeux. Apprends. Pleure.',
  'Je suis là. J\'ai toujours été là.',
  'Cette question : ton courage... ou ma vitesse ?',
]
const TAUNTS_HIT = [
  'Aide détectée — origine : un poing dans ta face.',
  'Erreur critique — origine : toi.',
  'Même Word t\'a mieux traité.',
  'Tu veux que je reformate ta stratégie ?',
  'L\'esquive n\'était pas dans tes compétences.',
]
const TAUNTS_DODGE = [
  '...Note mentale.',
  'Bien. BIEN. Ça ne changera rien.',
  'Tu esquives. Intéressant. Notoire.',
  'Je reconnais ta valeur. Elle est faible.',
]

interface Props { onWin: () => void; onLose: () => void; initialHP?: number }
// HP de base pour la Phase 3 (70 = 20 base + 50 ajoutés)
const CLIPPY_PHASE3_HP = 70

export default function ClippyPunchOutPhaser({ onWin, onLose, initialHP = CLIPPY_PHASE3_HP }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef      = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let mounted = true

    import('phaser').then(({ default: Phaser }) => {
      if (!mounted || !containerRef.current) return

      class PunchScene extends Phaser.Scene {
        // ── Dimensions ────────────────────────────────────────────────────
        W = 800; H = 520; CX = 400; CY = 195
        SH_LX = -58; SH_LY = -18; SH_RX = 58; SH_RY = -18

        // ── State ──────────────────────────────────────────────────────────
        gs: GS = 'intro'
        playerHP = PLAYER_MAX_HP
        clippyHP = initialHP
        stars    = 0
        atk: Attack | null = null
        hitDone  = false

        // ── Tutoriel ───────────────────────────────────────────────────────
        tutMode  = true
        tutStep  = 0      // 0-4
        tutRetry = false  // true si on rejoue la même étape après un miss

        // ── Arms lerp ─────────────────────────────────────────────────────
        lGX = 0; lGY = 0; lGTX = 0; lGTY = 0
        rGX = 0; rGY = 0; rGTX = 0; rGTY = 0

        // ── Visual ─────────────────────────────────────────────────────────
        shakeX   = 0
        flashA   = 0; flashC = 0xff0000
        telPct   = 0
        bounceT  = 0
        eyePulse = 0
        nowAlpha = 0      // fade du "MAINTENANT !" central

        // ── Timers ─────────────────────────────────────────────────────────
        t1: Phaser.Time.TimerEvent | null = null
        t2: Phaser.Time.TimerEvent | null = null
        currentAtkMs = 2200

        // ── Phaser objects ─────────────────────────────────────────────────
        sprClipy!:   Phaser.GameObjects.Image
        pGloveGuard!: Phaser.GameObjects.Image   // garde : 1 sprite pleine largeur
        pGloveL!:     Phaser.GameObjects.Image   // frappe gauche (caché en garde)
        pGloveR!:     Phaser.GameObjects.Image   // frappe droite (caché en garde)
        lastPunchHand: 'left' | 'right' = 'right'
        gArms!:      Phaser.GameObjects.Graphics
        gHUD!:       Phaser.GameObjects.Graphics
        gFlash!:     Phaser.GameObjects.Graphics
        gArrows!:    Phaser.GameObjects.Graphics   // flèches d'esquive
        gKeys!:      Phaser.GameObjects.Graphics   // indicateurs touches
        tK!:         Phaser.GameObjects.Text[]     // labels touches
        tAction!:    Phaser.GameObjects.Text       // nom du coup
        tHint!:      Phaser.GameObjects.Text       // touche à appuyer
        tMsg!:       Phaser.GameObjects.Text       // taunts / feedback
        tNow!:       Phaser.GameObjects.Text       // "MAINTENANT !" flash
        tTut!:       Phaser.GameObjects.Text       // indicateur tutoriel
        tTutInstr!:  Phaser.GameObjects.Text       // instruction tutoriel
        tPHPL!:      Phaser.GameObjects.Text
        tCHPL!:      Phaser.GameObjects.Text
        tRound!:     Phaser.GameObjects.Text
        kLeft!: Phaser.Input.Keyboard.Key; kRight!: Phaser.Input.Keyboard.Key
        kDown!: Phaser.Input.Keyboard.Key; kA!: Phaser.Input.Keyboard.Key
        kD!:    Phaser.Input.Keyboard.Key; kS!:  Phaser.Input.Keyboard.Key
        kJ!:    Phaser.Input.Keyboard.Key; kSpace!: Phaser.Input.Keyboard.Key

        constructor() { super({ key: 'Punch' }) }

        // ── PRELOAD ────────────────────────────────────────────────────────
        preload() {
          this.load.image('arena',         '/arene-clippy-03.png')
          this.load.image('evilClipy',     '/evil-clippy.png')
          this.load.audio('snd_hit',       '/clippy-coup.mp3')
          this.load.audio('snd_miss',      '/clippy-hit.mp3')
          this.load.audio('snd_parry',     '/clippy-parry.mp3')
          this.load.audio('snd_swoosh',    '/clippy-swoosh.wav')
          this.load.image(P_GLOVE_DEFAULT, '/gant-joueur.png')
          this.load.image(P_GLOVE_LEFT,    '/gant-joueur-gauche.png')
          this.load.image(P_GLOVE_RIGHT,   '/gant-joueur-droit.png')
        }

        // ── CREATE ─────────────────────────────────────────────────────────
        create() {
          this.W  = this.scale.width
          this.H  = this.scale.height
          this.CX = this.W / 2
          this.CY = Math.round(this.H * 0.375)
          this.SH_LX = Math.round(SH_LX_PCT * this.W)
          this.SH_LY = Math.round(SH_LY_PCT * this.H)
          this.SH_RX = Math.round(SH_RX_PCT * this.W)
          this.SH_RY = Math.round(SH_RY_PCT * this.H)

          const armSpread = Math.round(this.W * 0.194)
          this.lGX  = this.CX + this.SH_LX - armSpread; this.lGY  = this.CY + this.SH_LY
          this.rGX  = this.CX + this.SH_RX + armSpread; this.rGY  = this.CY + this.SH_RY
          this.lGTX = this.lGX; this.lGTY = this.lGY
          this.rGTX = this.rGX; this.rGTY = this.rGY

          const W = this.W, H = this.H

          // Arène plein écran
          this.add.image(W/2, H/2, 'arena').setDisplaySize(W, H)
          this.add.graphics().fillStyle(0x040412, 0.38).fillRect(0, 0, W, H)

          // Graphics layers
          this.gArrows = this.add.graphics().setDepth(1)
          this.gArms   = this.add.graphics().setDepth(2)
          this.gHUD    = this.add.graphics().setDepth(8)
          this.gKeys   = this.add.graphics().setDepth(9)
          this.gFlash  = this.add.graphics().setDepth(10)

          // Clippy — ratio préservé, 20 % plus petit
          const sc    = Math.min(W / 800, H / 520)
          const clipW = Math.round(160 * sc)
          const clipH = Math.round(216 * sc)
          this.sprClipy = this.add.image(this.CX, this.CY, 'evilClipy')
            .setDisplaySize(clipW, clipH).setDepth(3)

          // ── Gant garde : 1 sprite pleine largeur ──────────────────────
          // Le sprite est étiré à W px de large → ses bords touchent les bords écran
          const guardSrc   = this.textures.get(P_GLOVE_DEFAULT).getSourceImage() as HTMLImageElement
          const guardRatio = guardSrc.naturalHeight && guardSrc.naturalWidth
            ? guardSrc.naturalHeight / guardSrc.naturalWidth
            : 0.38
          const guardH = Math.round(W * guardRatio * 0.527)  // réduit de ~47 % au total (−15 % de plus)
          const guardY = Math.round(H - guardH * 0.38)
          this.pGloveGuard = this.add.image(W / 2, guardY, P_GLOVE_DEFAULT)
            .setDisplaySize(W, guardH).setDepth(7)

          // ── Gants de frappe (invisibles en garde) ─────────────────────
          const gW = Math.round(W * 0.28)
          const gH = Math.round(gW * 1.15)
          const gY = Math.round(H * 0.82)
          this.pGloveL = this.add.image(Math.round(W * 0.10), gY, P_GLOVE_LEFT)
            .setDisplaySize(gW, gH).setDepth(7).setVisible(false)
          this.pGloveR = this.add.image(Math.round(W * 0.90), gY, P_GLOVE_RIGHT)
            .setDisplaySize(gW, gH).setDepth(7).setVisible(false).setFlipX(true)

          // ── Textes ─────────────────────────────────────────────────────
          const tf  = { fontFamily: '"Courier New", Courier, monospace', stroke: '#000', strokeThickness: 4 }
          const tfB = { ...tf, strokeThickness: 6 }

          // Panneau central (action + hint + msg)
          const panelY = Math.round(H * 0.64)
          this.tAction = this.add.text(W/2, panelY,           '', { ...tfB, fontSize: '28px', color: '#ffaa00', align: 'center', fontStyle: 'bold' }).setOrigin(0.5, 0).setDepth(9)
          this.tHint   = this.add.text(W/2, panelY + 38,      '', { ...tf,  fontSize: '18px', color: '#ffee55', align: 'center' }).setOrigin(0.5, 0).setDepth(9)
          this.tMsg    = this.add.text(W/2, panelY + 70,      '', { ...tf,  fontSize: '13px', color: '#aaaaaa', align: 'center', wordWrap: { width: Math.round(W * 0.65) } }).setOrigin(0.5, 0).setDepth(9)

          // "MAINTENANT !" — flash central, grosse police, éphémère
          this.tNow  = this.add.text(W/2, Math.round(H * 0.46), '', {
            ...tfB, fontSize: '54px', color: '#ff2200', align: 'center',
          }).setOrigin(0.5, 0.5).setDepth(11).setAlpha(0)

          // HUD haut
          this.tPHPL  = this.add.text(16,   10, '❤️ VOUS',   { ...tf, fontSize: '11px', color: '#88ee88' }).setDepth(9)
          this.tCHPL  = this.add.text(W-16, 10, '📎 CLIPPY', { ...tf, fontSize: '11px', color: '#ee8888' }).setOrigin(1, 0).setDepth(9)
          this.tRound = this.add.text(W/2,   6, '',           { ...tf, fontSize: '12px', color: '#ffcc44' }).setOrigin(0.5, 0).setDepth(9)

          // Indicateur tutoriel (haut centre) + instruction (sous le round)
          this.tTut      = this.add.text(W/2, 30, '', { ...tfB, fontSize: '13px', color: '#88ccff', align: 'center', letterSpacing: 2 }).setOrigin(0.5, 0).setDepth(9)
          this.tTutInstr = this.add.text(W/2, 50, '', { ...tf,  fontSize: '11px', color: '#ffcc88', align: 'center', wordWrap: { width: Math.round(W * 0.6) } }).setOrigin(0.5, 0).setDepth(9)

          // ── Indicateurs touches (bas centre, entre les gants) ──────────
          const keyLabels = ['A / ←', 'S / ↓', 'D / →', 'J / ⎵']
          const kBoxW = Math.round(W * 0.085)
          const kBoxH = Math.round(H * 0.055)
          const kGap  = Math.round(W * 0.012)
          const kTotalW = keyLabels.length * kBoxW + (keyLabels.length - 1) * kGap
          const kStartX = (W - kTotalW) / 2
          const kY = Math.round(H * 0.935)
          this.tK = keyLabels.map((lbl, i) => {
            const bx = kStartX + i * (kBoxW + kGap) + kBoxW / 2
            return this.add.text(bx, kY, lbl, {
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: `${Math.round(H * 0.022)}px`,
              color: '#777777', align: 'center', fontStyle: 'bold',
              stroke: '#000', strokeThickness: 3,
            }).setOrigin(0.5, 0.5).setDepth(10)
          })

          // Clavier
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
          this.flashA  = Math.max(0, this.flashA - dt * 5)
          this.nowAlpha = Math.max(0, this.nowAlpha - dt * 2.2)
          this.tNow.setAlpha(this.nowAlpha)

          const diff = this.tutMode ? TUT_DIFF : getDiff(this.clippyHP, initialHP)
          if (this.gs === 'telegraph') {
            this.telPct = Math.min(1, this.telPct + delta / diff.telMs)
          } else if (this.gs === 'attack') {
            this.telPct = Math.max(0, this.telPct - delta / this.currentAtkMs)
          } else if (this.gs === 'idle' || this.gs === 'intro' || this.gs === 'tut_pre') {
            this.telPct = 0
          } else {
            this.telPct *= 0.85
          }

          // Lerp arms Clippy
          const ls = 0.16
          this.lGX += (this.lGTX - this.lGX) * ls; this.lGY += (this.lGTY - this.lGY) * ls
          this.rGX += (this.rGTX - this.rGX) * ls; this.rGY += (this.rGTY - this.rGY) * ls

          const bounceOff = this.gs === 'idle' ? Math.sin(this.bounceT) * 9 : 0
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
          else if (this.gs === 'win') this.sprClipy.setTint(0x888888)
          else if (this.eyePulse > 0.1) {
            const v = Math.round(this.eyePulse * 80)
            this.sprClipy.setTint(Phaser.Display.Color.GetColor(255, 255 - v, 255 - v))
          }

          this.handleInput()
          this.drawFrame(cx, cy)
        }

        // ── INPUT ──────────────────────────────────────────────────────────
        handleInput() {
          if (this.gs === 'win' || this.gs === 'lose') return
          const JD = Phaser.Input.Keyboard.JustDown
          const jPr = JD(this.kJ)    || JD(this.kSpace)
          const lPr = JD(this.kLeft) || JD(this.kA)
          const rPr = JD(this.kRight)|| JD(this.kD)
          const dPr = JD(this.kDown) || JD(this.kS)

          if (jPr && this.gs === 'idle' && this.stars >= 3 && !this.tutMode) { this.doStarPunch(); return }
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

        flashNow(text: string) {
          this.tNow.setText(text)
          this.nowAlpha = 1
        }

        armsGuard() {
          const s = Math.round(this.W * 0.194)
          this.lGTX = this.CX + this.SH_LX - s; this.lGTY = this.CY + this.SH_LY
          this.rGTX = this.CX + this.SH_RX + s; this.rGTY = this.CY + this.SH_RY
        }

        refreshCtrl() {
          const s = this.gs, a = this.atk
          if (s === 'telegraph') {
            // Pas de texte — la flèche visuelle suffit
            this.tAction.setText('')
            this.tHint.setText('')
          } else if (s === 'attack') {
            const hints: Record<Attack, string> = {
              left:  '→  [ D / → ]',
              right: '←  [ A / ← ]',
              body:  '↓  [ S / ↓ ]',
            }
            this.tAction.setText('⚡  ESQUIVEZ  ⚡').setColor('#ff3300')
            this.tHint.setText(a ? hints[a] : '').setColor('#ffcc00')
          } else if (s === 'counter') {
            this.tAction.setText('🥊  CONTRE-ATTAQUE !').setColor('#44ff88')
            this.tHint.setText('[ J / Espace ]').setColor('#ffffff')
          } else if (s === 'idle' && this.stars >= 3 && !this.tutMode) {
            this.tAction.setText('⭐⭐⭐  UPPERCUT ÉTOILE !').setColor('#ffcc00')
            this.tHint.setText('[ J / Espace ]').setColor('#ffee55')
          } else {
            this.tAction.setText('')
            this.tHint.setText('')
          }
        }

        // ── TUTORIEL ───────────────────────────────────────────────────────

        updateTutUI() {
          if (!this.tutMode) { this.tTut.setText(''); this.tTutInstr.setText(''); return }
          const step = Math.min(this.tutStep, TUT_TOTAL - 1)
          this.tTut.setText(`— ENTRAÎNEMENT  ${step + 1} / ${TUT_TOTAL} —`)
          this.tTutInstr.setText(TUT_MSGS[step]?.hint ?? '')
        }

        endTutorial() {
          this.tutMode = false
          this.tTut.setText('')
          this.tTutInstr.setText('')
          this.tRound.setText('ROUND 1').setColor('#ffcc44')
          this.flash(0x44ccff, 0.35)
          this.msg('✅  Entraînement terminé — Combat réel !')
          this.tAction.setText('FIGHT !').setColor('#44ff88')
          this.tHint.setText('')
          this.t1 = this.time.delayedCall(2000, () => {
            this.tAction.setText('')
            this.startIdle()
          })
        }

        advanceTutorial() {
          this.tutStep++
          if (this.tutStep >= TUT_TOTAL) {
            this.endTutorial()
          } else {
            this.startTutorialStep()
          }
        }

        startTutorialStep() {
          this.set('tut_pre')
          this.armsGuard()
          const step = this.tutStep
          this.updateTutUI()
          this.msg(TUT_MSGS[step]?.pre ?? '')
          this.tAction.setText('').setColor('#ffaa00')
          this.tHint.setText('')
          this.tRound.setText(`ENTRAÎNEMENT  ${step + 1} / ${TUT_TOTAL}`).setColor('#88ccff')
          this.t1 = this.time.delayedCall(2800, () => this.startTelegraph())
        }

        // ── GAME FLOW ──────────────────────────────────────────────────────

        startIntro() {
          this.set('intro')
          this.armsGuard()
          const lines = [
            'PHASE 3 — LE RING',
            'Clippy vous affronte en combat direct.',
            'Un entraînement de 5 rounds va commencer.',
            'Aucune perte de vie pendant l\'entraînement.',
          ]
          let i = 0
          this.msg(lines[0])
          this.tAction.setText('').setColor('#ffaa00')
          const next = () => {
            i++
            if (i < lines.length) { this.msg(lines[i]); this.t1 = this.time.delayedCall(1800, next) }
            else {
              this.tutStep = 0
              this.updateTutUI()
              this.startTutorialStep()
            }
          }
          this.t1 = this.time.delayedCall(1800, next)
        }

        startIdle() {
          if (this.gs === 'win' || this.gs === 'lose') return
          this.set('idle'); this.armsGuard()
          this.msg(this.rand(TAUNTS_IDLE))
          this.t1 = this.time.delayedCall(1200 + Math.random() * 1500, () => this.startTelegraph())
        }

        startTelegraph() {
          if (this.gs === 'win' || this.gs === 'lose') return
          // Attaque scriptée en tuto, aléatoire sinon
          const attacks: Attack[] = ['left', 'right', 'body']
          this.atk = this.tutMode
            ? TUT_SEQUENCE[Math.min(this.tutStep, TUT_SEQUENCE.length - 1)]
            : attacks[Math.floor(Math.random() * 3)]

          this.set('telegraph'); this.telPct = 0; this.hitDone = false
          this.msg('')

          if (!this.tutMode) {
            const diff = getDiff(this.clippyHP, initialHP)
            this.tRound.setText(diff.label || 'ROUND 1')
            this.tRound.setColor(diff.label === '⚠️ RAGE MODE' ? '#ff2222' : diff.label === '🔥 DANGER' ? '#ff8800' : '#ffcc44')
          }

          // Tension des bras pendant le telegraph
          const spread = Math.round(this.W * 0.15)
          if (this.atk === 'left') {
            this.lGTX = this.CX + this.SH_LX - spread; this.lGTY = this.CY + this.SH_LY + Math.round(this.H * 0.02)
          } else if (this.atk === 'right') {
            this.rGTX = this.CX + this.SH_RX + spread; this.rGTY = this.CY + this.SH_RY + Math.round(this.H * 0.02)
          } else {
            const bs = Math.round(this.W * 0.113)
            this.lGTX = this.CX + this.SH_LX - bs; this.lGTY = this.CY + this.SH_LY + Math.round(this.H * 0.04)
            this.rGTX = this.CX + this.SH_RX + bs; this.rGTY = this.CY + this.SH_RY + Math.round(this.H * 0.04)
          }

          const ms = (this.tutMode ? TUT_DIFF : getDiff(this.clippyHP, initialHP)).telMs
          this.t1 = this.time.delayedCall(ms, () => this.startAttack())
        }

        startAttack() {
          if (this.gs === 'win' || this.gs === 'lose') return
          const atkMs = (this.tutMode ? TUT_DIFF : getDiff(this.clippyHP, initialHP)).atkMs
          this.currentAtkMs = atkMs
          this.set('attack'); this.msg(''); this.telPct = 1; this.snd('snd_swoosh')
          this.flashNow('⚡  MAINTENANT  ⚡')

          const lunge = Math.round(this.W * 0.075), lungeY = Math.round(this.H * 0.1)
          if (this.atk === 'left') {
            this.lGTX = this.CX + lunge;  this.lGTY = this.CY + lungeY
          } else if (this.atk === 'right') {
            this.rGTX = this.CX - lunge;  this.rGTY = this.CY + lungeY
          } else {
            const bL = Math.round(this.W * 0.038), bY = Math.round(this.H * 0.21)
            this.lGTX = this.CX - bL; this.lGTY = this.CY + bY
            this.rGTX = this.CX + bL; this.rGTY = this.CY + bY
          }
          this.t1 = this.time.delayedCall(atkMs, () => {
            if (!this.hitDone) { this.hitDone = true; this.onMiss() }
          })
        }

        onDodge() {
          this.set('dodged'); this.flash(0x44ff88, 0.38); this.snd('snd_parry')
          this.armsGuard(); this.stars = Math.min(3, this.stars + 1)
          this.msg('✅  Bien esquivé !  Contre-attaquez !')

          // Fenêtre de contre
          this.t1 = this.time.delayedCall(200, () => this.set('counter'))
          this.t2 = this.time.delayedCall(200 + COUNTER_WIN_MS, () => {
            if (this.gs === 'counter') {
              if (this.tutMode) {
                this.msg('Vous n\'avez pas contre-attaqué. Appuyez sur J ou Espace après l\'esquive !')
                this.t1 = this.time.delayedCall(1800, () => this.advanceTutorial())
              } else {
                this.msg(this.rand(TAUNTS_DODGE))
                this.time.delayedCall(550, () => this.startIdle())
              }
            }
          })
        }

        doCounter() {
          this.clearT(); this.set('countered')
          this.flash(0xffee22, 0.5); this.shake(20); this.snd('snd_hit')
          this.msg('💥  TOUCHÉ !')
          this.lastPunchHand = this.lastPunchHand === 'right' ? 'left' : 'right'
          this.punchGlove(this.lastPunchHand)

          if (this.tutMode) {
            this.clippyHP = Math.max(0, this.clippyHP - 1)  // dégâts symboliques en tuto
            this.t1 = this.time.delayedCall(900, () => this.advanceTutorial())
            return
          }

          this.clippyHP = Math.max(0, this.clippyHP - 1)
          if (this.clippyHP <= 0) { this.t1 = this.time.delayedCall(400, () => this.doWin()); return }
          this.t1 = this.time.delayedCall(900, () => this.startIdle())
        }

        punchGlove(hand: 'left' | 'right') {
          const isLeft = hand === 'left'
          const glove  = isLeft ? this.pGloveL : this.pGloveR
          // Cacher la garde, montrer le gant de frappe
          this.pGloveGuard.setVisible(false)
          glove.setVisible(true).setFlipX(!isLeft)
          // Positions
          const gx = isLeft ? Math.round(this.W * 0.10) : Math.round(this.W * 0.90)
          const gy = Math.round(this.H * 0.82)
          const tx = isLeft ? Math.round(this.W * 0.38) : Math.round(this.W * 0.62)
          const ty = Math.round(this.H * 0.56)
          glove.setPosition(gx, gy)
          this.tweens.killTweensOf(glove)
          this.tweens.add({
            targets: glove, x: tx, y: ty, duration: 130, ease: 'Power2',
            onComplete: () => this.tweens.add({
              targets: glove, x: gx, y: gy, duration: 300, ease: 'Power2',
              onComplete: () => {
                glove.setVisible(false)
                this.pGloveGuard.setVisible(true)
              },
            }),
          })
        }

        doStarPunch() {
          this.stars = 0; this.set('starpunch')
          this.flash(0xffffff, 0.75); this.shake(28); this.snd('snd_hit')
          this.msg('⭐⭐⭐  UPPERCUT ÉTOILE !!!')
          const upperY    = Math.round(this.H * 0.24)
          const gloveGuardY = Math.round(this.H * 0.82)
          this.lGTX = this.CX - Math.round(this.W * 0.025); this.lGTY = this.CY - Math.round(this.H * 0.212)
          this.rGTX = this.CX + Math.round(this.W * 0.025); this.rGTY = this.CY - Math.round(this.H * 0.212)
          this.pGloveGuard.setVisible(false)
          ;[
            { g: this.pGloveL, sx: Math.round(this.W * 0.10), px: Math.round(this.W * 0.38), flip: false },
            { g: this.pGloveR, sx: Math.round(this.W * 0.90), px: Math.round(this.W * 0.62), flip: true  },
          ].forEach(({ g, sx, px, flip }) => {
            g.setVisible(true).setFlipX(flip).setPosition(sx, gloveGuardY)
            this.tweens.killTweensOf(g)
            this.tweens.add({
              targets: g, x: px, y: upperY, duration: 180, ease: 'Power2',
              onComplete: () => this.tweens.add({
                targets: g, x: sx, y: gloveGuardY, duration: 500, ease: 'Power2',
                onComplete: () => { g.setVisible(false); this.pGloveGuard.setVisible(true) },
              }),
            })
          })
          this.clippyHP = Math.max(0, this.clippyHP - 3)
          if (this.clippyHP <= 0) { this.t1 = this.time.delayedCall(500, () => this.doWin()); return }
          this.t1 = this.time.delayedCall(1400, () => { this.armsGuard(); this.startIdle() })
        }

        onMiss() {
          this.set('miss'); this.flash(0xff1111, 0.52); this.snd('snd_miss')
          this.armsGuard()

          if (this.tutMode) {
            // Pas de perte de vie — message d'encouragement puis on réessaie
            const step = Math.min(this.tutStep, TUT_TOTAL - 1)
            this.tAction.setText('').setColor('#ffaa00')
            this.tHint.setText('')
            this.msg(TUT_MSGS[step]?.miss ?? 'Raté ! On réessaie.')
            this.t1 = this.time.delayedCall(2200, () => this.startTelegraph())
            return
          }

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
          this.gArrows.clear()
          this.gKeys.clear()

          const dy = cy - this.CY
          const lSX = cx + this.SH_LX, lSY = cy + this.SH_LY
          const rSX = cx + this.SH_RX, rSY = cy + this.SH_RY
          const lGx = this.lGX + (cx - this.CX), lGy = this.lGY + dy
          const rGx = this.rGX + (cx - this.CX), rGy = this.rGY + dy

          this.drawArm(lSX, lSY, lGx, lGy, 'left')
          this.drawArm(rSX, rSY, rGx, rGy, 'right')
          this.drawDodgeArrows()
          this.drawKeyHints()
          this.drawHUD()

          if (this.flashA > 0.01) {
            this.gFlash.clear()
            this.gFlash.fillStyle(this.flashC, Math.min(this.flashA, 0.55))
            this.gFlash.fillRect(0, 0, this.W, this.H)
          } else {
            this.gFlash.clear()
          }
        }

        // Indicateurs touches en temps réel
        drawKeyHints() {
          const g = this.gKeys
          const W = this.W, H = this.H

          // État actuel de chaque groupe de touches
          const pressed = [
            this.kA.isDown    || this.kLeft.isDown,   // A / ←
            this.kS.isDown    || this.kDown.isDown,   // S / ↓
            this.kD.isDown    || this.kRight.isDown,  // D / →
            this.kJ.isDown    || this.kSpace.isDown,  // J / ⎵
          ]
          const colors = [0x44aaff, 0xffaa00, 0x44aaff, 0x44ff88]

          const kBoxW = Math.round(W * 0.085)
          const kBoxH = Math.round(H * 0.055)
          const kGap  = Math.round(W * 0.012)
          const kTotalW = pressed.length * kBoxW + (pressed.length - 1) * kGap
          const kStartX = (W - kTotalW) / 2
          const kY = Math.round(H * 0.935)

          pressed.forEach((isDown, i) => {
            const bx = kStartX + i * (kBoxW + kGap)
            const col = colors[i]
            if (isDown) {
              // Fond coloré lumineux + halo
              g.fillStyle(col, 0.85)
              g.fillRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
              g.lineStyle(2, col, 1)
              g.strokeRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
              // Halo extérieur
              g.lineStyle(4, col, 0.30)
              g.strokeRoundedRect(bx - 2, kY - kBoxH / 2 - 2, kBoxW + 4, kBoxH + 4, 7)
            } else {
              // Fond sombre discret
              g.fillStyle(0x0a0a14, 0.75)
              g.fillRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
              g.lineStyle(1.5, 0x334466, 0.50)
              g.strokeRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
            }
            // Couleur du label selon l'état
            this.tK[i].setColor(isDown ? '#ffffff' : '#555577')
          })
        }

        // Flèches d'esquive — petites en repos, grande flèche centrale pendant telegraph/attack
        drawDodgeArrows() {
          const g = this.gArrows
          const W = this.W, H = this.H
          const isTel    = this.gs === 'telegraph'
          const isAtk    = this.gs === 'attack'
          const active   = isTel || isAtk
          const midY     = Math.round(H * 0.50)
          const smallSz  = Math.round(W * 0.030)

          // Petites flèches guides aux bords (toujours visibles, très discrètes)
          this.drawArrow(g, Math.round(W * 0.038), midY, 'left',  smallSz, 0x445566, 0.22)
          this.drawArrow(g, Math.round(W * 0.962), midY, 'right', smallSz, 0x445566, 0.22)
          this.drawArrow(g, Math.round(W * 0.500), Math.round(H * 0.60), 'down', smallSz, 0x445566, 0.22)

          if (!active || !this.atk) return

          // Grande flèche centrale qui indique la direction d'esquive
          const dir: 'left'|'right'|'down' =
            this.atk === 'right' ? 'left' :
            this.atk === 'left'  ? 'right' : 'down'

          const sz     = Math.round(W * 0.095)   // grande
          const col    = isAtk ? 0xff3300 : 0xffcc00
          const alpha  = isAtk ? 0.95 : 0.80 + Math.sin(this.eyePulse * Math.PI) * 0.18

          // Position : centré horizontalement, verticalement entre Clippy et le HUD
          const cx = W / 2
          const cy = Math.round(H * (dir === 'down' ? 0.60 : 0.52))

          // Halo derrière la flèche
          g.fillStyle(col, (isAtk ? 0.18 : 0.12))
          g.fillCircle(cx, cy, sz * 1.6)

          this.drawArrow(g, cx, cy, dir, sz, col, alpha)
        }

        drawArrow(g: Phaser.GameObjects.Graphics, x: number, y: number, dir: 'left'|'right'|'down', size: number, col: number, alpha: number) {
          g.fillStyle(col, alpha)
          g.beginPath()
          if (dir === 'left') {
            g.moveTo(x, y)
            g.lineTo(x + size, y - size * 0.65)
            g.lineTo(x + size, y + size * 0.65)
          } else if (dir === 'right') {
            g.moveTo(x, y)
            g.lineTo(x - size, y - size * 0.65)
            g.lineTo(x - size, y + size * 0.65)
          } else {
            g.moveTo(x, y)
            g.lineTo(x - size * 0.65, y - size)
            g.lineTo(x + size * 0.65, y - size)
          }
          g.closePath(); g.fillPath()
        }

        drawArm(sx: number, sy: number, gx: number, gy: number, side: 'left'|'right') {
          const g = this.gArms
          const isActive  = this.gs === 'telegraph' || this.gs === 'attack'
          const isThisArm = this.atk === 'body'
            || (side === 'left'  && this.atk === 'left')
            || (side === 'right' && this.atk === 'right')
          const isLunging = this.gs === 'attack'   && isThisArm
          const isUpper   = this.gs === 'starpunch'

          if (isActive && isThisArm) {
            g.fillStyle(0xff5500, 0.20 + this.eyePulse * 0.30)
            g.fillCircle(gx, gy, Math.round(this.W * 0.060))
          }
          // Bras de Clippy — ligne seulement, pas de cercle au bout
          const armW = isLunging ? 26 : 20
          g.lineStyle(armW, 0x8899a8, 1)
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(gx, gy); g.strokePath()
          g.lineStyle(3, 0x223344, 0.5)
          g.beginPath(); g.moveTo(sx, sy); g.lineTo(gx, gy); g.strokePath()
        }

        drawHUD() {
          const g = this.gHUD
          const W = this.W, H = this.H
          const BW = Math.round(W * 0.255), BH = 16, BY = 26

          // Fond panneau bas (action + hint + msg)
          const hasAction = this.gs === 'telegraph' || this.gs === 'attack' || this.gs === 'counter'
            || (this.gs === 'idle' && this.stars >= 3 && !this.tutMode)
          const panelH = hasAction ? 120 : 65
          const panelY = Math.round(H * 0.625)
          g.fillStyle(0x000000, 0.68)
          g.fillRoundedRect(Math.round(W * 0.08), panelY - 8, Math.round(W * 0.84), panelH, 10)

          // Barre joueur
          if (!this.tutMode) {
            const pPct = Math.max(0, this.playerHP / PLAYER_MAX_HP)
            g.fillStyle(0x0d0d1e, 1).fillRoundedRect(14, BY, BW, BH, 4)
            if (pPct > 0) {
              g.fillStyle(pPct > 0.5 ? 0x22cc55 : pPct > 0.25 ? 0xffaa00 : 0xff2222, 1)
              g.fillRoundedRect(14, BY, BW * pPct, BH, 4)
            }
            g.lineStyle(2, 0x000000, 0.7).strokeRoundedRect(14, BY, BW, BH, 4)
          }

          // Barre Clippy
          const cPct = Math.max(0, this.clippyHP / initialHP)
          g.fillStyle(0x0d0d1e, 1).fillRoundedRect(W - 14 - BW, BY, BW, BH, 4)
          if (cPct > 0) {
            g.fillStyle(0xee3333, 1).fillRoundedRect(W - 14 - BW, BY, BW * cPct, BH, 4)
          }
          g.lineStyle(2, 0x000000, 0.7).strokeRoundedRect(W - 14 - BW, BY, BW, BH, 4)

          // Étoiles (hors tuto)
          if (!this.tutMode) {
            for (let i = 0; i < 3; i++) {
              g.fillStyle(i < this.stars ? 0xffcc00 : 0x252535, 1)
              this.drawStar(g, W/2 - 28 + i * 28, BY + 8, 10, 4.5)
            }
          }

          // Barre de timing
          if (this.telPct > 0.01) {
            const TW = Math.round(W * 0.60), TH = 8
            const TX = (W - TW) / 2, TY = panelY - 18
            g.fillStyle(0x0a0a1a, 0.85).fillRoundedRect(TX, TY, TW, TH, 4)
            const barCol = this.gs === 'telegraph' ? 0xffaa00 : 0xff3300
            g.fillStyle(barCol, 1)
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
        scale:  { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
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

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 99990 }} />
}
