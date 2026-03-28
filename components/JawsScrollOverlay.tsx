'use client'

import { useEffect, useRef } from 'react'

/**
 * Jaws scroll easter egg — overlay discret en bas de page.
 * L'aileron apparaît/disparaît en rythme avec la musique,
 * puis le requin surgit et croque la nageuse quand ça s'emballe.
 */
export default function JawsScrollOverlay({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = window.innerWidth
    const H = Math.round(window.innerHeight * 0.32)  // 32% de la hauteur de l'écran
    canvas.width  = W
    canvas.height = H

    const ctx = canvas.getContext('2d')!

    // Audio
    const audio = new Audio('/sons/jaws-theme.m4a')
    audio.volume = 0.75
    audio.play().catch(() => {})

    let done = false
    const startTime = performance.now()

    // Echap ou scroll vers le haut → ferme l'animation
    function abort() {
      if (done) return
      done = true; audio.pause(); onDone()
    }

    const initScrollY = window.scrollY
    function onScrollAbort() {
      if (window.scrollY < initScrollY - 30) abort()
    }
    function onKeyAbort(e: KeyboardEvent) {
      if (e.key === 'Escape') abort()
    }

    window.addEventListener('scroll', onScrollAbort, { passive: true })
    window.addEventListener('keydown', onKeyAbort)

    // Positions relatives dans le canvas
    const SURFACE_Y = Math.round(H * 0.28)   // ligne de surface de l'eau
    const cx        = W * 0.5                 // centre horizontal (femme)

    // ── PHASES (ms) ──────────────────────────────────────────────────────────
    // Synchronisées sur le rythme de la musique Jaws
    // Phase 1 (0-8s)   : aileron lent — une montée toutes les ~3s
    // Phase 2 (8-15s)  : aileron plus fréquent — toutes les 1.8s
    // Phase 3 (15-22s) : aileron tourne autour de la femme rapidement
    // Phase 4 (22-26s) : requin surgit, mange la femme
    // Phase 5 (26-28s) : eau rouge, fade
    const T = {
      phase2:   8000,
      phase3:  15000,
      attack:  22000,
      bite:    23800,
      fadeStart: 25500,
      end:     27500,
    }

    // Fin state — patrol left-to-right across full width
    const fin = {
      x: W * 0.08,         // commence sur la gauche
      vx: 1.8,             // vitesse horizontale (px/frame @ ~60fps)
      riseProgress: 0,     // 0 = sous l'eau, 1 = en surface
      cycleTimer: 0,
      cyclePhase: 'rise' as 'rise' | 'peak' | 'sink',
    }

    // Phase 3 : fin accélère et converge vers la femme
    let phase3Timer = 0

    // Shark (phase 4)
    const shark = {
      x: cx, y: H + 200,
      jawOpen: 0,
      risen: false,
    }

    let womanVisible = true
    let bloodAmt     = 0
    let fadeAlpha    = 0

    // Waves
    let w1 = 0, w2 = 1.4, w3 = 2.8

    // ── BACKGROUND OCEAN ─────────────────────────────────────────────────────
    function drawOcean() {
      w1 += 0.022; w2 += 0.016; w3 += 0.028

      // Deep water fill
      const base = ctx.createLinearGradient(0, SURFACE_Y, 0, H)
      if (bloodAmt > 0) {
        const r = Math.floor(14 + bloodAmt * 150)
        const g = Math.floor(26 * (1 - bloodAmt))
        base.addColorStop(0, `rgb(${r},${g},${g})`)
        base.addColorStop(1, `rgb(${Math.floor(r * 0.4)},0,0)`)
      } else {
        base.addColorStop(0, 'rgba(10,35,62,0.92)')
        base.addColorStop(1, 'rgba(4,14,26,0.96)')
      }
      ctx.fillStyle = base
      ctx.fillRect(0, SURFACE_Y, W, H - SURFACE_Y)

      // 3 wave layers
      const layerData = [
        { off: w1, amp: 8, freq: 0.014, col: bloodAmt > 0 ? `rgba(${Math.floor(100*bloodAmt)},0,0,0.5)` : 'rgba(14,52,102,0.55)' },
        { off: w2, amp: 5, freq: 0.022, col: bloodAmt > 0 ? `rgba(${Math.floor(70*bloodAmt)},0,0,0.35)` : 'rgba(10,38,80,0.4)' },
        { off: w3, amp: 4, freq: 0.01,  col: bloodAmt > 0 ? `rgba(${Math.floor(55*bloodAmt)},0,0,0.25)` : 'rgba(18,60,110,0.3)' },
      ]
      for (const l of layerData) {
        ctx.beginPath(); ctx.moveTo(0, SURFACE_Y)
        for (let x = 0; x <= W; x += 4) ctx.lineTo(x, SURFACE_Y + Math.sin(x * l.freq + l.off) * l.amp)
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
        ctx.fillStyle = l.col; ctx.fill()
      }
    }

    // ── WOMAN ON BUOY ─────────────────────────────────────────────────────────
    function drawWoman(bobY: number) {
      if (!womanVisible) return
      const x = cx, y = SURFACE_Y - 10 + bobY

      // Buoy (inflatable ring — bright yellow/orange, petite taille)
      ctx.beginPath(); ctx.ellipse(x, y + 9, 26, 11, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#f5a623'; ctx.fill()
      ctx.strokeStyle = '#c8830e'; ctx.lineWidth = 1.5; ctx.stroke()
      // Stripes
      ctx.save()
      ctx.beginPath(); ctx.ellipse(x, y + 9, 26, 11, 0, 0, Math.PI * 2); ctx.clip()
      for (let s = -3; s <= 3; s++) {
        if (s % 2 === 0) { ctx.fillStyle = '#cc1f1f'; ctx.beginPath(); ctx.rect(x + s * 10, y + 2, 9, 16); ctx.fill() }
      }
      ctx.restore()
      // Inner hole
      ctx.beginPath(); ctx.ellipse(x, y + 9, 12, 5, 0, 0, Math.PI * 2)
      ctx.fillStyle = bloodAmt > 0 ? `rgb(${Math.floor(12 + bloodAmt * 90)},0,0)` : 'rgba(10,35,62,0.92)'
      ctx.fill()

      // Body
      ctx.beginPath(); ctx.ellipse(x, y - 2, 9, 12, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#e8b09a'; ctx.fill()
      ctx.beginPath(); ctx.ellipse(x, y - 7, 8, 7, 0, 0, Math.PI)
      ctx.fillStyle = '#d01818'; ctx.fill()

      // Head
      ctx.beginPath(); ctx.arc(x, y - 18, 9, 0, Math.PI * 2)
      ctx.fillStyle = '#e8b09a'; ctx.fill()
      // Hair
      ctx.beginPath(); ctx.ellipse(x + 2, y - 21, 10, 7, 0.3, 0, Math.PI * 2)
      ctx.fillStyle = '#3a1a08'; ctx.fill()
      // Eyes
      ctx.fillStyle = '#111'
      ctx.beginPath(); ctx.arc(x - 3, y - 19, 1.5, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(x + 3, y - 19, 1.5, 0, Math.PI * 2); ctx.fill()

      // Arms up
      ctx.strokeStyle = '#e8b09a'; ctx.lineWidth = 4; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(x - 8, y - 4); ctx.lineTo(x - 20, y - 16); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + 8, y - 4); ctx.lineTo(x + 20, y - 14); ctx.stroke()
    }

    // ── DORSAL FIN ────────────────────────────────────────────────────────────
    function drawFin(fx: number, surfaceProgress: number, alpha = 1) {
      if (surfaceProgress <= 0 || alpha <= 0) return
      ctx.save(); ctx.globalAlpha = alpha

      const finH = 28 * surfaceProgress
      const fy = SURFACE_Y - finH + 2

      ctx.beginPath()
      ctx.moveTo(fx, SURFACE_Y + 2)
      ctx.lineTo(fx - 7, fy + finH * 0.95)
      ctx.lineTo(fx + 20, fy + finH * 0.95)
      ctx.quadraticCurveTo(fx + 26, fy + finH * 0.45, fx + 12, fy)
      ctx.closePath()
      ctx.fillStyle = '#181820'; ctx.fill()

      // Wake behind fin
      ctx.beginPath()
      ctx.moveTo(fx + 20, SURFACE_Y - 2)
      ctx.quadraticCurveTo(fx + 40, SURFACE_Y + 4, fx + 65, SURFACE_Y - 5)
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1.5; ctx.stroke()

      ctx.restore()
    }

    // ── SHARK (attack) ────────────────────────────────────────────────────────
    function drawShark(sy: number, jawOpen: number) {
      if (sy >= H + 20) return
      ctx.save(); ctx.translate(cx, sy)

      // Body
      ctx.beginPath(); ctx.ellipse(0, 30, 38, 100, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#1e1e28'; ctx.fill()
      // Belly
      ctx.beginPath(); ctx.ellipse(5, 40, 22, 70, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#c8c8b8'; ctx.fill()
      // Dorsal fin
      ctx.beginPath(); ctx.moveTo(-14, -40); ctx.lineTo(-28, -95); ctx.quadraticCurveTo(-18, -104, 0, -48); ctx.lineTo(12, -40); ctx.closePath()
      ctx.fillStyle = '#18181e'; ctx.fill()
      // Pectoral fins
      ctx.beginPath(); ctx.moveTo(-38, 22); ctx.lineTo(-72, 50); ctx.lineTo(-40, 58); ctx.closePath(); ctx.fillStyle = '#1a1a22'; ctx.fill()
      ctx.beginPath(); ctx.moveTo(38, 22); ctx.lineTo(72, 50); ctx.lineTo(40, 58); ctx.closePath(); ctx.fillStyle = '#1a1a22'; ctx.fill()

      // Upper jaw
      ctx.beginPath()
      ctx.moveTo(-38, -76); ctx.quadraticCurveTo(-54, -70, -60, -54)
      ctx.lineTo(-46, -46); ctx.lineTo(46, -46); ctx.lineTo(38, -76)
      ctx.quadraticCurveTo(0, -90, -38, -76)
      ctx.fillStyle = '#1e1e28'; ctx.fill()

      // Lower jaw (opens)
      const lj = jawOpen * 48
      ctx.beginPath()
      ctx.moveTo(-38, -76 + lj); ctx.quadraticCurveTo(-54, -66 + lj, -58, -50 + lj)
      ctx.lineTo(-45, -47 + lj); ctx.lineTo(45, -47 + lj); ctx.lineTo(38, -76 + lj)
      ctx.quadraticCurveTo(0, -84 + lj, -38, -76 + lj)
      ctx.fillStyle = '#cc1818'; ctx.fill()

      // Teeth upper
      ctx.fillStyle = '#f0f0e4'
      for (let t = 0; t < 7; t++) {
        const tx = -40 + t * 12
        ctx.beginPath(); ctx.moveTo(tx, -48); ctx.lineTo(tx + 5, -64); ctx.lineTo(tx + 10, -48); ctx.fill()
      }
      // Teeth lower
      const lyt = -47 + lj
      for (let t = 0; t < 6; t++) {
        const tx = -35 + t * 12
        ctx.beginPath(); ctx.moveTo(tx, lyt); ctx.lineTo(tx + 5, lyt + 14); ctx.lineTo(tx + 10, lyt); ctx.fill()
      }

      // Eye
      ctx.beginPath(); ctx.arc(-24, -60, 7, 0, Math.PI * 2)
      ctx.fillStyle = jawOpen > 0.6 ? '#ddd' : '#000'; ctx.fill()
      if (jawOpen <= 0.6) { ctx.beginPath(); ctx.arc(-22, -58, 3, 0, Math.PI * 2); ctx.fillStyle = '#111'; ctx.fill() }

      ctx.restore()

      // Splash ring
      if (jawOpen > 0.1 && jawOpen < 0.92) {
        const sR = 48 + jawOpen * 42
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.ellipse(cx, SURFACE_Y + 4, sR, sR * 0.2, 0, 0, Math.PI * 2); ctx.stroke()
      }
    }

    // ── BLOOD POOL ────────────────────────────────────────────────────────────
    function drawBlood() {
      if (bloodAmt <= 0) return
      const g = ctx.createRadialGradient(cx, SURFACE_Y + 6, 0, cx, SURFACE_Y + 6, 220 * bloodAmt)
      g.addColorStop(0, `rgba(160,0,0,${Math.min(0.88, bloodAmt * 1.2)})`)
      g.addColorStop(0.4, `rgba(120,0,0,${bloodAmt * 0.7})`)
      g.addColorStop(1, 'rgba(70,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath(); ctx.ellipse(cx, SURFACE_Y + 6, 220 * bloodAmt, 55 * bloodAmt, 0, 0, Math.PI * 2); ctx.fill()
    }

    // ── FIN CYCLE LOGIC ───────────────────────────────────────────────────────
    // Fin patrols left-to-right across full screen width; rises/sinks in rhythm
    // Phase 1: slow (cycle ~3s), Phase 2: faster (~1.8s), Phase 3: charge toward woman
    function updateFinCycle(elapsed: number, dt: number) {
      const inPhase1 = elapsed < T.phase2
      const inPhase2 = elapsed >= T.phase2 && elapsed < T.phase3
      if (!inPhase1 && !inPhase2) return

      const riseMs = inPhase1 ? 900  : 550
      const peakMs = inPhase1 ? 700  : 450
      const sinkMs = inPhase1 ? 1000 : 650
      // Speed: phase1 slow patrol, phase2 faster
      const speed  = inPhase1 ? 1.6  : 2.8

      // Horizontal patrol — bounce between margins
      fin.x += fin.vx * (dt / 16)
      if (fin.x < W * 0.05)  { fin.x = W * 0.05;  fin.vx =  Math.abs(fin.vx) * speed / 1.6 }
      if (fin.x > W * 0.92)  { fin.x = W * 0.92;  fin.vx = -Math.abs(fin.vx) * speed / 1.6 }
      // Normalise speed
      const dir = fin.vx > 0 ? 1 : -1
      fin.vx = dir * speed

      // Rise / sink cycle
      fin.cycleTimer -= dt
      if (fin.cycleTimer <= 0) {
        if (fin.cyclePhase === 'sink') {
          fin.cyclePhase = 'rise'
          fin.cycleTimer = riseMs
        } else if (fin.cyclePhase === 'rise') {
          fin.cyclePhase = 'peak'
          fin.cycleTimer = peakMs
        } else {
          fin.cyclePhase = 'sink'
          fin.cycleTimer = sinkMs + (inPhase1 ? 600 : 200)
        }
      }

      if (fin.cyclePhase === 'rise') {
        fin.riseProgress = Math.min(1, fin.riseProgress + dt / riseMs)
      } else if (fin.cyclePhase === 'sink') {
        fin.riseProgress = Math.max(0, fin.riseProgress - dt / sinkMs)
      }
    }

    // ── RENDER ────────────────────────────────────────────────────────────────
    let raf: number
    let lastNow = performance.now()

    function render(now: number) {
      if (done) return
      const elapsed = now - startTime
      const dt = Math.min(now - lastNow, 50)
      lastNow = now

      ctx.clearRect(0, 0, W, H)
      drawOcean()
      drawBlood()

      const bobY = Math.sin(elapsed * 0.002 * Math.PI * 2) * 3

      if (elapsed < T.phase3) {
        // Phase 1 & 2 : patrol + rise/sink cycle
        updateFinCycle(elapsed, dt)
        drawFin(fin.x, fin.riseProgress)
      } else if (elapsed < T.attack) {
        // Phase 3 : fin fonce vers la femme en zigzag
        phase3Timer += dt
        const p3 = Math.min(1, (elapsed - T.phase3) / (T.attack - T.phase3))
        // Converge toward woman with narrowing oscillation
        const targetX = cx - 10
        fin.x += (targetX - fin.x) * 0.04 + Math.sin(elapsed * 0.018) * (30 * (1 - p3))
        // Keep visible above surface
        const rp = 0.82 + p3 * 0.18
        drawFin(fin.x, rp)
      } else if (elapsed < T.bite) {
        // Phase 4a : requin monte
        if (!shark.risen) { shark.risen = true }
        const riseP = (elapsed - T.attack) / (T.bite - T.attack)
        const eased = riseP * riseP
        shark.y = SURFACE_Y + 20 - eased * (SURFACE_Y + 220)
        shark.jawOpen = Math.min(1, riseP * 1.5)
        drawShark(shark.y, shark.jawOpen)
      } else {
        // Phase 4b : après la morsure
        if (womanVisible) womanVisible = false
        shark.y = SURFACE_Y - 220
        shark.jawOpen = 1
        // Requin replonge
        if (elapsed > T.bite + 400) {
          const retreatP = Math.min(1, (elapsed - (T.bite + 400)) / 1500)
          shark.y = SURFACE_Y - 220 + retreatP * (H + 250)
          shark.jawOpen = Math.max(0, 1 - retreatP * 2)
        }
        if (elapsed > T.bite) {
          bloodAmt = Math.min(1, (elapsed - T.bite) / (T.fadeStart - T.bite))
        }
        drawShark(shark.y, shark.jawOpen)
      }

      drawWoman(bobY)

      // Fade
      if (elapsed >= T.fadeStart) {
        fadeAlpha = (elapsed - T.fadeStart) / (T.end - T.fadeStart)
        if (fadeAlpha >= 1 && !done) {
          done = true; audio.pause(); onDone(); return
        }
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeAlpha)})`
        ctx.fillRect(0, 0, W, H)
      }

      raf = requestAnimationFrame(render)
    }

    raf = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(raf); audio.pause()
      window.removeEventListener('scroll', onScrollAbort)
      window.removeEventListener('keydown', onKeyAbort)
    }
  }, [onDone])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        bottom: 0, left: 0,
        width: '100%',
        height: '32vh',
        zIndex: 8800,
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  )
}
