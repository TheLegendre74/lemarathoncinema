'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { DANCE_BEATMAP } from './ClippyDanceBattleBeatmap'
import type { DanceNote } from './ClippyDanceBattleBeatmap'
import { saveDanceScore, getDanceLeaderboard } from '@/lib/actions'

type Dir = DanceNote['direction']
type LeaderEntry = { pseudo: string; score: number; max_combo: number }

interface Props {
  onWin:  () => void
  onLose: () => void
  onMiss?: () => void
  initialHP?: number
  userId?: string
}

const COLS: Dir[] = ['left', 'down', 'up', 'right']
const COL_ARROWS: Record<Dir, string>    = { left: '←', down: '↓', up: '↑', right: '→' }
const COL_HEX:    Record<Dir, number>    = { left: 0xff6699, down: 0x6699ff, up: 0x66ff99, right: 0xffcc44 }
const COL_CSS:    Record<Dir, string>    = { left: '#ff6699', down: '#6699ff', up: '#66ff99', right: '#ffcc44' }
const COL_DARK:   Record<Dir, number>    = { left: 0x661133, down: 0x112266, up: 0x116633, right: 0x664411 }

const NOTE_SPEED    = 380
const HIT_WIN_MS    = 170
const PERFECT_MS    = 85
const MAX_HP        = 10
const FEVER_AT      = 10     // combo threshold for fever
const FEVER_MS      = 10000  // fever duration
const AHEAD_MS      = 420    // ms before hit to light lane

// ── Post-game overlay ─────────────────────────────────────────────────────────

