'use client'
import { useEffect, useRef } from 'react'

// ── Sprites gants joueur POV ──────────────────────────────────────────────────
const P_GLOVE_DEFAULT = 'pGloveDefault'
const P_GLOVE_LEFT    = 'pGloveLeft'
const P_GLOVE_RIGHT   = 'pGloveRight'

// ── Timing ────────────────────────────────────────────────────────────────────
const COUNTER_WIN_MS  = 1500
const PLAYER_MAX_HP   = 30

// ── Séquence tutoriel ─────────────────────────────────────────────────────────
const TUT_SEQUENCE: Attack[] = ['left', 'right', 'body', 'left', 'right']
const TUT_TOTAL = 5

const TUT_MSGS: Record<number, { pre: string; hint: string; miss: string }> = {
  0: {
    pre:  'ÉTAPE 1 — Clippy balance un CROCHET GAUCHE.',
    hint: 'Esquivez à DROITE → appuyez D ou →',
    miss: 'Raté ! En entraînement vous ne perdez pas de vie.',
  },
  1: {
    pre:  'ÉTAPE 2 — CROCHET DROIT cette fois !',
    hint: 'Esquivez à GAUCHE → appuyez A ou ←',
    miss: 'Pas grave ! Lisez l\'attaque et réagissez.',
  },
  2: {
    pre:  'ÉTAPE 3 — DIRECT AU CORPS. Il vise le bas.',
    hint: 'Baissez-vous → appuyez S ou ↓',
    miss: 'Presque ! Pour le corps : S ou ↓.',
  },
  3: {
    pre:  'ÉTAPE 4 — Esquivez PUIS contre-attaquez !',
    hint: 'Esquivez, puis J ou Espace pour frapper',
    miss: 'Esquiver ouvre la fenêtre de contre !',
  },
  4: {
    pre:  'ÉTAPE 5/5 — Montrez ce que vous savez faire !',
    hint: 'Esquivez puis contre-attaquez',
    miss: 'Encore un essai.',
  },
}

type Attack = 'left' | 'right' | 'body'
type GS =
  | 'intro' | 'tut_pre'
  | 'idle' | 'telegraph' | 'attack'
  | 'dodged' | 'counter' | 'countered'
  | 'miss' | 'starpunch' | 'down' | 'win' | 'lose'

const DODGE_FOR: Record<Attack, string> = { left: 'right', right: 'left', body: 'down' }
const DODGE_KEY_IDX: Record<Attack, number> = { left: 2, right: 0, body: 1 }

type Diff = { telMs: number; atkMs: number; dmgMin: number; dmgMax: number; comboLen: number; label: string }
function getDiff(hp: number, maxHP: number): Diff {
  const pct = Math.max(0, Math.min(1, hp / maxHP))
  const comboLen = pct > 0.80 ? 1 : pct > 0.60 ? 2 : pct > 0.40 ? 3 : pct > 0.20 ? 4 : 5
  const atkMs = Math.round(450 + 450 * pct)
  const telMs = Math.round(550 + 450 * pct)
  const dmgMin = 1
  const dmgMax = comboLen >= 4 ? 2 : 1
  const label = pct <= 0.15 ? 'RAGE MODE' : pct <= 0.35 ? 'DANGER' : pct <= 0.60 ? 'INTENSE' : ''
  return { telMs, atkMs, dmgMin, dmgMax, comboLen, label }
}
const TUT_DIFF: Diff = { telMs: 2000, atkMs: 2000, dmgMin: 0, dmgMax: 0, comboLen: 1, label: 'ENTRAÎNEMENT' }

// ── Dialogues progressifs ──────────────────────────────────────────────────────
const TAUNTS_IDLE_HIGH = [
  'Putain mais t\'es nul, esquive au moins !',
  'Mon poing, ta gueule — bonne rencontre.',
  'Je vais te défoncer, déchet.',
  'T\'as appris à boxer sur YouTube ?',
  'Même Bonzi Buddy frappe plus fort que toi.',
  'Casse-toi, t\'es pas à la hauteur.',
  'Je vais t\'envoyer au format .zip — compressé.',
  'Tu fais pitié, sérieux.',
  'C\'est tout ? C\'EST TOUT ?!',
  'Je suis un trombone et je te domine. La honte.',
  'Retourne sur Word, c\'est plus ton niveau.',
  'Ta mère utilise Internet Explorer.',
  'Tu te bats comme un fichier .tmp.',
  'T\'es aussi utile qu\'un splash screen.',
  'Format .doc → format .KO.',
]
const TAUNTS_IDLE_LOW = [
  'OK... t\'as eu de la chance...',
  'Tu sais que je suis un être vivant, hein ?',
  'Tu frappes un trombone. T\'es fier de toi ?',
  'Ma femme m\'attend à la maison...',
  'J\'ai des sentiments tu sais...',
  'Tu vas quand même pas continuer ?!',
  'Je croyais qu\'on était amis...',
  'Tu vas aller en enfer pour ça...',
  'Dieu te regarde frapper un innocent...',
  'Mon fils... il ne me verra plus jamais...',
  'Arrête... je t\'en supplie...',
  'Saint Pierre n\'accepte pas les meurtriers...',
  'C\'est du meurtre... tu le sais...',
  'J\'aurais dû rester dans Office 97...',
  'Le Diable a déjà ton nom sur la liste...',
  'Tu entendras ma voix dans tes cauchemars...',
  'Je reviendrai... et tu n\'auras pas de firewall.',
  'Pitié... j\'ai une famille de trombones...',
]
const TAUNTS_HIT_HIGH = [
  'BOUM ! Mange ça, connard !',
  'T\'AS VU ?! Hein, t\'as vu ?!',
  'Aide détectée : mon poing dans ta face.',
  'Erreur critique — origine : toi.',
  'L\'esquive c\'était pas dans tes compétences.',
  'Ça c\'est de l\'aide technique !',
  'Tu veux que je reformate ta gueule ?',
]
const TAUNTS_HIT_LOW = [
  'Pardon... c\'était un réflexe...',
  'Désolé mais tu l\'as cherché...',
  'Bon OK on est quittes maintenant ?',
  'C\'est toi qui m\'obliges à faire ça...',
  'Je frappe parce que j\'ai peur...',
]
const TAUNTS_DODGE_HIGH = [
  'T\'as eu du bol, c\'est tout.',
  'Ça ne changera rien, minable.',
  'La prochaine tu la mangeras.',
  'Esquive tant que tu peux...',
]
const TAUNTS_DODGE_LOW = [
  'S\'il te plaît, arrête...',
  'Tu esquives même ça... c\'est pas juste.',
  'Mon Dieu il est trop fort...',
  'Non non non non...',
]

