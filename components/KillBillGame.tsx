'use client'

import { useEffect, useRef, useState } from 'react'
import { discoverEgg } from '@/lib/actions'

const GW = 900, GH = 500

export default function KillBillGame({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef(0)
  const [scale, setScale]   = useState(1)
  const [beaten, setBeaten] = useState(false)

  useEffect(() => {
    function upd() { setScale(Math.min(window.innerWidth / GW, window.innerHeight / GH, 1.5)) }
    upd()
    window.addEventListener('resize', upd)
    return () => window.removeEventListener('resize', upd)
  }, [])

  useEffect(() => {
    discoverEgg('killbill')
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // ── State ─────────────────────────────────────────────
    let mouseX = GW / 2, mouseY = GH / 2
    let frame = 0

    // Bill: he stands center-ish
    const bill = {
      x: GW * 0.55, y: GH * 0.75,  // feet position
      hp: 100, maxHp: 100,
      phase: 0 as 0|1|2|3,   // 0=alive 1=staggering 2=decapitated 3=done
      headY: 0,               // head flies off
      headVY: -12,
      headVX: 4,
      bleedTimer: 0,
      fallAngle: 0,
    }

    // Katana (mouse-controlled)
    const katana = { x: 100, y: GH / 2, angle: 0, trail: [] as { x: number; y: number }[] }
    let swinging = false
    let swingTimer = 0
    let hitRegistered = false

    // Sparks
    const sparks: { x: number; y: number; vx: number; vy: number; life: number; col: string }[] = []

    // Blood drops
    const blood: { x: number; y: number; vy: number; life: number }[] = []

    // ── Drawing helpers ───────────────────────────────────

    function drawBill(decap = false, fallAngle = 0, headX = 0, headY = 0) {
      ctx.save()
      ctx.translate(bill.x, bill.y)
      ctx.rotate(fallAngle)

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(0, 4, 40 * Math.cos(fallAngle), 8, 0, 0, Math.PI * 2)
      ctx.fill()

      // Legs
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(-16, -80, 14, 80)
      ctx.fillRect(2, -80, 14, 80)

      // Suit jacket (black)
      ctx.fillStyle = '#111'
      ctx.fillRect(-22, -160, 44, 82)

      // White shirt/tie
      ctx.fillStyle = '#ddd'
      ctx.fillRect(-6, -158, 12, 72)
      ctx.fillStyle = '#cc0000'
      ctx.fillRect(-3, -158, 6, 50)

      // Arms
      ctx.fillStyle = '#111'
      ctx.fillRect(-34, -158, 14, 60)
      ctx.fillRect(20, -158, 14, 60)

      // Hands
      ctx.fillStyle = '#f2d5a8'
      ctx.fillRect(-36, -100, 14, 12)
      ctx.fillRect(22, -100, 14, 12)

      // Sword (he holds one)
      ctx.strokeStyle = '#bbb'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(22, -100)
      ctx.lineTo(80, -200)
      ctx.stroke()
      ctx.fillStyle = '#888'
      ctx.fillRect(60, -180, 24, 4)

      // Neck stump (after decap)
      if (decap && bill.phase >= 2) {
        ctx.fillStyle = '#cc0000'
        ctx.fillRect(-8, -165, 16, 12)
        // Blood gush
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = '#cc0000'
          ctx.fillRect(-5 + i * 5, -170 - i * 10, 4, 14 + i * 6)
        }
      } else if (!decap) {
        // Head + hair
        ctx.fillStyle = '#f2d5a8'
        ctx.beginPath()
        ctx.ellipse(0, -176, 22, 24, 0, 0, Math.PI * 2)
        ctx.fill()
        // Hair (white/gray)
        ctx.fillStyle = '#cccccc'
        ctx.fillRect(-21, -200, 42, 16)
        ctx.fillRect(-22, -192, 6, 14)
        // Eyes (menacing)
        ctx.fillStyle = '#222'
        ctx.fillRect(-9, -180, 6, 6)
        ctx.fillRect(3, -180, 6, 6)
        // Mouth (sinister grin)
        ctx.strokeStyle = '#884444'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(0, -166, 8, 0, Math.PI)
        ctx.stroke()
      }

      ctx.restore()

      // Detached flying head
      if (decap && bill.phase >= 2) {
        ctx.save()
        ctx.translate(headX, headY)
        ctx.rotate(frame * 0.15)
        ctx.fillStyle = '#f2d5a8'
        ctx.beginPath()
        ctx.ellipse(0, 0, 22, 24, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#cccccc'
        ctx.fillRect(-21, -24, 42, 16)
        ctx.fillStyle = '#cc0000'
        ctx.fillRect(-8, 22, 16, 8)
        // Shocked eyes
        ctx.fillStyle = '#fff'
        ctx.fillRect(-9, -8, 8, 8)
        ctx.fillRect(1, -8, 8, 8)
        ctx.fillStyle = '#333'
        ctx.fillRect(-7, -6, 4, 6)
        ctx.fillRect(3, -6, 4, 6)
        // O mouth
        ctx.fillStyle = '#444'
        ctx.beginPath()
        ctx.arc(0, 6, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    function drawKatana(kx: number, ky: number, angle: number) {
      ctx.save()
      ctx.translate(kx, ky)
      ctx.rotate(angle)

      // Trail
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 2
      for (let i = 0; i < katana.trail.length - 1; i++) {
        const a = katana.trail[i], b = katana.trail[i + 1]
        ctx.globalAlpha = i / katana.trail.length * 0.4
        ctx.strokeStyle = `rgba(220,220,255,${i / katana.trail.length * 0.5})`
        ctx.lineWidth = (i / katana.trail.length) * 4
        ctx.beginPath()
        ctx.moveTo(a.x - kx, a.y - ky)
        ctx.lineTo(b.x - kx, b.y - ky)
        ctx.stroke()
      }
      ctx.globalAlpha = 1

      // Handle
      ctx.fillStyle = '#4a2800'
      ctx.fillRect(-8, 30, 16, 44)
      // Guard
      ctx.fillStyle = '#aa8800'
      ctx.fillRect(-12, 24, 24, 8)
      // Blade
      const bladeGrad = ctx.createLinearGradient(-4, -120, 4, -120)
      bladeGrad.addColorStop(0, '#e8e8f0')
      bladeGrad.addColorStop(0.5, '#ffffff')
      bladeGrad.addColorStop(1, '#b0b0c0')
      ctx.fillStyle = bladeGrad
      ctx.beginPath()
      ctx.moveTo(-5, 24)
      ctx.lineTo(5, 24)
      ctx.lineTo(1, -120)
      ctx.lineTo(-1, -120)
      ctx.closePath()
      ctx.fill()
      // Blood on blade if hit
      if (bill.phase >= 1) {
        ctx.fillStyle = 'rgba(180,0,0,0.6)'
        ctx.beginPath()
        ctx.moveTo(-4, -40)
        ctx.lineTo(4, -40)
        ctx.lineTo(2, -100)
        ctx.lineTo(-2, -100)
        ctx.closePath()
        ctx.fill()
      }

      ctx.restore()
    }

    // ── Main loop ──────────────────────────────────────────
    function loop() {
      frame++
      ctx.clearRect(0, 0, GW, GH)

      // Background — dojo / Japanese aesthetic
      const bg = ctx.createLinearGradient(0, 0, 0, GH)
      bg.addColorStop(0, '#1a0505')
      bg.addColorStop(1, '#0d0202')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, GW, GH)

      // Floor
      const floor = ctx.createLinearGradient(0, GH * 0.7, 0, GH)
      floor.addColorStop(0, '#2a1a0a')
      floor.addColorStop(1, '#1a0f05')
      ctx.fillStyle = floor
      ctx.fillRect(0, GH * 0.75, GW, GH * 0.25)
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'
      ctx.lineWidth = 1
      for (let x = 0; x < GW; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, GH * 0.75); ctx.lineTo(x, GH); ctx.stroke()
      }

      // "KILL BILL" title
      ctx.save()
      ctx.textAlign = 'center'
      ctx.font = 'bold 52px serif'
      ctx.fillStyle = '#cc0000'
      ctx.shadowColor = '#ff0000'
      ctx.shadowBlur = 20
      ctx.fillText('KILL BILL', GW / 2, 72)
      ctx.shadowBlur = 0
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.font = '13px monospace'
      ctx.fillText(bill.phase === 0 ? 'Tranche-lui la tête avec le katana !' : bill.phase === 3 ? '' : '...', GW / 2, 100)
      ctx.restore()

      // Bill logic
      if (bill.phase === 0) {
        // Bill slowly walks toward player
        bill.x -= 0.4
        if (bill.x < GW * 0.3) bill.x = GW * 0.55  // reset
      }
      if (bill.phase === 1) {
        bill.bleedTimer++
        if (bill.bleedTimer > 40) { bill.phase = 2 }
        // Blood drips
        if (frame % 3 === 0) blood.push({ x: bill.x, y: bill.y - 160, vy: 1, life: 60 })
      }
      if (bill.phase === 2) {
        bill.fallAngle += 0.05
        bill.headY += bill.headVY
        bill.headVY += 0.5
        const headX = bill.x + bill.headVX * (bill.bleedTimer - 40)
        const headY = bill.y - 160 + bill.headY
        if (bill.fallAngle > Math.PI / 2) {
          bill.phase = 3
          setTimeout(() => setBeaten(true), 500)
        }
        // More blood when decapitated
        if (frame % 2 === 0) {
          for (let i = 0; i < 2; i++) {
            blood.push({ x: bill.x + (Math.random() - 0.5) * 14, y: bill.y - 162, vy: -2 + Math.random() * -4, life: 50 })
            sparks.push({ x: bill.x, y: bill.y - 160, vx: (Math.random() - 0.5) * 5, vy: -3 - Math.random() * 3, life: 20, col: '#cc0000' })
          }
        }
        drawBill(true, bill.fallAngle, headX, headY)
      } else if (bill.phase < 2) {
        drawBill(false, bill.phase === 1 ? Math.sin(frame * 0.2) * 0.08 : 0)
      }

      // Blood drops
      for (const b of blood) {
        b.y += b.vy; b.vy += 0.3; b.life--
        ctx.fillStyle = `rgba(160,0,0,${Math.max(0, b.life / 50)})`
        ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill()
      }
      blood.splice(0, blood.filter(b => b.life <= 0).length)

      // Sparks
      for (const s of sparks) {
        s.x += s.vx; s.y += s.vy; s.vy += 0.3; s.life--
        ctx.fillStyle = `rgba(200,0,0,${s.life / 20})`
        ctx.fillRect(s.x - 1, s.y - 1, 3, 3)
      }
      sparks.splice(0, sparks.filter(s => s.life <= 0).length)

      // Katana angle follows mouse (aim toward Bill's neck level)
      const targetAngle = Math.atan2(mouseY - katana.y, bill.x - katana.x) - Math.PI / 2

      if (swinging) {
        swingTimer++
        const progress = swingTimer / 12
        katana.x += (bill.x - 80 - katana.x) * 0.28
        katana.y += ((bill.y - 165) - katana.y) * 0.28

        // Hit detection: katana tip near Bill's neck
        const tipX = katana.x + Math.sin(katana.angle) * 120
        const tipY = katana.y - Math.cos(katana.angle) * 120
        const dist = Math.hypot(tipX - bill.x, tipY - (bill.y - 162))
        if (dist < 55 && !hitRegistered && bill.phase === 0) {
          hitRegistered = true
          bill.phase = 1
          bill.bleedTimer = 0
          // Sparks at neck
          for (let i = 0; i < 18; i++) {
            sparks.push({
              x: bill.x, y: bill.y - 162,
              vx: (Math.random() - 0.5) * 8, vy: -4 - Math.random() * 4,
              life: 30, col: '#ffaa00',
            })
          }
        }

        if (swingTimer > 20) { swinging = false; swingTimer = 0 }
      } else {
        katana.x += (mouseX - katana.x) * 0.18
        katana.y += (mouseY - katana.y) * 0.18
        katana.angle += (targetAngle - katana.angle) * 0.15
      }

      // Trail
      katana.trail.push({ x: katana.x, y: katana.y })
      if (katana.trail.length > 20) katana.trail.shift()

      // Draw katana
      if (bill.phase < 3) drawKatana(katana.x, katana.y, swinging ? katana.angle + Math.PI * 0.3 * (swingTimer / 12) : katana.angle)

      // Hint
      if (bill.phase === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        ctx.font = '11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('Clic gauche pour frapper', GW / 2, GH - 18)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    // ── Input ──────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      const scaleX = GW / rect.width, scaleY = GH / rect.height
      mouseX = (e.clientX - rect.left) * scaleX
      mouseY = (e.clientY - rect.top) * scaleY
    }

    function onClick() {
      if (bill.phase === 0 && !swinging) { swinging = true; swingTimer = 0; hitRegistered = false }
    }

    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onDone() }

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    rafRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <canvas
        ref={canvasRef}
        width={GW}
        height={GH}
        style={{ display: 'block', transform: `scale(${scale})`, transformOrigin: 'center', cursor: 'crosshair', imageRendering: 'pixelated' }}
      />
      {beaten && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.85)', animation: 'ee-hal-in .6s ease',
        }}>
          <div style={{ color: '#cc0000', fontSize: '3rem', fontFamily: 'serif', fontWeight: 700, textShadow: '0 0 30px #ff0000', marginBottom: '1rem' }}>
            BILL EST MORT
          </div>
          <div style={{ color: '#e8e8e8', fontSize: '1.1rem', fontStyle: 'italic', fontFamily: 'serif', marginBottom: '2rem' }}>
            "Pai mei t'a bien entraîné."
          </div>
          <button
            onClick={onDone}
            style={{ background: '#cc0000', border: 'none', color: '#fff', padding: '.8rem 2rem', borderRadius: 6, cursor: 'pointer', fontSize: '1rem', fontFamily: 'monospace', letterSpacing: '2px' }}
          >
            FERMER
          </button>
        </div>
      )}
      <button
        onClick={onDone}
        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.5)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '.78rem', fontFamily: 'monospace' }}
      >
        ESC
      </button>
    </div>
  )
}
