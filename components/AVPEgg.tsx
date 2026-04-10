'use client'

import React, { useEffect, useRef } from 'react'

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
  const osc = ac.createOscillator(); const g = ac.createGain()
  osc.connect(g); g.connect(ac.destination)
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(2400, t)
  osc.frequency.exponentialRampToValueAtTime(160, t + 0.20)
  g.gain.setValueAtTime(0.20, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
  osc.start(t); osc.stop(t + 0.25)
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.12), ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.02))
  const src = ac.createBufferSource()
  const bpf = ac.createBiquadFilter(); bpf.type = 'bandpass'; bpf.frequency.value = 3000; bpf.Q.value = 0.8
  const cg = ac.createGain(); cg.gain.value = 0.15
  src.buffer = buf; src.connect(bpf); bpf.connect(cg); cg.connect(ac.destination)
  src.start(t)
}

function sfxDodge(ac: AudioContext) {
  // High-pitched alien screech
  const t = ac.currentTime
  const osc = ac.createOscillator(); const g = ac.createGain()
  osc.connect(g); g.connect(ac.destination)
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(900, t)
  osc.frequency.exponentialRampToValueAtTime(400, t + 0.18)
  g.gain.setValueAtTime(0.12, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.20)
  osc.start(t); osc.stop(t + 0.22)
}

