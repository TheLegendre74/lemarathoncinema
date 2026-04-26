'use client'
import { useEffect, useRef } from 'react'
import { DANCE_BEATMAP } from './ClippyDanceBattleBeatmap'
import type { DanceNote } from './ClippyDanceBattleBeatmap'

type Dir = DanceNote['direction']

interface Props {
  onWin: () => void
  onLose: () => void
  onMiss?: () => void
  initialHP?: number
}

const COLS: Dir[] = ['left', 'down', 'up', 'right']
const COL_ARROWS: Record<Dir, string>  = { left: '←', down: '↓', up: '↑', right: '→' }
const COL_COLORS_HEX: Record<Dir, number> = { left: 0xff6699, down: 0x6699ff, up: 0x66ff99, right: 0xffcc44 }
const COL_LABEL_CSS: Record<Dir, string>  = { left: '#ff6699', down: '#6699ff', up: '#66ff99', right: '#ffcc44' }

const NOTE_SPEED    = 380
const HIT_WINDOW_MS = 160
const PERFECT_MS    = 80
const MAX_HP        = 10

export default function ClippyDanceBattle({ onWin, onLose, onMiss, initialHP }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onWinRef     = useRef(onWin)
  const onLoseRef    = useRef(onLose)
  const onMissRef    = useRef(onMiss)

  useEffect(() => { onWinRef.current  = onWin  }, [onWin])
  useEffect(() => { onLoseRef.current = onLose }, [onLose])
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
      // Détection mobile une seule fois, capturée dans la closure de la classe
      const isMobile = window.matchMedia('(pointer: coarse)').matches

      class DDRScene extends Phaser.Scene {
        // Capturé depuis la closure — valeur stable pendant toute la vie de la scène
        private readonly isMobile = isMobile

        private hp        = sceneMaxHP
        private score     = 0
        private bmIdx     = 0
        private activeNotes: { obj: Phaser.GameObjects.Container; time: number; dir: Dir; judged: boolean }[] = []
        private startTime = 0
        private hpText!:      Phaser.GameObjects.Text
        private scoreTxt!:    Phaser.GameObjects.Text
        private feedbackTxt!: Phaser.GameObjects.Text
        private colX!:    number[]
        private hitY!:    number
        private spawnAdv!: number
        private ended     = false
        private discoBg!: Phaser.GameObjects.Rectangle
        private readonly colCount = COLS.length

        // Sprite Clippy partagé desktop + mobile
        private clippySprite!: Phaser.GameObjects.Image

        // Desktop uniquement
        private matTilePos: Record<Dir, { x: number; y: number }> = {} as Record<Dir, { x: number; y: number }>
        private matTileBg:  Record<Dir, Phaser.GameObjects.Rectangle> = {} as Record<Dir, Phaser.GameObjects.Rectangle>
        private matCenterX  = 0
        private laneCenterX = 0

        // Mobile uniquement
        private clippyZoneH = 0          // hauteur de la bande Clippy (haut d'écran)
        private clippyTopY  = 0          // Y centre de la bande Clippy
        private laneFlashBg: Phaser.GameObjects.Rectangle[] = []
        private hitCircles:  Phaser.GameObjects.Arc[]       = []

        constructor() { super({ key: 'DDRScene' }) }

        preload() {
          this.load.audio('ddr-music', '/audio/clippy/nightclub.m4a')
          this.load.image('evil-clippy-disco', '/evil-clippy-disco.png')
        }

        create() {
          const W = this.scale.width
          const H = this.scale.height

          // Fond commun
          this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setAlpha(0.52)
          this.discoBg = this.add.rectangle(W / 2, H / 2, W, H, 0x1a0035).setAlpha(0)
          this.tweens.add({
            targets: this.discoBg,
            alpha: { from: 0, to: 0.28 },
            duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          })

          if (this.isMobile) {
            this.setupMobile(W, H)
          } else {
            this.setupDesktop(W, H)
          }

          // Clavier (desktop, ou fallback mobile si bluetooth)
          const keyMap: Record<string, Dir> = {
            ArrowLeft: 'left', ArrowDown: 'down', ArrowUp: 'up', ArrowRight: 'right',
          }
          const kbListener = (e: KeyboardEvent) => {
            const dir = keyMap[e.key]
            if (!dir) return
            e.preventDefault(); e.stopImmediatePropagation()
            if (this.ended) return
            this.handleInput(dir, this.time.now - this.startTime)
          }
          activeKeyListener = kbListener
          window.addEventListener('keydown', kbListener, true)

          // Touch Phaser — mobile uniquement (tap n'importe où dans la colonne)
          if (this.isMobile) {
            this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
              if (this.ended) return
              // Ignore les taps dans la zone Clippy (haut d'écran)
              if (ptr.y < this.clippyZoneH) return
              const colIdx = Math.min(3, Math.floor(ptr.x / (this.scale.width / 4)))
              this.handleInput(COLS[colIdx], this.time.now - this.startTime)
            })
          }

          // Musique + timer de fin
          this.sound.add('ddr-music', { loop: false, volume: 0.85 }).play()
          this.startTime = this.time.now
          const lastNote = DANCE_BEATMAP[DANCE_BEATMAP.length - 1]
          this.time.addEvent({
            delay: lastNote.time + 2200,
            callback: () => { if (!this.ended) this.endGame('win') },
          })
        }

        // ── Layout DESKTOP — lanes centrées, tapis DDR à droite ────────────

        private setupDesktop(W: number, H: number) {
          this.hitY     = Math.round(H * 0.82)
          this.spawnAdv = ((this.hitY + 80) / NOTE_SPEED) * 1000

          // Lanes centrées horizontalement
          const laneW  = Math.min(W * 0.38, 280)
          const laneX0 = Math.round(W / 2 - laneW / 2)
          this.laneCenterX = Math.round(W / 2)
          this.colX = COLS.map((_, i) => Math.round(laneX0 + (i + 0.5) * (laneW / this.colCount)))

          this.add.rectangle(this.laneCenterX, H / 2, laneW + 18, H, 0x000000).setAlpha(0.35)
          this.colX.forEach((x, i) => {
            const dir = COLS[i]
            this.add.rectangle(x, H / 2, Math.round(laneW / this.colCount) - 6, H, 0x0d0828).setAlpha(0.55)
            this.add.circle(x, this.hitY, 32, 0x000000, 0).setStrokeStyle(3, COL_COLORS_HEX[dir], 0.55)
            this.add.text(x, this.hitY, COL_ARROWS[dir], { fontSize: '32px', color: COL_LABEL_CSS[dir], fontFamily: 'monospace' }).setOrigin(0.5).setAlpha(0.30)
          })
          this.add.rectangle(this.laneCenterX, this.hitY, laneW + 10, 2, 0xffffff, 0.18)

          // Tapis DDR Clippy — à droite des lanes, jamais chevauchant
          const TW  = Math.min(Math.max(72, H * 0.095), 100)  // cases plus grandes
          const GAP = 8
          const matPanelW = Math.round(TW * 3 + GAP * 4 + 24)
          const matPanelH = Math.round(TW * 3 + GAP * 4 + 50)
          const laneRightEdge = Math.round(W / 2 + laneW / 2)
          // Position : 50px après le bord droit des lanes, capée pour rester dans l'écran
          this.matCenterX = Math.min(
            Math.round(laneRightEdge + 50 + matPanelW / 2),
            W - Math.round(matPanelW / 2) - 12
          )
          const matCenterY = Math.round(H * 0.50)

          this.matTilePos = {
            up:    { x: this.matCenterX,            y: matCenterY - TW - GAP },
            down:  { x: this.matCenterX,            y: matCenterY + TW + GAP },
            left:  { x: this.matCenterX - TW - GAP, y: matCenterY },
            right: { x: this.matCenterX + TW + GAP, y: matCenterY },
          }
          this.add.rectangle(this.matCenterX, matCenterY, matPanelW, matPanelH, 0x080018).setAlpha(0.78)
          const border = this.add.graphics()
          border.lineStyle(2, 0x9966ff, 0.55)
          border.strokeRect(this.matCenterX - matPanelW / 2, matCenterY - matPanelH / 2, matPanelW, matPanelH)

          this.matTileBg = {} as Record<Dir, Phaser.GameObjects.Rectangle>
          ;(['up', 'down', 'left', 'right'] as Dir[]).forEach(dir => {
            const pos = this.matTilePos[dir]
            const col = COL_COLORS_HEX[dir]
            const bg  = this.add.rectangle(pos.x, pos.y, TW - 4, TW - 4, col).setAlpha(0.2)
            this.matTileBg[dir] = bg
            const g = this.add.graphics()
            g.lineStyle(2, col, 0.5)
            g.strokeRect(pos.x - (TW - 4) / 2, pos.y - (TW - 4) / 2, TW - 4, TW - 4)
            this.add.text(pos.x, pos.y, COL_ARROWS[dir], { fontSize: `${Math.round(TW * 0.52)}px`, color: COL_LABEL_CSS[dir], fontFamily: 'monospace' }).setOrigin(0.5).setAlpha(0.55)
          })
          this.add.rectangle(this.matCenterX, matCenterY, TW - 4, TW - 4, 0x221144).setAlpha(0.55)
          const gc = this.add.graphics()
          gc.lineStyle(1, 0x9966ff, 0.3)
          gc.strokeRect(this.matCenterX - (TW - 4) / 2, matCenterY - (TW - 4) / 2, TW - 4, TW - 4)
          this.add.text(this.matCenterX, matCenterY - matPanelH / 2 - 10, '📎 CLIPPY', { fontSize: '14px', color: '#cc88ff', fontFamily: 'monospace' }).setOrigin(0.5, 1)

          // Clippy plus grand sur le tapis
          this.clippySprite = this.add.image(this.matCenterX, matCenterY, 'evil-clippy-disco')
          this.clippySprite.setDisplaySize(TW * 0.88, TW * 0.88)

          // Séparateur VS entre lanes et tapis
          const matLeftEdge = this.matCenterX - matPanelW / 2
          const sepX = Math.round((laneRightEdge + matLeftEdge) / 2)
          this.add.text(sepX, Math.round(H * 0.50), 'VS', { fontSize: '24px', color: '#cc88ff', fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.5)

          // HUD
          this.hpText = this.add.text(14, 14, this.buildHpString(), { fontSize: '18px', fontFamily: 'monospace' }).setAlpha(0)
          this.scoreTxt = this.add.text(laneX0 - 6, 14, 'Score: 0', { fontSize: '14px', color: '#cccccc', fontFamily: 'monospace' }).setOrigin(1, 0)
          this.feedbackTxt = this.add.text(this.laneCenterX, Math.round(H * 0.62), '', { fontSize: '36px', fontStyle: 'bold', fontFamily: 'monospace' }).setOrigin(0.5)
          this.add.text(this.laneCenterX, 18, '🎵  DUEL DE DANSE  🎵', { fontSize: '14px', color: '#cc88ff', letterSpacing: 3, fontFamily: 'monospace' }).setOrigin(0.5, 0)
        }

        // ── Layout MOBILE — Guitar Hero plein écran ─────────────────────────

        private setupMobile(W: number, H: number) {
          // Zone Clippy en haut (~28% de l'écran)
          this.clippyZoneH = Math.round(H * 0.28)
          this.clippyTopY  = Math.round(this.clippyZoneH / 2)

          // Ligne de frappe à 87% de l'écran
          this.hitY     = Math.round(H * 0.87)
          // Les notes apparaissent au bord de la zone Clippy et tombent jusqu'à hitY
          this.spawnAdv = (this.hitY - this.clippyZoneH) / NOTE_SPEED * 1000

          // 4 colonnes pleine largeur
          const colW = Math.round(W / 4)
          this.colX  = COLS.map((_, i) => Math.round((i + 0.5) * W / this.colCount))

          // ── Bande Clippy (fond + séparateur)
          this.add.rectangle(W / 2, this.clippyZoneH / 2, W, this.clippyZoneH, 0x08001a).setAlpha(0.88)
          this.add.rectangle(W / 2, this.clippyZoneH, W, 2, 0x9966ff).setAlpha(0.55)

          // Clippy positionné sur la barre séparatrice (centre = séparateur)
          const clippySize = Math.round(Math.min(this.clippyZoneH * 0.78, W * 0.30))
          this.clippyTopY  = this.clippyZoneH  // centre de Clippy pile sur la barre
          this.clippySprite = this.add.image(W / 2, this.clippyTopY, 'evil-clippy-disco')
          this.clippySprite.setDisplaySize(clippySize, clippySize)

          // ── 4 lanes pleine hauteur (sous la bande Clippy)
          const laneZoneH = H - this.clippyZoneH
          const laneZoneY = this.clippyZoneH + laneZoneH / 2

          this.laneFlashBg = COLS.map((dir, i) => {
            const x = this.colX[i]
            // Fond de lane (très subtil, s'allume sur la note active)
            const bg = this.add.rectangle(x, laneZoneY, colW - 2, laneZoneH, COL_COLORS_HEX[dir]).setAlpha(0.06)
            // Séparateur vertical
            if (i > 0) this.add.rectangle(x - colW / 2, laneZoneY, 1, laneZoneH, 0x9966ff).setAlpha(0.22)
            // Flèche en haut de la lane (repère directionnel)
            this.add.text(x, this.clippyZoneH + 10, COL_ARROWS[dir], {
              fontSize: `${Math.round(colW * 0.28)}px`, color: COL_LABEL_CSS[dir], fontFamily: 'monospace',
            }).setOrigin(0.5, 0).setAlpha(0.4)
            return bg
          })

          // Ligne de frappe
          this.add.rectangle(W / 2, this.hitY, W, 2, 0xffffff).setAlpha(0.15)

          // ── Cercles cibles (zone de frappe en bas)
          const circleR = Math.round(colW * 0.35)
          this.hitCircles = COLS.map((dir, i) => {
            const x = this.colX[i]
            const arc = this.add.circle(x, this.hitY, circleR, COL_COLORS_HEX[dir], 0.10)
            arc.setStrokeStyle(2.5, COL_COLORS_HEX[dir], 0.75)
            // Flèche dans le cercle
            this.add.text(x, this.hitY, COL_ARROWS[dir], {
              fontSize: `${Math.round(circleR * 1.05)}px`, color: COL_LABEL_CSS[dir], fontFamily: 'monospace',
            }).setOrigin(0.5).setAlpha(0.50)
            return arc
          })

          // ── HUD
          this.hpText = this.add.text(8, 8, this.buildHpString(), { fontSize: '13px', fontFamily: 'monospace' }).setAlpha(0)
          this.scoreTxt = this.add.text(W - 8, 8, 'Score: 0', { fontSize: '12px', color: '#cccccc', fontFamily: 'monospace' }).setOrigin(1, 0)
          this.add.text(W / 2, 7, '🎵 DUEL DE DANSE 🎵', { fontSize: '11px', color: '#cc88ff', fontFamily: 'monospace', letterSpacing: 1 }).setOrigin(0.5, 0)
          this.feedbackTxt = this.add.text(W / 2, Math.round(H * 0.74), '', { fontSize: '38px', fontStyle: 'bold', fontFamily: 'monospace' }).setOrigin(0.5)
        }

        // ── Update loop ─────────────────────────────────────────────────────

        update() {
          if (this.ended) return
          const elapsed = this.time.now - this.startTime

          while (
            this.bmIdx < DANCE_BEATMAP.length &&
            DANCE_BEATMAP[this.bmIdx].time - elapsed < this.spawnAdv
          ) {
            const note = DANCE_BEATMAP[this.bmIdx]
            if (note.time >= elapsed - 200) this.spawnNote(note.direction, note.time)
            this.bmIdx++
          }

          for (const n of this.activeNotes) {
            if (n.judged) continue
            const timeToHit = n.time - elapsed
            n.obj.setY(this.hitY - (timeToHit / 1000) * NOTE_SPEED)
            if (timeToHit < -(HIT_WINDOW_MS + 10)) {
              n.judged = true; n.obj.destroy(); this.onMiss()
            }
          }
          this.activeNotes = this.activeNotes.filter(n => !n.judged)

          if (this.feedbackTxt.alpha > 0) {
            this.feedbackTxt.setAlpha(Math.max(0, this.feedbackTxt.alpha - 0.02))
          }
        }

        // ── Clippy réagit à la direction de la note ─────────────────────────

        private moveClippyToDir(dir: Dir) {
          const colIdx = COLS.indexOf(dir)
          this.tweens.killTweensOf(this.clippySprite)

          if (this.isMobile) {
            // Mobile : Clippy glisse horizontalement dans sa bande
            this.tweens.add({
              targets: this.clippySprite,
              x: this.colX[colIdx],
              y: this.clippyTopY,
              duration: 90, ease: 'Back.Out',
            })
            // Allumer la lane active
            this.laneFlashBg.forEach((bg, i) => bg.setAlpha(i === colIdx ? 0.20 : 0.06))
          } else {
            // Desktop : Clippy se déplace sur la case du tapis DDR
            ;(['up', 'down', 'left', 'right'] as Dir[]).forEach(d => {
              if (this.matTileBg[d]) this.matTileBg[d].setAlpha(d === dir ? 0.85 : 0.2)
            })
            const pos = this.matTilePos[dir]
            this.tweens.add({ targets: this.clippySprite, x: pos.x, y: pos.y, duration: 90, ease: 'Back.Out' })
          }
        }

        // ── Spawn d'une note ─────────────────────────────────────────────────

        private spawnNote(dir: Dir, hitTime: number) {
          const colIdx = COLS.indexOf(dir)
          const x      = this.colX[colIdx]
          const color  = COL_COLORS_HEX[dir]
          const W      = this.scale.width

          // Taille des notes adaptée : plus grosses sur mobile
          const noteR    = this.isMobile ? Math.round(W / 4 * 0.32) : 24
          const arrowPx  = this.isMobile ? `${Math.round(noteR * 1.05)}px` : '24px'

          const container = this.add.container(x, -80)
          const circle    = this.add.circle(0, 0, noteR, color, 1)
          circle.setStrokeStyle(3, 0xffffff, 0.4)
          const arrow = this.add.text(0, 0, COL_ARROWS[dir], { fontSize: arrowPx, color: '#ffffff', fontFamily: 'monospace' }).setOrigin(0.5)
          container.add([circle, arrow])
          this.activeNotes.push({ obj: container, time: hitTime, dir, judged: false })
          this.moveClippyToDir(dir)
        }

        // ── Gestion des inputs ───────────────────────────────────────────────

        private handleInput(dir: Dir, elapsed: number) {
          let best: typeof this.activeNotes[0] | null = null
          let bestDelta = Infinity
          for (const n of this.activeNotes) {
            if (n.judged || n.dir !== dir) continue
            const d = Math.abs(n.time - elapsed)
            if (d < bestDelta) { bestDelta = d; best = n }
          }
          if (!best || bestDelta > HIT_WINDOW_MS) return

          best.judged = true; best.obj.destroy()
          const perfect = bestDelta <= PERFECT_MS
          this.showFeedback(perfect ? 'PERFECT !' : 'GOOD !', perfect ? '#00ff88' : '#ffcc44')
          this.score += perfect ? 100 : 50
          this.scoreTxt.setText('Score: ' + this.score)

          // Flash du cercle cible (mobile uniquement)
          if (this.isMobile) {
            const arc = this.hitCircles[COLS.indexOf(dir)]
            if (arc) {
              arc.setAlpha(0.75)
              this.tweens.add({ targets: arc, alpha: 0.10, duration: 180 })
            }
          }
        }

        private onMiss() {
          this.hp = Math.max(0, this.hp - 1)
          this.hpText.setText(this.buildHpString())
          this.showFeedback('MISS !', '#ff4444')
          onMissRef.current?.()
          if (this.hp <= 0) this.endGame('lose')
        }

        private showFeedback(text: string, color: string) {
          this.feedbackTxt.setText(text).setColor(color).setAlpha(1)
        }

        private buildHpString() {
          return '❤️'.repeat(this.hp) + '🖤'.repeat(sceneMaxHP - this.hp)
        }

        private endGame(result: 'win' | 'lose') {
          if (this.ended) return
          this.ended = true
          this.sound.stopAll()
          this.time.addEvent({
            delay: result === 'win' ? 1000 : 600,
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

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      style={{ position: 'fixed', inset: 0, zIndex: 99985, outline: 'none' }}
    />
  )
}
