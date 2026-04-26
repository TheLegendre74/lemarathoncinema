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
const COL_ARROWS: Record<Dir, string> = { left: '←', down: '↓', up: '↑', right: '→' }
const COL_COLORS_HEX: Record<Dir, number> = { left: 0xff6699, down: 0x6699ff, up: 0x66ff99, right: 0xffcc44 }
const COL_LABEL_CSS: Record<Dir, string> = { left: '#ff6699', down: '#6699ff', up: '#66ff99', right: '#ffcc44' }

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

      class DDRScene extends Phaser.Scene {
        private hp = sceneMaxHP
        private score = 0
        private bmIdx = 0
        private clippyBeatIdx = 0
        private activeNotes: {
          obj: Phaser.GameObjects.Container
          time: number
          dir: Dir
          judged: boolean
        }[] = []
        private startTime = 0
        private hpText!: Phaser.GameObjects.Text
        private scoreTxt!: Phaser.GameObjects.Text
        private feedbackTxt!: Phaser.GameObjects.Text
        private colX!: number[]
        private hitY!: number
        private spawnAdv!: number
        private ended = false
        private discoBg!: Phaser.GameObjects.Rectangle
        private colCount = COLS.length
        // Clippy mat
        private clippySprite!: Phaser.GameObjects.Image
        private matTilePos!: Record<Dir, { x: number; y: number }>
        private matCenterX = 0
        private matCenterY = 0
        private matTileBg!: Record<Dir, Phaser.GameObjects.Rectangle>
        private laneCenterX = 0

        constructor() { super({ key: 'DDRScene' }) }

        preload() {
          this.load.audio('ddr-music', '/audio/clippy/nightclub.m4a')
          this.load.image('clippy-normal', '/clippy1.png')
        }

        create() {
          const W = this.scale.width
          const H = this.scale.height
          this.hitY     = Math.round(H * 0.82)
          this.spawnAdv = ((this.hitY + 80) / NOTE_SPEED) * 1000

          // ── Overlay sombre semi-transparent (arène visible derrière) ──────
          this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setAlpha(0.52)

          // ── Fond disco pulsant ────────────────────────────────────────────
          this.discoBg = this.add.rectangle(W / 2, H / 2, W, H, 0x1a0035)
          this.discoBg.setAlpha(0)
          this.tweens.add({
            targets: this.discoBg,
            alpha: { from: 0, to: 0.28 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          })

          // ── Lanes joueur — décalées à gauche ─────────────────────────────
          const laneW  = Math.min(W * 0.42, 260)
          const laneX0 = W * 0.04
          this.laneCenterX = Math.round(laneX0 + laneW / 2)
          this.colX = COLS.map((_, i) =>
            Math.round(laneX0 + (i + 0.5) * (laneW / this.colCount))
          )

          // Overlay sombre derrière les lanes pour lisibilité
          this.add.rectangle(this.laneCenterX, H / 2, laneW + 18, H, 0x000000).setAlpha(0.35)

          this.colX.forEach((x, i) => {
            const dir = COLS[i]
            const lane = this.add.rectangle(x, H / 2, Math.round(laneW / this.colCount) - 6, H, 0x0d0828)
            lane.setAlpha(0.55)
            const ring = this.add.circle(x, this.hitY, 30, 0x000000, 0)
            ring.setStrokeStyle(3, COL_COLORS_HEX[dir], 0.5)
            this.add.text(x, this.hitY, COL_ARROWS[dir], {
              fontSize: '30px',
              color: COL_LABEL_CSS[dir],
              fontFamily: 'monospace',
            }).setOrigin(0.5).setAlpha(0.28)
          })

          // Ligne de frappe
          this.add.rectangle(this.laneCenterX, this.hitY, laneW + 10, 2, 0xffffff, 0.18)

          // ── Tapis DDR de Clippy — côté droit ─────────────────────────────
          this.matCenterX = Math.round(W * 0.78)
          this.matCenterY = Math.round(H * 0.52)
          const TW  = Math.min(Math.max(52, H * 0.082), 82)  // taille d'une case
          const GAP = 8

          // Positions des 4 cases en croix
          this.matTilePos = {
            up:    { x: this.matCenterX,       y: this.matCenterY - TW - GAP },
            down:  { x: this.matCenterX,       y: this.matCenterY + TW + GAP },
            left:  { x: this.matCenterX - TW - GAP, y: this.matCenterY },
            right: { x: this.matCenterX + TW + GAP, y: this.matCenterY },
          }

          // Fond du tapis (panneau)
          const matPanelW = TW * 3 + GAP * 4 + 24
          const matPanelH = TW * 3 + GAP * 4 + 50
          this.add.rectangle(this.matCenterX, this.matCenterY, matPanelW, matPanelH, 0x080018).setAlpha(0.78)
          const border = this.add.graphics()
          border.lineStyle(2, 0x9966ff, 0.55)
          border.strokeRect(
            this.matCenterX - matPanelW / 2,
            this.matCenterY - matPanelH / 2,
            matPanelW, matPanelH
          )

          // Cases directionnelles
          this.matTileBg = {} as Record<Dir, Phaser.GameObjects.Rectangle>
          ;(['up', 'down', 'left', 'right'] as Dir[]).forEach(dir => {
            const pos = this.matTilePos[dir]
            const col = COL_COLORS_HEX[dir]
            const bg = this.add.rectangle(pos.x, pos.y, TW - 4, TW - 4, col)
            bg.setAlpha(0.2)
            this.matTileBg[dir] = bg
            // Bordure case
            const g = this.add.graphics()
            g.lineStyle(2, col, 0.5)
            g.strokeRect(pos.x - (TW - 4) / 2, pos.y - (TW - 4) / 2, TW - 4, TW - 4)
            // Flèche sur la case
            this.add.text(pos.x, pos.y, COL_ARROWS[dir], {
              fontSize: `${Math.round(TW * 0.52)}px`,
              color: COL_LABEL_CSS[dir],
              fontFamily: 'monospace',
            }).setOrigin(0.5).setAlpha(0.55)
          })

          // Case centre (neutre)
          this.add.rectangle(this.matCenterX, this.matCenterY, TW - 4, TW - 4, 0x221144).setAlpha(0.55)
          const gc = this.add.graphics()
          gc.lineStyle(1, 0x9966ff, 0.3)
          gc.strokeRect(this.matCenterX - (TW - 4) / 2, this.matCenterY - (TW - 4) / 2, TW - 4, TW - 4)

          // Label "CLIPPY" au-dessus du tapis
          this.add.text(this.matCenterX, this.matCenterY - matPanelH / 2 - 10, '📎 CLIPPY', {
            fontSize: '13px', color: '#cc88ff', fontFamily: 'monospace',
          }).setOrigin(0.5, 1)

          // Sprite Clippy positionné au centre du tapis
          this.clippySprite = this.add.image(this.matCenterX, this.matCenterY, 'clippy-normal')
          const spriteW = TW * 1.05
          const spriteH = TW * 1.5
          this.clippySprite.setDisplaySize(spriteW, spriteH)

          // Séparateur "VS"
          const sepX = Math.round(laneX0 + laneW + (this.matCenterX - (TW * 1.5 + GAP * 2) - laneX0 - laneW) / 2)
          this.add.text(sepX, Math.round(H * 0.5), 'VS', {
            fontSize: '22px', color: '#cc88ff', fontFamily: 'monospace', fontStyle: 'bold',
          }).setOrigin(0.5).setAlpha(0.5)

          // ── HUD ──────────────────────────────────────────────────────────
          this.hpText = this.add.text(14, 14, this.buildHpString(), {
            fontSize: '18px', fontFamily: 'monospace',
          }).setAlpha(0)

          this.scoreTxt = this.add.text(
            Math.round(laneX0 + laneW) + 6, 14,
            'Score: 0',
            { fontSize: '14px', color: '#cccccc', fontFamily: 'monospace' }
          )

          this.feedbackTxt = this.add.text(
            this.laneCenterX, Math.round(H * 0.62), '',
            { fontSize: '36px', fontStyle: 'bold', fontFamily: 'monospace' }
          ).setOrigin(0.5)

          this.add.text(this.laneCenterX, 18, '🎵  DUEL DE DANSE  🎵', {
            fontSize: '14px', color: '#cc88ff', letterSpacing: 3, fontFamily: 'monospace',
          }).setOrigin(0.5, 0)

          // ── Clavier ───────────────────────────────────────────────────────
          const keyMap: Record<string, Dir> = {
            ArrowLeft: 'left', ArrowDown: 'down',
            ArrowUp:   'up',   ArrowRight: 'right',
          }
          const kbListener = (e: KeyboardEvent) => {
            const dir = keyMap[e.key]
            if (!dir) return
            e.preventDefault()
            e.stopImmediatePropagation()
            if (this.ended) return
            const elapsed = this.time.now - this.startTime
            this.handleInput(dir, elapsed)
          }
          activeKeyListener = kbListener
          window.addEventListener('keydown', kbListener, true)

          // ── Musique ───────────────────────────────────────────────────────
          const music = this.sound.add('ddr-music', { loop: false, volume: 0.85 })
          music.play()
          this.startTime = this.time.now

          const lastNote = DANCE_BEATMAP[DANCE_BEATMAP.length - 1]
          this.time.addEvent({
            delay: lastNote.time + 2200,
            callback: () => { if (!this.ended) this.endGame('win') },
          })
        }

        update() {
          if (this.ended) return
          const elapsed = this.time.now - this.startTime

          // Spawn notes joueur
          while (
            this.bmIdx < DANCE_BEATMAP.length &&
            DANCE_BEATMAP[this.bmIdx].time - elapsed < this.spawnAdv
          ) {
            const note = DANCE_BEATMAP[this.bmIdx]
            if (note.time >= elapsed - 200) this.spawnNote(note.direction, note.time)
            this.bmIdx++
          }

          // Clippy suit la beatmap en temps réel
          while (
            this.clippyBeatIdx < DANCE_BEATMAP.length &&
            DANCE_BEATMAP[this.clippyBeatIdx].time <= elapsed
          ) {
            this.moveClippyToDir(DANCE_BEATMAP[this.clippyBeatIdx].direction)
            this.clippyBeatIdx++
          }

          // Déplacer + miss check
          for (const n of this.activeNotes) {
            if (n.judged) continue
            const timeToHit = n.time - elapsed
            n.obj.setY(this.hitY - (timeToHit / 1000) * NOTE_SPEED)
            if (timeToHit < -(HIT_WINDOW_MS + 10)) {
              n.judged = true
              n.obj.destroy()
              this.onMiss()
            }
          }
          this.activeNotes = this.activeNotes.filter(n => !n.judged)

          if (this.feedbackTxt.alpha > 0) {
            this.feedbackTxt.setAlpha(Math.max(0, this.feedbackTxt.alpha - 0.02))
          }
        }

        private moveClippyToDir(dir: Dir) {
          const pos = this.matTilePos[dir]
          // Flash de la case
          if (this.matTileBg[dir]) {
            this.matTileBg[dir].setAlpha(0.88)
            this.time.delayedCall(260, () => {
              if (!this.ended && this.matTileBg[dir]) this.matTileBg[dir].setAlpha(0.2)
            })
          }
          // Déplacement de Clippy avec effet squish
          this.tweens.killTweensOf(this.clippySprite)
          this.tweens.add({
            targets: this.clippySprite,
            x: pos.x,
            y: pos.y,
            scaleX: 1.18,
            scaleY: 0.82,
            duration: 65,
            ease: 'Cubic.Out',
            onComplete: () => {
              this.tweens.add({
                targets: this.clippySprite,
                scaleX: 1,
                scaleY: 1,
                duration: 110,
                ease: 'Back.Out',
              })
              // Retour au centre entre les notes
              this.time.delayedCall(310, () => {
                if (this.ended) return
                this.tweens.add({
                  targets: this.clippySprite,
                  x: this.matCenterX,
                  y: this.matCenterY,
                  duration: 160,
                  ease: 'Sine.Out',
                })
              })
            },
          })
        }

        private spawnNote(dir: Dir, hitTime: number) {
          const colIdx = COLS.indexOf(dir)
          const x = this.colX[colIdx]
          const color = COL_COLORS_HEX[dir]
          const container = this.add.container(x, -60)
          const circle = this.add.circle(0, 0, 24, color, 1)
          circle.setStrokeStyle(3, 0xffffff, 0.4)
          const arrow = this.add.text(0, 0, COL_ARROWS[dir], {
            fontSize: '24px', color: '#ffffff', fontFamily: 'monospace',
          }).setOrigin(0.5)
          container.add([circle, arrow])
          this.activeNotes.push({ obj: container, time: hitTime, dir, judged: false })
        }

        private handleInput(dir: Dir, elapsed: number) {
          let best: typeof this.activeNotes[0] | null = null
          let bestDelta = Infinity
          for (const n of this.activeNotes) {
            if (n.judged || n.dir !== dir) continue
            const d = Math.abs(n.time - elapsed)
            if (d < bestDelta) { bestDelta = d; best = n }
          }
          if (best && bestDelta <= HIT_WINDOW_MS) {
            best.judged = true
            best.obj.destroy()
            if (bestDelta <= PERFECT_MS) {
              this.showFeedback('PERFECT !', '#00ff88')
              this.score += 100
            } else {
              this.showFeedback('GOOD !', '#ffcc44')
              this.score += 50
            }
            this.scoreTxt.setText('Score: ' + this.score)
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
          const delay = result === 'win' ? 1000 : 600
          this.time.addEvent({
            delay,
            callback: () => {
              if (result === 'win') onWinRef.current()
              else onLoseRef.current()
            },
          })
        }
      }

      phaserGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        transparent: true,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [DDRScene],
        audio: { disableWebAudio: false },
        banner: false,
      })
    })()

    return () => {
      destroyed = true
      if (activeKeyListener) {
        window.removeEventListener('keydown', activeKeyListener, true)
        activeKeyListener = null
      }
      phaserGame?.destroy(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99985,
        outline: 'none',
      }}
    />
  )
}
