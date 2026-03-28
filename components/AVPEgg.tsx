'use client'

import { useEffect, useRef } from 'react'
import { discoverEgg } from '@/lib/actions'

export default function AVPEgg({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const W = canvas.width, H = canvas.height

    discoverEgg('predator')

    const roarAudio = new Audio('/sons/predator-roar.mp3')
    roarAudio.volume = 0.9

    let done = false
    const startTime = performance.now()

    // ── TIMING (ms) ──────────────────────────────────────────────────────────
    const T = {
      huntStart:  800,
      leapStart:  8000,
      stabStart:  9200,
      roarStart:  9600,
      fadeStart: 12200,
      end:       14000,
    }

    // ── STATE ─────────────────────────────────────────────────────────────────
    const predX     = W * 0.28
    const predBaseY = H * 0.82
    let predAimAngle   = -Math.PI * 0.65
    let predFiring     = false
    let predWristBlade = false
    let predVictory    = false
    let roarPlayed     = false
    let fadeAlpha      = 0

    const al = {
      x: W * 0.55, y: H * 0.74,
      vx: 1.2, vy: -0.5,
      walkPhase: 0, facingLeft: false,
      changeTimer: 0, leaping: false,
      leapT: 0, leapSX: 0, leapSY: 0,
      dead: false, deadAlpha: 1.0,
    }

    const bolts: { x: number; y: number; vx: number; vy: number; age: number }[] = []
    let lastFire = -999
    const FIRE_INTERVAL = 1500

    const acidSplats: { x: number; y: number; r: number; a: number }[] = []

    // ── BACKGROUND ────────────────────────────────────────────────────────────
    function drawBG() {
      ctx.fillStyle = '#02060a'
      ctx.fillRect(0, 0, W, H)
      const fog = ctx.createRadialGradient(W * 0.5, H * 0.5, 80, W * 0.5, H * 0.5, W * 0.8)
      fog.addColorStop(0, 'rgba(0,12,6,0)')
      fog.addColorStop(1, 'rgba(0,0,0,0.65)')
      ctx.fillStyle = fog; ctx.fillRect(0, 0, W, H)
      // Tree silhouettes
      ctx.fillStyle = '#010502'
      for (let i = 0; i < 18; i++) {
        const tx = (i / 18) * W * 1.1 - W * 0.05 + (i % 3) * 22
        const th = H * 0.28 + Math.sin(i * 2.3) * H * 0.11
        const tw = 24 + Math.sin(i * 1.7) * 9
        ctx.beginPath()
        ctx.moveTo(tx, H * 0.89)
        ctx.lineTo(tx - tw, H * 0.89 - th * 0.45)
        ctx.lineTo(tx - tw * 0.45, H * 0.89 - th)
        ctx.lineTo(tx, H * 0.89 - th * 1.12)
        ctx.lineTo(tx + tw * 0.45, H * 0.89 - th)
        ctx.lineTo(tx + tw, H * 0.89 - th * 0.45)
        ctx.closePath(); ctx.fill()
      }
      ctx.fillStyle = '#030804'
      ctx.fillRect(0, H * 0.86, W, H * 0.14)
      for (let m = 0; m < 5; m++) {
        const mg = ctx.createLinearGradient(0, H * 0.84 + m * 7, 0, H * 0.84 + m * 7 + 18)
        mg.addColorStop(0, 'rgba(8,20,10,0.14)')
        mg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = mg; ctx.fillRect(0, H * 0.84 + m * 7, W, 18)
      }
    }

    // ── ALIEN (quadruped) ─────────────────────────────────────────────────────
    function drawAlien(x: number, y: number, walkPhase: number, facingLeft: boolean, alpha = 1) {
      if (alpha <= 0) return
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.translate(x, y)
      if (!facingLeft) ctx.scale(-1, 1)
      const bob = Math.sin(walkPhase * 2) * 2.8

      // Ground shadow
      ctx.beginPath(); ctx.ellipse(0, 33 + bob, 50, 9, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fill()

      // Body (elongated, horizontal, low)
      ctx.beginPath(); ctx.ellipse(-2, 2 + bob, 34, 12, -0.06, 0, Math.PI * 2)
      ctx.fillStyle = '#12121a'; ctx.fill()
      // Biomechanical ribbing
      ctx.strokeStyle = '#080810'; ctx.lineWidth = 1.5
      for (let r = 0; r < 5; r++) {
        ctx.beginPath(); ctx.moveTo(-24 + r * 11, bob - 5); ctx.lineTo(-26 + r * 11, bob + 10); ctx.stroke()
      }

      // Dorsal tubes
      for (let d = 0; d < 5; d++) {
        const dx = -20 + d * 10, th = 14 + Math.sin(d * 1.4) * 4
        ctx.beginPath(); ctx.moveTo(dx, bob - 11); ctx.lineTo(dx + 1, bob - 11 - th)
        ctx.strokeStyle = '#1c1c28'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.stroke()
        ctx.beginPath(); ctx.arc(dx + 1, bob - 11 - th, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = '#1c1c28'; ctx.fill()
      }

      // Elongated head (iconic dome)
      ctx.beginPath(); ctx.ellipse(-36, bob - 3, 22, 9, -0.12, 0, Math.PI * 2)
      ctx.fillStyle = '#0e0e18'; ctx.fill()
      // Dome ridge
      ctx.beginPath(); ctx.moveTo(-54, bob - 4); ctx.quadraticCurveTo(-48, bob - 21, -26, bob - 9)
      ctx.strokeStyle = '#08080e'; ctx.lineWidth = 2.5; ctx.stroke()
      // Sheen
      ctx.beginPath(); ctx.moveTo(-52, bob - 10); ctx.quadraticCurveTo(-44, bob - 19, -28, bob - 12)
      ctx.strokeStyle = 'rgba(50,70,100,0.3)'; ctx.lineWidth = 1.5; ctx.stroke()
      // Inner jaw (2nd mouth)
      ctx.beginPath(); ctx.ellipse(-51, bob - 1, 5.5, 2.5, -0.18, 0, Math.PI)
      ctx.fillStyle = '#c82820'; ctx.fill()
      ctx.fillStyle = '#dddac8'
      for (let t = 0; t < 4; t++) {
        ctx.beginPath(); ctx.moveTo(-56 + t * 3.5, bob - 0.5)
        ctx.lineTo(-54.5 + t * 3.5, bob + 4.5); ctx.lineTo(-53 + t * 3.5, bob - 0.5); ctx.fill()
      }
      // Acid drool
      ctx.beginPath(); ctx.moveTo(-52, bob + 1.5); ctx.lineTo(-52, bob + 8)
      ctx.strokeStyle = 'rgba(160,255,40,0.55)'; ctx.lineWidth = 1.5; ctx.stroke()

      // 4 legs — diagonal pair walking
      const swing = Math.sin(walkPhase) * 22
      const fl = (swing * Math.PI) / 180, fr = (-swing * Math.PI) / 180
      ctx.strokeStyle = '#12121a'; ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      // Front-left
      ctx.beginPath(); ctx.moveTo(-22, bob + 8)
      ctx.lineTo(-22 + Math.sin(fl) * 17, bob + 23); ctx.lineTo(-22 + Math.sin(fl) * 22, bob + 35); ctx.stroke()
      // Front-right
      ctx.beginPath(); ctx.moveTo(-12, bob + 9)
      ctx.lineTo(-12 + Math.sin(fr) * 17, bob + 23); ctx.lineTo(-12 + Math.sin(fr) * 22, bob + 35); ctx.stroke()
      // Rear-left (diagonal with front-right)
      ctx.beginPath(); ctx.moveTo(14, bob + 8)
      ctx.lineTo(14 + Math.sin(fr) * 15, bob + 22); ctx.lineTo(14 + Math.sin(fr) * 19, bob + 33); ctx.stroke()
      // Rear-right (diagonal with front-left)
      ctx.beginPath(); ctx.moveTo(24, bob + 9)
      ctx.lineTo(24 + Math.sin(fl) * 15, bob + 22); ctx.lineTo(24 + Math.sin(fl) * 19, bob + 33); ctx.stroke()

      // Tail (long S-curve)
      const tailWag = Math.sin(walkPhase * 1.5) * 10
      ctx.beginPath(); ctx.moveTo(28, bob + 3)
      ctx.bezierCurveTo(46, bob + 13 + tailWag, 63, bob - 9 + tailWag * 0.7, 78, bob - 3)
      ctx.bezierCurveTo(92, bob + 5, 102, bob - 14 + tailWag * 0.4, 110, bob - 7)
      ctx.strokeStyle = '#12121a'; ctx.lineWidth = 4; ctx.stroke()
      // Blade tip
      ctx.beginPath(); ctx.moveTo(108, bob - 7); ctx.lineTo(117, bob - 17); ctx.lineTo(110, bob - 6)
      ctx.fillStyle = '#1e1e28'; ctx.fill()

      ctx.restore()
    }

    // ── PLASMA BOLT ───────────────────────────────────────────────────────────
    function drawBolt(bx: number, by: number) {
      ctx.save()
      ctx.shadowColor = '#20ff70'; ctx.shadowBlur = 22
      ctx.fillStyle = '#90ffb0'
      ctx.beginPath(); ctx.ellipse(bx, by, 5.5, 11, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.ellipse(bx, by, 2, 4.5, 0, 0, Math.PI * 2); ctx.fill()
      ctx.shadowBlur = 0; ctx.restore()
    }

    // ── PREDATOR ──────────────────────────────────────────────────────────────
    function drawPredator(aimAngle: number, firing: boolean, wristBlade: boolean, victory: boolean) {
      ctx.save(); ctx.translate(predX, predBaseY)

      // Legs
      ctx.fillStyle = '#263018'
      ctx.beginPath(); ctx.moveTo(-15, -5); ctx.lineTo(-24, 28); ctx.lineTo(-16, 30); ctx.lineTo(-8, -3); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(15, -5); ctx.lineTo(24, 28); ctx.lineTo(16, 30); ctx.lineTo(8, -3); ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#1a2210'
      ctx.beginPath(); ctx.ellipse(-20, 30, 13, 5, -0.3, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(20, 30, 13, 5, 0.3, 0, Math.PI * 2); ctx.fill()

      // Torso
      ctx.fillStyle = '#2a3618'
      ctx.beginPath(); ctx.ellipse(0, -14, 21, 27, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#364420'
      ctx.beginPath(); ctx.ellipse(0, -18, 17, 19, 0, 0, Math.PI * 2); ctx.fill()
      // Net pattern
      ctx.strokeStyle = 'rgba(0,0,0,0.38)'; ctx.lineWidth = 0.7
      for (let n = -20; n < 22; n += 6) {
        ctx.beginPath(); ctx.moveTo(n, -38); ctx.lineTo(n + 8, 2); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(-22 + n, 2); ctx.lineTo(-22 + n + 8, -38); ctx.stroke()
      }

      // Arms
      ctx.fillStyle = '#263018'
      ctx.beginPath(); ctx.moveTo(-21, -26); ctx.lineTo(-30, 8); ctx.lineTo(-22, 10); ctx.lineTo(-14, -24); ctx.closePath(); ctx.fill()
      ctx.beginPath(); ctx.moveTo(21, -26); ctx.lineTo(26, 5); ctx.lineTo(32, 3); ctx.lineTo(26, -24); ctx.closePath(); ctx.fill()

      // Head + bio-mask
      ctx.fillStyle = '#222c14'
      ctx.beginPath(); ctx.ellipse(0, -46, 16, 21, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#384620'
      ctx.beginPath(); ctx.ellipse(0, -48, 14, 17, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#202e10'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.ellipse(0, -48, 10, 12, 0, 0, Math.PI * 2); ctx.stroke()
      // Tri-laser
      ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10; ctx.fillStyle = '#ff1818'
      for (const [dx, dy] of [[-5, -53], [0, -57], [5, -53]]) {
        ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI * 2); ctx.fill()
      }
      ctx.shadowBlur = 0
      // Mandibles
      ctx.strokeStyle = '#1a2208'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
      for (let m = -1; m <= 1; m += 2) {
        ctx.beginPath(); ctx.moveTo(m * 13, -38); ctx.lineTo(m * 19, -27); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(m * 11, -33); ctx.lineTo(m * 17, -21); ctx.stroke()
      }
      // Dreadlocks
      for (let d = 0; d < 7; d++) {
        const bx2 = (d - 3) * 5, by2 = -63, len = 24 + (d % 3) * 8
        ctx.strokeStyle = '#121808'; ctx.lineWidth = 3.5
        ctx.beginPath(); ctx.moveTo(bx2, by2)
        ctx.quadraticCurveTo(bx2 + Math.sin(d * 1.3) * 5, by2 + len * 0.5, bx2 + Math.sin(d * 1.7) * 4, by2 + len); ctx.stroke()
        ctx.strokeStyle = '#242e10'; ctx.lineWidth = 1.2
        ctx.beginPath(); ctx.arc(bx2 + Math.sin(d) * 3, by2 + len * 0.38, 2, 0, Math.PI * 2); ctx.stroke()
        ctx.beginPath(); ctx.arc(bx2 + Math.sin(d) * 2, by2 + len * 0.7, 2, 0, Math.PI * 2); ctx.stroke()
      }

      // Shoulder plasma cannon
      ctx.save(); ctx.translate(23, -31); ctx.rotate(aimAngle)
      ctx.fillStyle = '#383824'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 13, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#282818'; ctx.beginPath(); ctx.rect(-4, -28, 8, 16); ctx.fill()
      ctx.strokeStyle = 'rgba(255,25,25,0.75)'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(0, -31); ctx.lineTo(-6, -24); ctx.lineTo(6, -24); ctx.closePath(); ctx.stroke()
      if (firing) {
        ctx.shadowColor = '#00ff60'; ctx.shadowBlur = 28
        ctx.fillStyle = '#50ffa0'; ctx.beginPath(); ctx.arc(0, -30, 5.5, 0, Math.PI * 2); ctx.fill()
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = 'rgba(0,200,60,0.1)'; ctx.beginPath(); ctx.arc(0, -30, 3, 0, Math.PI * 2); ctx.fill()
      }
      ctx.restore()

      // Wrist blades
      if (wristBlade) {
        ctx.save(); ctx.translate(-22, 6)
        ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-9, -58); ctx.lineTo(-4, -64); ctx.lineTo(1, -2)
        ctx.closePath(); ctx.fillStyle = '#b0c0a8'; ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.5; ctx.stroke()
        ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-1, -52); ctx.lineTo(4, -57); ctx.lineTo(8, -2)
        ctx.closePath(); ctx.fillStyle = '#a0b098'; ctx.fill()
        ctx.restore()
      }

      // Victory arms raised
      if (victory) {
        ctx.strokeStyle = '#263018'; ctx.lineWidth = 12; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(-21, -24); ctx.lineTo(-44, -60); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(21, -24); ctx.lineTo(44, -60); ctx.stroke()
      }

      ctx.restore()
    }

    // ── ACID SPLAT ────────────────────────────────────────────────────────────
    function drawAcid(x: number, y: number, r: number, a: number) {
      if (a <= 0) return
      ctx.save(); ctx.globalAlpha = a
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, 'rgba(150,255,30,0.95)')
      g.addColorStop(0.4, 'rgba(70,190,8,0.7)')
      g.addColorStop(1, 'rgba(30,140,0,0)')
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }

    // ── RENDER LOOP ───────────────────────────────────────────────────────────
    let raf: number

    function render(now: number) {
      if (done) return
      const elapsed = now - startTime

      ctx.clearRect(0, 0, W, H)
      drawBG()

      // Hunt phase
      if (elapsed >= T.huntStart && elapsed < T.leapStart && !al.dead) {
        al.changeTimer -= 16
        if (al.changeTimer <= 0) {
          al.changeTimer = 380 + Math.random() * 620
          const wildness = 1 + (elapsed - T.huntStart) / T.leapStart * 2
          al.vx = (Math.random() - 0.5) * 5 * wildness
          al.vy = -0.35 - Math.random() * 0.9
        }
        // Dodge bolts
        for (const b of bolts) {
          const dx = b.x - al.x, dy = b.y - al.y
          if (Math.abs(dx) < 110 && dy > -220 && dy < 0) {
            al.vx = al.x < b.x + W * 0.1 ? -6 : 6; al.vy = -2.2; al.changeTimer = 350; break
          }
        }
        al.x += al.vx; al.y += al.vy
        al.x = Math.max(50, Math.min(W - 50, al.x)); al.y = Math.max(H * 0.05, al.y)
        al.walkPhase += 0.18; al.facingLeft = al.vx < 0
        // Fire bolt
        if (elapsed - lastFire > FIRE_INTERVAL) {
          lastFire = elapsed
          const dx = al.x - predX, dy = al.y - (predBaseY - 52)
          const dist = Math.sqrt(dx * dx + dy * dy)
          bolts.push({ x: predX, y: predBaseY - 52, vx: dx / dist * 9, vy: dy / dist * 9, age: 0 })
          predAimAngle = Math.atan2(dy, dx) - Math.PI * 0.5
          predFiring = true; setTimeout(() => { predFiring = false }, 160)
        }
      }

      for (const b of bolts) { b.x += b.vx; b.y += b.vy; b.age++ }

      // Leap phase
      if (elapsed >= T.leapStart && elapsed < T.stabStart && !al.dead) {
        if (!al.leaping) { al.leaping = true; al.leapSX = al.x; al.leapSY = al.y }
        al.leapT = (elapsed - T.leapStart) / (T.stabStart - T.leapStart)
        al.x = al.leapSX + (predX - al.leapSX) * al.leapT
        al.y = al.leapSY + (predBaseY - 40 - al.leapSY) * al.leapT - Math.sin(al.leapT * Math.PI) * 65
        al.walkPhase += 0.22; al.facingLeft = al.x > predX
      }

      // Kill phase
      if (elapsed >= T.stabStart && !al.dead) {
        al.dead = true; predWristBlade = true
        for (let s = 0; s < 8; s++) acidSplats.push({
          x: predX + (Math.random() - 0.5) * 150,
          y: predBaseY - 28 + (Math.random() - 0.5) * 110,
          r: 12 + Math.random() * 30, a: 0.85,
        })
      }
      if (al.dead) al.deadAlpha = Math.max(0, al.deadAlpha - 0.006)

      // Roar
      if (elapsed >= T.roarStart && !roarPlayed) {
        roarPlayed = true; predVictory = true; roarAudio.play().catch(() => {})
      }

      // Fade
      if (elapsed >= T.fadeStart) {
        fadeAlpha = (elapsed - T.fadeStart) / (T.end - T.fadeStart)
        if (fadeAlpha >= 1 && !done) { done = true; roarAudio.pause(); onDone(); return }
      }

      // Draw
      for (const s of acidSplats) { drawAcid(s.x, s.y, s.r, s.a); if (fadeAlpha > 0) s.a -= 0.014 }
      for (const b of bolts) { if (b.age < 160) drawBolt(b.x, b.y) }

      // Tri-laser tracking
      if (elapsed >= T.huntStart && elapsed < T.leapStart && !al.dead) {
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(predX + i * 3, predBaseY - 52); ctx.lineTo(al.x + i * 3, al.y)
          ctx.strokeStyle = `rgba(255,8,8,${0.18 - Math.abs(i) * 0.07})`; ctx.lineWidth = 0.8; ctx.stroke()
        }
      }

      if (!al.dead) drawAlien(al.x, al.y, al.walkPhase, al.facingLeft)
      else if (al.deadAlpha > 0) drawAlien(al.x, al.y, al.walkPhase, al.facingLeft, al.deadAlpha)

      drawPredator(predAimAngle, predFiring, predWristBlade, predVictory)

      if (fadeAlpha > 0) {
        ctx.fillStyle = `rgba(0,0,0,${Math.min(1, fadeAlpha)})`
        ctx.fillRect(0, 0, W, H)
      }

      raf = requestAnimationFrame(render)
    }

    raf = requestAnimationFrame(render)
    return () => { cancelAnimationFrame(raf); roarAudio.pause() }
  }, [onDone])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 9999, width: '100%', height: '100%' }} />
}
