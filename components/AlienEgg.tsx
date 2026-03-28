'use client'

import { useEffect, useRef } from 'react'
import { discoverEgg } from '@/lib/actions'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Marine {
  id: number
  x: number
  y: number
  alpha: number
  killed: boolean
  killFlash: number
  isRipley: boolean
  bellyBulge: number
}

export default function AlienEgg({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const W = canvas.width, H = canvas.height

    discoverEgg('alien')

    let done = false
    const startTime = performance.now()

    // ── TIMING (ms) ──────────────────────────────────────────────────────────
    const T = {
      // Crew positions (L→R): Lambert, Brett, Dallas, Ripley
      kill1:     2800,  // Lambert grabbed
      kill2:     5600,  // Brett
      kill3:     8400,  // Dallas
      approachR: 10500, // Alien approaches Ripley visibly
      ovipos:    13000, // Ovipositor on Ripley's belly
      bulge:     14500, // Belly distends
      burst:     16500, // Facehugger bursts
      flee:      18000, // Facehugger scurries
      fadeStart: 19500,
      end:       22000,
    }

    // ── FLICKER STATE ─────────────────────────────────────────────────────────
    let lightFlicker  = 1.0
    let flickerTimer  = 0

    // ── MARINES ───────────────────────────────────────────────────────────────
    const crewY = H * 0.72
    const marines: Marine[] = [
      { id: 0, x: W * 0.14, y: crewY, alpha: 1, killed: false, killFlash: 0, isRipley: false, bellyBulge: 0 },
      { id: 1, x: W * 0.34, y: crewY, alpha: 1, killed: false, killFlash: 0, isRipley: false, bellyBulge: 0 },
      { id: 2, x: W * 0.56, y: crewY, alpha: 1, killed: false, killFlash: 0, isRipley: false, bellyBulge: 0 },
      { id: 3, x: W * 0.75, y: crewY, alpha: 1, killed: false, killFlash: 0, isRipley: true,  bellyBulge: 0 },
    ]

    // ── ALIEN STATE ───────────────────────────────────────────────────────────
    const alienShadow = {
      x: W * 0.92,
      y: H * 0.32,        // on ceiling
      vx: 0, vy: 0,
      walkPhase: 0,
      visible: 0,         // 0–1 visibility
      targetX: W * 0.92,
      targetY: H * 0.32,
      ovipositorExt: 0,   // 0–1 ovipositor extension
    }

    // ── FACEHUGGER STATE ──────────────────────────────────────────────────────
    const fhugger = {
      x: marines[3].x, y: marines[3].y - 18,
      vx: 0, vy: 0,
      alpha: 0, walkPhase: 0,
      active: false,
      fled: false,
    }

    let fadeAlpha = 0

    // ── CORRIDOR BACKGROUND ───────────────────────────────────────────────────
    function drawCorridor(flicker: number) {
      // Floor to ceiling gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, `rgba(8,8,14,${flicker})`)
      bg.addColorStop(0.45, `rgba(12,12,20,${flicker})`)
      bg.addColorStop(0.7, `rgba(16,14,12,${flicker * 0.9})`)
      bg.addColorStop(1, `rgba(6,6,8,${flicker})`)
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

      // Corridor walls (perspective lines to a vanishing point)
      const vpX = W * 0.5, vpY = H * 0.52
      ctx.strokeStyle = `rgba(40,40,55,${flicker * 0.7})`; ctx.lineWidth = 1
      // Floor lines
      for (let f = 0; f <= 6; f++) {
        const fx = (f / 6) * W
        ctx.beginPath(); ctx.moveTo(fx, H); ctx.lineTo(vpX, vpY); ctx.stroke()
      }
      // Ceiling lines
      for (let c = 0; c <= 6; c++) {
        const cx = (c / 6) * W
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(vpX, vpY); ctx.stroke()
      }

      // Metal wall panels (left and right)
      ctx.strokeStyle = `rgba(30,35,50,${flicker * 0.8})`; ctx.lineWidth = 1.5
      // Left wall panels
      for (let p = 0; p < 5; p++) {
        const py = (p / 5) * H
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W * 0.12, vpY + (py - vpY) * 0.3); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, py + H * 0.1); ctx.lineTo(W * 0.12, vpY + (py + H * 0.1 - vpY) * 0.3); ctx.stroke()
      }
      // Right wall panels
      for (let p = 0; p < 5; p++) {
        const py = (p / 5) * H
        ctx.beginPath(); ctx.moveTo(W, py); ctx.lineTo(W * 0.88, vpY + (py - vpY) * 0.3); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(W, py + H * 0.1); ctx.lineTo(W * 0.88, vpY + (py + H * 0.1 - vpY) * 0.3); ctx.stroke()
      }

      // Pipes along ceiling
      ctx.strokeStyle = `rgba(28,30,42,${flicker * 0.9})`
      for (let pipe = 0; pipe < 6; pipe++) {
        const py = pipe * 18 + 8
        ctx.lineWidth = 3 + (pipe % 2) * 4
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke()
      }

      // Emergency lighting strips (left and right walls, red)
      const redAlpha = 0.12 * flicker
      ctx.fillStyle = `rgba(180,30,20,${redAlpha})`
      ctx.fillRect(0, H * 0.35, 18, H * 0.3)
      ctx.fillRect(W - 18, H * 0.35, 18, H * 0.3)
      // Red glow
      const leftGlow = ctx.createRadialGradient(12, H * 0.5, 0, 12, H * 0.5, 100)
      leftGlow.addColorStop(0, `rgba(180,20,20,${0.18 * flicker})`)
      leftGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = leftGlow; ctx.fillRect(0, H * 0.3, 120, H * 0.4)

      const rightGlow = ctx.createRadialGradient(W - 12, H * 0.5, 0, W - 12, H * 0.5, 100)
      rightGlow.addColorStop(0, `rgba(180,20,20,${0.18 * flicker})`)
      rightGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = rightGlow; ctx.fillRect(W - 120, H * 0.3, 120, H * 0.4)

      // Floor
      const floorGrad = ctx.createLinearGradient(0, H * 0.82, 0, H)
      floorGrad.addColorStop(0, `rgba(18,16,14,${flicker})`)
      floorGrad.addColorStop(1, `rgba(6,5,4,${flicker})`)
      ctx.fillStyle = floorGrad; ctx.fillRect(0, H * 0.82, W, H * 0.18)
      // Floor grid lines
      ctx.strokeStyle = `rgba(30,28,24,${flicker * 0.5})`; ctx.lineWidth = 1
      for (let fx = 0; fx < W; fx += 60) {
        ctx.beginPath(); ctx.moveTo(fx, H * 0.82); ctx.lineTo(fx + 20, H); ctx.stroke()
      }
    }

    // ── DRAW MARINE ───────────────────────────────────────────────────────────
    function drawMarine(m: Marine) {
      if (m.alpha <= 0) return
      ctx.save()
      ctx.globalAlpha = m.alpha
      ctx.translate(m.x, m.y)

      const suit  = m.isRipley ? '#3a3038' : '#2c3028'
      const light = m.isRipley ? '#4a4048' : '#3a3c30'

      // Kill flash (dark shadow wash)
      if (m.killFlash > 0) {
        ctx.fillStyle = `rgba(0,0,0,${m.killFlash})`
        ctx.fillRect(-30, -80, 60, 100)
      }

      // Body / suit
      ctx.fillStyle = suit
      ctx.beginPath(); ctx.ellipse(0, -28, 16, 30, 0, 0, Math.PI * 2); ctx.fill()
      // Suit details
      ctx.fillStyle = light
      ctx.beginPath(); ctx.ellipse(0, -30, 10, 20, 0, 0, Math.PI * 2); ctx.fill()
      // Belt / utility
      ctx.fillStyle = '#1a1c16'
      ctx.beginPath(); ctx.rect(-15, -14, 30, 6); ctx.fill()
      // Pouches
      for (let p = -1; p <= 1; p += 2) {
        ctx.fillStyle = '#252820'
        ctx.beginPath(); ctx.rect(p * 8, -12, 6, 8); ctx.fill()
      }

      // Legs
      ctx.fillStyle = suit
      ctx.beginPath(); ctx.ellipse(-8, 10, 8, 18, -0.08, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(8, 10, 8, 18, 0.08, 0, Math.PI * 2); ctx.fill()
      // Boots
      ctx.fillStyle = '#14140e'
      ctx.beginPath(); ctx.ellipse(-10, 24, 10, 5, -0.2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(10, 24, 10, 5, 0.2, 0, Math.PI * 2); ctx.fill()

      // Helmet (or Ripley's bare head)
      if (!m.isRipley) {
        // Helmet
        ctx.fillStyle = '#303530'
        ctx.beginPath(); ctx.arc(0, -56, 16, 0, Math.PI * 2); ctx.fill()
        // Visor
        ctx.fillStyle = 'rgba(180,200,220,0.22)'
        ctx.beginPath(); ctx.ellipse(0, -56, 11, 9, 0, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#222522'; ctx.lineWidth = 1.5
        ctx.beginPath(); ctx.arc(0, -56, 14, 0, Math.PI * 2); ctx.stroke()
      } else {
        // Ripley's head — short wavy hair, determined face
        ctx.fillStyle = '#e0a878'; ctx.beginPath(); ctx.arc(0, -58, 13, 0, Math.PI * 2); ctx.fill()
        // Hair (short, layered)
        ctx.fillStyle = '#3a2010'
        ctx.beginPath(); ctx.ellipse(0, -64, 14, 8, 0, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(-8, -62, 7, 5, -0.4, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.ellipse(8, -62, 7, 5, 0.4, 0, Math.PI * 2); ctx.fill()
        // Eyes (intense)
        ctx.fillStyle = '#111'
        ctx.beginPath(); ctx.arc(-4, -58, 2.2, 0, Math.PI * 2); ctx.fill()
        ctx.beginPath(); ctx.arc(4, -58, 2.2, 0, Math.PI * 2); ctx.fill()
        // Mouth (tense)
        ctx.strokeStyle = '#aa7050'; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.moveTo(-4, -53); ctx.lineTo(4, -53); ctx.stroke()
        // Ripley's tank top visible at neck
        ctx.fillStyle = '#888070'
        ctx.beginPath(); ctx.rect(-8, -48, 16, 8); ctx.fill()
      }

      // Arms
      ctx.fillStyle = suit
      ctx.beginPath(); ctx.ellipse(-18, -28, 7, 16, -0.2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(18, -28, 7, 16, 0.2, 0, Math.PI * 2); ctx.fill()

      // Weapon
      if (!m.isRipley) {
        // Pulse rifle
        ctx.fillStyle = '#282c24'
        ctx.beginPath(); ctx.rect(16, -40, 26, 8); ctx.fill()
        ctx.fillStyle = '#1e2218'
        ctx.beginPath(); ctx.rect(28, -46, 12, 8); ctx.fill()
      } else {
        // Flamethrower (Ripley's iconic weapon)
        ctx.fillStyle = '#302c20'
        ctx.beginPath(); ctx.rect(-42, -38, 30, 10); ctx.fill()
        // Tank
        ctx.fillStyle = '#3a3828'
        ctx.beginPath(); ctx.arc(-28, -32, 8, 0, Math.PI * 2); ctx.fill()
        // Nozzle
        ctx.fillStyle = '#1a1810'
        ctx.beginPath(); ctx.rect(-46, -35, 6, 6); ctx.fill()
      }

      // Ripley belly bulge
      if (m.bellyBulge > 0) {
        const bulgeR = 8 + m.bellyBulge * 18
        const pulse  = Math.sin(Date.now() * 0.01) * 2 * m.bellyBulge
        ctx.fillStyle = `rgba(200,120,80,${m.bellyBulge * 0.85})`
        ctx.beginPath(); ctx.ellipse(0, -22 + pulse, bulgeR, bulgeR * 0.75, 0, 0, Math.PI * 2); ctx.fill()
        // Movement ripple under skin
        if (m.bellyBulge > 0.5) {
          ctx.strokeStyle = `rgba(240,150,100,${(m.bellyBulge - 0.5) * 0.7})`
          ctx.lineWidth = 1.5
          ctx.beginPath(); ctx.ellipse(0, -22 + pulse, bulgeR + 4, bulgeR * 0.8, 0, 0, Math.PI * 2); ctx.stroke()
        }
      }

      ctx.restore()
    }

    // ── DRAW ALIEN (quadruped, stealthy) ──────────────────────────────────────
    function drawAlienShadow(x: number, y: number, walkPhase: number, visibility: number, onCeiling: boolean) {
      if (visibility <= 0) return
      ctx.save()
      ctx.globalAlpha = visibility * 0.88

      if (onCeiling) {
        ctx.translate(x, y); ctx.scale(0.65, -0.65)
      } else {
        ctx.translate(x, y); ctx.scale(0.7, 0.7)
      }

      const bob = Math.sin(walkPhase * 2) * 2.5

      // Body
      ctx.beginPath(); ctx.ellipse(-2, 2 + bob, 34, 12, -0.06, 0, Math.PI * 2)
      ctx.fillStyle = '#0a0a12'; ctx.fill()
      // Ribs
      ctx.strokeStyle = '#060610'; ctx.lineWidth = 1.5
      for (let r = 0; r < 5; r++) {
        ctx.beginPath(); ctx.moveTo(-24 + r * 11, bob - 5); ctx.lineTo(-26 + r * 11, bob + 10); ctx.stroke()
      }
      // Dorsal tubes
      for (let d = 0; d < 5; d++) {
        const dx = -20 + d * 10, th = 14 + Math.sin(d * 1.4) * 4
        ctx.beginPath(); ctx.moveTo(dx, bob - 11); ctx.lineTo(dx + 1, bob - 11 - th)
        ctx.strokeStyle = '#161620'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke()
        ctx.beginPath(); ctx.arc(dx + 1, bob - 11 - th, 2.2, 0, Math.PI * 2)
        ctx.fillStyle = '#161620'; ctx.fill()
      }
      // Head
      ctx.beginPath(); ctx.ellipse(-36, bob - 3, 22, 9, -0.12, 0, Math.PI * 2)
      ctx.fillStyle = '#080812'; ctx.fill()
      ctx.beginPath(); ctx.moveTo(-54, bob - 4); ctx.quadraticCurveTo(-48, bob - 21, -26, bob - 9)
      ctx.strokeStyle = '#060608'; ctx.lineWidth = 2.5; ctx.stroke()
      // Sheen
      ctx.beginPath(); ctx.moveTo(-52, bob - 10); ctx.quadraticCurveTo(-44, bob - 19, -28, bob - 12)
      ctx.strokeStyle = 'rgba(40,55,80,0.25)'; ctx.lineWidth = 1.5; ctx.stroke()

      // 4 legs
      const swing = Math.sin(walkPhase) * 20, fl = swing * Math.PI / 180, fr = -fl
      ctx.strokeStyle = '#0a0a12'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.beginPath(); ctx.moveTo(-22, bob + 8); ctx.lineTo(-22 + Math.sin(fl) * 17, bob + 23); ctx.lineTo(-22 + Math.sin(fl) * 22, bob + 34); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(-12, bob + 9); ctx.lineTo(-12 + Math.sin(fr) * 17, bob + 23); ctx.lineTo(-12 + Math.sin(fr) * 22, bob + 34); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(14, bob + 8); ctx.lineTo(14 + Math.sin(fr) * 15, bob + 22); ctx.lineTo(14 + Math.sin(fr) * 19, bob + 32); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(24, bob + 9); ctx.lineTo(24 + Math.sin(fl) * 15, bob + 22); ctx.lineTo(24 + Math.sin(fl) * 19, bob + 32); ctx.stroke()

      // Tail
      const tailWag = Math.sin(walkPhase * 1.5) * 10
      ctx.beginPath(); ctx.moveTo(28, bob + 3)
      ctx.bezierCurveTo(46, bob + 13 + tailWag, 63, bob - 9 + tailWag * 0.7, 78, bob - 3)
      ctx.bezierCurveTo(92, bob + 5, 102, bob - 14 + tailWag * 0.4, 110, bob - 7)
      ctx.strokeStyle = '#0a0a12'; ctx.lineWidth = 4; ctx.stroke()
      ctx.beginPath(); ctx.moveTo(108, bob - 7); ctx.lineTo(117, bob - 17); ctx.lineTo(110, bob - 6)
      ctx.fillStyle = '#161620'; ctx.fill()

      ctx.restore()
    }

    // ── FACEHUGGER ────────────────────────────────────────────────────────────
    function drawFacehugger(x: number, y: number, walkPhase: number, alpha: number) {
      if (alpha <= 0) return
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y)

      const legWave = Math.sin(walkPhase * 3) * 12
      const bodyColor = '#c8a070'

      // Central body (flat oval)
      ctx.fillStyle = bodyColor
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2); ctx.fill()
      // Body texture
      ctx.strokeStyle = '#a07850'; ctx.lineWidth = 0.8
      for (let s = 0; s < 4; s++) {
        ctx.beginPath(); ctx.ellipse(0, 0, 6 + s * 3, 4 + s * 2, 0, 0, Math.PI * 2); ctx.stroke()
      }

      // 8 legs (4 per side, thin, segmented)
      ctx.strokeStyle = '#b09060'; ctx.lineWidth = 1.8; ctx.lineCap = 'round'
      for (let leg = 0; leg < 4; leg++) {
        const baseAngle = (leg / 3) * Math.PI * 0.6 - Math.PI * 0.3
        const wave = legWave * (leg % 2 === 0 ? 1 : -1)
        // Left legs
        ctx.beginPath()
        ctx.moveTo(-10, (leg - 1.5) * 4)
        ctx.lineTo(-22 + wave, (leg - 1.5) * 4 - 6)
        ctx.lineTo(-32 + wave * 0.5, (leg - 1.5) * 4 + 4)
        ctx.stroke()
        // Right legs
        ctx.beginPath()
        ctx.moveTo(10, (leg - 1.5) * 4)
        ctx.lineTo(22 - wave, (leg - 1.5) * 4 - 6)
        ctx.lineTo(32 - wave * 0.5, (leg - 1.5) * 4 + 4)
        ctx.stroke()
      }

      // Long tail (curling)
      ctx.beginPath(); ctx.moveTo(14, 2)
      ctx.bezierCurveTo(28, 10, 38, -8, 42, 2)
      ctx.bezierCurveTo(46, 10, 40, 20, 35, 14)
      ctx.strokeStyle = '#c09060'; ctx.lineWidth = 2.5; ctx.stroke()

      ctx.restore()
    }

    // ── RENDER LOOP ───────────────────────────────────────────────────────────
    let raf: number

    function render(now: number) {
      if (done) return
      const elapsed = now - startTime

      // Flicker logic
      flickerTimer -= 16
      if (flickerTimer <= 0) {
        flickerTimer = 120 + Math.random() * 400
        if (Math.random() < 0.3) {
          // Brief flicker
          lightFlicker = 0.2 + Math.random() * 0.5
          setTimeout(() => { lightFlicker = 0.8 + Math.random() * 0.2 }, 80 + Math.random() * 120)
        }
      }

      ctx.clearRect(0, 0, W, H)
      drawCorridor(lightFlicker)

      // ── Kill 1 — Lambert (2.8s) ───────────────────────────────────────────
      if (elapsed >= T.kill1 && !marines[0].killed) {
        marines[0].killed = true; marines[0].killFlash = 1
        setTimeout(() => { marines[0].alpha = 0; marines[0].killFlash = 0 }, 320)
      }
      if (marines[0].killFlash > 0) marines[0].killFlash -= 0.04

      // ── Kill 2 — Brett (5.6s) ─────────────────────────────────────────────
      if (elapsed >= T.kill2 && !marines[1].killed) {
        marines[1].killed = true; marines[1].killFlash = 1
        // Alien shadow moves toward Brett
        alienShadow.targetX = marines[1].x; alienShadow.targetY = marines[1].y - 80
        setTimeout(() => { marines[1].alpha = 0; marines[1].killFlash = 0 }, 320)
      }
      if (marines[1].killFlash > 0) marines[1].killFlash -= 0.04

      // ── Kill 3 — Dallas (8.4s) ────────────────────────────────────────────
      if (elapsed >= T.kill3 && !marines[2].killed) {
        marines[2].killed = true; marines[2].killFlash = 1
        alienShadow.targetX = marines[2].x; alienShadow.targetY = marines[2].y - 80
        setTimeout(() => { marines[2].alpha = 0; marines[2].killFlash = 0 }, 320)
      }
      if (marines[2].killFlash > 0) marines[2].killFlash -= 0.04

      // ── Alien approaches Ripley visibly (10.5s) ───────────────────────────
      if (elapsed >= T.approachR) {
        alienShadow.visible = Math.min(0.9, alienShadow.visible + 0.008)
        alienShadow.targetX = marines[3].x + 80
        alienShadow.targetY = marines[3].y - 30
      } else {
        alienShadow.visible = Math.min(0.35, alienShadow.visible + 0.002)
      }

      // Move alien shadow toward target
      alienShadow.x += (alienShadow.targetX - alienShadow.x) * 0.025
      alienShadow.y += (alienShadow.targetY - alienShadow.y) * 0.025
      alienShadow.walkPhase += elapsed < T.kill3 ? 0.06 : 0.10

      // ── Ovipositor (13s) ──────────────────────────────────────────────────
      if (elapsed >= T.ovipos && elapsed < T.bulge) {
        alienShadow.ovipositorExt = Math.min(1, alienShadow.ovipositorExt + 0.02)
      }

      // ── Belly distends (14.5s) ────────────────────────────────────────────
      if (elapsed >= T.bulge && elapsed < T.burst) {
        marines[3].bellyBulge = Math.min(1, marines[3].bellyBulge + 0.015)
      }

      // ── Facehugger bursts (16.5s) ─────────────────────────────────────────
      if (elapsed >= T.burst && !fhugger.active) {
        fhugger.active = true
        fhugger.x = marines[3].x; fhugger.y = marines[3].y - 22
        fhugger.alpha = 1; fhugger.vx = 2.5; fhugger.vy = -1
        marines[3].bellyBulge = 1.2  // burst effect
      }

      // ── Facehugger flee (18s) ─────────────────────────────────────────────
      if (elapsed >= T.flee && !fhugger.fled) {
        fhugger.fled = true; fhugger.vx = 5; fhugger.vy = 2
      }

      if (fhugger.active) {
        fhugger.x += fhugger.vx; fhugger.y += fhugger.vy
        fhugger.walkPhase += 0.25
        if (fhugger.fled) fhugger.alpha = Math.max(0, fhugger.alpha - 0.015)
      }

      // ── Fade (19.5s) ──────────────────────────────────────────────────────
      if (elapsed >= T.fadeStart) {
        fadeAlpha = (elapsed - T.fadeStart) / (T.end - T.fadeStart)
        if (fadeAlpha >= 1 && !done) { done = true; onDone(); return }
      }

      // ── DRAW ──────────────────────────────────────────────────────────────

      // Alien shadow (on ceiling before approaching, then at ground level)
      const onCeiling = elapsed < T.approachR
      drawAlienShadow(alienShadow.x, alienShadow.y, alienShadow.walkPhase, alienShadow.visible, onCeiling)

      // Ovipositor extending toward Ripley
      if (alienShadow.ovipositorExt > 0) {
        const ovi = alienShadow.ovipositorExt
        ctx.save(); ctx.globalAlpha = ovi * 0.75
        ctx.beginPath()
        ctx.moveTo(alienShadow.x - 20, alienShadow.y + 5)
        ctx.quadraticCurveTo(
          (alienShadow.x + marines[3].x) * 0.5, alienShadow.y + 30,
          marines[3].x, marines[3].y - 22
        )
        ctx.strokeStyle = '#1a180e'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke()
        // Inner ovipositor
        ctx.strokeStyle = '#2a2418'; ctx.lineWidth = 3; ctx.stroke()
        ctx.restore()
      }

      // Marines
      for (const m of marines) drawMarine(m)

      // Facehugger
      drawFacehugger(fhugger.x, fhugger.y, fhugger.walkPhase, fhugger.alpha)

      // Atmosphere: dark fog from sides
      const leftFog = ctx.createLinearGradient(0, 0, W * 0.25, 0)
      leftFog.addColorStop(0, 'rgba(4,4,8,0.6)')
      leftFog.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = leftFog; ctx.fillRect(0, 0, W * 0.25, H)
      const rightFog = ctx.createLinearGradient(W, 0, W * 0.75, 0)
      rightFog.addColorStop(0, 'rgba(4,4,8,0.6)')
      rightFog.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = rightFog; ctx.fillRect(W * 0.75, 0, W * 0.25, H)

      if (fadeAlpha > 0) {
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeAlpha)})`
        ctx.fillRect(0, 0, W, H)
      }

      raf = requestAnimationFrame(render)
    }

    raf = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(raf) }
  }, [onDone])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 9999, width: '100%', height: '100%' }} />
}