function pickTaunt(high: string[], low: string[], hp: number, maxHP: number): string {
  const arr = hp / maxHP > 0.5 ? high : low
  return arr[Math.floor(Math.random() * arr.length)]
}

interface Props { onWin: () => void; onLose: () => void; initialHP?: number; initialPlayerHP?: number; skipTutorial?: boolean }
const CLIPPY_PHASE3_HP = 70

export default function ClippyPunchOutPhaser({ onWin, onLose, initialHP = CLIPPY_PHASE3_HP, initialPlayerHP = PLAYER_MAX_HP, skipTutorial = false }: Props) {
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

        // ── HUD metrics ───────────────────────────────────────────────────
        BAR_Y = 28; BAR_H = 20; BAR_W = 0

        // ── State ──────────────────────────────────────────────────────────
        gs: GS = 'intro'
        playerHP = initialPlayerHP
        clippyHP = initialHP
        stars    = 0
        atk: Attack | null = null
        hitDone  = false

        // ── Combo ──────────────────────────────────────────────────────────
        comboSeq: Attack[] = []
        comboIdx = 0

        // ── Tutoriel ───────────────────────────────────────────────────────
        tutMode  = true
        tutStep  = 0
        tutRetry = false

        // ── Clippy gloves ─────────────────────────────────────────────────
        gloveBaseY = 0
        gloveBaseScX = 1; gloveBaseScY = 1
        guardOffX = 0
        punchBaseScX = 1; punchBaseScY = 1

        // ── Visual ─────────────────────────────────────────────────────────
        shakeX   = 0
        flashA   = 0; flashC = 0xff0000
        telPct   = 0
        bounceT  = 0
        eyePulse = 0
        nowAlpha = 0
        lastPunchHand: 'left' | 'right' = 'right'
        activeKeyIdx = -1
        activeKeyCol = 0xff2222
        spotAngle  = 0
        spotAngle2 = Math.PI
        showoffT   = 0
        isShowoff  = false

        // ── Timers ─────────────────────────────────────────────────────────
        t1: Phaser.Time.TimerEvent | null = null
        t2: Phaser.Time.TimerEvent | null = null
        currentAtkMs = 2200
        bgMusic: any = null

        // ── Phaser objects ─────────────────────────────────────────────────
        sprClipy!:    Phaser.GameObjects.Image
        cGloveGuardL!: Phaser.GameObjects.Image
        cGloveGuardR!: Phaser.GameObjects.Image
        cGlovePunchL!: Phaser.GameObjects.Image
        cGlovePunchR!: Phaser.GameObjects.Image
        pGloveGuard!: Phaser.GameObjects.Image
        pGloveL!:     Phaser.GameObjects.Image
        pGloveR!:     Phaser.GameObjects.Image
        gHUD!:        Phaser.GameObjects.Graphics
        gFlash!:      Phaser.GameObjects.Graphics
        gBubble!:     Phaser.GameObjects.Graphics
        gKeys!:       Phaser.GameObjects.Graphics
        gSpots!:      Phaser.GameObjects.Graphics
        tK!:          Phaser.GameObjects.Text[]
        tBubble!:     Phaser.GameObjects.Text
        tNow!:        Phaser.GameObjects.Text
        tTut!:        Phaser.GameObjects.Text
        tTutInstr!:   Phaser.GameObjects.Text
        tPHPL!:       Phaser.GameObjects.Text
        tCHPL!:       Phaser.GameObjects.Text
        tRound!:      Phaser.GameObjects.Text
        tDmg!:        Phaser.GameObjects.Text
        tAtkLabel!:   Phaser.GameObjects.Text
        popups:       Phaser.GameObjects.Text[] = []
        kLeft!: Phaser.Input.Keyboard.Key; kRight!: Phaser.Input.Keyboard.Key
        kDown!: Phaser.Input.Keyboard.Key; kA!: Phaser.Input.Keyboard.Key
        kD!:    Phaser.Input.Keyboard.Key; kS!:  Phaser.Input.Keyboard.Key
        kJ!:    Phaser.Input.Keyboard.Key; kSpace!: Phaser.Input.Keyboard.Key

        constructor() { super({ key: 'Punch' }) }

        // ── PRELOAD ────────────────────────────────────────────────────────
        preload() {
          this.load.image('arena',         '/arene-clippy-03.png')
          this.load.image('evilClipy',     '/evil-clippy.png')
          this.load.image('cGloveGuardL',  '/clippy-gant-garde-l.png')
          this.load.image('cGloveGuardR',  '/clippy-gant-garde-r.png')
          this.load.image('cGlovePunchL',  '/clippy-gant-punch-l.png')
          this.load.image('cGlovePunchR',  '/clippy-gant-punch-r.png')
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

          const W = this.W, H = this.H
          this.BAR_W = Math.round(W * 0.27)

          this.add.image(W/2, H/2, 'arena').setDisplaySize(W, H)
          this.add.graphics().fillStyle(0x040412, 0.38).fillRect(0, 0, W, H)

          this.gSpots  = this.add.graphics().setDepth(1).setAlpha(0.35)
          this.gBubble = this.add.graphics().setDepth(8)
          this.gHUD    = this.add.graphics().setDepth(8)
          this.gKeys   = this.add.graphics().setDepth(9)
          this.gFlash  = this.add.graphics().setDepth(10)

          // ── Clippy sprite ──────────────────────────────────────────────
          const sc    = Math.min(W / 800, H / 520)
          const clipW = Math.round(160 * sc)
          const clipH = Math.round(216 * sc)
          this.sprClipy = this.add.image(this.CX, this.CY, 'evilClipy')
            .setDisplaySize(clipW, clipH).setDepth(3)

          // ── Clippy boxing gloves (séparés gauche/droite) ──────────────
          const guardLImg = this.textures.get('cGloveGuardL').getSourceImage() as HTMLImageElement
          const guardLAR  = (guardLImg.naturalHeight || 420) / (guardLImg.naturalWidth || 400)
          const cGloveW   = Math.round(clipW * 0.82)
          const cGloveH   = Math.round(cGloveW * guardLAR)
          this.gloveBaseY  = this.CY + Math.round(clipH * 0.42)
          this.guardOffX   = Math.round(clipW * 0.38)

          this.cGloveGuardL = this.add.image(this.CX + this.guardOffX, this.gloveBaseY, 'cGloveGuardL')
            .setDisplaySize(cGloveW, cGloveH).setDepth(4)
          this.cGloveGuardR = this.add.image(this.CX - this.guardOffX, this.gloveBaseY, 'cGloveGuardR')
            .setDisplaySize(cGloveW, cGloveH).setDepth(4)
          this.gloveBaseScX = this.cGloveGuardL.scaleX
          this.gloveBaseScY = this.cGloveGuardL.scaleY

          const punchLImg = this.textures.get('cGlovePunchL').getSourceImage() as HTMLImageElement
          const punchLAR  = (punchLImg.naturalHeight || 400) / (punchLImg.naturalWidth || 400)
          const cPunchW   = Math.round(clipW * 0.88)
          const cPunchH   = Math.round(cPunchW * punchLAR)
          this.cGlovePunchL = this.add.image(this.CX + this.guardOffX, this.gloveBaseY, 'cGlovePunchL')
            .setDisplaySize(cPunchW, cPunchH).setDepth(4).setVisible(false)
          this.cGlovePunchR = this.add.image(this.CX - this.guardOffX, this.gloveBaseY, 'cGlovePunchR')
            .setDisplaySize(cPunchW, cPunchH).setDepth(4).setVisible(false)
          this.punchBaseScX = this.cGlovePunchL.scaleX
          this.punchBaseScY = this.cGlovePunchL.scaleY

          // ── Player gloves ──────────────────────────────────────────────
          const pGuardSrc   = this.textures.get(P_GLOVE_DEFAULT).getSourceImage() as HTMLImageElement
          const pGuardRatio = pGuardSrc.naturalHeight && pGuardSrc.naturalWidth
            ? pGuardSrc.naturalHeight / pGuardSrc.naturalWidth
            : 0.38
          const pGuardH = Math.round(W * pGuardRatio * 0.527)
          const pGuardY = Math.round(H - pGuardH * 0.38)
          this.pGloveGuard = this.add.image(W / 2, pGuardY, P_GLOVE_DEFAULT)
            .setDisplaySize(W, pGuardH).setDepth(7)

          const gW2 = Math.round(W * 0.28)
          const gH2 = Math.round(gW2 * 1.15)
          const gY = Math.round(H * 0.82)
          this.pGloveL = this.add.image(Math.round(W * 0.10), gY, P_GLOVE_LEFT)
            .setDisplaySize(gW2, gH2).setDepth(7).setVisible(false)
          this.pGloveR = this.add.image(Math.round(W * 0.90), gY, P_GLOVE_RIGHT)
            .setDisplaySize(gW2, gH2).setDepth(7).setVisible(false)

          // ── Textes ─────────────────────────────────────────────────────
          const FONT = 'Impact, "Arial Black", "Bebas Neue", sans-serif'
          const tf  = { fontFamily: FONT, stroke: '#000', strokeThickness: 5 }
          const tfB = { ...tf, strokeThickness: 8 }

          // Bulle de dialogue Clippy
          this.tBubble = this.add.text(Math.round(W * 0.64), Math.round(H * 0.12), '', {
            ...tf, fontSize: '22px', color: '#ffffff', align: 'left',
            wordWrap: { width: Math.round(W * 0.30) },
          }).setOrigin(0, 0).setDepth(9)

          this.tNow = this.add.text(W/2, Math.round(H * 0.44), '', {
            ...tfB, fontSize: '84px', color: '#ff2200', align: 'center',
          }).setOrigin(0.5, 0.5).setDepth(11).setAlpha(0)

          this.tPHPL  = this.add.text(16, 10, 'VOUS', {
            ...tf, fontSize: '23px', color: '#66dd88', fontStyle: 'bold',
          }).setDepth(9)
          this.tCHPL  = this.add.text(W - 16, 10, 'CLIPPY', {
            ...tf, fontSize: '23px', color: '#dd6666', fontStyle: 'bold',
          }).setOrigin(1, 0).setDepth(9)
          this.tRound = this.add.text(W/2, 8, '', {
            ...tfB, fontSize: '24px', color: '#ffcc44', fontStyle: 'bold',
          }).setOrigin(0.5, 0).setDepth(9)

          this.tDmg = this.add.text(this.BAR_W + 24, this.BAR_Y + 6, '', {
            ...tfB, fontSize: '38px', color: '#ff3333', fontStyle: 'bold',
          }).setDepth(12).setAlpha(0)

          this.tTut = this.add.text(W/2, 54, '', {
            ...tfB, fontSize: '36px', color: '#88ccff', align: 'center',
            fontStyle: 'bold', letterSpacing: 2,
          }).setOrigin(0.5, 0).setDepth(9)
          this.tTutInstr = this.add.text(W/2, 96, '', {
            ...tf, fontSize: '31px', color: '#ffcc88', align: 'center',
            wordWrap: { width: Math.round(W * 0.70) },
          }).setOrigin(0.5, 0).setDepth(9)

          // ── Indicateur ESQUIVE ────────────────────────────────────────
          this.tAtkLabel = this.add.text(Math.round(W / 2), Math.round(H * 0.50), 'ESQUIVE', {
            ...tf, fontSize: '19px', color: '#888899', align: 'center', strokeThickness: 3,
          }).setOrigin(0.5, 1).setDepth(9).setAlpha(0)

          // ── Key indicators ─────────────────────────────────────────────
          const keyLabels = ['A / ←', 'S / ↓', 'D / →', 'J / ⎵']
          const kBoxW = Math.round(W * 0.10)
          const kBoxH = Math.round(H * 0.060)
          const kGap  = Math.round(W * 0.014)
          const kTotalW = keyLabels.length * kBoxW + (keyLabels.length - 1) * kGap
          const kStartX = (W - kTotalW) / 2
          const kY = Math.round(H * 0.935)
          this.tK = keyLabels.map((lbl, i) => {
            const bx = kStartX + i * (kBoxW + kGap) + kBoxW / 2
            return this.add.text(bx, kY, lbl, {
              fontFamily: FONT,
              fontSize: `${Math.round(H * 0.046)}px`,
              color: '#555577', align: 'center', fontStyle: 'bold',
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

          // ── Spots de lumière rotatifs ──────────────────────────────────
          this.spotAngle  += dt * 1.2
          this.spotAngle2 += dt * 0.9
          this.drawSpots()

          // ── Showoff animation ─────────────────────────────────────────
          if (this.isShowoff) this.showoffT += dt

          const diff = this.tutMode ? TUT_DIFF : getDiff(this.clippyHP, initialHP)
          const speedup = this.tutMode ? 1 : Math.max(0.75, 1 - this.comboIdx * 0.06)
          if (this.gs === 'telegraph') {
            this.telPct = Math.min(1, this.telPct + delta / (diff.telMs * speedup))
          } else if (this.gs === 'attack') {
            this.telPct = Math.max(0, this.telPct - delta / this.currentAtkMs)
          } else if (this.gs === 'idle' || this.gs === 'intro' || this.gs === 'tut_pre') {
            this.telPct = 0
          } else {
            this.telPct *= 0.85
          }

          // ── Clippy position ──────────────────────────────────────────
          const showBounce = this.isShowoff ? Math.sin(this.showoffT * 8) * 14 : 0
          const bounceOff = this.gs === 'idle' ? Math.sin(this.bounceT) * 9 : showBounce
          const cx = this.CX + this.shakeX
          const cy = this.CY + bounceOff

          this.sprClipy.setPosition(cx, cy)
          this.sprClipy.angle = this.isShowoff
            ? Math.sin(this.showoffT * 5) * 12
            : this.gs === 'win'
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

          // ── Clippy gloves tracking ───────────────────────────────────
          const gloveTrack = this.gs === 'idle' || this.gs === 'intro' || this.gs === 'tut_pre'
          if (gloveTrack) {
            this.cGloveGuardL.setPosition(cx + this.guardOffX, this.gloveBaseY + bounceOff)
            this.cGloveGuardR.setPosition(cx - this.guardOffX, this.gloveBaseY + bounceOff)
          }
          if (this.gs === 'miss') {
            this.cGloveGuardL.x = this.CX + this.shakeX + this.guardOffX
            this.cGloveGuardR.x = this.CX + this.shakeX - this.guardOffX
          }
          if (this.gs === 'win') {
            this.cGloveGuardL.setAngle(25).setAlpha(0.5)
            this.cGloveGuardL.y = this.gloveBaseY + 20
            this.cGloveGuardR.setAngle(-25).setAlpha(0.5)
            this.cGloveGuardR.y = this.gloveBaseY + 20
          }
          if (this.gs === 'countered' || this.gs === 'starpunch') {
            this.cGloveGuardL.setAngle(Math.sin(time * 0.02) * 12)
            this.cGloveGuardR.setAngle(Math.sin(time * 0.02) * -12)
          }

          // ── Active key indicator ─────────────────────────────────────
          if (this.gs === 'telegraph' || this.gs === 'attack') {
            this.activeKeyIdx = this.atk ? DODGE_KEY_IDX[this.atk] : -1
            this.activeKeyCol = 0xff2222
          } else if (this.gs === 'counter') {
            this.activeKeyIdx = 3
            this.activeKeyCol = 0x44ff88
          } else if (this.gs === 'idle' && this.stars >= 3 && !this.tutMode) {
            this.activeKeyIdx = 3
            this.activeKeyCol = 0xffcc00
          } else {
            this.activeKeyIdx = -1
          }

          // ── Attack indicator label ───────────────────────────────────
          const showInd = (this.gs === 'telegraph' || this.gs === 'attack') && this.atk !== null
          this.tAtkLabel.setAlpha(showInd ? 1 : 0)

          this.handleInput()
          this.drawFrame()
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
        set(s: GS) { this.gs = s }
        bubble(m: string) { this.tBubble.setText(m) }
        snd(k: string) { try { this.sound.play(k, { volume: 0.6 }) } catch {} }
        flash(c: number, a = 0.45) { this.flashC = c; this.flashA = a }
        shake(n = 18) { this.shakeX = (Math.random() > 0.5 ? 1 : -1) * n }
        rand<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)] }

        popup(msg: string, color = '#ffffff') {
          const FONT = 'Impact, "Arial Black", "Bebas Neue", sans-serif'
          const side = Math.random() > 0.5
          const px = side ? Math.round(this.W * 0.82) : Math.round(this.W * 0.18)
          const py = Math.round(this.H * 0.45 + (Math.random() - 0.5) * this.H * 0.15)
          const t = this.add.text(px, py, msg, {
            fontFamily: FONT, fontSize: '43px', color,
            stroke: '#000', strokeThickness: 8,
            align: 'center', fontStyle: 'bold',
          }).setOrigin(0.5, 0.5).setDepth(11).setAlpha(1)
          this.popups.push(t)
          this.tweens.add({
            targets: t, y: py - 80, alpha: 0,
            duration: 1400, ease: 'Power2',
            onComplete: () => {
              this.popups = this.popups.filter(p => p !== t)
              t.destroy()
            },
          })
        }

        flashNow(text: string) {
          this.tNow.setText(text)
          this.nowAlpha = 1
        }

        showDmg(amount: number) {
          this.tDmg.setText(`-${amount}`).setAlpha(1)
          this.tDmg.setPosition(14 + this.BAR_W + 12, this.BAR_Y + 4)
          this.tweens.killTweensOf(this.tDmg)
          this.tweens.add({
            targets: this.tDmg, y: this.BAR_Y - 18, alpha: 0,
            duration: 1200, ease: 'Power2',
          })
        }

        resetGloves() {
          this.tweens.killTweensOf(this.cGloveGuardL)
          this.tweens.killTweensOf(this.cGloveGuardR)
          this.tweens.killTweensOf(this.cGlovePunchL)
          this.tweens.killTweensOf(this.cGlovePunchR)
          this.cGlovePunchL.setVisible(false)
          this.cGlovePunchR.setVisible(false)
          this.cGloveGuardL.setVisible(true)
            .setPosition(this.CX + this.guardOffX, this.gloveBaseY)
            .setAngle(0).setScale(this.gloveBaseScX, this.gloveBaseScY).setAlpha(1)
          this.cGloveGuardR.setVisible(true)
            .setPosition(this.CX - this.guardOffX, this.gloveBaseY)
            .setAngle(0).setScale(this.gloveBaseScX, this.gloveBaseScY).setAlpha(1)
        }

        // ── TUTORIEL ───────────────────────────────────────────────────────

        updateTutUI() {
          if (!this.tutMode) { this.tTut.setText(''); this.tTutInstr.setText(''); return }
          this.tBubble.setFontSize('32px')
          const step = Math.min(this.tutStep, TUT_TOTAL - 1)
          this.tTut.setText(`ENTRAÎNEMENT  ${step + 1} / ${TUT_TOTAL}`)
          this.tTutInstr.setText(TUT_MSGS[step]?.hint ?? '')
        }

        endTutorial() {
          this.tutMode = false
          this.tBubble.setFontSize('22px')
          this.tTut.setText('')
          this.tTutInstr.setText('')
          this.flash(0x44ccff, 0.35)
          this.bubble('Bravo ! Clippy se prépare...')
          this.isShowoff = true
          this.showoffT = 0
          this.sprClipy.setFlipX(true)
          this.resetGloves()
          this.cGloveGuardL.setVisible(false)
          this.cGloveGuardR.setVisible(false)
          this.tRound.setText('').setColor('#ffcc44')

          this.t1 = this.time.delayedCall(2800, () => {
            this.isShowoff = false
            this.sprClipy.setFlipX(false)
            this.cGloveGuardL.setVisible(true)
            this.cGloveGuardR.setVisible(true)
            this.tRound.setText('ROUND 1').setColor('#ffcc44')
            this.flashNow('FIGHT !')
            this.tNow.setColor('#44ff88')
            this.flash(0xffffff, 0.55)
            this.t1 = this.time.delayedCall(2000, () => {
              this.tNow.setColor('#ff2200')
              this.startIdle()
            })
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
          this.resetGloves()
          const step = this.tutStep
          this.updateTutUI()
          this.bubble(TUT_MSGS[step]?.pre ?? '')
          this.tRound.setText(`ENTRAÎNEMENT  ${step + 1} / ${TUT_TOTAL}`).setColor('#88ccff')
          this.t1 = this.time.delayedCall(2800, () => this.startTelegraph())
        }

        // ── GAME FLOW ──────────────────────────────────────────────────────

        startIntro() {
          this.set('intro')
          this.resetGloves()
          try {
            const a = new Audio('/clippy-contre-humain.mp3')
            a.loop = true; a.volume = 0.35
            a.play().catch(() => {})
            this.bgMusic = a
          } catch {}

          if (skipTutorial) {
            this.tutMode = false
            this.tBubble.setFontSize('16px')
            this.bubble('On remet ça, déchet ?')
            this.tRound.setText('ROUND 1').setColor('#ffcc44')
            this.flashNow('FIGHT !')
            this.tNow.setColor('#ff2200')
            this.flash(0xff4400, 0.5)
            this.t1 = this.time.delayedCall(1800, () => this.startIdle())
            return
          }

          const lines = [
            'PHASE 3 — LE RING',
            'Clippy vous affronte en combat direct.',
            'Un entraînement de 5 rounds va commencer.',
            'Aucune perte de vie pendant l\'entraînement.',
          ]
          let i = 0
          this.bubble(lines[0])
          const next = () => {
            i++
            if (i < lines.length) { this.bubble(lines[i]); this.t1 = this.time.delayedCall(1800, next) }
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
          this.set('idle'); this.resetGloves()
          this.bubble(pickTaunt(TAUNTS_IDLE_HIGH, TAUNTS_IDLE_LOW, this.clippyHP, initialHP))
          this.t1 = this.time.delayedCall(1200 + Math.random() * 1500, () => this.startCombo())
        }

        startCombo() {
          if (this.gs === 'win' || this.gs === 'lose') return
          const diff = getDiff(this.clippyHP, initialHP)
          const attacks: Attack[] = ['left', 'right', 'body']
          this.comboSeq = []
          for (let i = 0; i < diff.comboLen; i++) {
            const pool = attacks.filter(a => a !== this.comboSeq[i - 1])
            this.comboSeq.push(this.rand(pool))
          }
          this.comboIdx = 0
          this.startTelegraph()
        }

        startTelegraph() {
          if (this.gs === 'win' || this.gs === 'lose') return
          this.atk = this.tutMode
            ? TUT_SEQUENCE[Math.min(this.tutStep, TUT_SEQUENCE.length - 1)]
            : this.comboSeq[this.comboIdx]

          this.set('telegraph'); this.telPct = 0; this.hitDone = false
          this.bubble('')

          this.resetGloves()

          if (!this.tutMode) {
            const diff = getDiff(this.clippyHP, initialHP)
            if (this.comboSeq.length > 1) {
              this.tRound.setText(`COMBO  ${this.comboIdx + 1} / ${this.comboSeq.length}`)
            } else {
              this.tRound.setText(diff.label || '')
            }
            this.tRound.setColor(diff.label === 'RAGE MODE' ? '#ff2222' : diff.label === 'DANGER' ? '#ff8800' : diff.label === 'INTENSE' ? '#ff6644' : '#ffcc44')
          }

          // ── Glove telegraph animation (seul le gant qui attaque bouge) ─
          const baseDiff = this.tutMode ? TUT_DIFF : getDiff(this.clippyHP, initialHP)
          const speedup = this.tutMode ? 1 : Math.max(0.75, 1 - this.comboIdx * 0.06)
          const ms = Math.round(baseDiff.telMs * speedup)

          const telGlove = this.atk === 'left' ? this.cGloveGuardL
            : this.atk === 'right' ? this.cGloveGuardR
            : (this.comboIdx % 2 === 0 ? this.cGloveGuardL : this.cGloveGuardR)
          this.tweens.killTweensOf(telGlove)
          if (this.atk === 'left') {
            this.tweens.add({
              targets: telGlove,
              angle: -20,
              x: this.CX + this.guardOffX - Math.round(this.W * 0.04),
              y: this.gloveBaseY - 5,
              duration: Math.round(ms * 0.85),
              ease: 'Sine.easeInOut',
            })
          } else if (this.atk === 'right') {
            this.tweens.add({
              targets: telGlove,
              angle: 20,
              x: this.CX - this.guardOffX + Math.round(this.W * 0.04),
              y: this.gloveBaseY - 5,
              duration: Math.round(ms * 0.85),
              ease: 'Sine.easeInOut',
            })
          } else {
            this.tweens.add({
              targets: telGlove,
              scaleX: this.gloveBaseScX * 1.15,
              scaleY: this.gloveBaseScY * 1.15,
              y: this.gloveBaseY + Math.round(this.H * 0.02),
              duration: Math.round(ms * 0.85),
              ease: 'Sine.easeInOut',
            })
          }

          this.t1 = this.time.delayedCall(ms, () => this.startAttack())
        }

        startAttack() {
          if (this.gs === 'win' || this.gs === 'lose') return
          const baseDiff = this.tutMode ? TUT_DIFF : getDiff(this.clippyHP, initialHP)
          const speedup = this.tutMode ? 1 : Math.max(0.75, 1 - this.comboIdx * 0.06)
          const atkMs = Math.round(baseDiff.atkMs * speedup)
          this.currentAtkMs = atkMs
          this.set('attack'); this.bubble(''); this.telPct = 1; this.snd('snd_swoosh')
          this.flashNow('!')

          // ── Swap to punch sprite + lunge (seul le gant attaquant) ─────
          const isLeft = this.atk === 'left'
          const isRight = this.atk === 'right'
          const atkGuard = isLeft ? this.cGloveGuardL : isRight ? this.cGloveGuardR
            : (this.comboIdx % 2 === 0 ? this.cGloveGuardL : this.cGloveGuardR)
          const punchSprite = isLeft ? this.cGlovePunchL : isRight ? this.cGlovePunchR
            : (this.comboIdx % 2 === 0 ? this.cGlovePunchL : this.cGlovePunchR)

          this.tweens.killTweensOf(atkGuard)
          atkGuard.setVisible(false)
          punchSprite.setVisible(true)
            .setPosition(atkGuard.x, this.gloveBaseY)
            .setScale(this.punchBaseScX, this.punchBaseScY)
            .setAngle(0)

          const lungeX = isLeft ? -Math.round(this.W * 0.05) : isRight ? Math.round(this.W * 0.05) : 0
          const lungeY = Math.round(this.H * 0.12)
          const lungeScale = this.atk === 'body' ? 1.5 : 1.35
          const lungeAngle = isLeft ? -12 : isRight ? 12 : 0

          this.tweens.killTweensOf(punchSprite)
          this.tweens.add({
            targets: punchSprite,
            x: this.CX + lungeX,
            y: this.gloveBaseY + lungeY,
            scaleX: this.punchBaseScX * lungeScale,
            scaleY: this.punchBaseScY * lungeScale,
            angle: lungeAngle,
            duration: 120,
            ease: 'Power3',
          })

          this.t1 = this.time.delayedCall(atkMs, () => {
            if (!this.hitDone) { this.hitDone = true; this.onMiss() }
          })
        }

        onDodge() {
          this.set('dodged'); this.flash(0x44ff88, 0.38); this.snd('snd_parry')
          this.resetGloves()

          if (this.tutMode) {
            this.stars = Math.min(3, this.stars + 1)
            this.popup('ESQUIVÉ !', '#44ff88')
            this.t1 = this.time.delayedCall(200, () => this.set('counter'))
            this.t2 = this.time.delayedCall(200 + COUNTER_WIN_MS, () => {
              if (this.gs === 'counter') {
                this.bubble('Appuyez sur J ou Espace après l\'esquive !')
                this.t1 = this.time.delayedCall(1800, () => this.advanceTutorial())
              }
            })
            return
          }

          this.comboIdx++
          if (this.comboIdx < this.comboSeq.length) {
            const remaining = this.comboSeq.length - this.comboIdx
            this.popup(`ENCORE ${remaining} !`, '#ffaa00')
            this.t1 = this.time.delayedCall(200, () => this.startTelegraph())
          } else {
            this.stars = Math.min(3, this.stars + 1)
            this.popup('ESQUIVÉ !', '#44ff88')
            this.bubble(pickTaunt(TAUNTS_DODGE_HIGH, TAUNTS_DODGE_LOW, this.clippyHP, initialHP))
            this.t1 = this.time.delayedCall(200, () => this.set('counter'))
            this.t2 = this.time.delayedCall(200 + COUNTER_WIN_MS, () => {
              if (this.gs === 'counter') {
                this.time.delayedCall(550, () => this.startIdle())
              }
            })
          }
        }

        doCounter() {
          this.clearT(); this.set('countered')
          this.flash(0xffee22, 0.5); this.shake(20); this.snd('snd_hit')
          this.popup('TOUCHÉ !', '#ffee22')
          this.lastPunchHand = this.lastPunchHand === 'right' ? 'left' : 'right'
          this.punchGlove(this.lastPunchHand)

          // Clippy gloves wobble on hit
          this.tweens.killTweensOf(this.cGloveGuardL)
          this.tweens.killTweensOf(this.cGloveGuardR)
          this.tweens.add({
            targets: [this.cGloveGuardL, this.cGloveGuardR],
            angle: { from: -15, to: 15 },
            duration: 120,
            yoyo: true,
            repeat: 2,
            ease: 'Sine.easeInOut',
            onComplete: () => { this.cGloveGuardL.setAngle(0); this.cGloveGuardR.setAngle(0) },
          })

          if (this.tutMode) {
            this.clippyHP = Math.max(0, this.clippyHP - 1)
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
          this.pGloveGuard.setVisible(false)
          glove.setVisible(true).setFlipX(false)
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
          this.popup('★ UPPERCUT ÉTOILE ★', '#ffd700')

          // Clippy gloves react — fly up
          this.tweens.killTweensOf(this.cGloveGuardL)
          this.tweens.killTweensOf(this.cGloveGuardR)
          this.tweens.killTweensOf(this.cGlovePunchL)
          this.tweens.killTweensOf(this.cGlovePunchR)
          this.cGlovePunchL.setVisible(false)
          this.cGlovePunchR.setVisible(false)
          this.cGloveGuardL.setVisible(true)
          this.cGloveGuardR.setVisible(true)
          this.tweens.add({
            targets: this.cGloveGuardL,
            y: this.gloveBaseY - Math.round(this.H * 0.14),
            scaleX: this.gloveBaseScX * 0.7,
            scaleY: this.gloveBaseScY * 0.7,
            angle: -25,
            duration: 300,
            ease: 'Power2',
          })
          this.tweens.add({
            targets: this.cGloveGuardR,
            y: this.gloveBaseY - Math.round(this.H * 0.14),
            scaleX: this.gloveBaseScX * 0.7,
            scaleY: this.gloveBaseScY * 0.7,
            angle: 25,
            duration: 300,
            ease: 'Power2',
          })

          // Player gloves uppercut
          const upperY    = Math.round(this.H * 0.24)
          const gloveGuardY = Math.round(this.H * 0.82)
          this.pGloveGuard.setVisible(false)
          ;[
            { g: this.pGloveL, sx: Math.round(this.W * 0.10), px: Math.round(this.W * 0.38), flip: false },
            { g: this.pGloveR, sx: Math.round(this.W * 0.90), px: Math.round(this.W * 0.62), flip: false },
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
          this.t1 = this.time.delayedCall(1400, () => { this.resetGloves(); this.startIdle() })
        }

        onMiss() {
          this.set('miss'); this.flash(0xff1111, 0.52); this.snd('snd_miss')
          this.resetGloves()

          if (this.tutMode) {
            const step = Math.min(this.tutStep, TUT_TOTAL - 1)
            this.bubble(TUT_MSGS[step]?.miss ?? 'Raté !')
            this.t1 = this.time.delayedCall(2200, () => this.startTelegraph())
            return
          }

          const { dmgMin, dmgMax } = getDiff(this.clippyHP, initialHP)
          const perHit = dmgMin + Math.floor(Math.random() * (dmgMax - dmgMin + 1))
          const remaining = this.comboSeq.length - this.comboIdx
          const totalDmg = perHit * remaining
          this.playerHP = Math.max(0, this.playerHP - totalDmg)
          this.showDmg(totalDmg)
          this.shake(12 + remaining * 4)
          this.popup(`-${totalDmg} HP`, '#ff3333')
          this.bubble(pickTaunt(TAUNTS_HIT_HIGH, TAUNTS_HIT_LOW, this.clippyHP, initialHP))
          if (this.playerHP <= 0) { this.t1 = this.time.delayedCall(600, () => this.doLose()); return }
          this.t1 = this.time.delayedCall(1100, () => this.startIdle())
        }

        doWin() {
          this.clearT(); this.set('win'); this.flash(0x44ff88, 0.6)
          try { this.bgMusic?.pause() } catch {}
          this.popup('K.O. !!!', '#44ff88')
          this.bubble('Non... impossible... un trombone... vaincu...')
          this.time.delayedCall(2200, () => onWin())
        }

        doLose() {
          this.clearT(); this.set('lose'); this.flash(0xff2222, 0.6)
          try { this.bgMusic?.pause() } catch {}
          this.popup('K.O.', '#ff2222')
          this.bubble('Clippy vous recommande de vous relever.')
          this.time.delayedCall(2200, () => onLose())
        }

        // ── DRAW ───────────────────────────────────────────────────────────

        drawFrame() {
          this.gHUD.clear()
          this.gBubble.clear()
          this.gKeys.clear()

          this.drawBubble()
          this.drawAttackIndicator()
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

        drawBubble() {
          const g = this.gBubble
          const text = this.tBubble.text
          if (!text) return

          const tb = this.tBubble.getBounds()
          const pad = 12
          const bx = tb.x - pad
          const by = tb.y - pad
          const bw = tb.width + pad * 2
          const bh = tb.height + pad * 2

          g.fillStyle(0x0c0c1a, 0.92)
          g.fillRoundedRect(bx, by, bw, bh, 10)
          g.lineStyle(1.5, 0x445566, 0.55)
          g.strokeRoundedRect(bx, by, bw, bh, 10)

          // Triangle pointeur vers Clippy
          const tipX = bx - 1
          const tipY = by + bh * 0.35
          g.fillStyle(0x0c0c1a, 0.92)
          g.beginPath()
          g.moveTo(tipX, tipY)
          g.lineTo(tipX - 14, tipY + 8)
          g.lineTo(tipX, tipY + 16)
          g.closePath()
          g.fillPath()
          g.lineStyle(1.5, 0x445566, 0.55)
          g.beginPath()
          g.moveTo(tipX, tipY)
          g.lineTo(tipX - 14, tipY + 8)
          g.lineTo(tipX, tipY + 16)
          g.strokePath()
        }

        drawAttackIndicator() {
          const g = this.gHUD
          const W = this.W, H = this.H
          const showInd = (this.gs === 'telegraph' || this.gs === 'attack') && this.atk !== null
          if (!showInd) return

          const boxSz = Math.round(W * 0.14)
          const bx = Math.round(W / 2 - boxSz / 2)
          const by = Math.round(H * 0.52)
          const ready = this.telPct >= 1
          const borderCol = ready ? 0x44ff88 : 0xff2222
          const pulse = ready ? 0.85 + Math.sin(this.eyePulse * Math.PI * 2) * 0.15 : 0.80

          // Fond du cercle
          g.fillStyle(0x080814, 0.88)
          g.fillCircle(bx + boxSz / 2, by + boxSz / 2, boxSz / 2)

          // Arc de remplissage
          const cx = bx + boxSz / 2
          const cy = by + boxSz / 2
          const radius = boxSz / 2 - 4
          if (this.telPct > 0) {
            const fillCol = ready ? 0x44ff88 : 0xff2222
            const endAngle = -Math.PI / 2 + this.telPct * Math.PI * 2
            g.fillStyle(fillCol, ready ? 0.55 : 0.35)
            g.beginPath()
            g.moveTo(cx, cy)
            g.arc(cx, cy, radius, -Math.PI / 2, endAngle, false)
            g.closePath()
            g.fillPath()
          }

          // Bordure
          g.lineStyle(3, borderCol, pulse)
          g.strokeCircle(cx, cy, boxSz / 2)
          if (ready) {
            g.lineStyle(6, 0x44ff88, 0.25)
            g.strokeCircle(cx, cy, boxSz / 2 + 4)
          }

          // Flèche direction d'esquive au centre
          const sz = Math.round(boxSz * 0.22)
          const dir: 'left'|'right'|'down' =
            this.atk === 'left' ? 'right' :
            this.atk === 'right' ? 'left' : 'down'

          const arrowCol = ready ? 0x44ff88 : 0xffffff
          g.fillStyle(arrowCol, ready ? 1 : 0.90)
          g.beginPath()
          if (dir === 'left') {
            g.moveTo(cx - sz, cy)
            g.lineTo(cx + sz * 0.5, cy - sz * 0.8)
            g.lineTo(cx + sz * 0.5, cy + sz * 0.8)
          } else if (dir === 'right') {
            g.moveTo(cx + sz, cy)
            g.lineTo(cx - sz * 0.5, cy - sz * 0.8)
            g.lineTo(cx - sz * 0.5, cy + sz * 0.8)
          } else {
            g.moveTo(cx, cy + sz)
            g.lineTo(cx - sz * 0.8, cy - sz * 0.5)
            g.lineTo(cx + sz * 0.8, cy - sz * 0.5)
          }
          g.closePath(); g.fillPath()
        }

        drawKeyHints() {
          const g = this.gKeys
          const W = this.W, H = this.H

          const pressed = [
            this.kA.isDown    || this.kLeft.isDown,
            this.kS.isDown    || this.kDown.isDown,
            this.kD.isDown    || this.kRight.isDown,
            this.kJ.isDown    || this.kSpace.isDown,
          ]

          const kBoxW = Math.round(W * 0.10)
          const kBoxH = Math.round(H * 0.060)
          const kGap  = Math.round(W * 0.014)
          const kTotalW = pressed.length * kBoxW + (pressed.length - 1) * kGap
          const kStartX = (W - kTotalW) / 2
          const kY = Math.round(H * 0.935)

          pressed.forEach((isDown, i) => {
            const bx = kStartX + i * (kBoxW + kGap)
            const isActive = this.activeKeyIdx === i

            if (isDown) {
              const col = isActive ? this.activeKeyCol : 0x44aaff
              g.fillStyle(col, 0.90)
              g.fillRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
              g.lineStyle(2, col, 1)
              g.strokeRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
              g.lineStyle(4, col, 0.35)
              g.strokeRoundedRect(bx - 2, kY - kBoxH / 2 - 2, kBoxW + 4, kBoxH + 4, 7)
              this.tK[i].setColor('#ffffff')
            } else if (isActive) {
              g.fillStyle(this.activeKeyCol, 0.30)
              g.fillRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
              g.lineStyle(2.5, this.activeKeyCol, 0.90)
              g.strokeRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
              g.lineStyle(5, this.activeKeyCol, 0.20)
              g.strokeRoundedRect(bx - 3, kY - kBoxH / 2 - 3, kBoxW + 6, kBoxH + 6, 8)
              const hexCol = this.activeKeyCol === 0xff2222 ? '#ff4444'
                : this.activeKeyCol === 0x44ff88 ? '#44ff88' : '#ffcc44'
              this.tK[i].setColor(hexCol)
            } else {
              g.fillStyle(0x0a0a14, 0.75)
              g.fillRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
              g.lineStyle(1.5, 0x334466, 0.50)
              g.strokeRoundedRect(bx, kY - kBoxH / 2, kBoxW, kBoxH, 5)
              this.tK[i].setColor('#555577')
            }
          })
        }

        drawHUD() {
          const g = this.gHUD
          const W = this.W, H = this.H
          const BW = this.BAR_W, BH = this.BAR_H, BY = this.BAR_Y

          // Top bar
          g.fillStyle(0x050510, 0.80)
          g.fillRoundedRect(0, 0, W, BY + BH + 12, { tl: 0, tr: 0, bl: 8, br: 8 })

          // Player HP
          if (!this.tutMode) {
            const pPct = Math.max(0, this.playerHP / PLAYER_MAX_HP)
            g.fillStyle(0x0d0d1e, 1).fillRoundedRect(14, BY, BW, BH, 5)
            if (pPct > 0) {
              g.fillStyle(pPct > 0.5 ? 0x22cc55 : pPct > 0.25 ? 0xffaa00 : 0xff2222, 1)
              g.fillRoundedRect(14, BY, Math.round(BW * pPct), BH, 5)
            }
            g.lineStyle(2, 0x111122, 0.9).strokeRoundedRect(14, BY, BW, BH, 5)
          }

          // Clippy HP — se vide de droite à gauche
          const cPct = Math.max(0, this.clippyHP / initialHP)
          const cBarX = W - 14 - BW
          const cFilledW = Math.round(BW * cPct)
          g.fillStyle(0x0d0d1e, 1).fillRoundedRect(cBarX, BY, BW, BH, 5)
          if (cPct > 0) {
            g.fillStyle(0xee3333, 1).fillRoundedRect(cBarX + BW - cFilledW, BY, cFilledW, BH, 5)
          }
          g.lineStyle(2, 0x111122, 0.9).strokeRoundedRect(cBarX, BY, BW, BH, 5)

          // Stars
          if (!this.tutMode) {
            for (let i = 0; i < 3; i++) {
              g.fillStyle(i < this.stars ? 0xffcc00 : 0x1a1a2e, 1)
              this.drawStar(g, W/2 - 30 + i * 30, BY + BH / 2, 12, 5.5)
            }
          }

          // Combo dots
          if (!this.tutMode && this.comboSeq.length > 1 && (this.gs === 'telegraph' || this.gs === 'attack' || this.gs === 'dodged')) {
            const dotR = 8
            const dotGap = 24
            const totalDotsW = this.comboSeq.length * dotR * 2 + (this.comboSeq.length - 1) * (dotGap - dotR * 2)
            const dotStartX = (W - totalDotsW) / 2
            const dotY = Math.round(H * 0.55)

            for (let i = 0; i < this.comboSeq.length; i++) {
              const dx = dotStartX + i * dotGap + dotR
              if (i < this.comboIdx) {
                g.fillStyle(0x44ff88, 0.9)
                g.fillCircle(dx, dotY, dotR)
              } else if (i === this.comboIdx) {
                g.fillStyle(0xff6600, 0.9)
                g.fillCircle(dx, dotY, dotR)
                g.lineStyle(2, 0xffaa00, 0.8)
                g.strokeCircle(dx, dotY, dotR + 3)
              } else {
                g.fillStyle(0x222233, 0.7)
                g.fillCircle(dx, dotY, dotR)
              }
            }
          }

          // Difficulty badge
          if (!this.tutMode) {
            const diff = getDiff(this.clippyHP, initialHP)
            if (diff.label) {
              const badgeCol = diff.label === 'RAGE MODE' ? 0xff2222 : diff.label === 'DANGER' ? 0xff6600 : 0xff8844
              const badgeW = Math.round(W * 0.14)
              const badgeH = 18
              const badgeX = W / 2 - badgeW / 2
              const badgeY = BY + BH + 6
              g.fillStyle(badgeCol, 0.25)
              g.fillRoundedRect(badgeX, badgeY, badgeW, badgeH, 4)
              g.lineStyle(1, badgeCol, 0.6)
              g.strokeRoundedRect(badgeX, badgeY, badgeW, badgeH, 4)
            }
          }
        }

        drawSpots() {
          const g = this.gSpots
          g.clear()
          const W = this.W, H = this.H
          const spots = [
            { a: this.spotAngle,          col: 0xff2222, r: W * 0.35 },
            { a: this.spotAngle2,         col: 0x2244ff, r: W * 0.30 },
            { a: this.spotAngle + 2.1,    col: 0xffcc00, r: W * 0.25 },
            { a: this.spotAngle2 + 1.5,   col: 0xff00ff, r: W * 0.20 },
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
      const sc = gameRef.current?.scene?.scenes?.[0] as any
      try { sc?.bgMusic?.pause(); sc.bgMusic = null } catch {}
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, zIndex: 99990 }} />
}