function PostGameOverlay({
  score, maxCombo, won, leader,
  onContinue,
}: {
  score: number; maxCombo: number; won: boolean
  leader: LeaderEntry[]; onContinue: () => void
}) {
  const myRank = leader.findIndex(e => e.score <= score) + 1 || leader.length + 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99990,
      background: 'rgba(4,0,12,.96)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '1.2rem', padding: '1.5rem',
      fontFamily: 'monospace',
    }}>
      {/* Résultat */}
      <div style={{ fontSize: 'clamp(1.6rem,5vw,2.4rem)', color: won ? '#4ade80' : '#e85a5a', fontWeight: 800, letterSpacing: 3, textShadow: `0 0 30px ${won ? '#4ade8088' : '#e85a5a88'}` }}>
        {won ? '🎉 VICTOIRE !' : '💀 DÉFAITE'}
      </div>

      {/* Scores */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '.7rem', color: '#888', letterSpacing: 2, marginBottom: '.2rem' }}>SCORE</div>
          <div style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', color: '#e8c46a', fontWeight: 700 }}>{score.toLocaleString()}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '.7rem', color: '#888', letterSpacing: 2, marginBottom: '.2rem' }}>COMBO MAX</div>
          <div style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', color: '#cc88ff', fontWeight: 700 }}>x{maxCombo}</div>
        </div>
        {leader.length > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '.7rem', color: '#888', letterSpacing: 2, marginBottom: '.2rem' }}>CLASSEMENT</div>
            <div style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', color: '#66ccff', fontWeight: 700 }}>#{Math.min(myRank, 10)}+</div>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      {leader.length > 0 && (
        <div style={{ width: '100%', maxWidth: 380, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '.6rem 1rem', fontSize: '.65rem', color: '#888', letterSpacing: 3, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
            🏆 TOP 10 — MEILLEURS SCORES
          </div>
          {leader.slice(0, 10).map((e, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '.8rem',
              padding: '.45rem 1rem',
              background: e.score === score ? 'rgba(232,196,106,.1)' : i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent',
              borderLeft: e.score === score ? '3px solid #e8c46a' : '3px solid transparent',
            }}>
              <span style={{ width: 20, fontSize: '.75rem', color: i < 3 ? ['#ffd700','#c0c0c0','#cd7f32'][i] : '#555', fontWeight: 700 }}>
                {i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}.`}
              </span>
              <span style={{ flex: 1, fontSize: '.82rem', color: e.score === score ? '#e8c46a' : '#ccc', fontWeight: e.score === score ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.pseudo}
              </span>
              <span style={{ fontSize: '.8rem', color: '#e8c46a', fontWeight: 600 }}>{e.score.toLocaleString()}</span>
              <span style={{ fontSize: '.7rem', color: '#cc88ff' }}>x{e.max_combo}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onContinue}
        style={{ marginTop: '.5rem', padding: '.75rem 2.5rem', borderRadius: 8, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.2)', color: '#fff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', letterSpacing: 2 }}
      >
        CONTINUER
      </button>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ClippyDanceBattle({ onWin, onLose, onMiss, initialHP, userId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onWinRef     = useRef(onWin)
  const onLoseRef    = useRef(onLose)
  const onMissRef    = useRef(onMiss)
  const finalScore   = useRef(0)
  const finalCombo   = useRef(0)
  const finalWon     = useRef(false)

  const [postGame, setPostGame] = useState<{
    score: number; maxCombo: number; won: boolean; leader: LeaderEntry[]
  } | null>(null)

  const showPostGame = useCallback(async (won: boolean) => {
    finalWon.current = won
    const score = finalScore.current, combo = finalCombo.current
    let leader: LeaderEntry[] = []
    try {
      if (userId && won) await saveDanceScore(score, combo)
      leader = await getDanceLeaderboard()
    } catch {}
    setPostGame({ score, maxCombo: combo, won, leader })
  }, [userId])

  useEffect(() => { onWinRef.current  = () => showPostGame(true)  }, [showPostGame])
  useEffect(() => { onLoseRef.current = () => showPostGame(false) }, [showPostGame])
  useEffect(() => { onMissRef.current = onMiss }, [onMiss])

  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let phaserGame: any = null
    let activeKeyListener: ((e: KeyboardEvent) => void) | null = null

    ;(async () => {
      const Phaser = (await import('phaser')).default
      if (destroyed || !containerRef.current) return

      const sceneMaxHP = initialHP ?? MAX_HP
      const isMobile   = window.matchMedia('(pointer: coarse)').matches

      class DDRScene extends Phaser.Scene {
        private readonly isMobile = isMobile
        // State
        private hp       = sceneMaxHP
        private score    = 0
        private combo    = 0
        private maxCombo = 0
        private fever    = false
        private feverEnd = 0
        private bmIdx    = 0
        private ended    = false
        private startTime = 0
        private readonly colCount = COLS.length

        // Audio
        private music!: Phaser.Sound.BaseSound

        // Notes
        private activeNotes: { obj: Phaser.GameObjects.Container; time: number; dir: Dir; judged: boolean }[] = []

        // Geometry
        private colX!:    number[]
        private hitY!:    number
        private spawnAdv!: number
        private laneW     = 0  // desktop only (col width)

        // Sprites / objects
        private clippySprite!:  Phaser.GameObjects.Image
        private hpText!:        Phaser.GameObjects.Text
        private scoreTxt!:      Phaser.GameObjects.Text
        private feedbackTxt!:   Phaser.GameObjects.Text
        private comboTxt!:      Phaser.GameObjects.Text
        private feverLabel!:    Phaser.GameObjects.Text
        private feverBar!:      Phaser.GameObjects.Rectangle
        private feverBarBg!:    Phaser.GameObjects.Rectangle
        private multiBadge!:    Phaser.GameObjects.Text  // "×2"

        // Desktop DDR mat
        private matTilePos: Record<Dir, { x: number; y: number }> = {} as any
        private matTileBg:  Record<Dir, Phaser.GameObjects.Rectangle> = {} as any
        private matCenterX  = 0
        private laneCenterX = 0

        // Mobile lane visuals
        private clippyZoneH  = 0
        private clippyTopY   = 0
        private laneFlashBg: Phaser.GameObjects.Rectangle[] = []
        private hitRings:    Phaser.GameObjects.Arc[] = []

        // Sync tracking
        private lastLitDir: Dir | null = null

        constructor() { super({ key: 'DDRScene' }) }

        preload() {
          this.load.audio('ddr-music', '/audio/clippy/nightclub.m4a')
          this.load.image('evil-clippy-disco', '/evil-clippy-disco.png')
        }

        // ── Timing ──────────────────────────────────────────────────────────

        private getElapsed(): number {
          const seek = ((this.music as any)?.seek ?? 0) * 1000
          return seek > 50 ? seek : Math.max(0, this.time.now - this.startTime)
        }

        // ── Create ──────────────────────────────────────────────────────────

        create() {
          const W = this.scale.width, H = this.scale.height

          this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setAlpha(0.55)
          const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x150025).setAlpha(0)
          this.tweens.add({ targets: bg, alpha: { from: 0, to: 0.32 }, duration: 650, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

          if (this.isMobile) this.setupMobile(W, H)
          else               this.setupDesktop(W, H)

          this.buildComboHUD(W, H)
          this.buildFeverBar(W, H)

          // Keyboard
          const kbMap: Record<string, Dir> = { ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up', ArrowRight: 'right' }
          const kbListener = (e: KeyboardEvent) => {
            const dir = kbMap[e.key]; if (!dir) return
            e.preventDefault(); e.stopImmediatePropagation()
            if (!this.ended) this.handleInput(dir, this.getElapsed())
          }
          activeKeyListener = kbListener
          window.addEventListener('keydown', kbListener, true)

          // Touch (mobile — whole column tap)
          if (this.isMobile) {
            this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              if (this.ended || ptr.y < this.clippyZoneH) return
              this.handleInput(COLS[Math.min(3, Math.floor(ptr.x / (this.scale.width / 4)))], this.getElapsed())
            })
          }

          // Music
          this.music = this.sound.add('ddr-music', { loop: false, volume: 0.85 })
          this.music.play()
          this.startTime = this.time.now

          const last = DANCE_BEATMAP[DANCE_BEATMAP.length - 1]
          this.time.addEvent({ delay: last.time + 2200, callback: () => { if (!this.ended) this.endGame('win') } })
        }

        // ── Desktop layout ──────────────────────────────────────────────────

        private setupDesktop(W: number, H: number) {
          this.hitY     = Math.round(H * 0.82)
          this.spawnAdv = ((this.hitY + 80) / NOTE_SPEED) * 1000

          const totalLaneW = Math.min(W * 0.38, 280)
          this.laneW       = Math.round(totalLaneW / 4)
          const laneX0     = Math.round(W / 2 - totalLaneW / 2)
          this.laneCenterX = Math.round(W / 2)
          this.colX = COLS.map((_, i) => Math.round(laneX0 + (i + 0.5) * totalLaneW / this.colCount))

          // Lane backdrops
          this.add.rectangle(this.laneCenterX, H / 2, totalLaneW + 18, H, 0x000000).setAlpha(0.38)
          this.colX.forEach((x, i) => {
            const dir = COLS[i]
            const g = this.add.graphics()
            g.fillStyle(COL_HEX[dir], 0.07)
            g.fillRect(x - this.laneW / 2 + 3, 0, this.laneW - 6, H)
            if (i > 0) { const sep = this.add.rectangle(x - this.laneW / 2, H / 2, 1, H, 0xffffff); sep.setAlpha(0.06) }
          })
          // Hit-zone targets
          this.colX.forEach((x, i) => {
            const dir = COLS[i], col = COL_HEX[dir]
            const ring = this.add.circle(x, this.hitY, 30, col, 0.12); ring.setStrokeStyle(2.5, col, 0.75)
            this.tweens.add({ targets: ring, scaleX: 1.1, scaleY: 1.1, duration: 550, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
            this.add.text(x, this.hitY, COL_ARROWS[dir], { fontSize: '28px', color: COL_CSS[dir], fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.35)
          })
          this.add.rectangle(this.laneCenterX, this.hitY, totalLaneW + 10, 2, 0xffffff).setAlpha(0.12)

          // DDR mat (Clippy, right of lanes)
          const TW = Math.min(Math.max(72, H * 0.095), 100)
          const GAP = 8
          const matPanelW = Math.round(TW * 3 + GAP * 4 + 24)
          const matPanelH = Math.round(TW * 3 + GAP * 4 + 50)
          const laneRight  = Math.round(W / 2 + totalLaneW / 2)
          this.matCenterX  = Math.min(Math.round(laneRight + 50 + matPanelW / 2), W - Math.round(matPanelW / 2) - 12)
          const mY = Math.round(H * 0.50)

          this.matTilePos = {
            up:    { x: this.matCenterX,            y: mY - TW - GAP },
            down:  { x: this.matCenterX,            y: mY + TW + GAP },
            left:  { x: this.matCenterX - TW - GAP, y: mY },
            right: { x: this.matCenterX + TW + GAP, y: mY },
          }
          this.add.rectangle(this.matCenterX, mY, matPanelW, matPanelH, 0x060010).setAlpha(0.85)
          const mborder = this.add.graphics(); mborder.lineStyle(1.5, 0x9966ff, 0.45)
          mborder.strokeRect(this.matCenterX - matPanelW / 2, mY - matPanelH / 2, matPanelW, matPanelH)

          this.matTileBg = {} as Record<Dir, Phaser.GameObjects.Rectangle>
          ;(['up','down','left','right'] as Dir[]).forEach(dir => {
            const pos = this.matTilePos[dir], col = COL_HEX[dir]
            const bg = this.add.rectangle(pos.x, pos.y, TW - 4, TW - 4, col).setAlpha(0.18)
            this.matTileBg[dir] = bg
            const g = this.add.graphics(); g.lineStyle(1.5, col, 0.45)
            g.strokeRect(pos.x - (TW-4)/2, pos.y - (TW-4)/2, TW-4, TW-4)
            this.add.text(pos.x, pos.y, COL_ARROWS[dir], { fontSize: `${Math.round(TW*.50)}px`, color: COL_CSS[dir], fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.5)
          })
          // Center tile
          this.add.rectangle(this.matCenterX, mY, TW-4, TW-4, 0x1a0044).setAlpha(0.6)
          const gc = this.add.graphics(); gc.lineStyle(1, 0x9966ff, 0.25)
          gc.strokeRect(this.matCenterX - (TW-4)/2, mY - (TW-4)/2, TW-4, TW-4)
          this.add.text(this.matCenterX, mY - matPanelH/2 - 12, '📎 CLIPPY', { fontSize: '13px', color: '#cc88ff', fontFamily: 'monospace' }).setOrigin(0.5, 1)

          this.clippySprite = this.add.image(this.matCenterX, mY, 'evil-clippy-disco')
          this.clippySprite.setDisplaySize(TW * 0.88, TW * 0.88)

          // VS separator
          const matLeft = this.matCenterX - matPanelW / 2
          const sepX = Math.round((laneRight + matLeft) / 2)
          this.add.text(sepX, Math.round(H * 0.50), 'VS', { fontSize: '22px', color: '#cc88ff', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.45)

          // HUD
          this.hpText  = this.add.text(14, 14, this.buildHpStr(), { fontSize: '16px', fontFamily: 'monospace' }).setAlpha(0)
          this.scoreTxt = this.add.text(laneX0 - 6, 14, 'Score: 0', { fontSize: '13px', color: '#ccc', fontFamily: 'monospace' }).setOrigin(1, 0)
          this.feedbackTxt = this.add.text(this.laneCenterX, Math.round(H * 0.61), '', { fontSize: '38px', fontStyle: 'bold', fontFamily: 'monospace' }).setOrigin(0.5)
          this.add.text(this.laneCenterX, 14, '🎵  DUEL DE DANSE  🎵', { fontSize: '13px', color: '#cc88ff', letterSpacing: 3, fontFamily: 'monospace' }).setOrigin(0.5, 0)
        }

        // ── Mobile layout (Guitar Hero) ─────────────────────────────────────

        private setupMobile(W: number, H: number) {
          this.clippyZoneH = Math.round(H * 0.28)
          this.clippyTopY  = this.clippyZoneH   // Clippy centré sur la barre
          this.hitY        = Math.round(H * 0.87)
          this.spawnAdv    = (this.hitY - this.clippyZoneH) / NOTE_SPEED * 1000

          const colW = Math.round(W / 4)
          this.laneW = colW
          this.colX  = COLS.map((_, i) => Math.round((i + 0.5) * W / this.colCount))

          // Clippy zone
          this.add.rectangle(W / 2, this.clippyZoneH / 2, W, this.clippyZoneH, 0x080018).setAlpha(0.90)
          this.add.rectangle(W / 2, this.clippyZoneH, W, 2, 0x9966ff).setAlpha(0.55)
          this.add.text(W / 2, 7, '🎵 DUEL DE DANSE 🎵', { fontSize: '11px', color: '#cc88ff', fontFamily: 'monospace', letterSpacing: 1 }).setOrigin(0.5, 0)

          const cSize = Math.round(Math.min(this.clippyZoneH * 0.78, W * 0.30))
          this.clippySprite = this.add.image(W / 2, this.clippyTopY, 'evil-clippy-disco')
          this.clippySprite.setDisplaySize(cSize, cSize)

          // Lanes with colored gradient-ish backgrounds
          const laneZoneH = H - this.clippyZoneH
          const laneZoneY = this.clippyZoneH + laneZoneH / 2
          this.laneFlashBg = COLS.map((dir, i) => {
            const x = this.colX[i], col = COL_HEX[dir]
            // Lane tint background
            const g = this.add.graphics()
            g.fillStyle(col, 0.06); g.fillRect(x - colW / 2 + 2, this.clippyZoneH, colW - 4, laneZoneH)
            // Separator
            if (i > 0) { const sep = this.add.rectangle(x - colW / 2, laneZoneY, 1, laneZoneH, 0x9966ff); sep.setAlpha(0.18) }
            // Direction label at top of lane
            this.add.text(x, this.clippyZoneH + 9, COL_ARROWS[dir], { fontSize: `${Math.round(colW * 0.28)}px`, color: COL_CSS[dir], fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5, 0).setAlpha(0.38)
            // Flash background (opacity controlled per-frame)
            const flash = this.add.rectangle(x, laneZoneY, colW - 4, laneZoneH, col); flash.setAlpha(0)
            return flash
          })

          // Hit line
          this.add.rectangle(W / 2, this.hitY, W, 2, 0xffffff).setAlpha(0.14)

          // Hit zone targets (rings + arrows)
          this.hitRings = COLS.map((dir, i) => {
            const x = this.colX[i], col = COL_HEX[dir]
            const r = Math.round(colW * 0.34)
            // Outer glow ring (pulsing)
            const outerRing = this.add.circle(x, this.hitY, r + 6, col, 0.06); outerRing.setStrokeStyle(2, col, 0.35)
            this.tweens.add({ targets: outerRing, scaleX: 1.10, scaleY: 1.10, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
            // Inner ring (hit target)
            const ring = this.add.circle(x, this.hitY, r, col, 0.14); ring.setStrokeStyle(2.5, col, 0.80)
            // Arrow
            this.add.text(x, this.hitY, COL_ARROWS[dir], { fontSize: `${Math.round(r * 1.05)}px`, color: COL_CSS[dir], fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.55)
            return ring
          })

          // HUD
          this.hpText  = this.add.text(6, this.clippyZoneH - 20, this.buildHpStr(), { fontSize: '12px', fontFamily: 'monospace' }).setAlpha(0)
          this.scoreTxt = this.add.text(W - 6, 8, 'Score: 0', { fontSize: '11px', color: '#ccc', fontFamily: 'monospace' }).setOrigin(1, 0)
          this.feedbackTxt = this.add.text(W / 2, Math.round(H * 0.73), '', { fontSize: '36px', fontStyle: 'bold', fontFamily: 'monospace' }).setOrigin(0.5)
        }

        // ── HUD helpers ─────────────────────────────────────────────────────

        private buildComboHUD(W: number, H: number) {
          const y = this.isMobile ? Math.round(H * 0.64) : Math.round(H * 0.70)
          this.comboTxt = this.add.text(W / 2, y, '', { fontSize: '20px', fontStyle: 'bold', fontFamily: 'monospace', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setAlpha(0)
          this.feverLabel = this.add.text(W / 2, y - 28, '', { fontSize: '22px', fontStyle: 'bold', fontFamily: 'monospace', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setAlpha(0)
          this.multiBadge = this.add.text(W / 2 + 60, this.isMobile ? 42 : 36, '', { fontSize: '18px', fontStyle: 'bold', fontFamily: 'monospace', color: '#ff9944', stroke: '#000', strokeThickness: 3 }).setOrigin(0, 0.5).setAlpha(0)
        }

        private buildFeverBar(W: number, H: number) {
          const barY  = this.isMobile ? this.clippyZoneH - 6 : H - 8
          const barW  = W - 40
          this.feverBarBg = this.add.rectangle(W / 2, barY, barW, 6, 0x221100).setAlpha(0).setDepth(10)
          this.feverBar   = this.add.rectangle(W / 2, barY, barW, 6, 0xff8800).setAlpha(0).setDepth(11)
          this.feverBar.setOrigin(0, 0.5)
          this.feverBar.setX(W / 2 - barW / 2)
        }

        // ── Update ──────────────────────────────────────────────────────────

        update() {
          if (this.ended) return
          const elapsed = this.getElapsed()

          // Spawn notes
          while (this.bmIdx < DANCE_BEATMAP.length && DANCE_BEATMAP[this.bmIdx].time - elapsed < this.spawnAdv) {
            const note = DANCE_BEATMAP[this.bmIdx]
            if (note.time >= elapsed - 200) this.spawnNote(note.direction, note.time)
            this.bmIdx++
          }

          // Move notes + miss check
          for (const n of this.activeNotes) {
            if (n.judged) continue
            const tth = n.time - elapsed
            n.obj.setY(this.hitY - (tth / 1000) * NOTE_SPEED)
            if (tth < -(HIT_WIN_MS + 10)) { n.judged = true; n.obj.destroy(); this.doMiss() }
          }
          this.activeNotes = this.activeNotes.filter(n => !n.judged)

          // Feedback fade
          if (this.feedbackTxt.alpha > 0) this.feedbackTxt.setAlpha(Math.max(0, this.feedbackTxt.alpha - 0.022))
          if (this.comboTxt.alpha > 0 && this.combo === 0) this.comboTxt.setAlpha(Math.max(0, this.comboTxt.alpha - 0.025))

          // Fever timer
          if (this.fever) {
            const remaining = this.feverEnd - (this.time.now)
            if (remaining <= 0) {
              this.fever = false
              this.feverLabel.setAlpha(0); this.multiBadge.setAlpha(0)
              this.feverBarBg.setAlpha(0); this.feverBar.setAlpha(0)
            } else {
              const ratio = remaining / FEVER_MS
              const W = this.scale.width
              this.feverBar.setDisplaySize((W - 40) * ratio, 6)
            }
          }

          // ── Lane highlight sync: light lane of note CLOSEST to hitY within AHEAD_MS ──
          const litDirs = new Set<Dir>()
          let closestDir: Dir | null = null, closestDist = Infinity
          for (const n of this.activeNotes) {
            if (n.judged) continue
            const tth = n.time - elapsed
            if (tth >= -HIT_WIN_MS && tth <= AHEAD_MS) {
              litDirs.add(n.dir)
              if (Math.abs(tth) < closestDist) { closestDist = Math.abs(tth); closestDir = n.dir }
            }
          }

          if (this.isMobile) {
            this.laneFlashBg.forEach((bg, i) => bg.setAlpha(litDirs.has(COLS[i]) ? 0.20 : 0))
            // Clippy glides to the upcoming direction
            if (closestDir && closestDir !== this.lastLitDir) {
              this.lastLitDir = closestDir
              const idx = COLS.indexOf(closestDir)
              this.tweens.killTweensOf(this.clippySprite)
              this.tweens.add({ targets: this.clippySprite, x: this.colX[idx], y: this.clippyTopY, duration: 80, ease: 'Power2' })
            }
          } else {
            // Desktop: mat tile lighting follows closest note (separate from Clippy movement on spawn)
            if (closestDir && closestDir !== this.lastLitDir) {
              this.lastLitDir = closestDir
              ;(['up','down','left','right'] as Dir[]).forEach(d => {
                if (this.matTileBg[d]) this.matTileBg[d].setAlpha(d === closestDir ? 0.78 : 0.18)
              })
            }
          }
        }

        // ── Spawn note ──────────────────────────────────────────────────────

        private spawnNote(dir: Dir, hitTime: number) {
          const colIdx = COLS.indexOf(dir)
          const x      = this.colX[colIdx]
          const col    = COL_HEX[dir]
          const W      = this.scale.width

          const noteW = this.isMobile ? Math.round(W / 4 * 0.76) : Math.round(this.laneW * 0.74)
          const noteH = Math.round(noteW * 0.40)
          const r     = Math.round(noteH / 2)

          const container = this.add.container(x, -noteH * 2)

          // Glow
          const gfxGlow = this.add.graphics()
          gfxGlow.fillStyle(col, 0.20)
          gfxGlow.fillRoundedRect(-noteW / 2 - 5, -noteH / 2 - 5, noteW + 10, noteH + 10, r + 5)

          // Body
          const gfxBody = this.add.graphics()
          gfxBody.fillStyle(col, 1)
          gfxBody.fillRoundedRect(-noteW / 2, -noteH / 2, noteW, noteH, r)
          // Highlight strip
          gfxBody.fillStyle(0xffffff, 0.22)
          gfxBody.fillRoundedRect(-noteW / 2 + 4, -noteH / 2 + 3, noteW - 8, Math.round(noteH * 0.38), Math.min(r, 4))

          const arrow = this.add.text(0, 0, COL_ARROWS[dir], {
            fontSize: `${Math.round(noteH * 1.15)}px`, color: '#ffffff',
            fontFamily: 'monospace', fontStyle: 'bold',
            stroke: '#00000033', strokeThickness: 2,
          }).setOrigin(0.5)

          container.add([gfxGlow, gfxBody, arrow])
          this.activeNotes.push({ obj: container, time: hitTime, dir, judged: false })

          // Desktop: Clippy moves on spawn (shows upcoming direction)
          if (!this.isMobile) {
            this.tweens.killTweensOf(this.clippySprite)
            this.tweens.add({ targets: this.clippySprite, x: this.matTilePos[dir].x, y: this.matTilePos[dir].y, duration: 90, ease: 'Back.Out' })
          }
        }

        // ── Input handling ──────────────────────────────────────────────────

        private handleInput(dir: Dir, elapsed: number) {
          let best: typeof this.activeNotes[0] | null = null, bestDelta = Infinity
          for (const n of this.activeNotes) {
            if (n.judged || n.dir !== dir) continue
            const d = Math.abs(n.time - elapsed)
            if (d < bestDelta) { bestDelta = d; best = n }
          }
          if (!best || bestDelta > HIT_WIN_MS) return

          best.judged = true; best.obj.destroy()
          const perfect = bestDelta <= PERFECT_MS
          const multiplier = this.fever ? 2 : 1
          const pts = (perfect ? 100 : 50) * multiplier
          this.score += pts; finalScore.current = this.score

          // Combo
          this.combo++
          if (this.combo > this.maxCombo) { this.maxCombo = this.combo; finalCombo.current = this.maxCombo }
          if (this.combo >= FEVER_AT && !this.fever) this.activateFever()
          this.refreshComboDisplay()

          this.showFeedback(perfect ? 'PERFECT !' : 'GOOD !', perfect ? '#4ade80' : '#ffcc44')
          this.scoreTxt.setText(`Score: ${this.score}`)

          // Flash hit ring (mobile)
          if (this.isMobile) {
            const ring = this.hitRings[COLS.indexOf(dir)]
            if (ring) { ring.setAlpha(0.75); this.tweens.add({ targets: ring, alpha: 0.14, duration: 180 }) }
          }
        }

        private doMiss() {
          this.hp = Math.max(0, this.hp - 1)
          this.hpText.setText(this.buildHpStr())
          this.showFeedback('MISS !', '#e85a5a')
          onMissRef.current?.()
          // Combo reset
          this.combo = 0; this.fever = false
          this.comboTxt.setAlpha(0); this.feverLabel.setAlpha(0)
          this.multiBadge.setAlpha(0); this.feverBarBg.setAlpha(0); this.feverBar.setAlpha(0)
          if (this.hp <= 0) this.endGame('lose')
        }

        // ── Fever ───────────────────────────────────────────────────────────

        private activateFever() {
          this.fever = true; this.feverEnd = this.time.now + FEVER_MS
          const W = this.scale.width
          this.feverLabel.setText('🔥 FEVER !').setColor('#ff8800').setAlpha(1)
          this.tweens.add({ targets: this.feverLabel, scaleX: 1.25, scaleY: 1.25, duration: 200, yoyo: true, ease: 'Back.Out' })
          this.multiBadge.setText('×2').setAlpha(1)
          this.feverBarBg.setAlpha(0.35); this.feverBar.setAlpha(1)
          this.feverBar.setDisplaySize(W - 40, 6)
        }

        private refreshComboDisplay() {
          if (this.combo < 2) { this.comboTxt.setAlpha(0); return }
          const color = this.fever ? '#ff8800' : this.combo >= 20 ? '#cc88ff' : this.combo >= 10 ? '#ffcc44' : '#ffffff'
          this.comboTxt.setText(`COMBO  ×${this.combo}`).setColor(color).setAlpha(1)
          this.tweens.add({ targets: this.comboTxt, scaleX: 1.15, scaleY: 1.15, duration: 120, yoyo: true, ease: 'Back.Out' })
        }

        // ── Helpers ─────────────────────────────────────────────────────────

        private showFeedback(text: string, color: string) {
          this.feedbackTxt.setText(text).setColor(color).setAlpha(1)
        }

        private buildHpStr() {
          return '❤️'.repeat(this.hp) + '🖤'.repeat(sceneMaxHP - this.hp)
        }

        private endGame(result: 'win' | 'lose') {
          if (this.ended) return
          this.ended = true
          finalScore.current = this.score
          finalCombo.current = this.maxCombo
          this.sound.stopAll()
          this.time.addEvent({
            delay: result === 'win' ? 900 : 600,
            callback: () => { if (result === 'win') onWinRef.current(); else onLoseRef.current() },
          })
        }
      }

      phaserGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        transparent: true,
        scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: [DDRScene],
        audio: { disableWebAudio: false },
        banner: false,
      })
    })()

    return () => {
      destroyed = true
      if (activeKeyListener) { window.removeEventListener('keydown', activeKeyListener, true); activeKeyListener = null }
      phaserGame?.destroy(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Post-game overlay ───────────────────────────────────────────────────────
  if (postGame) {
    return (
      <PostGameOverlay
        score={postGame.score}
        maxCombo={postGame.maxCombo}
        won={postGame.won}
        leader={postGame.leader}
        onContinue={() => {
          setPostGame(null)
          if (finalWon.current) onWin(); else onLose()
        }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, zIndex: 99985, outline: 'none' }}
    />
  )
}
