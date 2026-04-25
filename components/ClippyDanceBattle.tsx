'use client'
import { useEffect, useRef } from 'react'
import { DANCE_BEATMAP } from './ClippyDanceBattleBeatmap'
import type { DanceNote } from './ClippyDanceBattleBeatmap'

type Dir = DanceNote['direction']

interface Props {
  onWin: () => void
  onLose: () => void
}

const COLS: Dir[] = ['left', 'down', 'up', 'right']
const COL_ARROWS: Record<Dir, string> = { left: '←', down: '↓', up: '↑', right: '→' }
const COL_COLORS_HEX: Record<Dir, number> = { left: 0xff6699, down: 0x6699ff, up: 0x66ff99, right: 0xffcc44 }
const COL_LABEL_CSS: Record<Dir, string> = { left: '#ff6699', down: '#6699ff', up: '#66ff99', right: '#ffcc44' }

const NOTE_SPEED    = 380   // px/sec
const HIT_WINDOW_MS = 160   // ±ms autour du hit pour juger
const PERFECT_MS    = 80    // ±ms pour PERFECT
const MAX_HP        = 10

export default function ClippyDanceBattle({ onWin, onLose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onWinRef     = useRef(onWin)
  const onLoseRef    = useRef(onLose)

  useEffect(() => { onWinRef.current  = onWin  }, [onWin])
  useEffect(() => { onLoseRef.current = onLose }, [onLose])

  // Les flèches directionnelles sont gérées DIRECTEMENT dans la scène Phaser
  // via window.addEventListener (voir ci-dessous) — pas de blocker externe ici.

  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let phaserGame: any = null
    // Référence au listener clavier direct (bypasse le système focus/input de Phaser)
    let activeKeyListener: ((e: KeyboardEvent) => void) | null = null

    ;(async () => {
      const Phaser = (await import('phaser')).default
      if (destroyed || !containerRef.current) return

      // ── Scène DDR ─────────────────────────────────────────────────────────
      class DDRScene extends Phaser.Scene {
        private hp = MAX_HP
        private score = 0
        private bmIdx = 0
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
        private spawnAdv!: number  // ms avant hit pour spawner la note
        private ended = false
        private discoBg!: Phaser.GameObjects.Rectangle
        private discoTween!: Phaser.Tweens.Tween
        private colCount = COLS.length

        constructor() { super({ key: 'DDRScene' }) }

        preload() {
          this.load.audio('ddr-music', '/audio/clippy/nightclub.m4a')
        }

        create() {
          const W = this.scale.width
          const H = this.scale.height
          this.hitY     = Math.round(H * 0.82)
          this.spawnAdv = ((this.hitY + 80) / NOTE_SPEED) * 1000

          const laneW   = Math.min(W * 0.56, 340)
          const laneX0  = (W - laneW) / 2
          this.colX     = COLS.map((_, i) => Math.round(laneX0 + (i + 0.5) * (laneW / this.colCount)))

          // ── Fond disco animé ──────────────────────────────────────────────
          this.add.rectangle(W / 2, H / 2, W, H, 0x06021a)
          this.discoBg = this.add.rectangle(W / 2, H / 2, W, H, 0x1a0035)
          this.discoBg.setAlpha(0)
          this.discoTween = this.tweens.add({
            targets: this.discoBg,
            alpha: { from: 0, to: 0.35 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          })

          // Titres colonnes
          this.colX.forEach((x, i) => {
            const dir = COLS[i]
            const lane = this.add.rectangle(x, H / 2, Math.round(laneW / this.colCount) - 6, H, 0x0d0828)
            lane.setAlpha(0.55)
            // Zone de frappe (anneau)
            const ring = this.add.circle(x, this.hitY, 30, 0x000000, 0)
            ring.setStrokeStyle(3, COL_COLORS_HEX[dir], 0.5)
            // Flèche cible fixe (dim)
            this.add.text(x, this.hitY, COL_ARROWS[dir], {
              fontSize: '30px',
              color: COL_LABEL_CSS[dir],
              fontFamily: 'monospace',
            }).setOrigin(0.5).setAlpha(0.28)
          })

          // Ligne de frappe
          this.add.rectangle(W / 2, this.hitY, laneW + 10, 2, 0xffffff, 0.18)

          // ── HUD ─────────────────────────────────────────────────────────
          this.hpText = this.add.text(14, 14, this.buildHpString(), {
            fontSize: '18px', fontFamily: 'monospace',
          })
          this.scoreTxt = this.add.text(W - 14, 14, 'Score: 0', {
            fontSize: '16px', color: '#cccccc', fontFamily: 'monospace',
          }).setOrigin(1, 0)

          this.feedbackTxt = this.add.text(W / 2, Math.round(H * 0.62), '', {
            fontSize: '38px', fontStyle: 'bold', fontFamily: 'monospace',
          }).setOrigin(0.5)

          this.add.text(W / 2, 18, '🎵  DUEL DE DANSE  🎵', {
            fontSize: '15px', color: '#cc88ff',
            letterSpacing: 3, fontFamily: 'monospace',
          }).setOrigin(0.5, 0)

          // ── Touches clavier — listener direct sur window ──────────────────
          // Bypasse le système focus/canvas de Phaser : fonctionne quelle que
          // soit la situation de focus du DOM.
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
          window.addEventListener('keydown', kbListener, true)  // capture=true : priorité max

          // ── Musique ───────────────────────────────────────────────────────
          const music = this.sound.add('ddr-music', { loop: false, volume: 0.85 })
          music.play()
          this.startTime = this.time.now

          // Victoire automatique si toujours en vie à la fin de la beatmap + 2s
          const lastNote = DANCE_BEATMAP[DANCE_BEATMAP.length - 1]
          this.time.addEvent({
            delay: lastNote.time + 2200,
            callback: () => { if (!this.ended) this.endGame('win') },
          })
        }

        update() {
          if (this.ended) return
          const elapsed = this.time.now - this.startTime
          // Input géré via window.addEventListener dans create() — rien à faire ici

          // Spawn les notes dont le hit time approche
          while (
            this.bmIdx < DANCE_BEATMAP.length &&
            DANCE_BEATMAP[this.bmIdx].time - elapsed < this.spawnAdv
          ) {
            const note = DANCE_BEATMAP[this.bmIdx]
            if (note.time >= elapsed - 200) this.spawnNote(note.direction, note.time)
            this.bmIdx++
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

          // Fade feedback
          if (this.feedbackTxt.alpha > 0) {
            this.feedbackTxt.setAlpha(Math.max(0, this.feedbackTxt.alpha - 0.02))
          }
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
          // Phantom press (sans note proche) = pas de pénalité
        }

        private onMiss() {
          this.hp = Math.max(0, this.hp - 1)
          this.hpText.setText(this.buildHpString())
          this.showFeedback('MISS !', '#ff4444')
          if (this.hp <= 0) this.endGame('lose')
        }

        private showFeedback(text: string, color: string) {
          this.feedbackTxt.setText(text).setColor(color).setAlpha(1)
        }

        private buildHpString() {
          return '❤️'.repeat(this.hp) + '🖤'.repeat(MAX_HP - this.hp)
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
      // ── /Scène DDR ────────────────────────────────────────────────────────

      phaserGame = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        backgroundColor: '#06021a',
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
        background: '#06021a',
        outline: 'none',
      }}
    />
  )
}
