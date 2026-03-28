'use client'

import { useEffect, useRef, useState } from 'react'
import { discoverEgg } from '@/lib/actions'

// ── South Park theme 8-bit (Primus — looping) ────────────────────────────
function startSPTheme(): () => void {
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
    // South Park main theme — main hook + verse loop
    const MELODY: [number, number][] = [
      // Main hook
      [392, .17], [392, .08], [494, .17], [392, .17], [523, .17], [494, .33],
      [392, .17], [392, .08], [494, .17], [392, .17], [587, .17], [523, .33],
      [392, .17], [392, .08], [784, .25], [659, .17], [523, .17], [494, .17], [440, .33],
      [523, .17], [523, .08], [659, .17], [523, .17], [698, .17], [659, .33],
      // Verse (funky bass riff)
      [196, .18], [0, .06], [196, .12], [220, .12], [247, .18], [0, .06],
      [247, .12], [220, .12], [196, .36],
      [220, .18], [0, .06], [220, .12], [247, .12], [277, .18], [0, .06],
      [277, .12], [247, .12], [220, .36],
      // Hook reprise
      [392, .17], [392, .08], [494, .17], [392, .17], [523, .17], [494, .33],
      [392, .17], [392, .08], [784, .25], [659, .17], [523, .17], [494, .17], [440, .5],
      [0, .25],
    ]
    const totalLen = MELODY.reduce((s, [, d]) => s + d, 0)
    const master = ac.createGain(); master.gain.value = 0.18; master.connect(ac.destination)
    let running = true, nextStart = ac.currentTime + 0.05

    function scheduleLoop() {
      const t0 = nextStart; nextStart += totalLen
      let t = t0
      for (const [freq, dur] of MELODY) {
        if (freq > 0) {
          const o = ac.createOscillator(), g = ac.createGain()
          o.type = 'square'; o.frequency.value = freq
          g.gain.setValueAtTime(0, t)
          g.gain.linearRampToValueAtTime(0.12, t + 0.01)
          g.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.88)
          o.connect(g); g.connect(master)
          o.start(t); o.stop(t + dur + 0.01)
        }
        t += dur
      }
    }
    scheduleLoop(); scheduleLoop()
    const id = setInterval(() => {
      if (!running) { clearInterval(id); return }
      if (nextStart - ac.currentTime < totalLen * 1.5) scheduleLoop()
    }, 400)
    return () => {
      running = false; clearInterval(id)
      master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3)
      setTimeout(() => { try { master.disconnect() } catch {} }, 400)
    }
  } catch { return () => {} }
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function drawKenny(ctx: CanvasRenderingContext2D, cx: number, bottom: number, sqY = 1) {
  ctx.save()
  ctx.translate(cx, bottom)
  ctx.scale(1, sqY)
  const h = -70 / sqY  // adjust head position when squished

  // Body (parka)
  ctx.fillStyle = '#ee8800'
  ctx.fillRect(-14, -40, 28, 40)

  // Hood
  ctx.beginPath()
  ctx.arc(0, -44, 17, 0, Math.PI * 2)
  ctx.fill()

  // Face opening (tiny oval)
  ctx.fillStyle = '#f2d5a8'
  ctx.beginPath()
  ctx.ellipse(0, -44, 9, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#222'
  ctx.fillRect(-5, -47, 4, 4)
  ctx.fillRect(1, -47, 4, 4)

  // Legs
  ctx.fillStyle = '#cc7700'
  ctx.fillRect(-12, 0, 10, 18)
  ctx.fillRect(2, 0, 10, 18)

  // Shoes
  ctx.fillStyle = '#111'
  ctx.fillRect(-14, 16, 13, 5)
  ctx.fillRect(0, 16, 13, 5)

  ctx.restore()
}

function drawCartman(ctx: CanvasRenderingContext2D, cx: number, bottom: number) {
  ctx.save()
  ctx.translate(cx, bottom)

  // Legs (blue/navy pants — fat)
  ctx.fillStyle = '#223366'
  ctx.fillRect(-16, -30, 14, 30)
  ctx.fillRect(2, -30, 14, 30)

  // Shoes
  ctx.fillStyle = '#111'
  ctx.fillRect(-18, -4, 16, 5)
  ctx.fillRect(2, -4, 16, 5)

  // Body (red jacket — chubby)
  ctx.fillStyle = '#cc1111'
  ctx.fillRect(-20, -70, 40, 42)

  // Shirt visible
  ctx.fillStyle = '#eee'
  ctx.fillRect(-6, -68, 12, 28)

  // Left glove (yellow)
  ctx.fillStyle = '#ffcc55'
  ctx.fillRect(-26, -58, 10, 14)
  // Right glove
  ctx.fillRect(16, -58, 10, 14)

  // Neck
  ctx.fillStyle = '#f2d5a8'
  ctx.fillRect(-6, -74, 12, 6)

  // Head (round, chubby)
  ctx.fillStyle = '#f2d5a8'
  ctx.beginPath()
  ctx.ellipse(0, -88, 20, 18, 0, 0, Math.PI * 2)
  ctx.fill()

  // Hat (blue with yellow brim)
  ctx.fillStyle = '#3355cc'
  ctx.fillRect(-18, -106, 36, 20)
  ctx.fillStyle = '#ffcc00'
  ctx.fillRect(-20, -88, 40, 5)

  // Eyes
  ctx.fillStyle = '#222'
  ctx.fillRect(-8, -92, 5, 5)
  ctx.fillRect(3, -92, 5, 5)

  // Mouth (smug grin)
  ctx.fillStyle = '#cc8866'
  ctx.fillRect(-5, -81, 10, 3)

  ctx.restore()
}

function drawKyle(ctx: CanvasRenderingContext2D, cx: number, bottom: number) {
  ctx.save()
  ctx.translate(cx, bottom)

  // Legs (brown)
  ctx.fillStyle = '#553311'
  ctx.fillRect(-10, -26, 9, 26)
  ctx.fillRect(1, -26, 9, 26)
  ctx.fillStyle = '#111'
  ctx.fillRect(-12, -4, 12, 5)
  ctx.fillRect(0, -4, 12, 5)

  // Body (orange jacket)
  ctx.fillStyle = '#ee7700'
  ctx.fillRect(-14, -60, 28, 36)

  // Arms
  ctx.fillStyle = '#ee7700'
  ctx.fillRect(-20, -58, 8, 22)
  ctx.fillRect(12, -58, 8, 22)

  // Head
  ctx.fillStyle = '#f2d5a8'
  ctx.beginPath()
  ctx.ellipse(0, -72, 14, 14, 0, 0, Math.PI * 2)
  ctx.fill()

  // Green ushanka hat
  ctx.fillStyle = '#228822'
  ctx.fillRect(-16, -86, 32, 16)  // top
  ctx.fillRect(-20, -74, 8, 10)   // left ear flap
  ctx.fillRect(12, -74, 8, 10)    // right ear flap

  // Red star on hat
  ctx.fillStyle = '#cc2222'
  ctx.beginPath()
  ctx.arc(0, -82, 5, 0, Math.PI * 2)
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#222'
  ctx.fillRect(-5, -75, 4, 4)
  ctx.fillRect(1, -75, 4, 4)

  ctx.restore()
}

function drawStan(ctx: CanvasRenderingContext2D, cx: number, bottom: number) {
  ctx.save()
  ctx.translate(cx, bottom)

  // Legs (gray)
  ctx.fillStyle = '#444'
  ctx.fillRect(-10, -26, 9, 26)
  ctx.fillRect(1, -26, 9, 26)
  ctx.fillStyle = '#111'
  ctx.fillRect(-12, -4, 12, 5)
  ctx.fillRect(0, -4, 12, 5)

  // Body (brown jacket)
  ctx.fillStyle = '#7a3a1a'
  ctx.fillRect(-14, -60, 28, 36)
  ctx.fillStyle = '#7a3a1a'
  ctx.fillRect(-20, -58, 8, 22)
  ctx.fillRect(12, -58, 8, 22)

  // Head
  ctx.fillStyle = '#f2d5a8'
  ctx.beginPath()
  ctx.ellipse(0, -72, 14, 14, 0, 0, Math.PI * 2)
  ctx.fill()

  // Hat (blue with red stripe, white pompom)
  ctx.fillStyle = '#3366aa'
  ctx.fillRect(-15, -86, 30, 16)
  ctx.fillStyle = '#cc2222'
  ctx.fillRect(-15, -72, 30, 4)
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(0, -88, 7, 0, Math.PI * 2)
  ctx.fill()

  // Eyes
  ctx.fillStyle = '#222'
  ctx.fillRect(-5, -75, 4, 4)
  ctx.fillRect(1, -75, 4, 4)

  ctx.restore()
}

function drawBus(ctx: CanvasRenderingContext2D, x: number, groundY: number) {
  const W = 240, H = 90
  const y = groundY - H

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ctx.beginPath()
  ctx.ellipse(x + W / 2, groundY + 4, W * 0.48, 8, 0, 0, Math.PI * 2)
  ctx.fill()

  // Body
  ctx.fillStyle = '#ffcc00'
  ctx.fillRect(x, y, W, H)
  ctx.fillStyle = '#cc9900'
  ctx.strokeStyle = '#cc9900'
  ctx.lineWidth = 3
  ctx.strokeRect(x, y, W, H)

  // Windows
  ctx.fillStyle = '#aaddff'
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x + 20 + i * 52, y + 10, 40, 30)
    ctx.strokeStyle = '#99bbdd'
    ctx.lineWidth = 1
    ctx.strokeRect(x + 20 + i * 52, y + 10, 40, 30)
  }

  // Front (right side - bus drives right to left, so front is on left)
  ctx.fillStyle = '#ee9900'
  ctx.fillRect(x, y, 14, H)
  // Headlight
  ctx.fillStyle = '#ffeeaa'
  ctx.fillRect(x + 2, y + H - 22, 10, 10)
  // STOP sign arm
  ctx.fillStyle = '#cc2222'
  ctx.fillRect(x - 6, y + 30, 6, 22)
  ctx.fillStyle = '#cc2222'
  ctx.beginPath()
  ctx.arc(x - 9, y + 41, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 7px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('STOP', x - 9, y + 44)

  // Door (left side - front of bus)
  ctx.fillStyle = '#cc9900'
  ctx.fillRect(x + W - 44, y + 22, 40, H - 22)
  ctx.strokeStyle = '#aa7700'
  ctx.lineWidth = 2
  ctx.strokeRect(x + W - 44, y + 22, 40, H - 22)

  // Wheels
  ctx.fillStyle = '#222'
  ctx.beginPath(); ctx.arc(x + 45, groundY - 2, 18, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + W - 45, groundY - 2, 18, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#666'
  ctx.beginPath(); ctx.arc(x + 45, groundY - 2, 8, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + W - 45, groundY - 2, 8, 0, Math.PI * 2); ctx.fill()
}

// ── KENNY DEATH ───────────────────────────────────────────────────────────────

export function KennyDeath({ onDone, text1, text2 }: { onDone: () => void; text1?: string; text2?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    discoverEgg('kenny')
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')!

    const GW = canvas.width, GH = canvas.height
    const groundY = GH * 0.72
    const kennyTargetX = GW * 0.44
    let frame = 0

    // Phases: 0=walk, 1=piano falling, 2=squished, 3=text1, 4=text2, 5=done
    let phase = 0
    let kennyX = -50
    let pianoY = -130
    let squishY = 1
    let text1Alpha = 0
    let text2Alpha = 0

    // Piano final Y
    const pianoFinalY = groundY - 70

    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => { phase = 1 }, 1400))           // piano starts
    timers.push(setTimeout(() => { phase = 2 }, 1900))           // squish
    timers.push(setTimeout(() => { phase = 3 }, 2500))           // text1
    timers.push(setTimeout(() => { phase = 4 }, 3600))           // text2
    timers.push(setTimeout(onDone, 5800))

    function loop() {
      frame++
      ctx.clearRect(0, 0, GW, GH)

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, GH)
      sky.addColorStop(0, '#1a2a5e')
      sky.addColorStop(1, '#3a5a9e')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, GW, GH)

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137 + 23) % GW)
        const sy = ((i * 89 + 7) % (groundY * 0.8))
        const blink = Math.sin(frame * 0.05 + i) > 0.5 ? 1 : 0.5
        ctx.globalAlpha = blink * 0.7
        ctx.fillRect(sx, sy, 2, 2)
      }
      ctx.globalAlpha = 1

      // Mountains
      ctx.fillStyle = '#ffffff'
      const mtns = [[GW*0.1,groundY],[GW*0.22,groundY-140],[GW*0.35,groundY],[GW*0.5,groundY-100],[GW*0.62,groundY],[GW*0.78,groundY-160],[GW*0.9,groundY],[GW,groundY]]
      ctx.beginPath()
      ctx.moveTo(0, groundY)
      mtns.forEach(([mx,my]) => ctx.lineTo(mx, my))
      ctx.lineTo(GW, groundY)
      ctx.fill()

      // Snow ground
      const snow = ctx.createLinearGradient(0, groundY, 0, GH)
      snow.addColorStop(0, '#e8eef8')
      snow.addColorStop(1, '#c8d4e8')
      ctx.fillStyle = snow
      ctx.fillRect(0, groundY, GW, GH - groundY)

      // Road
      ctx.fillStyle = '#2a2a2a'
      ctx.fillRect(0, groundY - 2, GW, 20)

      // Kenny walking
      if (phase === 0) kennyX = Math.min(kennyTargetX, kennyX + 5)

      // Kenny squish
      if (phase === 2) squishY = Math.max(0.08, squishY - 0.08)

      // Piano falling
      if (phase === 1) pianoY = Math.min(pianoFinalY, pianoY + (pianoFinalY - pianoY) * 0.18 + 6)

      // Piano
      if (phase >= 1) {
        const px = kennyX - 24
        const py = pianoY

        ctx.fillStyle = '#111'
        ctx.fillRect(px, py - 28, 54, 28)
        // White keys
        for (let k = 0; k < 6; k++) {
          ctx.fillStyle = '#eee'
          ctx.fillRect(px + 2 + k * 8, py - 26, 6, 20)
        }
        // Black keys
        ctx.fillStyle = '#000'
        for (const bk of [1, 2, 4, 5]) {
          ctx.fillRect(px + 4 + bk * 8, py - 26, 5, 13)
        }
        // Piano legs
        ctx.fillStyle = '#333'
        ctx.fillRect(px + 4, py, 8, 20)
        ctx.fillRect(px + 42, py, 8, 20)
      }

      // Kenny
      drawKenny(ctx, kennyX, groundY, squishY)

      // Blood/star when squished
      if (phase >= 2) {
        ctx.save()
        ctx.globalAlpha = Math.min(1, (frame - 60) * 0.1)
        const splats = ['💀', '⭐', '💥']
        ctx.font = '2rem sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(splats[(frame >> 3) % splats.length], kennyX, groundY - 20)
        ctx.restore()
      }

      // Text 1: "Oh mon Dieu!"
      if (phase >= 3) {
        text1Alpha = Math.min(1, text1Alpha + 0.07)
        ctx.save()
        ctx.globalAlpha = text1Alpha
        ctx.textAlign = 'center'
        ctx.font = `bold clamp(24px, 4vw, 38px) 'Georgia', serif`
        ctx.font = 'bold 38px Georgia, serif'
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 5
        ctx.strokeText(text1 ?? 'Oh mon Dieu ! Ils ont tué Kenny !', GW / 2, GH * 0.32)
        ctx.fillText(text1 ?? 'Oh mon Dieu ! Ils ont tué Kenny !', GW / 2, GH * 0.32)
        ctx.restore()
      }

      // Text 2: "Espèce d'enfoirés!"
      if (phase >= 4) {
        text2Alpha = Math.min(1, text2Alpha + 0.07)
        ctx.save()
        ctx.globalAlpha = text2Alpha
        ctx.textAlign = 'center'
        ctx.font = 'bold 28px Georgia, serif'
        ctx.fillStyle = '#ffdd00'
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 4
        ctx.strokeText(text2 ?? "Espèce d'enfoirés !", GW / 2, GH * 0.46)
        ctx.fillText(text2 ?? "Espèce d'enfoirés !", GW / 2, GH * 0.46)
        ctx.restore()
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(rafRef.current)
      timers.forEach(clearTimeout)
    }
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: 'pointer' }} onClick={onDone}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'rgba(255,255,255,0.4)', fontSize: '.75rem', fontFamily: 'monospace' }}>
        cliquer pour fermer
      </div>
    </div>
  )
}

