'use client'

import { useEffect, useRef, useState } from 'react'
import { discoverEgg } from '@/lib/actions'

const GW = 960, GH = 540
const KEYS = ['Q','W','E','R','A','S','D','F','Z','X','C','V']
const TOTAL_GROUPS = 5
const KEYS_PER_GROUP = 10
const KEY_MS = 1500
const MAX_LIVES = 3

function genSeq(): string[][] {
  return Array.from({ length: TOTAL_GROUPS }, () =>
    Array.from({ length: KEYS_PER_GROUP }, () => KEYS[~~(Math.random() * KEYS.length)])
  )
}

export default function KillBillGame({ onDone, endText }: { onDone: () => void; endText?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef      = useRef<any>(null)
  const handleKeyRef = useRef<((k: string) => void) | null>(null)
  const [beaten, setBeaten]             = useState(false)
  const [showCtrl, setShowCtrl]         = useState(false)
  const [currentKey, setCurrentKey]     = useState('')
  const [isMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)

  useEffect(() => {
    if (!containerRef.current) return
    let game: any
    let mounted = true

    import('phaser').then((Phaser) => {
      if (!mounted || !containerRef.current) return

      // ─────────────────────────────────────────────────────────────
      class KBScene extends Phaser.Scene {
        // State machine
        phase: 'intro'|'challenge'|'between'|'ending'|'gameover' = 'intro'
        seq: string[][] = genSeq()
        gIdx = 0   // group 0-4
        kIdx = 0   // key 0-9
        lives = MAX_LIVES
        keyMs = KEY_MS

        // Character positions/state
        billX = 690; billY = 420
        billFall = 0; billFalling = false
        brideX = 200; brideY = 420
        brideStrike = 0

        // Particles
        parts: {x:number;y:number;vx:number;vy:number;life:number;ml:number;col:number}[] = []

        // Graphics
        gBg!: Phaser.GameObjects.Graphics
        gBride!: Phaser.GameObjects.Graphics
        gBill!: Phaser.GameObjects.Graphics
        gBar!: Phaser.GameObjects.Graphics
        gBlood!: Phaser.GameObjects.Graphics
        gParts!: Phaser.GameObjects.Graphics
        gCircles: Phaser.GameObjects.Graphics[] = []
        lCircles: Phaser.GameObjects.Text[] = []

        // Texts
        tIntroTitle!: Phaser.GameObjects.Text
        tIntroSub!: Phaser.GameObjects.Text
        tIntroPrompt!: Phaser.GameObjects.Text
        tHudGrp!: Phaser.GameObjects.Text
        tHudLives!: Phaser.GameObjects.Text
        tFeedback!: Phaser.GameObjects.Text
        tBetween!: Phaser.GameObjects.Text
        tEnding!: Phaser.GameObjects.Text
        tKiddo!: Phaser.GameObjects.Text
        tGameOverMsg!: Phaser.GameObjects.Text
        tRetry!: Phaser.GameObjects.Text

        constructor() { super({ key: 'KB' }) }

        // ── CREATE ────────────────────────────────────────────────
        create() {
          // Graphics layers (depth order)
          this.gBg    = this.add.graphics().setDepth(0)
          this.gBlood = this.add.graphics().setDepth(2)
          this.gBride = this.add.graphics().setDepth(3)
          this.gBill  = this.add.graphics().setDepth(3)
          this.gParts = this.add.graphics().setDepth(6)
          this.gBar   = this.add.graphics().setDepth(8)

          for (let i = 0; i < KEYS_PER_GROUP; i++) {
            this.gCircles.push(this.add.graphics().setDepth(8))
            this.lCircles.push(
              this.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', fontStyle: 'bold' })
                .setOrigin(0.5).setDepth(9).setAlpha(0)
            )
          }

          // Letterbox bands
          const lb = this.add.graphics().setDepth(10)
          lb.fillStyle(0xf5c518).fillRect(0, 0, GW, 50).fillRect(0, GH - 50, GW, 50)
          this.add.text(GW / 2, 25, 'KILL BILL — La Technique des Cinq Points', {
            fontFamily: 'serif', fontSize: '18px', color: '#000000', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(11)

          // ── Intro texts
          this.tIntroTitle = this.add.text(GW / 2, GH / 2 - 55,
            'La Technique des Cinq Points\nde la Paume qui fait Exploser le Cœur', {
            fontFamily: 'serif', fontSize: '25px', color: '#f5c518',
            align: 'center', wordWrap: { width: 820 },
          }).setOrigin(0.5).setDepth(5).setAlpha(0)

          this.tIntroSub = this.add.text(GW / 2, GH / 2 + 40,
            '"Tu veux vraiment faire ça ?"  — Bill', {
            fontFamily: 'serif', fontSize: '16px', color: '#e8e8e8', fontStyle: 'italic',
          }).setOrigin(0.5).setDepth(5).setAlpha(0)

          this.tIntroPrompt = this.add.text(GW / 2, GH - 80,
            '[ ESPACE ou clic pour commencer ]', {
            fontFamily: 'monospace', fontSize: '13px', color: '#888888',
          }).setOrigin(0.5).setDepth(5).setAlpha(0)

          // ── HUD
          this.tHudGrp   = this.add.text(20, 58, '', { fontFamily: 'monospace', fontSize: '14px', color: '#f5c518' }).setDepth(9).setAlpha(0)
          this.tHudLives = this.add.text(GW - 20, 58, '', { fontFamily: 'monospace', fontSize: '18px', color: '#cc0000' }).setOrigin(1, 0).setDepth(9).setAlpha(0)

          // ── Feedback / between / ending / gameover texts
          this.tFeedback = this.add.text(GW / 2, GH / 2 - 30, '', {
            fontFamily: 'monospace', fontSize: '38px', color: '#22c55e', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(20).setAlpha(0)

          this.tBetween = this.add.text(GW / 2, GH / 2 - 80, '', {
            fontFamily: 'serif', fontSize: '40px', color: '#f5c518', fontStyle: 'bold',
          }).setOrigin(0.5).setDepth(20).setAlpha(0)

          this.tEnding = this.add.text(GW / 2, GH / 2 - 80, 'Technique complète.', {
            fontFamily: 'serif', fontSize: '30px', color: '#e8e8e8',
          }).setOrigin(0.5).setDepth(20).setAlpha(0)

          this.tKiddo = this.add.text(GW / 2, GH / 2 + 60, '...Kiddo.', {
            fontFamily: 'serif', fontSize: '28px', color: '#f5c518', fontStyle: 'italic',
          }).setOrigin(0.5).setDepth(20).setAlpha(0)

          this.tGameOverMsg = this.add.text(GW / 2, GH / 2 - 55,
            '"Pai Mei ne t\'a pas assez bien entraîné."', {
            fontFamily: 'serif', fontSize: '20px', color: '#e8e8e8', fontStyle: 'italic',
            align: 'center', wordWrap: { width: 700 },
          }).setOrigin(0.5).setDepth(20).setAlpha(0)

          this.tRetry = this.add.text(GW / 2, GH / 2 + 30, '[ ESPACE ou clic pour réessayer ]', {
            fontFamily: 'monospace', fontSize: '14px', color: '#f5c518',
          }).setOrigin(0.5).setDepth(20).setAlpha(0)

          // ── Intro animation
          this.tweens.add({ targets: this.tIntroTitle,  alpha: 1, duration: 800, delay: 400 })
          this.tweens.add({ targets: this.tIntroSub,    alpha: 1, duration: 800, delay: 1300 })
          this.tweens.add({ targets: this.tIntroPrompt, alpha: 1, duration: 600, delay: 2100 })
          this.time.delayedCall(2700, () => {
            this.tweens.add({ targets: this.tIntroPrompt, alpha: { from: 0.3, to: 1 }, duration: 700, yoyo: true, repeat: -1 })
          })

          // ── Keyboard input
          this.input.keyboard!.on('keydown', (e: KeyboardEvent) => {
            const k = e.key.toUpperCase()
            if (this.phase === 'intro' && (e.key === ' ' || e.key === 'Enter')) this.beginChallenge()
            else if (this.phase === 'gameover' && e.key === ' ') this.doRestart()
            else if (this.phase === 'challenge') this.onKey(k)
          })
          this.input.on('pointerdown', () => {
            if (this.phase === 'intro') this.beginChallenge()
            else if (this.phase === 'gameover') this.doRestart()
          })

          // Expose to React for mobile buttons
          handleKeyRef.current = (k: string) => this.onKey(k)
        }

        // ── DRAW HELPERS ─────────────────────────────────────────

        drawBg() {
          this.gBg.clear()
          this.gBg.fillStyle(0x0d0202).fillRect(0, 0, GW, GH)
          this.gBg.fillStyle(0x1a0f05).fillRect(0, GH * 0.73, GW, GH * 0.27)
          this.gBg.lineStyle(1, 0xffffff, 0.03)
          for (let x = 0; x < GW; x += 80) this.gBg.lineBetween(x, GH * 0.73, x, GH)
        }

        drawBride() {
          const g = this.gBride
          g.clear()
          const x = this.brideX, y = this.brideY
          const ext = this.brideStrike * 40
          g.fillStyle(0x000000, 0.25).fillEllipse(x, y + 5, 60, 14)
          g.fillStyle(0xf5c518)
          g.fillRect(x - 16, y - 75, 13, 75).fillRect(x + 3, y - 75, 13, 75)
          g.fillRect(x - 20, y - 155, 40, 80)
          // Strike arm: extends forward
          g.fillRect(x + 18, y - 138 - ext * 0.2, 38 + ext, 11)
          g.fillRect(x - 56, y - 128, 36, 11)
          g.fillStyle(0xf2d5a8).fillEllipse(x, y - 165, 36, 40)
          g.fillStyle(0x111111).fillRect(x - 18, y - 186, 36, 16)
          g.fillStyle(0x222222).fillRect(x - 8, y - 170, 5, 5).fillRect(x + 3, y - 170, 5, 5)
          // Katana
          g.lineStyle(3, 0xcccccc, 1).lineBetween(x + 18, y - 148, x + 68 + ext, y - 155)
        }

        drawBill() {
          const g = this.gBill
          g.clear()
          // Position + rotation applied at GameObject level
          g.setPosition(this.billX, this.billY)
          g.setRotation(this.billFall)

          // Draw in local space (feet at origin 0,0 going upward)
          g.fillStyle(0x000000, 0.2).fillEllipse(0, 5, 60, 14)
          g.fillStyle(0x1a1a1a)
          g.fillRect(-16, -75, 13, 75).fillRect(3, -75, 13, 75)
          g.fillStyle(0x111111).fillRect(-22, -155, 44, 80)
          g.fillStyle(0xdddddd).fillRect(-6, -153, 12, 70)
          g.fillStyle(0xcc0000).fillRect(-3, -153, 6, 50)
          g.fillStyle(0x111111)
          g.fillRect(-34, -153, 13, 58).fillRect(21, -153, 13, 58)
          g.fillStyle(0xf2d5a8)
          g.fillRect(-36, -97, 13, 11).fillRect(22, -97, 13, 11)
          g.fillStyle(0xf2d5a8).fillEllipse(0, -170, 36, 40)
          g.fillStyle(0xbbbbbb).fillRect(-18, -192, 36, 16)
          g.fillStyle(0x222222).fillRect(-8, -175, 5, 5).fillRect(3, -175, 5, 5)
        }

        drawCircles() {
          const group = this.seq[this.gIdx]
          if (!group) return
          const spacing = 62
          const sx = (GW - (KEYS_PER_GROUP - 1) * spacing) / 2
          const cy = GH - 108
          const pulse = 1 + 0.12 * Math.sin(this.time.now / 200)

          for (let i = 0; i < KEYS_PER_GROUP; i++) {
            const g = this.gCircles[i]
            const lbl = this.lCircles[i]
            const cx = sx + i * spacing
            g.clear()
            if (i < this.kIdx) {
              g.fillStyle(0x22c55e).fillCircle(cx, cy, 22)
              lbl.setText('✓').setPosition(cx, cy).setStyle({ color: '#ffffff', fontSize: '13px' }).setAlpha(1)
            } else if (i === this.kIdx) {
              g.fillStyle(0xf5c518).fillCircle(cx, cy, 22 * pulse)
              lbl.setText(group[i]).setPosition(cx, cy).setStyle({ color: '#000000', fontSize: '16px', fontStyle: 'bold' }).setAlpha(1)
            } else {
              g.fillStyle(0x333333).fillCircle(cx, cy, 22)
              lbl.setText(group[i]).setPosition(cx, cy).setStyle({ color: '#555555', fontSize: '13px' }).setAlpha(1)
            }
          }
        }

        hideCircles() {
          this.gCircles.forEach(g => g.clear())
          this.lCircles.forEach(l => l.setAlpha(0))
        }

        drawTimerBar() {
          this.gBar.clear()
          const ratio = Math.max(0, this.keyMs / KEY_MS)
          const bw = 380, bx = (GW - bw) / 2, by = GH - 142
          this.gBar.fillStyle(0x333333).fillRect(bx, by, bw, 6)
          const col = ratio < 0.3 ? 0xef4444 : ratio < 0.6 ? 0xf5c518 : 0x22c55e
          this.gBar.fillStyle(col).fillRect(bx, by, bw * ratio, 6)
        }

        updateHud() {
          this.tHudGrp.setText(`FRAPPE ${this.gIdx + 1} / ${TOTAL_GROUPS}`)
          this.tHudLives.setText('♥'.repeat(Math.max(0, this.lives)))
        }

        flash(txt: string, col: string) {
          this.tFeedback.setText(txt).setStyle({ color: col }).setAlpha(1).setY(GH / 2 - 30)
          this.tweens.killTweensOf(this.tFeedback)
          this.tweens.add({ targets: this.tFeedback, alpha: 0, y: GH / 2 - 60, duration: 500 })
        }

        // ── PHASES ───────────────────────────────────────────────

        beginChallenge() {
          if (this.phase !== 'intro') return
          this.phase = 'challenge'
          this.tweens.add({ targets: [this.tIntroTitle, this.tIntroSub, this.tIntroPrompt], alpha: 0, duration: 300 })
          this.time.delayedCall(320, () => {
            this.tHudGrp.setAlpha(1)
            this.tHudLives.setAlpha(1)
            this.keyMs = KEY_MS
            this.updateHud()
            setShowCtrl(true)
            setCurrentKey(this.seq[0][0])
          })
        }

        onKey(key: string) {
          if (this.phase !== 'challenge') return
          const expected = this.seq[this.gIdx][this.kIdx]
          if (key === expected) {
            this.kIdx++
            this.keyMs = KEY_MS
            this.flash('✓', '#22c55e')
            if (this.kIdx >= KEYS_PER_GROUP) {
              this.kIdx = 0
              this.gIdx++
              this.phase = 'between'
              this.doBetween()
            } else {
              setCurrentKey(this.seq[this.gIdx][this.kIdx])
            }
          } else {
            this.missKey()
          }
        }

        missKey() {
          this.lives--
          this.flash('✗', '#ef4444')
          this.cameras.main.shake(260, 0.007)
          this.keyMs = KEY_MS
          this.updateHud()
          if (this.lives <= 0) {
            this.phase = 'gameover'
            setShowCtrl(false)
            setCurrentKey('')
            this.hideCircles()
            this.gBar.clear()
            this.tHudGrp.setAlpha(0)
            this.tHudLives.setAlpha(0)
            this.tGameOverMsg.setAlpha(1)
            this.tweens.add({ targets: this.tRetry, alpha: { from: 0.3, to: 1 }, duration: 700, yoyo: true, repeat: -1 })
            this.tRetry.setAlpha(0.3)
          }
        }

        doRestart() {
          this.seq = genSeq()
          this.gIdx = 0; this.kIdx = 0
          this.lives = MAX_LIVES; this.keyMs = KEY_MS
          this.phase = 'challenge'
          this.tGameOverMsg.setAlpha(0)
          this.tweens.killTweensOf(this.tRetry)
          this.tRetry.setAlpha(0)
          this.tHudGrp.setAlpha(1)
          this.tHudLives.setAlpha(1)
          this.updateHud()
          setShowCtrl(true)
          setCurrentKey(this.seq[0][0])
        }

        doBetween() {
          setShowCtrl(false)
          setCurrentKey('')
          this.hideCircles()
          this.gBar.clear()
          this.tHudGrp.setAlpha(0)
          this.tHudLives.setAlpha(0)

          this.tBetween.setText(`FRAPPE ${this.gIdx} !`).setAlpha(0)
          this.tweens.add({ targets: this.tBetween, alpha: 1, duration: 300 })

          const origBX = this.brideX
          // Bride lunges
          this.tweens.add({
            targets: this, brideX: origBX + 75, brideStrike: 1,
            duration: 340, ease: 'Power2',
            onComplete: () => {
              this.cameras.main.flash(180, 255, 200, 80)
              this.cameras.main.shake(200, 0.01)
              // Bill staggers slightly
              const origBillX = this.billX
              this.tweens.add({ targets: this, billX: origBillX + 15, duration: 80, yoyo: true, repeat: 2,
                onComplete: () => { this.billX = origBillX }
              })
              this.time.delayedCall(200, () => {
                this.tweens.add({
                  targets: this, brideX: origBX, brideStrike: 0,
                  duration: 280,
                  onComplete: () => {
                    this.time.delayedCall(550, () => {
                      this.tweens.add({ targets: this.tBetween, alpha: 0, duration: 200 })
                      this.time.delayedCall(230, () => {
                        if (this.gIdx >= TOTAL_GROUPS) {
                          this.phase = 'ending'
                          this.doEnding()
                        } else {
                          this.phase = 'challenge'
                          this.keyMs = KEY_MS
                          this.tHudGrp.setAlpha(1)
                          this.tHudLives.setAlpha(1)
                          this.updateHud()
                          setShowCtrl(true)
                          setCurrentKey(this.seq[this.gIdx][0])
                        }
                      })
                    })
                  },
                })
              })
            },
          })
        }

        doEnding() {
          this.tweens.add({ targets: this.tEnding, alpha: 1, duration: 700 })

          // Bill speech bubble
          const bTxt = this.add.text(this.billX + 40, this.billY - 230, '"...impressive."', {
            fontFamily: 'serif', fontSize: '15px', color: '#e8e8e8', fontStyle: 'italic',
          }).setOrigin(0.5).setDepth(20)

          this.time.delayedCall(1000, () => {
            this.tweens.add({ targets: [this.tEnding, bTxt], alpha: 0, duration: 400 })
            this.time.delayedCall(500, () => this.billWalk(0))
          })
        }

        billWalk(step: number) {
          if (step >= 5) { this.time.delayedCall(200, () => this.heartExplode()); return }
          this.tweens.add({
            targets: this, billX: this.billX + 28,
            duration: 270, ease: 'Linear',
            onComplete: () => this.time.delayedCall(80, () => this.billWalk(step + 1)),
          })
        }

        heartExplode() {
          // Spawn blood/gold particles
          for (let i = 0; i < 75; i++) {
            const a = Math.random() * Math.PI * 2
            const s = 1.5 + Math.random() * 5
            this.parts.push({
              x: this.billX, y: this.billY - 125,
              vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2.5,
              life: 40 + ~~(Math.random() * 35), ml: 75,
              col: Math.random() > 0.35 ? 0xcc0000 : 0xf5c518,
            })
          }

          this.cameras.main.flash(320, 200, 0, 0)
          this.cameras.main.shake(400, 0.015)

          // Bill falls after brief delay
          this.time.delayedCall(500, () => {
            this.billFalling = true
            this.tweens.add({
              targets: this, billFall: Math.PI / 2,
              duration: 1800, ease: 'Power2',
              onComplete: () => {
                // Blood pool grows
                let pr = 0
                this.time.addEvent({
                  delay: 60, repeat: 20,
                  callback: () => {
                    pr += 4
                    this.gBlood.clear()
                    this.gBlood.fillStyle(0x550000, 0.8)
                    this.gBlood.fillEllipse(this.billX + 50, this.billY + 20, pr * 2.2, pr * 0.55)
                  },
                })
                // "...Kiddo."
                this.time.delayedCall(1300, () => {
                  this.tweens.add({ targets: this.tKiddo, alpha: 1, duration: 900 })
                  this.time.delayedCall(1600, () => {
                    void discoverEgg('killbill')
                    setBeaten(true)
                  })
                })
              },
            })
          })
        }

        // ── UPDATE LOOP ──────────────────────────────────────────
        update(_time: number, delta: number) {
          this.drawBg()
          this.drawBride()
          this.drawBill()

          // Timer
          if (this.phase === 'challenge') {
            this.keyMs -= delta
            if (this.keyMs <= 0 && this.lives > 0) {
              this.missKey()
              if (this.phase === 'challenge') this.keyMs = KEY_MS
            }
            this.drawCircles()
            this.drawTimerBar()
          }

          // Particles
          this.gParts.clear()
          if (this.parts.length > 0) {
            for (const p of this.parts) {
              p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life--
              const a = Math.max(0, p.life / p.ml)
              this.gParts.fillStyle(p.col, a).fillRect(p.x - 3, p.y - 3, 6, 6)
            }
            this.parts = this.parts.filter(p => p.life > 0)
          }
        }
      }
      // ─────────────────────────────────────────────────────────────

      const cfg: any = {
        type: Phaser.AUTO,
        width: GW, height: GH,
        parent: containerRef.current!,
        backgroundColor: '#000000',
        scene: KBScene,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GW, height: GH },
        audio: { disableWebAudio: true },
        banner: false,
      }

      game = new Phaser.Game(cfg)
      gameRef.current = game
    })

    return () => {
      mounted = false
      game?.destroy(true)
      gameRef.current = null
      handleKeyRef.current = null
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div ref={containerRef} />

      {/* Mobile keyboard — 3×4 grid */}
      {isMobile && showCtrl && !beaten && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6,
          padding: '8px 10px', background: 'rgba(0,0,0,0.85)',
          border: '1px solid rgba(245,197,24,0.25)', borderRadius: 8, marginTop: 6,
        }}>
          {KEYS.map(k => (
            <button key={k}
              onPointerDown={e => { e.preventDefault(); handleKeyRef.current?.(k) }}
              style={{
                width: 52, height: 52,
                background: k === currentKey ? '#f5c518' : 'rgba(22,22,22,0.95)',
                border: `2px solid ${k === currentKey ? '#f5c518' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 7, color: k === currentKey ? '#000' : '#e8e8e8',
                fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold',
                cursor: 'pointer', touchAction: 'none',
              }}
            >{k}</button>
          ))}
        </div>
      )}

      {/* Win overlay */}
      {beaten && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.9)', animation: 'ee-hal-in .6s ease',
        }}>
          <div style={{ color: '#cc0000', fontSize: '3rem', fontFamily: 'serif', fontWeight: 700, textShadow: '0 0 30px #ff0000', marginBottom: '1rem' }}>
            BILL EST MORT
          </div>
          <div style={{ color: '#e8e8e8', fontSize: '1.1rem', fontStyle: 'italic', fontFamily: 'serif', marginBottom: '2rem', textAlign: 'center', maxWidth: 500, padding: '0 1rem' }}>
            {endText ?? "Pai mei t'a bien entraîné."}
          </div>
          <button onClick={onDone} style={{ background: '#cc0000', border: 'none', color: '#fff', padding: '.8rem 2rem', borderRadius: 6, cursor: 'pointer', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '2px' }}>
            FERMER
          </button>
        </div>
      )}

      <button onClick={onDone} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '.78rem', fontFamily: 'monospace' }}>
        ESC
      </button>
    </div>
  )
}
