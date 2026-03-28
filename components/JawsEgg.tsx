'use client'

import { useEffect, useRef } from 'react'

export default function JawsEgg({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const W = canvas.width
    const H = canvas.height
    const WY = H * 0.56 // water surface Y

    const audio = new Audio('/sons/jaws-theme.m4a')
    audio.volume = 0.85
    audio.play().catch(() => {})

    // Timing in frames @ ~60fps
    const T = {
      finAppears:  150,  // 2.5s — fin appears far left
      finClose:    480,  // 8s   — fin moving close (music speeds up)
      finSinks:    750,  // 12.5s — fin disappears (shark diving deep)
      sharkRise:   810,  // 13.5s — shark bursts up
      sharkPeak:   930,  // 15.5s — jaws fully open, chomp
      sharkSinks:  990,  // 16.5s — shark retreats
      bloodFull:   1200, // 20s
      fadeStart:   1260, // 21s
      end:         1380, // 23s
    }

    let frame = 0
    let womanVisible = true
    let bloodAmt = 0
    let fadeAlpha = 0
    let done = false
    let finX = W * 0.12
    let finAlpha = 0
    let sharkY = H + 300
    let jawOpen = 0
    let w1 = 0, w2 = 1.4, w3 = 2.8

    const startTime = performance.now()

    // ── SKY ────────────────────────────────────────────────────────────────────
    function drawSky() {
      const g = ctx.createLinearGradient(0, 0, 0, WY)
      g.addColorStop(0, '#04041a')
      g.addColorStop(1, '#0c1c38')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, WY)

      // Moon
      ctx.save()
      const mx = W * 0.78, my = H * 0.13
      // Glow
      const mg = ctx.createRadialGradient(mx, my, 18, mx, my, 110)
      mg.addColorStop(0, 'rgba(240,230,180,0.18)')
      mg.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = mg
      ctx.beginPath(); ctx.arc(mx, my, 110, 0, Math.PI * 2); ctx.fill()
      // Moon disk
      ctx.beginPath(); ctx.arc(mx, my, 28, 0, Math.PI * 2)
      const md = ctx.createRadialGradient(mx - 6, my - 6, 4, mx, my, 28)
      md.addColorStop(0, '#fefee8')
      md.addColorStop(0.7, '#e8e0c0')
      md.addColorStop(1, '#c8c098')
      ctx.fillStyle = md; ctx.fill()
      ctx.restore()

      // Stars
      const stars = [
        [0.05,0.06],[0.11,0.2],[0.2,0.08],[0.28,0.16],[0.38,0.24],[0.46,0.07],
        [0.55,0.2],[0.14,0.32],[0.33,0.04],[0.42,0.3],[0.08,0.38],[0.6,0.28],
        [0.25,0.38],[0.52,0.35],[0.18,0.45],
      ]
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      for (const [sx, sy] of stars) {
        ctx.beginPath()
        ctx.arc(W * sx, H * sy, 1.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // ── OCEAN ──────────────────────────────────────────────────────────────────
    function drawOcean() {
      w1 += 0.018; w2 += 0.013; w3 += 0.023

      const base = ctx.createLinearGradient(0, WY, 0, H)
      if (bloodAmt > 0) {
        const r = Math.floor(14 + bloodAmt * 155)
        const g2 = Math.floor(28 * (1 - bloodAmt))
        base.addColorStop(0, `rgb(${r},${g2},${g2})`)
        base.addColorStop(1, `rgb(${Math.floor(r * 0.45)},0,0)`)
      } else {
        base.addColorStop(0, '#0c2d52')
        base.addColorStop(1, '#04101e')
      }
      ctx.fillStyle = base
      ctx.fillRect(0, WY, W, H - WY)

      const layerData = [
        { off: w1, amp: 10, freq: 0.012, alpha: bloodAmt > 0 ? `rgba(${Math.floor(100*bloodAmt+8)},0,0,0.5)` : 'rgba(14,54,108,0.55)' },
        { off: w2, amp:  7, freq: 0.020, alpha: bloodAmt > 0 ? `rgba(${Math.floor(70*bloodAmt)},0,0,0.35)` : 'rgba(10,38,82,0.4)' },
        { off: w3, amp:  5, freq: 0.009, alpha: bloodAmt > 0 ? `rgba(${Math.floor(55*bloodAmt)},0,0,0.25)` : 'rgba(20,62,118,0.3)' },
      ]
      for (const l of layerData) {
        ctx.beginPath(); ctx.moveTo(0, WY)
        for (let x = 0; x <= W; x += 4) ctx.lineTo(x, WY + Math.sin(x * l.freq + l.off) * l.amp)
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath()
        ctx.fillStyle = l.alpha; ctx.fill()
      }

      // Moon shimmer strip
      if (bloodAmt < 0.5) {
        const shimmer = ctx.createLinearGradient(W * 0.65, WY, W * 0.9, WY + 90)
        shimmer.addColorStop(0, `rgba(215,205,155,${0.13 * (1 - bloodAmt * 2)})`)
        shimmer.addColorStop(0.5, `rgba(215,205,155,${0.07 * (1 - bloodAmt * 2)})`)
        shimmer.addColorStop(1, 'rgba(215,205,155,0)')
        ctx.fillStyle = shimmer
        ctx.fillRect(W * 0.65, WY, W * 0.27, 90)
      }
    }

    // ── BLOOD POOL ─────────────────────────────────────────────────────────────
    function drawBloodPool() {
      if (bloodAmt <= 0) return
      const cx = W * 0.5
      const r = 260 * bloodAmt
      const g = ctx.createRadialGradient(cx, WY + 8, 0, cx, WY + 8, r)
      g.addColorStop(0,   `rgba(175,0,0,${Math.min(0.92, bloodAmt * 1.3)})`)
      g.addColorStop(0.4, `rgba(130,0,0,${bloodAmt * 0.75})`)
      g.addColorStop(1,   'rgba(70,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(cx, WY + 8, r, r * 0.28, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    // ── WOMAN ON BUOY ──────────────────────────────────────────────────────────
    function drawWoman(bobY: number) {
      if (!womanVisible) return
      const cx = W * 0.5, cy = WY - 6 + bobY

      // Shadow on water
      ctx.beginPath()
      ctx.ellipse(cx, WY + 7, 42, 9, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fill()

      // --- Buoy (inflatable ring) ---
      // Outer ring
      ctx.beginPath()
      ctx.ellipse(cx, cy + 14, 42, 17, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#f5a623'; ctx.fill()
      ctx.strokeStyle = '#c8850e'; ctx.lineWidth = 2; ctx.stroke()
      // Red/orange stripes on ring
      ctx.save()
      ctx.beginPath()
      ctx.ellipse(cx, cy + 14, 42, 17, 0, 0, Math.PI * 2)
      ctx.clip()
      for (let s = -5; s <= 4; s++) {
        if (s % 2 === 0) {
          ctx.beginPath()
          ctx.moveTo(cx + s * 16, cy)
          ctx.lineTo(cx + s * 16 + 14, cy)
          ctx.lineTo(cx + s * 16 + 14, cy + 32)
          ctx.lineTo(cx + s * 16, cy + 32)
          ctx.fillStyle = '#d42020'; ctx.fill()
        }
      }
      ctx.restore()
      // Inner hole
      ctx.beginPath()
      ctx.ellipse(cx, cy + 14, 19, 8, 0, 0, Math.PI * 2)
      ctx.fillStyle = bloodAmt > 0 ? `rgb(${Math.floor(12 + bloodAmt * 110)},0,0)` : '#0c2d52'
      ctx.fill()

      // --- Body ---
      // Torso
      ctx.beginPath()
      ctx.ellipse(cx, cy - 2, 12, 16, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#e8b09a'; ctx.fill()
      // Bikini bottom
      ctx.beginPath()
      ctx.ellipse(cx, cy + 10, 12, 8, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#d01818'; ctx.fill()
      // Bikini top
      ctx.beginPath()
      ctx.ellipse(cx, cy - 7, 11, 8, 0, 0, Math.PI)
      ctx.fillStyle = '#d01818'; ctx.fill()
      // Skin belt (abs)
      ctx.beginPath()
      ctx.ellipse(cx, cy + 2, 10, 5, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#e8b09a'; ctx.fill()

      // --- Head ---
      ctx.beginPath()
      ctx.arc(cx, cy - 22, 13, 0, Math.PI * 2)
      ctx.fillStyle = '#e8b09a'; ctx.fill()
      // Hair (long, dark)
      ctx.beginPath()
      ctx.ellipse(cx + 3, cy - 26, 15, 10, 0.35, 0, Math.PI * 2)
      ctx.fillStyle = '#3a1a08'; ctx.fill()
      ctx.beginPath()
      ctx.moveTo(cx + 10, cy - 20)
      ctx.quadraticCurveTo(cx + 22, cy - 8, cx + 18, cy + 4)
      ctx.lineWidth = 8; ctx.strokeStyle = '#3a1a08'
      ctx.lineCap = 'round'; ctx.stroke()
      // Eyes
      ctx.fillStyle = '#1a1a1a'
      ctx.beginPath(); ctx.arc(cx - 4, cy - 23, 2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(cx + 4, cy - 23, 2, 0, Math.PI * 2); ctx.fill()
      // Smile
      ctx.beginPath()
      ctx.arc(cx, cy - 18, 5, 0.2, Math.PI - 0.2)
      ctx.strokeStyle = '#883030'; ctx.lineWidth = 1.5; ctx.stroke()

      // --- Arms ---
      ctx.strokeStyle = '#e8b09a'; ctx.lineWidth = 6; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(cx - 11, cy - 4); ctx.lineTo(cx - 30, cy - 24); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx + 11, cy - 4); ctx.lineTo(cx + 30, cy - 22); ctx.stroke()
    }

    // ── FIN ────────────────────────────────────────────────────────────────────
    function drawFin() {
      if (finAlpha <= 0) return
      ctx.globalAlpha = finAlpha

      // Dorsal fin — Great White style (curved trailing edge)
      ctx.beginPath()
      ctx.moveTo(finX, WY - 2)
      ctx.lineTo(finX - 6, WY + 30)
      ctx.lineTo(finX + 26, WY + 30)
      ctx.quadraticCurveTo(finX + 35, WY + 10, finX + 14, WY - 8)
      ctx.closePath()
      ctx.fillStyle = '#18181e'
      ctx.fill()

      // Wake / ripple lines behind fin
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath()
        ctx.moveTo(finX + 26, WY + 20 + i * 3)
        ctx.quadraticCurveTo(finX + 46 + i * 10, WY + 26 + i * 2, finX + 70 + i * 18, WY + 14)
        ctx.strokeStyle = `rgba(255,255,255,${0.25 - i * 0.06})`
        ctx.lineWidth = 1.5; ctx.stroke()
      }

      ctx.globalAlpha = 1
    }

    // ── SHARK ──────────────────────────────────────────────────────────────────
    function drawShark() {
      if (sharkY >= H + 50) return
      const cx = W * 0.5

      ctx.save()
      ctx.translate(cx, sharkY)

      // Body
      ctx.beginPath()
      ctx.ellipse(0, 40, 50, 130, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#20202a'; ctx.fill()

      // Belly (lighter)
      ctx.beginPath()
      ctx.ellipse(6, 55, 28, 90, 0, 0, Math.PI * 2)
      ctx.fillStyle = '#c8c8b8'; ctx.fill()

      // Dorsal fin
      ctx.beginPath()
      ctx.moveTo(-18, -50)
      ctx.lineTo(-36, -120)
      ctx.quadraticCurveTo(-22, -132, 0, -58)
      ctx.lineTo(14, -50)
      ctx.closePath()
      ctx.fillStyle = '#18181e'; ctx.fill()

      // Pectoral fins (side fins)
      ctx.beginPath()
      ctx.moveTo(-50, 30); ctx.lineTo(-95, 62); ctx.lineTo(-52, 72)
      ctx.closePath(); ctx.fillStyle = '#1c1c26'; ctx.fill()
      ctx.beginPath()
      ctx.moveTo(50, 30); ctx.lineTo(95, 62); ctx.lineTo(52, 72)
      ctx.closePath(); ctx.fillStyle = '#1c1c26'; ctx.fill()

      // Caudal fin (tail fin — bottom)
      ctx.beginPath()
      ctx.moveTo(-22, 140); ctx.lineTo(-55, 175); ctx.lineTo(-15, 162)
      ctx.lineTo(0, 145); ctx.lineTo(15, 162); ctx.lineTo(55, 175); ctx.lineTo(22, 140)
      ctx.closePath(); ctx.fillStyle = '#18181e'; ctx.fill()

      // Gills
      ctx.strokeStyle = '#0e0e18'; ctx.lineWidth = 2.5
      for (let g = 0; g < 5; g++) {
        ctx.beginPath()
        ctx.moveTo(-48 + g * 3, -10 - g * 14)
        ctx.quadraticCurveTo(-30 + g * 2, -4 - g * 12, -44 + g * 3, 8 - g * 12)
        ctx.stroke()
      }

      // Upper jaw snout
      ctx.beginPath()
      ctx.moveTo(-48, -80)
      ctx.quadraticCurveTo(-65, -75, -72, -58)
      ctx.lineTo(-55, -50)
      ctx.lineTo(55, -50)
      ctx.lineTo(48, -80)
      ctx.quadraticCurveTo(0, -100, -48, -80)
      ctx.fillStyle = '#20202a'; ctx.fill()

      // Lower jaw — opens based on jawOpen
      const lj = jawOpen * 55
      ctx.beginPath()
      ctx.moveTo(-48, -80 + lj)
      ctx.quadraticCurveTo(-65, -70 + lj, -68, -52 + lj)
      ctx.lineTo(-54, -50 + lj)
      ctx.lineTo(54, -50 + lj)
      ctx.lineTo(50, -78 + lj)
      ctx.quadraticCurveTo(0, -88 + lj, -48, -80 + lj)
      ctx.fillStyle = '#cc2020'; ctx.fill()

      // Roof of mouth / gums
      if (jawOpen > 0.1) {
        ctx.beginPath()
        ctx.ellipse(0, -58, 44, 10, 0, 0, Math.PI * 2)
        ctx.fillStyle = '#e03030'; ctx.fill()
      }

      // Upper teeth
      ctx.fillStyle = '#f0f0e5'
      for (let i = 0; i < 8; i++) {
        const tx = -50 + i * 13
        ctx.beginPath()
        ctx.moveTo(tx, -52); ctx.lineTo(tx + 5.5, -72); ctx.lineTo(tx + 11, -52)
        ctx.fill()
      }

      // Lower teeth (move with jaw)
      const lyt = -52 + lj
      for (let i = 0; i < 7; i++) {
        const tx = -44 + i * 13
        ctx.beginPath()
        ctx.moveTo(tx, lyt); ctx.lineTo(tx + 5, lyt + 18); ctx.lineTo(tx + 10, lyt)
        ctx.fill()
      }

      // Eye (black, dead)
      ctx.beginPath(); ctx.arc(-28, -65, 9, 0, Math.PI * 2)
      ctx.fillStyle = jawOpen > 0.6 ? '#ddd' : '#000'
      ctx.fill()
      ctx.beginPath(); ctx.arc(-28, -65, 9, 0, Math.PI * 2)
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.stroke()
      if (jawOpen <= 0.6) {
        // Pupil
        ctx.beginPath(); ctx.arc(-26, -63, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = '#111'; ctx.fill()
      }

      ctx.restore()

      // Splash ring around breach point
      if (jawOpen > 0.15 && jawOpen < 0.95) {
        const splashR = 55 + jawOpen * 55
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.ellipse(cx, WY + 5, splashR, splashR * 0.22, 0, 0, Math.PI * 2)
        ctx.stroke()
        // Spray droplets
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        for (let d = 0; d < 12; d++) {
          const a = (d / 12) * Math.PI * 2
          const dr = splashR + Math.random() * 20
          ctx.beginPath()
          ctx.arc(cx + Math.cos(a) * dr, WY + Math.sin(a) * dr * 0.2 - jawOpen * 20, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // ── RENDER LOOP ────────────────────────────────────────────────────────────
    let raf: number

    function render(now: number) {
      if (done) return
      frame = Math.floor((now - startTime) / (1000 / 60))

      // Fin phase
      if (frame >= T.finAppears && frame < T.finSinks) {
        const p = (frame - T.finAppears) / (T.finSinks - T.finAppears)
        finAlpha = Math.min(1, p * 5)
        finX = W * 0.12 + p * (W * 0.5 - W * 0.12 - 35)
      } else if (frame >= T.finSinks && frame < T.sharkRise) {
        const p = (frame - T.finSinks) / (T.sharkRise - T.finSinks)
        finAlpha = Math.max(0, 1 - p * 4)
      } else if (frame >= T.sharkRise) {
        finAlpha = 0
      }

      // Shark rise
      if (frame >= T.sharkRise && frame < T.sharkPeak) {
        const p = (frame - T.sharkRise) / (T.sharkPeak - T.sharkRise)
        // Ease-in: slow start, fast end
        const eased = p * p
        sharkY = WY + 40 - eased * (WY + 260)
        jawOpen = Math.min(1, p * 1.4)
      }
      // Chomp — woman disappears
      if (frame === T.sharkPeak) womanVisible = false

      // Shark at peak
      if (frame >= T.sharkPeak && frame < T.sharkSinks) {
        sharkY = WY - 230
        jawOpen = 1
      }

      // Shark retreats
      if (frame >= T.sharkSinks) {
        const p = Math.min(1, (frame - T.sharkSinks) / (T.bloodFull - T.sharkSinks))
        sharkY = WY - 230 + p * (H + 300)
        jawOpen = Math.max(0, 1 - p * 1.5)
      }

      // Blood
      if (frame >= T.sharkPeak) {
        bloodAmt = Math.min(1, (frame - T.sharkPeak) / (T.bloodFull - T.sharkPeak))
      }

      // Fade
      if (frame >= T.fadeStart) {
        fadeAlpha = (frame - T.fadeStart) / (T.end - T.fadeStart)
        if (fadeAlpha >= 1 && !done) {
          done = true
          audio.pause()
          onDone()
          return
        }
      }

      // Woman bob
      const bobY = Math.sin(frame * 0.04) * 4

      // Draw
      ctx.clearRect(0, 0, W, H)
      drawSky()
      drawOcean()
      drawBloodPool()
      drawFin()
      drawWoman(bobY)
      drawShark()

      if (fadeAlpha > 0) {
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeAlpha)})`
        ctx.fillRect(0, 0, W, H)
      }

      raf = requestAnimationFrame(render)
    }

    raf = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(raf); audio.pause() }
  }, [onDone])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, width: '100%', height: '100%' }}
    />
  )
}