// ── SOUTH PARK BUS ────────────────────────────────────────────────────────────

export function SouthParkBus({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    discoverEgg('southpark')
    const stopMusic = startSPTheme()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')!

    const GW = canvas.width, GH = canvas.height
    const groundY = GH * 0.7
    const BUS_STOP_X = GW * 0.52  // right side of bus stop

    // Characters X positions (at bus stop)
    const chars = [
      { draw: drawCartman, x: BUS_STOP_X + 30,  visible: true },
      { draw: drawKyle,    x: BUS_STOP_X + 75,  visible: true },
      { draw: drawStan,    x: BUS_STOP_X + 120, visible: true },
      { draw: (c: CanvasRenderingContext2D, x: number, b: number) => drawKenny(c, x, b), x: BUS_STOP_X + 163, visible: true },
    ]

    let frame = 0
    let busX = GW + 60
    // phases: 0=kids waiting, 1=bus coming, 2=bus stopped, 3=boarding, 4=leaving, 5=gone
    let phase = 0
    let phaseTimer = 0
    let boardingIdx = 0
    let fadeOut = 0

    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => { phase = 1 }, 1500)) // bus starts coming after 1.5s

    function loop() {
      frame++
      phaseTimer++
      ctx.clearRect(0, 0, GW, GH)

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, GH)
      sky.addColorStop(0, '#0a1530')
      sky.addColorStop(0.6, '#1a2a5e')
      sky.addColorStop(1, '#2a4a8e')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, GW, GH)

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      for (let i = 0; i < 80; i++) {
        const sx = ((i * 179 + 31) % GW)
        const sy = ((i * 97 + 13) % (groundY * 0.75))
        const blink = Math.sin(frame * 0.04 + i * 0.7) > 0.3 ? 1 : 0.4
        ctx.globalAlpha = blink * 0.7
        ctx.fillRect(sx, sy, 2, 2)
      }
      ctx.globalAlpha = 1

      // Moon
      ctx.fillStyle = '#fffce0'
      ctx.beginPath()
      ctx.arc(GW * 0.85, GH * 0.12, 32, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e8e0a0'
      ctx.font = 'bold 18px monospace'
      ctx.textAlign = 'center'

      // Mountains
      ctx.fillStyle = '#ffffff'
      const peaks = [0, GW*0.12, GW*0.25, GW*0.38, GW*0.55, GW*0.68, GW*0.82, GW*0.93, GW]
      const heights = [0, 180, 80, 150, 90, 200, 70, 160, 0]
      ctx.beginPath()
      ctx.moveTo(0, groundY)
      peaks.forEach((px, i) => ctx.lineTo(px, groundY - heights[i]))
      ctx.lineTo(GW, groundY)
      ctx.closePath()
      ctx.fill()

      // Ground (snow)
      const snow = ctx.createLinearGradient(0, groundY, 0, GH)
      snow.addColorStop(0, '#d8e8f8')
      snow.addColorStop(1, '#b8c8e0')
      ctx.fillStyle = snow
      ctx.fillRect(0, groundY, GW, GH - groundY)

      // Road (darker strip)
      ctx.fillStyle = '#2a2a35'
      ctx.fillRect(0, groundY - 8, GW, 28)
      // Road line dashes
      ctx.strokeStyle = '#ffff00'
      ctx.setLineDash([40, 40])
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(0, groundY + 6)
      ctx.lineTo(GW, groundY + 6)
      ctx.stroke()
      ctx.setLineDash([])

      // Bus stop sign (pole + sign)
      ctx.fillStyle = '#888'
      ctx.fillRect(BUS_STOP_X - 4, groundY - 120, 8, 120)
      ctx.fillStyle = '#ee8800'
      ctx.beginPath()
      // hexagon sign
      const sx = BUS_STOP_X, sy = groundY - 148, sr = 28
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        if (i === 0) ctx.moveTo(sx + sr * Math.cos(angle), sy + sr * Math.sin(angle))
        else ctx.lineTo(sx + sr * Math.cos(angle), sy + sr * Math.sin(angle))
      }
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('BUS', sx, sy - 2)
      ctx.fillText('STOP', sx, sy + 12)

      // Town name
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '14px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('SOUTH PARK — COLORADO', 20, 30)

      // Bus logic
      if (phase === 1) {
        busX = Math.max(BUS_STOP_X - 240, busX - 5)
        if (busX <= BUS_STOP_X - 240) { phase = 2; phaseTimer = 0 }
      }
      if (phase === 2 && phaseTimer > 100) { phase = 3; phaseTimer = 0 }
      if (phase === 3) {
        if (phaseTimer % 28 === 0 && boardingIdx < chars.length) {
          chars[boardingIdx].visible = false
          boardingIdx++
        }
        if (boardingIdx >= chars.length) { phase = 4; phaseTimer = 0 }
      }
      if (phase === 4) {
        busX -= 5
        if (busX < -300) { phase = 5 }
      }
      if (phase === 5) {
        fadeOut = Math.min(1, fadeOut + 0.025)
        if (fadeOut >= 1) { onDone(); return }
      }

      // Draw characters
      for (const c of chars) {
        if (c.visible) c.draw(ctx, c.x, groundY - 8)
      }

      // Draw bus
      if (phase >= 1 && phase <= 4) {
        drawBus(ctx, busX, groundY - 8)
      }

      // "Waiting" walk animation (kids bobbing while waiting)
      // already drawn by the character functions

      // Fade to black at end
      if (fadeOut > 0) {
        ctx.fillStyle = `rgba(0,0,0,${fadeOut})`
        ctx.fillRect(0, 0, GW, GH)
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => {
      stopMusic()
      cancelAnimationFrame(rafRef.current)
      timers.forEach(clearTimeout)
    }
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: 'pointer' }} onClick={onDone}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '.75rem', fontFamily: 'monospace', letterSpacing: '1px' }}>
        cliquer pour fermer
      </div>
    </div>
  )
}

