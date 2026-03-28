'use client'

import { useEffect, useRef } from 'react'
import { discoverEgg } from '@/lib/actions'

// ── 8-bit Web Audio SFX ───────────────────────────────────────────────────────
function makeAC() { return new (window.AudioContext || (window as any).webkitAudioContext)() }

function sfxTargetBeep(ac: AudioContext, intensity: number) {
  const freq = 700 + intensity * 1400
  const osc = ac.createOscillator(); const g = ac.createGain()
  osc.connect(g); g.connect(ac.destination)
  osc.type = 'square'; osc.frequency.value = freq
  const t = ac.currentTime
  g.gain.setValueAtTime(0.07, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.055)
  osc.start(t); osc.stop(t + 0.07)
}

function sfxPlasmaShot(ac: AudioContext) {
  const t = ac.currentTime
  // Zap descend
  const osc = ac.createOscillator(); const g = ac.createGain()
  osc.connect(g); g.connect(ac.destination)
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(2400, t)
  osc.frequency.exponentialRampToValueAtTime(160, t + 0.20)
  g.gain.setValueAtTime(0.20, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  osc.start(t); osc.stop(t + 0.25)
  // Crackle
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.12), ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.02))
  const src = ac.createBufferSource()
  const bpf = ac.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 3000; bpf.Q.value = 0.8
  const cg = ac.createGain(); cg.gain.value = 0.15
  src.buffer = buf; src.connect(bpf); bpf.connect(cg); cg.connect(ac.destination)
  src.start(t)
}

