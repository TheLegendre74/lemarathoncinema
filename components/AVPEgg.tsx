'use client'

import { useEffect, useRef } from 'react'
import { discoverEgg } from '@/lib/actions'

// ── Alien vs Predator — destruction du DOM ────────────────────────────────────

export default function AVPEgg({ onDone }: { onDone: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const rafRef     = useRef(0)

  useEffect(() => {
    discoverEgg('avp')
    const overlay = overlayRef.current
    if (!overlay) return

    // ── Capture DOM snapshot for "damage" ──────────────────
    // We'll collect all visible text nodes and random elements to "destroy"
    const allTextEls: Element[] = []
    document.querySelectorAll('p, h1, h2, h3, span, a, button, label, li, td, th').forEach(el => {
      if (el.closest('[data-avp-overlay]')) return
      if (el.textContent && el.textContent.trim().length > 2) allTextEls.push(el)
    })

    // Store original styles to restore later
    const damaged: { el: Element; origStyle: string }[] = []

    // ── Canvas for characters ──────────────────────────────
    const canvas = document.createElement('canvas')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none;'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')!

    let frame = 0
    // Alien starts left, Predator starts right, they run toward center
    const SCENE_DURATION = 360 // ~6s at 60fps

    const alien = { x: -80, y: window.innerHeight * 0.65, vx: 5.5, vy: 0, attacking: false, attackTimer: 0 }
    const pred  = { x: window.innerWidth + 80, y: window.innerHeight * 0.65, vx: -5.5, vy: 0, attacking: false, attackTimer: 0 }

    // Missiles from predator
    const missiles: { x: number; y: number; vx: number; vy: number; life: number }[] = []
    // Impact holes on canvas
    const holes: { x: number; y: number; r: number; life: number }[] = []
    // Fire particles
    const fires: { x: number; y: number; vx: number; vy: number; life: number; size: number }[] = []
    // Falling letters
    const fallingLetters: { x: number; y: number; char: string; vy: number; rot: number; life: number; burning: boolean }[] = []

    let phase: 'entering' | 'fighting' | 'leaving' = 'entering'
    let phaseTimer = 0
    let damageIdx = 0

    // ── DOM destruction helper ─────────────────────────────
    function destroyRandomElement() {
      if (allTextEls.length === 0) return
      const el = allTextEls[Math.floor(Math.random() * allTextEls.length)] as HTMLElement
      if (!el || damaged.find(d => d.el === el)) return
      const rect = el.getBoundingClientRect()
      if (rect.width === 0) return

      damaged.push({ el, origStyle: (el as HTMLElement).style.cssText })
      const rnd = Math.random()

      if (rnd < 0.33) {
        // Letters fall off
        const text = el.textContent ?? ''
        for (let i = 0; i < Math.min(5, text.length); i++) {
          const char = text[Math.floor(Math.random() * text.length)]
          fallingLetters.push({
            x: rect.left + Math.random() * rect.width,
            y: rect.top,
            char, vy: -2 - Math.random() * 3,
            rot: (Math.random() - 0.5) * 0.5,
            life: 80 + Math.random() * 40,
            burning: Math.random() > 0.5,
          })
        }
        ;(el as HTMLElement).style.opacity = '0.2'
        ;(el as HTMLElement).style.textDecoration = 'line-through'
      } else if (rnd < 0.66) {
        // Text on fire (red/orange glow)
        ;(el as HTMLElement).style.color = `hsl(${20 + Math.random() * 30},100%,60%)`
        ;(el as HTMLElement).style.textShadow = '0 0 8px #ff4400, 0 0 20px #ff2200'
        ;(el as HTMLElement).style.animation = 'none'
        // Add fire particles at element position
        for (let i = 0; i < 4; i++) {
          fires.push({
            x: rect.left + Math.random() * rect.width,
            y: rect.top + Math.random() * rect.height,
            vx: (Math.random() - 0.5) * 2,
            vy: -2 - Math.random() * 2,
            life: 40 + Math.random() * 20,
            size: 4 + Math.random() * 6,
          })
        }
      } else {
        // Shake/blur
        ;(el as HTMLElement).style.filter = 'blur(2px)'
        ;(el as HTMLElement).style.transform = `rotate(${(Math.random() - 0.5) * 6}deg)`
      }
    }

    // ── Draw Alien (Xenomorph pixel art) ──────────────────
    function drawAlien(x: number, y: number, facing: 1 | -1, attacking: boolean) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(facing, 1)

      // Body
      ctx.fillStyle = '#1a2a1a'
      ctx.fillRect(-18, -90, 36, 55)

      // Ribcage detail
      ctx.strokeStyle = '#2a4a2a'
      ctx.lineWidth = 1.5
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(-16, -82 + i * 10)
        ctx.lineTo(16, -82 + i * 10)
        ctx.stroke()
      }

      // Arms
      ctx.fillStyle = '#1a2a1a'
      const atkOffset = attacking ? 20 : 0
      ctx.fillRect(-32, -88, 16, 42)         // back arm
      ctx.fillRect(16, -88 + atkOffset, 16, 42) // front arm (lunges when attacking)

      // Claws (front)
      ctx.strokeStyle = '#aaccaa'
      ctx.lineWidth = 2
      const clawBase = 16 + 16
      const clawY = -88 + atkOffset + 42
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(clawBase + i * 4, clawY)
        ctx.lineTo(clawBase + i * 4 + 6, clawY + 14)
        ctx.stroke()
      }

      // Legs
      ctx.fillStyle = '#111f11'
      ctx.fillRect(-14, -35, 12, 36)
      ctx.fillRect(2, -35, 12, 36)
      // Feet
      ctx.fillStyle = '#0f180f'
      ctx.fillRect(-16, -2, 16, 6)
      ctx.fillRect(0, -2, 18, 6)
      // Tail
      ctx.strokeStyle = '#1a2a1a'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-18, -50)
      ctx.quadraticCurveTo(-55, -30, -60, 0)
      ctx.stroke()
      // Tail tip
      ctx.fillStyle = '#aaccaa'
      ctx.beginPath()
      ctx.moveTo(-60, 0)
      ctx.lineTo(-68, -8)
      ctx.lineTo(-65, 4)
      ctx.closePath()
      ctx.fill()

      // Neck
      ctx.fillStyle = '#1a2a1a'
      ctx.fillRect(-6, -108, 12, 20)

      // Elongated head
      ctx.fillStyle = '#162216'
      ctx.beginPath()
      ctx.ellipse(10, -128, 20, 34, 0.3, 0, Math.PI * 2)
      ctx.fill()

      // Inner jaw (secondary mouth)
      if (attacking) {
        ctx.fillStyle = '#884400'
        ctx.fillRect(4, -110, 10, 6)
      }

      // Drool
      ctx.strokeStyle = 'rgba(180,220,180,0.5)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(20, -104)
      ctx.lineTo(20, -90)
      ctx.stroke()

      ctx.restore()
    }

    // ── Draw Predator ─────────────────────────────────────
    function drawPredator(x: number, y: number, facing: 1 | -1, attacking: boolean) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(facing, 1)

      // Legs (armored)
      ctx.fillStyle = '#4a3a1a'
      ctx.fillRect(-16, -80, 14, 80)
      ctx.fillRect(2, -80, 14, 80)
      // Knee armor
      ctx.fillStyle = '#6a5a2a'
      ctx.fillRect(-18, -52, 16, 12)
      ctx.fillRect(2, -52, 16, 12)
      // Feet
      ctx.fillStyle = '#2a1a08'
      ctx.fillRect(-18, -4, 20, 6)
      ctx.fillRect(0, -4, 20, 6)

      // Body armor
      ctx.fillStyle = '#5a4a1a'
      ctx.fillRect(-20, -148, 40, 70)
      // Chest plate
      ctx.fillStyle = '#7a6a2a'
      ctx.fillRect(-16, -144, 32, 36)
      // Shoulder cannon (on right shoulder)
      ctx.fillStyle = '#3a2a08'
      ctx.fillRect(16, -162, 20, 22)
      // Cannon barrel
      ctx.fillStyle = '#222'
      ctx.fillRect(34, -156, 28, 8)
      if (attacking) {
        // Laser sight
        ctx.strokeStyle = 'rgba(255,80,0,0.7)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(62, -152)
        ctx.lineTo(facing * -150, -152)
        ctx.stroke()
      }

      // Arms
      ctx.fillStyle = '#4a3a1a'
      ctx.fillRect(-34, -144, 16, 58)
      ctx.fillRect(20, -144, 16, 58)
      // Wrist blades (left arm)
      if (attacking) {
        ctx.strokeStyle = '#bbaa44'
        ctx.lineWidth = 2
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.moveTo(-34, -92 + i * 3)
          ctx.lineTo(-70, -108 + i * 3)
          ctx.stroke()
        }
      }

      // Head (dreadlocks + mask)
      ctx.fillStyle = '#3a2a08'
      ctx.beginPath()
      ctx.ellipse(0, -166, 20, 22, 0, 0, Math.PI * 2)
      ctx.fill()
      // Dreadlocks
      ctx.strokeStyle = '#2a1a04'
      ctx.lineWidth = 5
      const dlocks = [-18, -12, -6, 0, 6, 12, 18]
      dlocks.forEach((dx, i) => {
        ctx.beginPath()
        ctx.moveTo(dx, -150)
        ctx.lineTo(dx + (i % 2 === 0 ? -4 : 4), -120)
        ctx.stroke()
      })
      // Mask
      ctx.fillStyle = '#888866'
      ctx.fillRect(-14, -178, 28, 20)
      // Mask eyes (three dots)
      ctx.fillStyle = '#ff4400'
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.arc(-6 + i * 6, -170, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }

      // Net texture hint on body
      ctx.strokeStyle = 'rgba(100,80,20,0.4)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(-20, -148 + i * 12)
        ctx.lineTo(20, -148 + i * 12)
        ctx.stroke()
      }

      ctx.restore()
    }

    // ── Game loop ──────────────────────────────────────────
    function loop() {
      frame++
      phaseTimer++
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Phase management
      if (phase === 'entering' && phaseTimer > 80) phase = 'fighting'
      if (phase === 'fighting' && phaseTimer > 260) { phase = 'leaving'; phaseTimer = 0 }
      if (phase === 'leaving' && phaseTimer > 100) {
        // Restore DOM
        for (const { el, origStyle } of damaged) {
          ;(el as HTMLElement).style.cssText = origStyle
        }
        onDone()
        return
      }

      // Move characters
      if (phase === 'entering') {
        if (alien.x < window.innerWidth * 0.35) alien.x += alien.vx
        if (pred.x > window.innerWidth * 0.65) pred.x += pred.vx
      }
      if (phase === 'fighting') {
        // Oscillate back and forth
        alien.x = window.innerWidth * 0.35 + Math.sin(frame * 0.04) * 40
        pred.x  = window.innerWidth * 0.65 + Math.cos(frame * 0.035) * 40
        alien.y = window.innerHeight * 0.65 + Math.sin(frame * 0.07) * 10
        pred.y  = window.innerHeight * 0.65 + Math.cos(frame * 0.06) * 10

        // Predator fires missiles
        if (frame % 55 === 0) {
          missiles.push({
            x: pred.x - 30, y: pred.y - 152,
            vx: -8, vy: (Math.random() - 0.5) * 4,
            life: 60,
          })
        }

        // DOM destruction every ~40 frames
        if (frame % 38 === 0 && damageIdx < 12) {
          destroyRandomElement()
          damageIdx++
        }

        // Mark as attacking occasionally
        alien.attacking = frame % 60 < 20
        pred.attacking  = frame % 70 < 25
      }
      if (phase === 'leaving') {
        alien.x -= 6
        pred.x  += 6
        alien.y += 1
        pred.y  += 1
      }

      // Missiles
      for (const m of missiles) {
        m.x += m.vx; m.y += m.vy; m.life--
        // Draw missile
        ctx.fillStyle = '#ffaa00'
        ctx.save()
        ctx.translate(m.x, m.y)
        ctx.rotate(Math.atan2(m.vy, m.vx))
        ctx.fillRect(-15, -3, 30, 6)
        ctx.fillStyle = '#ff4400'
        ctx.fillRect(-20, -3, 6, 6)
        ctx.restore()
        // Exhaust trail
        fires.push({ x: m.x + 15, y: m.y, vx: 2 + Math.random(), vy: (Math.random() - 0.5), life: 15, size: 6 + Math.random() * 6 })

        // Impact (hit edge of screen or random target)
        if (m.life <= 0 || m.x < 0 || m.x > canvas.width) {
          const impactX = Math.max(0, Math.min(canvas.width, m.x))
          holes.push({ x: impactX, y: m.y, r: 18 + Math.random() * 14, life: 300 })
          for (let i = 0; i < 12; i++) {
            fires.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 8, vy: -4 - Math.random() * 4, life: 35, size: 8 + Math.random() * 8 })
          }
        }
      }
      missiles.splice(0, missiles.filter(m => m.life <= 0 || m.x < 0).length)

      // Fire particles
      for (const f of fires) {
        f.x += f.vx; f.y += f.vy; f.vy -= 0.1; f.life--
        const a = Math.max(0, f.life / 35)
        const hue = 20 + (1 - a) * 40
        ctx.fillStyle = `hsla(${hue},100%,${50 + (1 - a) * 20}%,${a})`
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.size * a, 0, Math.PI * 2)
        ctx.fill()
      }
      fires.splice(0, fires.filter(f => f.life <= 0).length)

      // Impact holes (on canvas)
      for (const h of holes) {
        h.life--
        ctx.save()
        const a = Math.min(1, h.life / 50)
        // Burn ring
        ctx.beginPath()
        ctx.arc(h.x, h.y, h.r + 4, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(60,20,0,${a * 0.7})`
        ctx.fill()
        // Black hole
        ctx.beginPath()
        ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(0,0,0,${a})`
        ctx.fill()
        // Scorch marks
        ctx.strokeStyle = `rgba(80,40,0,${a * 0.5})`
        ctx.lineWidth = 2
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * Math.PI * 2
          ctx.beginPath()
          ctx.moveTo(h.x + Math.cos(ang) * h.r, h.y + Math.sin(ang) * h.r)
          ctx.lineTo(h.x + Math.cos(ang) * (h.r + 12), h.y + Math.sin(ang) * (h.r + 12))
          ctx.stroke()
        }
        ctx.restore()
      }
      holes.splice(0, holes.filter(h => h.life <= 0).length)

      // Falling letters
      for (const l of fallingLetters) {
        l.y += l.vy; l.vy += 0.3; l.rot += 0.05; l.life--
        ctx.save()
        ctx.translate(l.x, l.y)
        ctx.rotate(l.rot)
        ctx.globalAlpha = Math.max(0, l.life / 80)
        ctx.font = `bold 14px monospace`
        if (l.burning) {
          ctx.fillStyle = `hsl(${20 + Math.random() * 20},100%,60%)`
          ctx.shadowColor = '#ff4400'
          ctx.shadowBlur = 8
        } else {
          ctx.fillStyle = '#ccc'
        }
        ctx.fillText(l.char, 0, 0)
        ctx.restore()
      }
      fallingLetters.splice(0, fallingLetters.filter(l => l.life <= 0).length)

      // Draw characters
      const alienFace = (alien.x < pred.x ? 1 : -1) as 1 | -1
      const predFace  = (pred.x > alien.x ? -1 : 1) as 1 | -1
      drawAlien(alien.x, alien.y, alienFace, alien.attacking)
      drawPredator(pred.x, pred.y, predFace, pred.attacking)

      // "Clash" effect when close together
      const dist = Math.abs(pred.x - alien.x)
      if (dist < 200 && phase === 'fighting') {
        ctx.save()
        ctx.globalAlpha = 0.6 + Math.sin(frame * 0.3) * 0.4
        ctx.fillStyle = `hsl(${(frame * 5) % 360},100%,70%)`
        ctx.font = 'bold 28px monospace'
        ctx.textAlign = 'center'
        const clashes = ['💥', '⚡', '🔥', '💢']
        ctx.fillText(clashes[(frame >> 3) % clashes.length], (alien.x + pred.x) / 2, (alien.y + pred.y) / 2 - 120)
        ctx.restore()
      }

      // HUD text
      if (phase === 'fighting') {
        ctx.fillStyle = 'rgba(0,200,50,0.6)'
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'left'
        ctx.fillText('⚠ ALIEN vs PREDATOR — COLLISION DÉTECTÉE', 14, 22)
      }
      if (phase === 'leaving') {
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.font = '12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Ils continuent leur combat... ailleurs.', canvas.width / 2, canvas.height / 2)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.remove()
      // Restore DOM just in case
      for (const { el, origStyle } of damaged) {
        ;(el as HTMLElement).style.cssText = origStyle
      }
    }
  }, [onDone])

  return <div data-avp-overlay ref={overlayRef} style={{ position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'none' }} />
}