// ── RANDY MARSH ───────────────────────────────────────────────────────────────

export function RandyMarsh({ onDone, quote }: { onDone: () => void; quote?: string }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    discoverEgg('randy')
    const t1 = setTimeout(() => setLeaving(true), 6500)
    const t2 = setTimeout(onDone, 7300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  // Randy Marsh — South Park style : chemise bleue claire, cheveux bruns, moustache
  const RandyPixel = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, flexShrink: 0 }}>
      {/* Cheveux bruns courts */}
      <div style={{ width: 50, height: 12, background: '#6b3a1f', borderRadius: '6px 6px 0 0' }} />
      {/* Tête */}
      <div style={{ width: 50, height: 44, borderRadius: '46% 46% 42% 42%', background: '#f2c888', position: 'relative', overflow: 'visible' }}>
        {/* Oreilles */}
        <div style={{ position: 'absolute', left: -7, top: 10, width: 8, height: 12, background: '#f2c888', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', right: -7, top: 10, width: 8, height: 12, background: '#f2c888', borderRadius: '50%' }} />
        {/* Yeux */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 8, height: 8, background: '#222', borderRadius: '50%' }} />
          <div style={{ width: 8, height: 8, background: '#222', borderRadius: '50%' }} />
        </div>
        {/* Nez */}
        <div style={{ width: 8, height: 5, background: '#e0a870', borderRadius: '50%', margin: '3px auto 0' }} />
        {/* Moustache brune épaisse — caractéristique de Randy */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 }}>
          <div style={{ width: 26, height: 7, background: '#5a2a0a', borderRadius: '4px 4px 6px 6px' }} />
        </div>
        {/* Bouche légèrement ouverte (sourire détendu) */}
        <div style={{ width: 14, height: 5, background: '#cc7755', borderRadius: '0 0 6px 6px', margin: '2px auto 0', border: '1px solid #8a3a22' }} />
      </div>
      {/* Corps — chemise bleue claire boutonné */}
      <div style={{ position: 'relative', width: 58, height: 60, background: '#5b9bd5', borderRadius: '2px 2px 4px 4px' }}>
        {/* Col de chemise */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 10, background: '#f0f0f0', clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }} />
        {/* Boutons chemise */}
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, background: '#3a7ab0', borderRadius: '50%' }} />)}
        </div>
        {/* Bras gauche + canette de bière */}
        <div style={{ position: 'absolute', left: -18, top: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 15, height: 32, background: '#5b9bd5', borderRadius: 4 }} />
          <div style={{ width: 14, height: 24, background: 'linear-gradient(180deg,#e8c020,#c8a010)', borderRadius: '2px 2px 3px 3px', border: '1px solid #a07808' }}>
            <div style={{ height: 4, background: '#eee', borderRadius: '2px 2px 0 0' }} />
            <div style={{ fontSize: '4px', color: '#fff', textAlign: 'center', fontFamily: 'monospace', marginTop: 2, lineHeight: 1.1 }}>{'BEER\nCO'}</div>
          </div>
        </div>
        {/* Bras droit + verre de vin */}
        <div style={{ position: 'absolute', right: -20, top: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: 15, height: 32, background: '#5b9bd5', borderRadius: 4 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 20, height: 14, background: 'rgba(180,50,50,0.75)', borderRadius: '0 0 10px 10px', border: '1px solid rgba(200,80,80,0.5)' }} />
            <div style={{ width: 2, height: 8, background: 'rgba(255,255,255,0.35)' }} />
            <div style={{ width: 14, height: 3, background: 'rgba(255,255,255,0.35)', borderRadius: 2 }} />
          </div>
        </div>
        {/* Ceinture */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 7, background: '#2a2a2a', borderRadius: '0 0 2px 2px' }}>
          <div style={{ width: 10, height: 7, background: '#888', margin: '0 auto' }} />
        </div>
      </div>
      {/* Pantalon gris */}
      <div style={{ display: 'flex', gap: 3 }}>
        <div style={{ width: 25, height: 38, background: '#7a7a8a', borderRadius: '0 0 4px 4px' }} />
        <div style={{ width: 25, height: 38, background: '#7a7a8a', borderRadius: '0 0 4px 4px' }} />
      </div>
      {/* Chaussures marron */}
      <div style={{ display: 'flex', gap: 3, marginTop: 1 }}>
        <div style={{ width: 28, height: 8, background: '#4a2810', borderRadius: '2px 4px 4px 2px' }} />
        <div style={{ width: 28, height: 8, background: '#4a2810', borderRadius: '4px 2px 2px 4px' }} />
      </div>
    </div>
  )

  return (
    <div
      onClick={onDone}
      style={{
        position: 'fixed', bottom: '2rem', left: '50%',
        zIndex: 9999, display: 'flex', alignItems: 'flex-end', gap: '1.2rem',
        cursor: 'pointer',
        animation: leaving ? 'ee-marvin-out .7s ease forwards' : 'ee-marvin-in .4s ease',
      }}
    >
      <RandyPixel />

      {/* Speech bubble */}
      <div style={{
        background: 'rgba(8,8,20,.97)',
        border: '1px solid rgba(255,255,255,.14)',
        borderRadius: 12, padding: '1rem 1.2rem',
        maxWidth: 320, marginBottom: '1.4rem', position: 'relative',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ fontSize: '.6rem', color: '#aaa', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '.4rem' }}>
          🧔 Randy Marsh
        </div>
        <div style={{ color: '#fff', fontSize: '.88rem', lineHeight: 1.65, fontStyle: 'italic' }}>
          {quote ?? "C'est pas de l'alcoolisme, c'est du vinomoussage... c'est une activité élégamment culturelle."}
        </div>
        {/* Bubble arrow */}
        <div style={{
          position: 'absolute', left: -9, bottom: 24,
          width: 0, height: 0,
          borderTop: '8px solid transparent',
          borderBottom: '8px solid transparent',
          borderRight: '9px solid rgba(8,8,20,.97)',
        }} />
      </div>
    </div>
  )
}
