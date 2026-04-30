'use client'

import { useEffect, useRef, useState } from 'react'

type Star = { x: number; y: number; r: number; a: number; twinkle: number }

export default function JawsCinematicTest() {
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (!running || !hostRef.current) return

    let cancelled = false

    async function boot() {
      const Phaser = await import('phaser')
      if (cancelled || !hostRef.current) return

      const audio = new Audio('/sons/jaws-theme.m4a')
      audio.volume = 0.82
      audioRef.current = audio
      audio.play().catch(() => {})

      class JawsCinematicScene extends Phaser.Scene {
        private sky!: any
        private seaBack!: any
        private seaMid!: any
        private seaFront!: any
        private reflections!: any
        private fin!: any
        private victim!: any
        private shark!: any
        private blood!: any
        private splash!: any
        private vignette!: any
        private stars: Star[] = []
        private startedAt = 0
        private victimAlive = true
        private ended = false

        constructor() {
          super('JawsCinematicScene')
        }

        create() {
          const { width, height } = this.scale
          this.cameras.main.setBackgroundColor('#020712')
          this.startedAt = this.time.now

          this.sky = this.add.graphics()
          this.seaBack = this.add.graphics()
          this.reflections = this.add.graphics()
          this.seaMid = this.add.graphics()
          this.blood = this.add.graphics()
          this.fin = this.add.graphics()
          this.victim = this.add.graphics()
          this.shark = this.add.graphics()
          this.splash = this.add.graphics()
          this.seaFront = this.add.graphics()
          this.vignette = this.add.graphics()

          this.stars = Array.from({ length: 64 }, (_, i) => ({
            x: ((i * 97) % 1000) / 1000,
            y: 0.035 + (((i * 53) % 360) / 1000),
            r: 0.7 + ((i * 29) % 16) / 10,
            a: 0.35 + ((i * 17) % 55) / 100,
            twinkle: 0.7 + ((i * 11) % 16) / 10,
          }))

          this.scale.on('resize', () => this.drawStaticScene())
          this.drawStaticScene()
        }

        update(time: number) {
          const elapsed = time - this.startedAt
          const { width, height } = this.scale
          const waterY = height * 0.5
          const cx = width * 0.5
          const phase = {
            stalk: 12500,
            circle: 18800,
            dive: 21300,
            breach: 23200,
            bite: 24400,
            sink: 27000,
            end: 30200,
          }

          this.drawWater(time, elapsed, 0)
          this.drawReflection(time, elapsed)
          this.drawBlood(elapsed, phase.bite, phase.sink)
          this.drawVictim(cx, waterY, elapsed)
          this.drawFin(elapsed, phase, cx, waterY, width)
          this.drawShark(elapsed, phase, cx, waterY, height)
          this.drawForegroundWater(time, elapsed)
          this.drawVignette(elapsed)

          if (elapsed > phase.bite && this.victimAlive) {
            this.victimAlive = false
            this.cameras.main.shake(520, 0.009)
          }

          if (elapsed > phase.breach && elapsed < phase.bite + 900) {
            this.drawAttackSplash(cx, waterY, elapsed - phase.breach)
          } else {
            this.splash.clear()
          }

          if (elapsed >= phase.end && !this.ended) {
            this.ended = true
            setFinished(true)
            setRunning(false)
          }
        }

        private drawStaticScene() {
          const { width, height } = this.scale
          const waterY = height * 0.5
          this.sky.clear()

          for (let i = 0; i < 42; i++) {
            const t = i / 41
            const color = Phaser.Display.Color.Interpolate.ColorWithColor(
              Phaser.Display.Color.ValueToColor(0x020713),
              Phaser.Display.Color.ValueToColor(0x0a1d32),
              41,
              i,
            )
            this.sky.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1)
            this.sky.fillRect(0, (waterY * i) / 42, width, waterY / 42 + 1)
          }

          const moonX = width * 0.73
          const moonY = height * 0.14
          for (let i = 7; i >= 1; i--) {
            this.sky.fillStyle(0xd9d2a6, 0.018 * i)
            this.sky.fillCircle(moonX, moonY, 23 * i)
          }
          this.sky.fillStyle(0xf0ead1, 1)
          this.sky.fillCircle(moonX, moonY, 34)
          this.sky.fillStyle(0xcfc8ab, 0.26)
          this.sky.fillCircle(moonX - 9, moonY - 6, 8)
          this.sky.fillCircle(moonX + 10, moonY + 8, 5)

          for (const star of this.stars) {
            this.sky.fillStyle(0xffffff, star.a)
            this.sky.fillCircle(width * star.x, height * star.y, star.r)
          }

          this.sky.fillStyle(0x071422, 1)
          this.sky.fillRect(0, waterY - 6, width, 12)
        }

        private drawWater(time: number, elapsed: number, blood: number) {
          const { width, height } = this.scale
          const waterY = height * 0.5
          this.seaBack.clear()

          const red = Math.min(1, blood)
          for (let i = 0; i < 36; i++) {
            const t = i / 35
            const dark = Phaser.Display.Color.ValueToColor(0x03101f)
            const blue = Phaser.Display.Color.ValueToColor(0x0b3156)
            const color = Phaser.Display.Color.Interpolate.ColorWithColor(blue, dark, 35, i)
            const rr = Math.round(color.r + red * 70 * (1 - t))
            const gg = Math.round(color.g * (1 - red * 0.82))
            const bb = Math.round(color.b * (1 - red * 0.88))
            this.seaBack.fillStyle(Phaser.Display.Color.GetColor(rr, gg, bb), 1)
            this.seaBack.fillRect(0, waterY + ((height - waterY) * i) / 36, width, (height - waterY) / 36 + 1)
          }

          this.waveFill(this.seaBack, waterY + 8, 9, 0.009, time * 0.0011, 0x15517b, 0.38)
          this.waveFill(this.seaBack, waterY + 26, 16, 0.006, time * 0.0008, 0x082844, 0.56)
          this.waveFill(this.seaBack, waterY + 64, 24, 0.004, time * 0.0006, 0x061c32, 0.72)

          if (elapsed > 700) {
            this.seaBack.lineStyle(1, 0x9bc7d6, 0.22)
            for (let y = waterY + 42; y < height; y += 42) {
              const offset = Math.sin(time * 0.001 + y * 0.02) * 70
              this.seaBack.beginPath()
              this.seaBack.moveTo(width * 0.56 + offset, y)
              this.seaBack.lineTo(width * 0.76 + offset * 0.35, y + 4)
              this.seaBack.strokePath()
            }
          }
        }

        private drawForegroundWater(time: number, elapsed: number) {
          const { width, height } = this.scale
          const waterY = height * 0.5
          this.seaFront.clear()
          const chop = Math.min(1, elapsed / 19000)
          this.waveLine(this.seaFront, waterY + 3, 8 + chop * 4, 0.013, time * 0.0019, 0x6aa7bf, 0.36, 2)
          this.waveLine(this.seaFront, waterY + 24, 13 + chop * 8, 0.016, time * 0.0024, 0xd9f2f5, 0.18, 1)
          this.waveLine(this.seaFront, waterY + 72, 18, 0.011, time * 0.0013, 0x86c5d8, 0.11, 1)
        }

        private drawReflection(time: number, elapsed: number) {
          const { width, height } = this.scale
          const waterY = height * 0.5
          this.reflections.clear()
          if (elapsed > 23200) return

          const center = width * 0.73
          for (let i = 0; i < 18; i++) {
            const y = waterY + 18 + i * 18
            const spread = 20 + i * 11
            const wobble = Math.sin(time * 0.0018 + i) * 18
            this.reflections.lineStyle(2, 0xded3a1, Math.max(0, 0.19 - i * 0.009))
            this.reflections.beginPath()
            this.reflections.moveTo(center - spread + wobble, y)
            this.reflections.lineTo(center + spread * 0.7 + wobble * 0.4, y + Math.sin(i) * 4)
            this.reflections.strokePath()
          }
        }

        private drawVictim(cx: number, waterY: number, elapsed: number) {
          this.victim.clear()
          if (!this.victimAlive) return

          const panic = Math.max(0, Math.min(1, (elapsed - 17800) / 5200))
          const bob = Math.sin(elapsed * 0.004) * (5 + panic * 3)
          const x = cx + Math.sin(elapsed * 0.0016) * (8 + panic * 12)
          const y = waterY - 14 + bob

          this.victim.fillStyle(0x020713, 0.24)
          this.victim.fillEllipse(x, waterY + 16, 112, 20)

          this.victim.fillStyle(0xf1f0e8, 1)
          this.victim.fillEllipse(x, y + 21, 82, 31)
          this.victim.lineStyle(5, 0xc62127, 1)
          this.victim.strokeEllipse(x, y + 21, 82, 31)
          this.victim.lineStyle(7, 0xf1f0e8, 1)
          this.victim.beginPath()
          this.victim.arc(x, y + 21, 41, -0.2, 0.5)
          this.victim.strokePath()
          this.victim.beginPath()
          this.victim.arc(x, y + 21, 41, 2.75, 3.45)
          this.victim.strokePath()
          this.victim.fillStyle(0x0b3156, 1)
          this.victim.fillEllipse(x, y + 21, 34, 13)

          this.victim.lineStyle(6, 0xe8b19b, 1)
          this.victim.beginPath()
          this.victim.moveTo(x - 13, y - 3)
          this.victim.lineTo(x - 34, y - 20 - panic * 10)
          this.victim.strokePath()
          this.victim.beginPath()
          this.victim.moveTo(x + 13, y - 3)
          this.victim.lineTo(x + 34, y - 18 - panic * 8)
          this.victim.strokePath()

          this.victim.fillStyle(0xe8b19b, 1)
          this.victim.fillEllipse(x, y - 2, 25, 31)
          this.victim.fillStyle(0xd51e29, 1)
          this.victim.fillEllipse(x, y - 9, 24, 13)
          this.victim.fillCircle(x, y - 31, 14)
          this.victim.fillStyle(0x271006, 1)
          this.victim.fillEllipse(x + 5, y - 36, 28, 17)
          this.victim.fillEllipse(x + 15, y - 19, 13, 28)
          this.victim.fillStyle(0x1c1110, 1)
          this.victim.fillCircle(x - 5, y - 32, 1.8)
          this.victim.fillCircle(x + 5, y - 32, 1.8)
        }

        private drawFin(elapsed: number, phase: Record<string, number>, cx: number, waterY: number, width: number) {
          this.fin.clear()
          if (elapsed < 1600 || elapsed > phase.dive) return

          const p = Math.min(1, (elapsed - 1600) / (phase.dive - 1600))
          const orbit = elapsed > phase.stalk ? Math.min(1, (elapsed - phase.stalk) / (phase.circle - phase.stalk)) : 0
          const sideX = width * (0.09 + 0.45 * p)
          const circleX = cx + Math.sin(elapsed * 0.0042) * (170 * (1 - orbit) + 46)
          const x = Phaser.Math.Linear(sideX, circleX, orbit)
          const y = waterY + Math.sin(elapsed * 0.006) * 9
          const visible = elapsed < phase.circle ? 0.72 + Math.sin(elapsed * 0.003) * 0.28 : 1 - Math.min(1, (elapsed - phase.circle) / (phase.dive - phase.circle)) * 0.35
          const scale = 0.68 + p * 0.45

          this.fin.fillStyle(0x0b0f16, 0.36)
          this.fin.fillEllipse(x + 32, y + 23, 160 * scale, 18 * scale)

          this.fin.fillStyle(0x111923, visible)
          this.fin.beginPath()
          this.fin.moveTo(x - 7 * scale, y + 20 * scale)
          this.fin.lineTo(x + 23 * scale, y + 20 * scale)
          this.fin.quadraticCurveTo(x + 36 * scale, y - 8 * scale, x + 10 * scale, y - 42 * scale)
          this.fin.quadraticCurveTo(x + 0 * scale, y - 12 * scale, x - 7 * scale, y + 20 * scale)
          this.fin.closePath()
          this.fin.fillPath()

          this.fin.lineStyle(2, 0xd6f7ff, 0.2 * visible)
          for (let i = 0; i < 4; i++) {
            this.fin.beginPath()
            this.fin.moveTo(x + 24 * scale + i * 5, y + 16 + i * 4)
            this.fin.lineTo(x + 78 * scale + i * 22, y + 9 + Math.sin(elapsed * 0.005 + i) * 7)
            this.fin.strokePath()
          }
        }

        private drawShark(elapsed: number, phase: Record<string, number>, cx: number, waterY: number, height: number) {
          this.shark.clear()
          if (elapsed < phase.dive) return

          const riseP = Math.max(0, Math.min(1, (elapsed - phase.dive) / (phase.breach - phase.dive)))
          const biteP = Math.max(0, Math.min(1, (elapsed - phase.breach) / (phase.bite - phase.breach)))
          const sinkP = Math.max(0, Math.min(1, (elapsed - phase.bite - 450) / (phase.sink - phase.bite)))
          const easeRise = riseP * riseP * (3 - 2 * riseP)
          const y = waterY + 360 - easeRise * 610 + sinkP * (height + 370)
          const jaw = Math.min(1, biteP * 1.35) * (1 - Math.max(0, sinkP - 0.2))
          const scale = Math.max(0.74, Math.min(1.45, 0.84 + riseP * 0.62))

          if (y > height + 260) return

          this.shark.save()
          this.shark.translateCanvas(cx, y)
          this.shark.scaleCanvas(scale, scale)

          this.shark.fillStyle(0x0a0d12, 0.34)
          this.shark.fillEllipse(0, 136, 170, 48)

          this.shark.fillStyle(0x1b2530, 1)
          this.shark.fillEllipse(0, 34, 112, 286)
          this.shark.fillStyle(0xd1d3c6, 1)
          this.shark.fillEllipse(10, 58, 58, 190)
          this.shark.fillStyle(0x121a22, 1)
          this.shark.fillTriangle(-23, -72, -45, -166, 10, -82)
          this.shark.fillTriangle(-58, 30, -125, 74, -61, 92)
          this.shark.fillTriangle(58, 30, 125, 74, 61, 92)

          this.shark.lineStyle(3, 0x0a0d12, 0.42)
          for (let i = 0; i < 5; i++) {
            this.shark.beginPath()
            this.shark.moveTo(-53 + i * 5, -25 + i * 9)
            this.shark.lineTo(-36 + i * 3, -4 + i * 9)
            this.shark.strokePath()
          }

          this.shark.fillStyle(0x1b2530, 1)
          this.shark.beginPath()
          this.shark.moveTo(-58, -91)
          this.shark.quadraticCurveTo(0, -132, 58, -91)
          this.shark.lineTo(50, -48)
          this.shark.lineTo(-50, -48)
          this.shark.closePath()
          this.shark.fillPath()

          const lowerY = jaw * 72
          this.shark.fillStyle(0x8d1118, 1)
          this.shark.beginPath()
          this.shark.moveTo(-55, -74 + lowerY)
          this.shark.quadraticCurveTo(0, -47 + lowerY, 55, -74 + lowerY)
          this.shark.lineTo(45, -31 + lowerY)
          this.shark.lineTo(-45, -31 + lowerY)
          this.shark.closePath()
          this.shark.fillPath()

          this.shark.fillStyle(0xf3f0df, 1)
          for (let i = 0; i < 9; i++) {
            const tx = -54 + i * 13.5
            this.shark.fillTriangle(tx, -48, tx + 6, -74, tx + 12, -48)
          }
          for (let i = 0; i < 8; i++) {
            const tx = -47 + i * 13.5
            this.shark.fillTriangle(tx, -33 + lowerY, tx + 6, -11 + lowerY, tx + 12, -33 + lowerY)
          }

          this.shark.fillStyle(0xf3f3ea, jaw > 0.74 ? 1 : 0)
          this.shark.fillCircle(-33, -74, 8)
          this.shark.fillStyle(0x040406, 1)
          this.shark.fillCircle(-33, -74, 4.2)

          this.shark.restore()
        }

        private drawAttackSplash(cx: number, waterY: number, t: number) {
          const p = Math.min(1, t / 1700)
          this.splash.clear()
          this.splash.lineStyle(3, 0xe8fbff, 0.58 * (1 - p))
          for (let i = 0; i < 4; i++) {
            this.splash.strokeEllipse(cx, waterY + 9 + i * 5, 120 + p * 240 + i * 45, 28 + p * 72 + i * 9)
          }
          this.splash.fillStyle(0xe8fbff, 0.34 * (1 - p))
          for (let i = 0; i < 28; i++) {
            const a = (i / 28) * Math.PI * 2
            const r = 55 + p * 180 + (i % 5) * 9
            this.splash.fillCircle(cx + Math.cos(a) * r, waterY - 10 - Math.abs(Math.sin(a)) * (70 + p * 80), 2 + (i % 3))
          }
        }

        private drawBlood(elapsed: number, biteAt: number, sinkAt: number) {
          const { width, height } = this.scale
          const waterY = height * 0.5
          this.blood.clear()
          const p = Math.max(0, Math.min(1, (elapsed - biteAt) / (sinkAt - biteAt)))
          if (p <= 0) return
          this.drawWater(this.time.now, elapsed, p)
          this.blood.fillStyle(0x9b0710, 0.72 * p)
          this.blood.fillEllipse(width * 0.5, waterY + 18, 110 + p * 450, 24 + p * 96)
          this.blood.fillStyle(0x4f0307, 0.22 * p)
          this.blood.fillEllipse(width * 0.5 + 42, waterY + 36, 220 + p * 310, 34 + p * 72)
        }

        private drawVignette(elapsed: number) {
          const { width, height } = this.scale
          this.vignette.clear()
          this.vignette.lineStyle(Math.max(width, height) * 0.18, 0x000000, 0.34)
          this.vignette.strokeRect(0, 0, width, height)
          const fade = Math.max(0, Math.min(1, (elapsed - 28200) / 2000))
          if (fade > 0) {
            this.vignette.fillStyle(0x000000, fade)
            this.vignette.fillRect(0, 0, width, height)
          }
        }

        private waveFill(g: any, y: number, amp: number, freq: number, speed: number, color: number, alpha: number) {
          const { width, height } = this.scale
          g.fillStyle(color, alpha)
          g.beginPath()
          g.moveTo(0, y)
          for (let x = 0; x <= width + 8; x += 8) {
            g.lineTo(x, y + Math.sin(x * freq + speed) * amp + Math.sin(x * freq * 2.1 + speed * 1.7) * amp * 0.28)
          }
          g.lineTo(width, height)
          g.lineTo(0, height)
          g.closePath()
          g.fillPath()
        }

        private waveLine(g: any, y: number, amp: number, freq: number, speed: number, color: number, alpha: number, width: number) {
          const { width: screenW } = this.scale
          g.lineStyle(width, color, alpha)
          g.beginPath()
          g.moveTo(0, y)
          for (let x = 0; x <= screenW + 8; x += 8) {
            g.lineTo(x, y + Math.sin(x * freq + speed) * amp + Math.sin(x * freq * 2.4 + speed * 1.4) * amp * 0.2)
          }
          g.strokePath()
        }
      }

      gameRef.current = new Phaser.Game({
        type: Phaser.WEBGL,
        parent: hostRef.current,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#020712',
        scene: JawsCinematicScene,
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: '100%',
          height: '100%',
        },
        render: {
          antialias: true,
          pixelArt: false,
          transparent: false,
        },
      })
    }

    boot()

    return () => {
      cancelled = true
      audioRef.current?.pause()
      audioRef.current = null
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [running])

  function start() {
    setFinished(false)
    setRunning(true)
  }

  return (
    <main style={styles.page}>
      <div ref={hostRef} style={styles.stage} />
      {!running && (
        <div style={styles.panel}>
          <p style={styles.kicker}>Test local</p>
          <h1 style={styles.title}>Les Dents de la mer</h1>
          <p style={styles.copy}>
            Scène Phaser isolée : mer nocturne, patrouille, montée de tension, surgissement et attaque.
          </p>
          <button type="button" onClick={start} style={styles.button}>
            {finished ? 'Relancer la scène' : 'Lancer la scène'}
          </button>
        </div>
      )}
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: 'fixed',
    inset: 0,
    overflow: 'hidden',
    background: '#020712',
    color: '#f6f2e7',
  },
  stage: {
    position: 'absolute',
    inset: 0,
  },
  panel: {
    position: 'absolute',
    left: 'clamp(20px, 6vw, 72px)',
    bottom: 'clamp(28px, 9vh, 92px)',
    width: 'min(440px, calc(100vw - 40px))',
    padding: '0',
    textShadow: '0 2px 18px rgba(0,0,0,.72)',
  },
  kicker: {
    margin: '0 0 10px',
    color: '#9dc3d0',
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    margin: '0 0 12px',
    color: '#f3ead2',
    fontSize: 'clamp(38px, 7vw, 82px)',
    lineHeight: 0.92,
    letterSpacing: 0,
    fontFamily: 'Georgia, serif',
    fontWeight: 700,
  },
  copy: {
    margin: '0 0 22px',
    maxWidth: 390,
    color: 'rgba(246,242,231,.78)',
    fontSize: 15,
    lineHeight: 1.55,
  },
  button: {
    minHeight: 44,
    border: '1px solid rgba(246,242,231,.34)',
    background: 'rgba(246,242,231,.92)',
    color: '#07111d',
    borderRadius: 6,
    padding: '0 18px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 14px 32px rgba(0,0,0,.32)',
  },
}