function sfxImpact(ac: AudioContext) {
  const t = ac.currentTime
  // Noise burst
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.45), ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.06))
  const src = ac.createBufferSource()
  const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 900
  const ng = ac.createGain(); ng.gain.value = 0.4
  src.buffer = buf; src.connect(lpf); lpf.connect(ng); ng.connect(ac.destination)
  src.start(t)
  // Sub thud
  const osc = ac.createOscillator(); const og = ac.createGain()
  osc.connect(og); og.connect(ac.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(110, t)
  osc.frequency.exponentialRampToValueAtTime(28, t + 0.32)
  og.gain.setValueAtTime(0.45, t)
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
  osc.start(t); osc.stop(t + 0.42)
  // 8-bit crunch (square)
  const osc2 = ac.createOscillator(); const og2 = ac.createGain()
  osc2.connect(og2); og2.connect(ac.destination)
  osc2.type = 'square'
  osc2.frequency.setValueAtTime(80, t)
  osc2.frequency.exponentialRampToValueAtTime(20, t + 0.18)
  og2.gain.setValueAtTime(0.10, t)
  og2.gain.exponentialRampToValueAtTime(0.001, t + 0.20)
  osc2.start(t); osc2.stop(t + 0.22)
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Smoke { x: number; y: number; vx: number; vy: number; r: number; alpha: number }
interface Hole  { x: number; y: number; r: number; age: number; smoke: Smoke[] }
interface Spark { x: number; y: number; vx: number; vy: number; r: number; alpha: number; rgb: [number, number, number] }
interface Bolt  { x1: number; y1: number; x2: number; y2: number; age: number; maxAge: number }

export default function AVPEgg({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W; canvas.height = H

    const ctx = canvas.getContext('2d')!
    discoverEgg('predator')

    // Audio principal
    const audio = new Audio('/sons/predator-sound.m4a')
    audio.volume = 0.85; audio.play().catch(() => {})

    let ac: AudioContext | null = null
    try { ac = makeAC() } catch {}

    let done = false
    const startTime = performance.now()

    // ── Timeline ──────────────────────────────────────────────────────────────
    // Shots fired at these timestamps (ms)
    const SHOT_TIMES = [2800, 5000, 7200, 9400, 11400]
    const T = {
      alienAppear: 500,
      laserStart: 1200,
      alienEscape: 12400,
      fadeStart: 14800,
      end: 16500,
    }

    // ── Alien ─────────────────────────────────────────────────────────────────
    const alien = {
      x: W * 0.58, y: H * 0.48,
      tx: W * 0.58, ty: H * 0.48,   // lerp target
      alpha: 0, legAnim: 0,
      escaped: false, escapeVy: 0,
    }
    // Where alien jumps after each shot (dodge)
    const DODGE_SPOTS = [
      { x: W * 0.20, y: H * 0.38 },
      { x: W * 0.72, y: H * 0.55 },
      { x: W * 0.14, y: H * 0.62 },
      { x: W * 0.60, y: H * 0.28 },
      { x: W * 0.38, y: H * 0.50 },
    ]
    let dodgeIdx = 0

    // ── Laser ─────────────────────────────────────────────────────────────────
    const laser = {
      visible: false,
      tx: W * 0.5, ty: H * 0.5,  // smoothed target
      dots: Array.from({ length: 3 }, () => ({ x: W * 0.5, y: H * 0.5 })),
      convergence: 0,             // 0=spread, 1=tight on target
    }

    // ── State ─────────────────────────────────────────────────────────────────
    const holes:  Hole[]  = []
    const sparks: Spark[] = []
    let bolt: Bolt | null = null
    let shotIdx = 0
    let fadeAlpha = 0

    // Beep interval — speed up as convergence rises
    let beepInterval: ReturnType<typeof setInterval> | null = null
    let beepCount = 0
    function startBeeps() {
      beepInterval = setInterval(() => {
        if (!ac || done) return
        sfxTargetBeep(ac, Math.min(1, beepCount * 0.06))
        beepCount++
      }, 300)
    }
    function stopBeeps() {
      if (beepInterval) { clearInterval(beepInterval); beepInterval = null }
    }

    // ── Draw alien (quadruped) ────────────────────────────────────────────────
    function drawAlien(x: number, y: number, alpha: number) {
      if (alpha <= 0) return
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y)

      // Body
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 13, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#1b2d1b'; ctx.fill()
      ctx.strokeStyle = '#2d4d2d'; ctx.lineWidth = 1; ctx.stroke()

      // Head elongated
      ctx.beginPath(); ctx.ellipse(36, -3, 22, 10, -0.15, 0, Math.PI * 2)
      ctx.fillStyle = '#1b2d1b'; ctx.fill()

      // Inner jaw
      ctx.beginPath(); ctx.moveTo(50, -1); ctx.lineTo(60, 1); ctx.lineTo(50, 4)
      ctx.fillStyle = '#8a2020'; ctx.fill()

      // Dorsal tubes
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.ellipse(-14 + i * 11, -12, 2.5, 6, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#253525'; ctx.fill()
      }

      // 4 legs (diagonal pair animation)
      const lp = alien.legAnim
      const legs = [
        { bx: -14, by: 8, ph: 0 }, { bx: 8, by: 8, ph: Math.PI },
        { bx: -24, by: 8, ph: Math.PI }, { bx: 18, by: 8, ph: 0 },
      ]
      ctx.lineCap = 'round'
      for (const leg of legs) {
        const sw = Math.sin(lp + leg.ph) * 13
        ctx.strokeStyle = '#1b2d1b'; ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(leg.bx, leg.by)
        ctx.lineTo(leg.bx + sw, leg.by + 17)
        ctx.lineTo(leg.bx + sw * 1.6, leg.by + 10)
        ctx.stroke()
        // Claw
        ctx.strokeStyle = '#3a5a3a'; ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(leg.bx + sw * 1.6, leg.by + 10)
        ctx.lineTo(leg.bx + sw * 1.6 + 4, leg.by + 8)
        ctx.stroke()
      }

      // Tail S-curve
      ctx.beginPath()
      ctx.moveTo(-30, 0)
      ctx.bezierCurveTo(-50, -12, -65, 12, -80, -6)
      ctx.strokeStyle = '#1b2d1b'; ctx.lineWidth = 4.5; ctx.stroke()
      // Blade
      ctx.beginPath(); ctx.moveTo(-80, -6); ctx.lineTo(-92, -16); ctx.lineTo(-85, -2)
      ctx.fillStyle = '#3a5a3a'; ctx.fill()

      ctx.restore()
    }

    // ── Draw laser 3-dot sight ────────────────────────────────────────────────
    function drawLaser() {
      if (!laser.visible) return
      ctx.save()
      for (let i = 0; i < 3; i++) {
        const d = laser.dots[i]
        // Outer glow
        const grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 12)
        grd.addColorStop(0, 'rgba(255,20,20,0.85)')
        grd.addColorStop(1, 'rgba(255,0,0,0)')
        ctx.fillStyle = grd
        ctx.beginPath(); ctx.arc(d.x, d.y, 12, 0, Math.PI * 2); ctx.fill()
        // Core
        ctx.beginPath(); ctx.arc(d.x, d.y, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = '#ff5555'; ctx.fill()
      }
      // Faint triangle between dots
      ctx.beginPath()
      ctx.moveTo(laser.dots[0].x, laser.dots[0].y)
      ctx.lineTo(laser.dots[1].x, laser.dots[1].y)
      ctx.lineTo(laser.dots[2].x, laser.dots[2].y)
      ctx.closePath()
      ctx.strokeStyle = `rgba(255,40,40,${0.08 + laser.convergence * 0.12})`
      ctx.lineWidth = 0.8; ctx.stroke()
      ctx.restore()
    }

    // ── Draw plasma bolt ──────────────────────────────────────────────────────
    function drawBolt() {
      if (!bolt) return
      const p = Math.min(1, bolt.age / bolt.maxAge)
      const ex = bolt.x1 + (bolt.x2 - bolt.x1) * p
      const ey = bolt.y1 + (bolt.y2 - bolt.y1) * p

      ctx.save()
      ctx.shadowColor = '#66ffaa'; ctx.shadowBlur = 16
      ctx.strokeStyle = '#88ffcc'; ctx.lineWidth = 3
      ctx.beginPath(); ctx.moveTo(bolt.x1, bolt.y1); ctx.lineTo(ex, ey); ctx.stroke()
      ctx.shadowBlur = 0

      if (p < 0.98) {
        ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(120,255,180,0.85)'; ctx.fill()
      }
      ctx.restore()

      bolt.age++
      if (bolt.age > bolt.maxAge + 4) bolt = null
    }

    // ── Draw holes + smoke ────────────────────────────────────────────────────
    function drawHoles() {
      for (const hole of holes) {
        hole.age++

        // Charcoal hole
        ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(6,4,2,0.97)'; ctx.fill()

        // Burning rim — pulsing orange
        const pulse = 0.65 + Math.sin(hole.age * 0.16) * 0.35
        const rim = ctx.createRadialGradient(hole.x, hole.y, hole.r * 0.65, hole.x, hole.y, hole.r * 1.7)
        rim.addColorStop(0, 'rgba(0,0,0,0)')
        rim.addColorStop(0.55, `rgba(240,85,8,${0.60 * pulse})`)
        rim.addColorStop(0.75, `rgba(255,150,0,${0.42 * pulse})`)
        rim.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r * 1.7, 0, Math.PI * 2)
        ctx.fillStyle = rim; ctx.fill()

        // Ember inner
        const ember = ctx.createRadialGradient(hole.x, hole.y, 0, hole.x, hole.y, hole.r * 0.9)
        ember.addColorStop(0, `rgba(255,50,0,${0.15 * pulse})`)
        ember.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r * 0.9, 0, Math.PI * 2)
        ctx.fillStyle = ember; ctx.fill()

        // Spawn smoke
        if (hole.age % 3 === 0 && Math.random() < 0.85) {
          hole.smoke.push({
            x: hole.x + (Math.random() - 0.5) * hole.r,
            y: hole.y - hole.r * 0.4,
            vx: (Math.random() - 0.5) * 0.7,
            vy: -(0.5 + Math.random() * 0.9),
            r: 5 + Math.random() * 9,
            alpha: 0.30 + Math.random() * 0.22,
          })
        }

        // Draw + update smoke
        for (let i = hole.smoke.length - 1; i >= 0; i--) {
          const s = hole.smoke[i]
          s.x += s.vx; s.y += s.vy
          s.r += 0.22; s.alpha -= 0.005
          if (s.alpha <= 0) { hole.smoke.splice(i, 1); continue }
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(38,32,28,${s.alpha})`; ctx.fill()
        }
      }
    }

    // ── Draw sparks ───────────────────────────────────────────────────────────
    function drawSparks() {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx; s.y += s.vy; s.vy += 0.28
        s.vx *= 0.98; s.r -= 0.10; s.alpha -= 0.022
        if (s.r <= 0 || s.alpha <= 0) { sparks.splice(i, 1); continue }
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]},${s.alpha})`
        ctx.fill()
      }
    }

    // ── Spawn impact ──────────────────────────────────────────────────────────
    function spawnImpact(x: number, y: number) {
      holes.push({ x, y, r: 26 + Math.random() * 20, age: 0, smoke: [] })
      for (let i = 0; i < 22; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 7
        sparks.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.5,
          r: 2 + Math.random() * 4.5,
          alpha: 1,
          rgb: Math.random() > 0.5 ? [255, 120, 0] : [255, 200, 50],
        })
      }
      if (ac) sfxImpact(ac)
    }

    // ── Fire a shot ───────────────────────────────────────────────────────────
    function fireShot() {
      const tx = laser.tx; const ty = laser.ty
      if (ac) sfxPlasmaShot(ac)
      // Bolt from predator (off-screen bottom-right corner)
      const BOLT_FRAMES = 9
      bolt = { x1: W * 0.92, y1: H * 0.90, x2: tx, y2: ty, age: 0, maxAge: BOLT_FRAMES }

      // Alien dodges after bolt lands (~150ms)
      const nextSpot = DODGE_SPOTS[dodgeIdx % DODGE_SPOTS.length]
      dodgeIdx++
      setTimeout(() => {
        if (done) return
        spawnImpact(tx, ty)  // impact where alien was
        alien.tx = nextSpot.x; alien.ty = nextSpot.y  // alien jumps
      }, 150)
    }

    // ── Render ────────────────────────────────────────────────────────────────
    let raf: number

    function render(now: number) {
      if (done) return
      const elapsed = now - startTime

      ctx.clearRect(0, 0, W, H)

      // Subtle dark tint so effects pop against page content
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.fillRect(0, 0, W, H)

      drawHoles()
      drawSparks()

      // ── Alien appear & move ─────────────────────────────────────────────────
      if (elapsed >= T.alienAppear) {
        alien.alpha = Math.min(1, (elapsed - T.alienAppear) / 350)
      }
      if (elapsed >= T.alienEscape && !alien.escaped) {
        alien.escaped = true; alien.escapeVy = -5
      }
      if (alien.escaped) {
        alien.escapeVy -= 0.35
        alien.ty += alien.escapeVy
        alien.tx += (W * 0.45 - alien.tx) * 0.03
        alien.alpha = Math.max(0, alien.alpha - (alien.ty < -50 ? 0.04 : 0))
      } else {
        // Idle bob
        alien.ty += Math.sin(elapsed * 0.0018) * 0.4
      }
      // Smooth lerp alien position
      alien.x += (alien.tx - alien.x) * 0.10
      alien.y += (alien.ty - alien.y) * 0.10
      alien.legAnim = elapsed * 0.011

      drawAlien(alien.x, alien.y, alien.alpha)

      // ── Laser tracking ──────────────────────────────────────────────────────
      if (elapsed >= T.laserStart && !alien.escaped) {
        laser.visible = true
        // Smooth laser target tracking alien
        laser.tx += (alien.x - laser.tx) * 0.04
        laser.ty += (alien.y - laser.ty) * 0.04

        // Convergence: how close we are to firing next shot
        const nextShotT = SHOT_TIMES[shotIdx] ?? Infinity
        const prevShotT = SHOT_TIMES[shotIdx - 1] ?? T.laserStart
        laser.convergence = Math.min(1, Math.max(0, (elapsed - prevShotT) / (nextShotT - prevShotT)))

        // Dots rotate tightly around target, spreading when hunting
        const spread = (1 - laser.convergence) * 38 + 6
        const rotSpeed = elapsed * 0.0022
        for (let i = 0; i < 3; i++) {
          const a = rotSpeed + (i / 3) * Math.PI * 2
          const tdx = laser.tx + Math.cos(a) * spread
          const tdy = laser.ty + Math.sin(a) * spread
          laser.dots[i].x += (tdx - laser.dots[i].x) * 0.14
          laser.dots[i].y += (tdy - laser.dots[i].y) * 0.14
        }
        drawLaser()
      }

      // ── Fire shots ──────────────────────────────────────────────────────────
      if (shotIdx < SHOT_TIMES.length && elapsed >= SHOT_TIMES[shotIdx] && !alien.escaped) {
        fireShot(); shotIdx++
      }

      drawBolt()

      // ── Fade out ────────────────────────────────────────────────────────────
      if (elapsed >= T.fadeStart) {
        fadeAlpha = (elapsed - T.fadeStart) / (T.end - T.fadeStart)
        if (fadeAlpha >= 1 && !done) {
          done = true; audio.pause(); stopBeeps(); onDone(); return
        }
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeAlpha)})`
        ctx.fillRect(0, 0, W, H)
      }

      raf = requestAnimationFrame(render)
    }

    startBeeps()
    raf = requestAnimationFrame(render)

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { done = true; audio.pause(); stopBeeps(); onDone() }
    }
    window.addEventListener('keydown', onKey)

    return () => {
      cancelAnimationFrame(raf); audio.pause(); stopBeeps()
      window.removeEventListener('keydown', onKey)
    }
  }, [onDone])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        zIndex: 9000,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  )
}