function sfxImpact(ac: AudioContext) {
  const t = ac.currentTime
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.45), ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.06))
  const src = ac.createBufferSource()
  const lpf = ac.createBiquadFilter(); lpf.type = 'lowpass'; lpf.frequency.value = 900
  const ng = ac.createGain(); ng.gain.value = 0.4
  src.buffer = buf; src.connect(lpf); lpf.connect(ng); ng.connect(ac.destination)
  src.start(t)
  const osc = ac.createOscillator(); const og = ac.createGain()
  osc.connect(og); og.connect(ac.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(110, t)
  osc.frequency.exponentialRampToValueAtTime(28, t + 0.32)
  og.gain.setValueAtTime(0.45, t)
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
  osc.start(t); osc.stop(t + 0.42)
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Smoke { x: number; y: number; vx: number; vy: number; r: number; alpha: number }
interface Hole  { x: number; y: number; r: number; age: number; smoke: Smoke[] }
interface Spark { x: number; y: number; vx: number; vy: number; r: number; alpha: number; rgb: [number, number, number] }
interface Bolt  { x1: number; y1: number; x2: number; y2: number; progress: number; dodged: boolean }

export default function AVPEgg({ onDone, predSound }: { onDone: () => void; predSound?: React.RefObject<HTMLAudioElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width = W; canvas.height = H

    const ctx = canvas.getContext('2d')!

    let ac: AudioContext | null = null
    try { ac = makeAC() } catch {}

    let roarPlayed = false
    function playRoar() {
      if (roarPlayed || !ac) return
      roarPlayed = true
      fetch('/sons/predator-roar.m4a')
        .then(r => r.arrayBuffer())
        .then(buf => ac!.decodeAudioData(buf))
        .then(decoded => {
          const src = ac!.createBufferSource()
          const g = ac!.createGain(); g.gain.value = 0.92
          src.buffer = decoded; src.connect(g); g.connect(ac!.destination)
          src.start()
        })
        .catch(() => {})
    }

    let done = false
    const startTime = performance.now()
    const MAX_DODGES = 5   // alien escapes after 5 dodges

    // ── Predator shoulder cannon origin ──────────────────────────────────────
    const PRED_X = W * 0.93
    const PRED_Y = H * 0.88

    // ── Alien ─────────────────────────────────────────────────────────────────
    const alien = {
      x: W * 0.5, y: H * 0.45,
      tx: W * 0.5, ty: H * 0.45,
      alpha: 0, legAnim: 0,
      escaped: false, escapeVy: 0,
      dodgeCount: 0,
      isDodging: false,
    }

    // Positions aléatoires où l'alien peut esquiver
    const DODGE_SPOTS = [
      { x: W * 0.18, y: H * 0.35 }, { x: W * 0.75, y: H * 0.50 },
      { x: W * 0.12, y: H * 0.60 }, { x: W * 0.62, y: H * 0.28 },
      { x: W * 0.40, y: H * 0.55 }, { x: W * 0.80, y: H * 0.38 },
      { x: W * 0.25, y: H * 0.70 }, { x: W * 0.55, y: H * 0.65 },
    ]
    let lastDodgeSpot = -1

    function getNextDodgeSpot() {
      let idx
      do { idx = Math.floor(Math.random() * DODGE_SPOTS.length) } while (idx === lastDodgeSpot)
      lastDodgeSpot = idx
      return DODGE_SPOTS[idx]
    }

    // ── Laser (suit la souris) ────────────────────────────────────────────────
    const mouse = { x: W * 0.5, y: H * 0.5 }
    const laser = {
      visible: false,
      tx: W * 0.5, ty: H * 0.5,
      dots: Array.from({ length: 3 }, () => ({ x: W * 0.5, y: H * 0.5 })),
    }

    // ── State ─────────────────────────────────────────────────────────────────
    const holes:  Hole[]  = []
    const sparks: Spark[] = []
    const bolts:  Bolt[]  = []
    let fadeAlpha = 0
    let alienAppeared = false
    let canShoot = false
    let cooldown = false   // 400ms cooldown entre tirs

    // Beep interval — accélère quand le curseur est près de l'alien
    let beepInterval: ReturnType<typeof setInterval> | null = null
    let lastBeepInterval = 600

    function updateBeepRate() {
      const dx = mouse.x - alien.x; const dy = mouse.y - alien.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      // 600ms loin → 80ms très près
      const targetInterval = Math.max(80, Math.min(600, dist * 1.2))
      if (Math.abs(targetInterval - lastBeepInterval) > 30) {
        lastBeepInterval = targetInterval
        if (beepInterval) clearInterval(beepInterval)
        beepInterval = setInterval(() => {
          if (!ac || done || !canShoot) return
          const d2x = mouse.x - alien.x; const d2y = mouse.y - alien.y
          const d2 = Math.sqrt(d2x * d2x + d2y * d2y)
          sfxTargetBeep(ac, Math.max(0, Math.min(1, 1 - d2 / 400)))
        }, lastBeepInterval)
      }
    }

    function stopBeeps() {
      if (beepInterval) { clearInterval(beepInterval); beepInterval = null }
    }

    // ── Draw alien ────────────────────────────────────────────────────────────
    function drawAlien(x: number, y: number, alpha: number) {
      if (alpha <= 0) return
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y)
      ctx.beginPath(); ctx.ellipse(0, 0, 30, 13, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#1b2d1b'; ctx.fill()
      ctx.strokeStyle = '#2d4d2d'; ctx.lineWidth = 1; ctx.stroke()
      ctx.beginPath(); ctx.ellipse(36, -3, 22, 10, -0.15, 0, Math.PI * 2)
      ctx.fillStyle = '#1b2d1b'; ctx.fill()
      ctx.beginPath(); ctx.moveTo(50, -1); ctx.lineTo(60, 1); ctx.lineTo(50, 4)
      ctx.fillStyle = '#8a2020'; ctx.fill()
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.ellipse(-14 + i * 11, -12, 2.5, 6, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#253525'; ctx.fill()
      }
      const lp = alien.legAnim
      const legs = [
        { bx: -14, by: 8, ph: 0 }, { bx: 8, by: 8, ph: Math.PI },
        { bx: -24, by: 8, ph: Math.PI }, { bx: 18, by: 8, ph: 0 },
      ]
      ctx.lineCap = 'round'
      for (const leg of legs) {
        const sw = Math.sin(lp + leg.ph) * 13
        ctx.strokeStyle = '#1b2d1b'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(leg.bx, leg.by); ctx.lineTo(leg.bx + sw, leg.by + 17); ctx.lineTo(leg.bx + sw * 1.6, leg.by + 10); ctx.stroke()
        ctx.strokeStyle = '#3a5a3a'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.moveTo(leg.bx + sw * 1.6, leg.by + 10); ctx.lineTo(leg.bx + sw * 1.6 + 4, leg.by + 8); ctx.stroke()
      }
      ctx.beginPath(); ctx.moveTo(-30, 0); ctx.bezierCurveTo(-50, -12, -65, 12, -80, -6)
      ctx.strokeStyle = '#1b2d1b'; ctx.lineWidth = 4.5; ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-80, -6); ctx.lineTo(-92, -16); ctx.lineTo(-85, -2)
      ctx.fillStyle = '#3a5a3a'; ctx.fill()
      ctx.restore()
    }

    // ── Draw laser sight (suit la souris) ─────────────────────────────────────
    function drawLaser(elapsed: number) {
      if (!laser.visible) return
      // Convergence : plus le curseur est proche de l'alien, plus les points se resserrent
      const dx = mouse.x - alien.x; const dy = mouse.y - alien.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const convergence = Math.max(0, Math.min(1, 1 - dist / 350))

      ctx.save()
      for (let i = 0; i < 3; i++) {
        const d = laser.dots[i]
        const grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, 12)
        grd.addColorStop(0, 'rgba(255,20,20,0.90)')
        grd.addColorStop(1, 'rgba(255,0,0,0)')
        ctx.fillStyle = grd
        ctx.beginPath(); ctx.arc(d.x, d.y, 12, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(d.x, d.y, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = '#ff5555'; ctx.fill()
      }
      ctx.beginPath()
      ctx.moveTo(laser.dots[0].x, laser.dots[0].y)
      ctx.lineTo(laser.dots[1].x, laser.dots[1].y)
      ctx.lineTo(laser.dots[2].x, laser.dots[2].y)
      ctx.closePath()
      ctx.strokeStyle = `rgba(255,40,40,${0.08 + convergence * 0.18})`
      ctx.lineWidth = 0.8; ctx.stroke()
      ctx.restore()

      // Smooth laser target → souris
      laser.tx += (mouse.x - laser.tx) * 0.18
      laser.ty += (mouse.y - laser.ty) * 0.18

      const spread = (1 - convergence) * 30 + 5
      const rotSpeed = elapsed * 0.003
      for (let i = 0; i < 3; i++) {
        const a = rotSpeed + (i / 3) * Math.PI * 2
        const tdx = laser.tx + Math.cos(a) * spread
        const tdy = laser.ty + Math.sin(a) * spread
        laser.dots[i].x += (tdx - laser.dots[i].x) * 0.20
        laser.dots[i].y += (tdy - laser.dots[i].y) * 0.20
      }
    }

    // ── Draw bolts ────────────────────────────────────────────────────────────
    function drawBolts() {
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i]
        b.progress = Math.min(1, b.progress + 0.065)

        const ex = b.x1 + (b.x2 - b.x1) * b.progress
        const ey = b.y1 + (b.y2 - b.y1) * b.progress

        // Détecter quand le bolt est à ~70% du trajet et proche de l'alien → déclencher esquive
        if (!b.dodged && b.progress >= 0.70) {
          const distToAlien = Math.hypot(ex - alien.x, ey - alien.y)
          if (distToAlien < 120 && !alien.escaped && !alien.isDodging) {
            b.dodged = true
            alien.isDodging = true
            if (ac) sfxDodge(ac)
            const spot = getNextDodgeSpot()
            alien.tx = spot.x; alien.ty = spot.y
            alien.dodgeCount++
            if (alien.dodgeCount >= MAX_DODGES) {
              setTimeout(() => {
                if (!done) { alien.escaped = true; alien.escapeVy = -5; playRoar() }
              }, 600)
            } else {
              setTimeout(() => { alien.isDodging = false }, 800)
            }
          }
        }

        ctx.save()
        ctx.shadowColor = '#66ffaa'; ctx.shadowBlur = 16
        ctx.strokeStyle = '#88ffcc'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(ex, ey); ctx.stroke()
        ctx.shadowBlur = 0
        if (b.progress < 0.98) {
          ctx.beginPath(); ctx.arc(ex, ey, 7, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(120,255,180,0.85)'; ctx.fill()
        }
        ctx.restore()

        if (b.progress >= 1) {
          spawnImpact(b.x2, b.y2)
          bolts.splice(i, 1)
        }
      }
    }

    // ── Draw holes ────────────────────────────────────────────────────────────
    function drawHoles() {
      for (const hole of holes) {
        hole.age++
        ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(6,4,2,0.97)'; ctx.fill()
        const pulse = 0.65 + Math.sin(hole.age * 0.16) * 0.35
        const rim = ctx.createRadialGradient(hole.x, hole.y, hole.r * 0.65, hole.x, hole.y, hole.r * 1.7)
        rim.addColorStop(0, 'rgba(0,0,0,0)')
        rim.addColorStop(0.55, `rgba(240,85,8,${0.60 * pulse})`)
        rim.addColorStop(0.75, `rgba(255,150,0,${0.42 * pulse})`)
        rim.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r * 1.7, 0, Math.PI * 2)
        ctx.fillStyle = rim; ctx.fill()
        if (hole.age % 3 === 0 && Math.random() < 0.85) {
          hole.smoke.push({ x: hole.x + (Math.random() - 0.5) * hole.r, y: hole.y - hole.r * 0.4, vx: (Math.random() - 0.5) * 0.7, vy: -(0.5 + Math.random() * 0.9), r: 5 + Math.random() * 9, alpha: 0.30 + Math.random() * 0.22 })
        }
        for (let i = hole.smoke.length - 1; i >= 0; i--) {
          const s = hole.smoke[i]; s.x += s.vx; s.y += s.vy; s.r += 0.22; s.alpha -= 0.005
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
        s.x += s.vx; s.y += s.vy; s.vy += 0.28; s.vx *= 0.98; s.r -= 0.10; s.alpha -= 0.022
        if (s.r <= 0 || s.alpha <= 0) { sparks.splice(i, 1); continue }
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${s.rgb[0]},${s.rgb[1]},${s.rgb[2]},${s.alpha})`; ctx.fill()
      }
    }

    // ── Spawn impact ──────────────────────────────────────────────────────────
    function spawnImpact(x: number, y: number) {
      holes.push({ x, y, r: 26 + Math.random() * 20, age: 0, smoke: [] })
      for (let i = 0; i < 22; i++) {
        const angle = Math.random() * Math.PI * 2; const speed = 2 + Math.random() * 7
        sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2.5, r: 2 + Math.random() * 4.5, alpha: 1, rgb: Math.random() > 0.5 ? [255, 120, 0] : [255, 200, 50] })
      }
      if (ac) sfxImpact(ac)
    }

    // ── Draw HUD ──────────────────────────────────────────────────────────────
    function drawHUD() {
      if (!canShoot || alien.escaped) return
      ctx.save()
      ctx.font = '700 13px monospace'
      ctx.fillStyle = 'rgba(255,80,80,0.65)'
      ctx.fillText(`ESQUIVES : ${alien.dodgeCount} / ${MAX_DODGES}`, 18, 28)
      ctx.fillStyle = 'rgba(255,80,80,0.40)'
      ctx.font = '11px monospace'
      ctx.fillText('CLIC pour tirer · ESC pour quitter', 18, 46)
      ctx.restore()
    }

    // ── Fire ──────────────────────────────────────────────────────────────────
    function fireShot() {
      if (cooldown || !canShoot || alien.escaped) return
      cooldown = true
      if (ac) sfxPlasmaShot(ac)
      bolts.push({ x1: PRED_X, y1: PRED_Y, x2: mouse.x, y2: mouse.y, progress: 0, dodged: false })
      setTimeout(() => { cooldown = false }, 400)
    }

    // ── Render ────────────────────────────────────────────────────────────────
    let raf: number

    function render(now: number) {
      if (done) return
      const elapsed = now - startTime

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.fillRect(0, 0, W, H)

      drawHoles(); drawSparks()

      // Alien apparition
      if (!alienAppeared && elapsed >= 500) { alienAppeared = true }
      if (alienAppeared) alien.alpha = Math.min(1, alien.alpha + 0.025)

      // Laser visible après apparition de l'alien
      if (alien.alpha > 0.5) { laser.visible = true; canShoot = true }

      // Escape
      if (alien.escaped) {
        alien.escapeVy -= 0.3
        alien.ty += alien.escapeVy
        alien.tx += (W * 0.45 - alien.tx) * 0.03
        alien.alpha = Math.max(0, alien.alpha - (alien.ty < -50 ? 0.04 : 0))
        laser.visible = false; canShoot = false
      } else {
        alien.ty += Math.sin(elapsed * 0.0018) * 0.3  // idle bob
      }

      alien.x += (alien.tx - alien.x) * 0.10
      alien.y += (alien.ty - alien.y) * 0.10
      alien.legAnim = elapsed * 0.012

      drawAlien(alien.x, alien.y, alien.alpha)

      if (laser.visible) {
        drawLaser(elapsed)
        updateBeepRate()
      }

      drawBolts()
      drawHUD()

      // Fade après escape
      const fadeDelay = alien.escaped ? 2000 : Infinity
      const escapeStart = alien.escapeVy !== 0 ? now : Infinity
      if (alien.escaped && alien.alpha <= 0) {
        fadeAlpha = Math.min(1, fadeAlpha + 0.018)
        if (fadeAlpha >= 1 && !done) {
          done = true; predSound?.current?.pause(); stopBeeps(); onDone(); return
        }
        ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`
        ctx.fillRect(0, 0, W, H)
      }
      void fadeDelay; void escapeStart

      raf = requestAnimationFrame(render)
    }

    const onMouseMove = (e: MouseEvent) => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onClick = () => fireShot()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { done = true; predSound?.current?.pause(); stopBeeps(); onDone() }
    }

    // Touch support
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches[0]) { mouse.x = e.touches[0].clientX; mouse.y = e.touches[0].clientY }
    }
    const onTouchEnd = (e: TouchEvent) => { e.preventDefault(); fireShot() }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    canvas.addEventListener('touchend', onTouchEnd, { passive: false })

    beepInterval = setInterval(() => {
      if (!ac || done || !canShoot) return
      const dx = mouse.x - alien.x; const dy = mouse.y - alien.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      sfxTargetBeep(ac, Math.max(0, Math.min(1, 1 - dist / 400)))
    }, 500)

    raf = requestAnimationFrame(render)

    return () => {
      done = true
      cancelAnimationFrame(raf)
      predSound?.current?.pause()
      stopBeeps()
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  }, [onDone])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        zIndex: 9000,
        cursor: 'none',
        pointerEvents: 'all',
        display: 'block',
      }}
    />
  )
}
