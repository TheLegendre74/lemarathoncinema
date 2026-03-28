'use client'

import { useEffect, useRef, useState } from 'react'
import { discoverEgg } from '@/lib/actions'
import FightClubGame from './FightClubGame'
import { KennyDeath, SouthParkBus, RandyMarsh } from './SouthParkEggs'
import KillBillGame from './KillBillGame'
import AVPEgg from './AVPEgg'
import AlienEgg from './AlienEgg'
import JawsEgg from './JawsEgg'

// ─── ANIMATIONS (partagées avec Forum et FilmsClient) ───────────────────────
const EE_STYLES = `
  @keyframes ee-fadein { from { opacity:0; transform:scale(.85); } to { opacity:1; transform:scale(1); } }
  @keyframes ee-blink  { 0%,100% { opacity:1; } 50% { opacity:0; } }
  @keyframes ee-hal-pulse { 0%,100% { box-shadow:0 0 60px rgba(255,50,0,.8),0 0 120px rgba(200,0,0,.4); } 50% { box-shadow:0 0 90px rgba(255,80,0,1),0 0 180px rgba(200,0,0,.7); } }
  @keyframes ee-joker-walk { from { left:100vw; } to { left:-200px; } }
  @keyframes ee-leg-l { from { transform:rotate(-22deg); } to { transform:rotate(22deg); } }
  @keyframes ee-leg-r { from { transform:rotate(22deg); } to { transform:rotate(-22deg); } }
  @keyframes ee-marvin-in { from { opacity:0; transform:translateX(-50%) translateY(40px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
  @keyframes ee-marvin-out { from { opacity:1; transform:translateX(-50%) translateY(0); } to { opacity:0; transform:translateX(-50%) translateY(20px); } }
  @keyframes ee-tars-in { from { opacity:0; transform:translateX(100px); } to { opacity:1; transform:translateX(0); } }
  @keyframes ee-tars-out { from { opacity:1; } to { opacity:0; transform:translateX(100px); } }
  @keyframes ee-shake { 0%,100% { transform:translateX(0); } 15%,45%,75% { transform:translateX(-10px); } 30%,60%,90% { transform:translateX(10px); } }
  @keyframes ee-hand-rise { from { opacity:0; transform:translateY(100px); } to { opacity:1; transform:translateY(0); } }
  @keyframes ee-shark-rise { from { transform:translateX(-50%) translateY(250px); } to { transform:translateX(-50%) translateY(0); } }
  @keyframes ee-shark-sink { from { transform:translateX(-50%) translateY(0); opacity:1; } to { transform:translateX(-50%) translateY(250px); opacity:0; } }
  @keyframes ee-dream-msg { from { opacity:0; transform:rotate(-45deg) scale(.7); } to { opacity:1; transform:rotate(-45deg) scale(1); } }
  @keyframes ee-rule-in { 0% { opacity:0; transform:scale(1.3); } 100% { opacity:1; transform:scale(1); } }
  @keyframes ee-matrix-text { 0% { opacity:0; } 15% { opacity:1; } 80% { opacity:1; } 100% { opacity:0; } }
  @keyframes ee-hal-eye { 0%,100% { transform:scale(1); } 50% { transform:scale(1.08); } }
  @keyframes ee-hal-in { from { opacity:0; } to { opacity:1; } }
  @keyframes ee-hal-out { from { opacity:1; } to { opacity:0; } }
  @keyframes ee-nolan-spin { from { transform:translateX(-50%) rotate(0deg); } to { transform:translateX(-50%) rotate(360deg); } }
  @keyframes ee-bond-iris-in { from { clip-path:circle(50% at 50% 50%); } to { clip-path:circle(0% at 30% 50%); } }
  @keyframes ee-bond-in { from { opacity:0; } to { opacity:1; } }
  @keyframes ee-bond-out { from { opacity:1; } to { opacity:0; } }
  @keyframes ee-noctambule-in { from { opacity:0; transform:translateX(100px); } to { opacity:1; transform:translateX(0); } }
  @keyframes ee-noctambule-out { from { opacity:1; } to { opacity:0; transform:translateX(100px); } }
`

// ─── MATRIX RAIN ────────────────────────────────────────────────────────────
function MatrixRain({ onDone, line1, line2, line3 }: { onDone: () => void; line1: string; line2: string; line3: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = window.innerWidth, H = window.innerHeight
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!

    const FS   = 13   // font size px
    const COLS = Math.floor(W / FS)
    const CHARS = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789:･=*+-<>'

    // Each column tracks its head position, speed, trail length and char pool
    const cols = Array.from({ length: COLS }, () => ({
      y:        -Math.floor(Math.random() * (H / FS)),   // start staggered above
      speed:    0.25 + Math.random() * 0.55,
      trail:    10  + Math.floor(Math.random() * 22),
      glyphs:   Array.from({ length: 50 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
      muteT:    0,
    }))

    let lastT  = performance.now()
    let elapsed = 0
    let msgAlpha = 0
    let raf: number

    function render(now: number) {
      const dt = Math.min(now - lastT, 50); lastT = now; elapsed += dt

      // Full clear each frame — trails managed per-column
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
      ctx.font = `${FS}px monospace`

      for (let i = 0; i < COLS; i++) {
        const col = cols[i]
        const headY = Math.floor(col.y)

        for (let j = 0; j < col.trail; j++) {
          const cy = headY - j
          if (cy < 0 || cy >= H / FS) continue
          const ch = col.glyphs[(headY - j + 500) % col.glyphs.length]
          const x  = i * FS
          const y  = cy * FS + FS

          if (j === 0) {
            // Head: bright white with green halo
            ctx.shadowColor = '#aaffaa'; ctx.shadowBlur = 6
            ctx.fillStyle = '#e8ffe8'
          } else {
            // Trail: fades from bright → dark green
            const fade = 1 - j / col.trail
            const g = Math.floor(40 + fade * 195)
            ctx.shadowBlur = 0
            ctx.fillStyle = `rgb(0,${g},0)`
          }
          ctx.fillText(ch, x, y)
        }
        ctx.shadowBlur = 0

        // Occasionally mutate a glyph
        col.muteT += dt
        if (col.muteT > 70 + Math.random() * 80) {
          col.muteT = 0
          col.glyphs[Math.floor(Math.random() * col.glyphs.length)] =
            CHARS[Math.floor(Math.random() * CHARS.length)]
        }

        // Advance head
        col.y += col.speed * (dt / 16)

        // Reset when fully off-screen
        if ((col.y - col.trail) * FS > H) {
          col.y     = -Math.floor(Math.random() * 12)
          col.speed = 0.25 + Math.random() * 0.55
          col.trail = 10  + Math.floor(Math.random() * 22)
        }
      }

      // Message fades in after 1.2s, out after 5.5s
      if (elapsed > 1200) msgAlpha = Math.min(1, (elapsed - 1200) / 700)
      if (elapsed > 5500) msgAlpha = Math.max(0, 1 - (elapsed - 5500) / 800)

      if (msgAlpha > 0) {
        ctx.save(); ctx.globalAlpha = msgAlpha; ctx.textAlign = 'center'
        ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 22
        ctx.fillStyle = '#00ff41'; ctx.font = `bold 20px monospace`
        ctx.fillText(line1, W / 2, H / 2 - 26)
        ctx.shadowBlur = 10; ctx.font = `13px monospace`; ctx.fillStyle = '#00cc33'
        ctx.fillText(line2, W / 2, H / 2 + 6)
        ctx.font = `11px monospace`; ctx.fillStyle = '#009922'; ctx.shadowBlur = 6
        ctx.fillText(line3, W / 2, H / 2 + 28)
        ctx.restore()
      }

      if (elapsed < 7000) {
        raf = requestAnimationFrame(render)
      } else {
        onDone()
      }
    }

    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [onDone, line1, line2, line3])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', display: 'block' }}
    />
  )
}

// ─── JOKER ──────────────────────────────────────────────────────────────────
function JokerWalk({ onDone, phrase }: { onDone: () => void; phrase: string }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5500)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* "Why so serious?" */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translateX(-50%)',
        color: '#cc0000', fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem,5vw,3rem)',
        fontWeight: 700, textShadow: '0 0 40px rgba(200,0,0,.7)',
        whiteSpace: 'nowrap', animation: 'ee-fadein .6s ease',
      }}>
        {phrase}
      </div>

      {/* Joker pixel-art character */}
      <div style={{ position: 'absolute', bottom: '12%', animation: 'ee-joker-walk 5s linear forwards', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        {/* Green hair */}
        <div style={{ width: 38, height: 14, background: '#2d8f3c', borderRadius: '50% 50% 0 0', border: '2px solid #1a5c25' }} />
        {/* Head */}
        <div style={{ width: 40, height: 38, borderRadius: '50%', background: '#f0e0c8', border: '2px solid #cca880', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <div style={{ display: 'flex', gap: 9 }}>
            <div style={{ width: 6, height: 7, background: '#222', borderRadius: '50%' }} />
            <div style={{ width: 6, height: 7, background: '#222', borderRadius: '50%' }} />
          </div>
          <div style={{ width: 22, height: 9, border: '2px solid #cc0000', borderTop: 'none', borderRadius: '0 0 11px 11px', background: 'rgba(200,0,0,.2)' }} />
        </div>
        {/* Body - purple suit */}
        <div style={{ width: 38, height: 52, background: '#4a0d78', border: '2px solid #300855', borderRadius: '3px 3px 2px 2px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', width: 14, height: 30, background: '#f0e6d3', borderRadius: '0 0 3px 3px' }} />
          <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', width: 5, height: 28, background: '#1a6b1a', borderRadius: 2 }} />
        </div>
        {/* Legs walking */}
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ width: 15, height: 28, background: '#3d0a62', borderRadius: '0 0 4px 4px', transformOrigin: 'top center', animation: 'ee-leg-l .38s ease-in-out infinite alternate' }} />
          <div style={{ width: 15, height: 28, background: '#3d0a62', borderRadius: '0 0 4px 4px', transformOrigin: 'top center', animation: 'ee-leg-r .38s ease-in-out infinite alternate' }} />
        </div>
      </div>
    </div>
  )
}

// ─── TARS ────────────────────────────────────────────────────────────────────
function TarsNotif({ onDone, line1, line2 }: { onDone: () => void; line1: string; line2: string }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 5200)
    const t2 = setTimeout(onDone, 6000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9997,
      background: 'rgba(12,12,20,.97)', border: '1px solid rgba(255,255,255,.12)',
      borderRadius: 'var(--rl)', padding: '1rem 1.4rem', maxWidth: 300,
      backdropFilter: 'blur(12px)',
      animation: leaving ? 'ee-tars-out .7s ease forwards' : 'ee-tars-in .4s ease',
    }}>
      <div style={{ fontSize: '.65rem', color: 'var(--text3)', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '.5rem' }}>
        ▣ TARS · Système actif
      </div>
      <div style={{ color: 'var(--text)', fontSize: '.9rem', fontFamily: 'monospace', lineHeight: 1.5 }}>
        {line1}
      </div>
      <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginTop: '.4rem', fontStyle: 'italic' }}>
        "{line2}"
      </div>
    </div>
  )
}

// ─── MARVIN ──────────────────────────────────────────────────────────────────
function MarvinOverlay({ onDone, line1, line2 }: { onDone: () => void; line1: string; line2: string }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 3300)
    const t2 = setTimeout(onDone, 4000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', left: '50%',
      zIndex: 9997, display: 'flex', alignItems: 'flex-end', gap: '1rem',
      animation: leaving ? 'ee-marvin-out .6s ease forwards' : 'ee-marvin-in .4s ease',
    }}>
      {/* Marvin robot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 50, height: 38, background: '#787878', borderRadius: '50% 50% 40% 40%', border: '2px solid #505050', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <div style={{ width: 38, height: 13, background: '#111827', borderRadius: 5, border: '1px solid #2a3548', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 22, height: 5, background: 'rgba(100,180,255,.15)', borderRadius: 2 }} />
          </div>
          <div style={{ width: 20, height: 5, border: '2px solid #505050', borderBottom: 'none', borderRadius: '8px 8px 0 0' }} />
        </div>
        <div style={{ width: 16, height: 8, background: '#888', border: '1px solid #555' }} />
        <div style={{ width: 46, height: 42, background: '#686868', border: '2px solid #444', borderRadius: '3px 3px 8px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 26, height: 20, background: '#505050', borderRadius: 3, border: '1px solid #333' }} />
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: -38, width: 62, justifyContent: 'space-between' }}>
          <div style={{ width: 8, height: 28, background: '#707070', border: '1px solid #444', borderRadius: '0 0 4px 4px', transform: 'rotate(18deg)', transformOrigin: 'top' }} />
          <div style={{ width: 8, height: 28, background: '#707070', border: '1px solid #444', borderRadius: '0 0 4px 4px', transform: 'rotate(-18deg)', transformOrigin: 'top' }} />
        </div>
      </div>

      {/* Speech bubble */}
      <div style={{
        background: 'rgba(12,12,20,.97)', border: '1px solid rgba(255,255,255,.12)',
        borderRadius: 'var(--rl)', padding: '.9rem 1.2rem', maxWidth: 270,
        backdropFilter: 'blur(12px)', marginBottom: '1.2rem', position: 'relative',
      }}>
        <div style={{ fontSize: '.65rem', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '.3rem' }}>Marvin</div>
        <div style={{ color: 'var(--text)', fontSize: '.85rem', lineHeight: 1.5 }}>
          {line1}
        </div>
        <div style={{ color: 'var(--text3)', fontSize: '.78rem', marginTop: '.4rem', fontStyle: 'italic' }}>
          {line2}
        </div>
        <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '8px solid rgba(12,12,20,.97)' }} />
      </div>
    </div>
  )
}

// ─── HAL 9000 ────────────────────────────────────────────────────────────────
function HalOverlay({ onDone, line1, line2 }: { onDone: () => void; line1: string; line2: string }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 5500)
    const t2 = setTimeout(onDone, 6200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      onClick={() => { setLeaving(true); setTimeout(onDone, 700) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(6,0,0,.92)', backdropFilter: 'blur(6px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: leaving ? 'ee-hal-out .7s ease forwards' : 'ee-hal-in .5s ease',
        cursor: 'pointer',
      }}
    >
      {/* HAL eye */}
      <div style={{
        width: 140, height: 140, borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 35%, #ff9060 0%, #cc2200 40%, #880000 70%, #1a0000 100%)',
        animation: 'ee-hal-pulse 2s ease-in-out infinite, ee-hal-eye 3s ease-in-out infinite',
        marginBottom: '2rem',
      }} />
      <div style={{
        fontFamily: 'monospace', color: '#ff4422', fontSize: 'clamp(.9rem,2.5vw,1.3rem)',
        textAlign: 'center', lineHeight: 2, maxWidth: 480, padding: '0 2rem',
        textShadow: '0 0 20px rgba(255,60,20,.6)',
      }}>
        <div>{line1}</div>
        <div style={{ fontSize: '.85em', opacity: .75 }}>{line2}</div>
      </div>
      <div style={{ marginTop: '2rem', fontSize: '.65rem', color: 'rgba(255,60,20,.4)', letterSpacing: '3px', textTransform: 'uppercase' }}>
        HAL 9000 · Discovery One
      </div>
    </div>
  )
}

// ─── NOLAN ───────────────────────────────────────────────────────────────────
function NolanOverlay({ onDone, quote }: { onDone: () => void; quote: string }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 5500)
    const t2 = setTimeout(onDone, 6200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      onClick={() => { setLeaving(true); setTimeout(onDone, 700) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(4,4,10,.95)', backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        animation: leaving ? 'ee-hal-out .7s ease forwards' : 'ee-hal-in .5s ease',
        cursor: 'pointer',
      }}
    >
      {/* Spinning top (toupie d'Inception) */}
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,.15)',
        borderTop: '3px solid rgba(255,255,255,.8)',
        animation: 'ee-nolan-spin 1.2s linear infinite',
        position: 'absolute', left: '50%', top: '30%',
        marginLeft: -30,
      }} />
      <div style={{
        fontFamily: 'var(--font-display)', color: '#fff',
        fontSize: 'clamp(1.1rem,3vw,1.8rem)',
        textAlign: 'center', lineHeight: 1.8, maxWidth: 520, padding: '0 2rem',
        textShadow: '0 2px 40px rgba(255,255,255,.2)',
      }}>
        <div style={{ fontSize: '.6em', letterSpacing: '6px', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: '1.5rem' }}>
          Christopher Nolan
        </div>
        {quote}
      </div>
      <div style={{ marginTop: '2.5rem', fontSize: '.65rem', color: 'rgba(255,255,255,.2)', letterSpacing: '3px', textTransform: 'uppercase' }}>
        Cliquer pour fermer
      </div>
    </div>
  )
}

// ─── BOND ────────────────────────────────────────────────────────────────────
function BondOverlay({ onDone, bondLine }: { onDone: () => void; bondLine: string }) {
  const [phase, setPhase] = useState<'barrel'|'quote'|'leaving'>('barrel')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('quote'), 1800)
    const t2 = setTimeout(() => setPhase('leaving'), 5500)
    const t3 = setTimeout(onDone, 6200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <div
      onClick={() => { setPhase('leaving'); setTimeout(onDone, 700) }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: phase === 'barrel' ? '#000' : 'rgba(4,4,12,.97)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        animation: phase === 'leaving' ? 'ee-bond-out .7s ease forwards' : 'ee-bond-in .3s ease',
      }}
    >
      {phase === 'barrel' && (
        /* Gun barrel circle */
        <div style={{
          width: 180, height: 180, borderRadius: '50%',
          border: '8px solid rgba(255,255,255,.08)',
          boxShadow: '0 0 0 200vmax rgba(0,0,0,1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111', border: '3px solid rgba(255,255,255,.15)' }} />
        </div>
      )}
      {phase === 'quote' && (
        <div style={{ textAlign: 'center', padding: '0 2rem' }}>
          <div style={{ fontSize: 'clamp(1.2rem,3vw,2rem)', fontFamily: 'var(--font-display)', color: '#fff', letterSpacing: '2px', marginBottom: '.5rem' }}>
            Bond.
          </div>
          <div style={{ fontSize: 'clamp(1.5rem,4vw,2.8rem)', fontFamily: 'var(--font-display)', color: '#d4af37', letterSpacing: '1px' }}>
            {bondLine}
          </div>
          <div style={{ marginTop: '2rem', fontSize: '.75rem', color: 'rgba(255,255,255,.3)', letterSpacing: '4px', textTransform: 'uppercase' }}>
            007 · Shaken, not stirred
          </div>
        </div>
      )}
    </div>
  )
}

// ─── NOCTAMBULE ──────────────────────────────────────────────────────────────
function NoctambuleNotif({ onDone, line1, line2 }: { onDone: () => void; line1: string; line2: string }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 6000)
    const t2 = setTimeout(onDone, 6800)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9997,
      background: 'rgba(8,8,20,.97)', border: '1px solid rgba(150,100,255,.25)',
      borderRadius: 'var(--rl)', padding: '1rem 1.4rem', maxWidth: 300,
      backdropFilter: 'blur(12px)',
      animation: leaving ? 'ee-noctambule-out .7s ease forwards' : 'ee-noctambule-in .4s ease',
    }}>
      <div style={{ fontSize: '.65rem', color: 'rgba(150,100,255,.7)', letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '.5rem' }}>
        🌙 Mode Noctambule
      </div>
      <div style={{ color: 'var(--text)', fontSize: '.9rem', lineHeight: 1.5 }}>
        {line1}
      </div>
      <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginTop: '.4rem', fontStyle: 'italic' }}>
        {line2}
      </div>
    </div>
  )
}

// ─── FIGHT CLUB RULES OVERLAY ───────────────────────────────────────────────
function FightClubRule({ rule, onDone }: { rule: 1|2|3; onDone: ()=>void }) {
  const RULES = [
    '',
    "La première règle du Fight Club est : il est interdit de parler du Fight Club.",
    "La deuxième règle du Fight Club est : il est interdit de parler du Fight Club.",
    "Troisième règle du Fight Club : quelqu'un crie stop, quelqu'un s'écroule ou n'en peut plus, le combat est terminé.",
  ]
  useEffect(()=>{
    const t=setTimeout(onDone,4500)
    const onKey=(e:KeyboardEvent)=>{ if(e.key==='Escape') onDone() }
    window.addEventListener('keydown',onKey)
    return ()=>{ clearTimeout(t); window.removeEventListener('keydown',onKey) }
  },[onDone])
  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.94)',
      display:'flex',alignItems:'center',justifyContent:'center',animation:'ee-fadein 0.4s ease'}}>
      <div style={{maxWidth:640,padding:'3rem',color:'#fff',fontFamily:'serif',textAlign:'center',lineHeight:1.8}}>
        <div style={{fontSize:'2.5rem',marginBottom:'1.5rem',opacity:.25}}>✊</div>
        <div style={{fontSize:'1.35rem',fontStyle:'italic',color:'#e8e8e8'}}>"{RULES[rule]}"</div>
        <div style={{marginTop:'2rem',fontSize:'.7rem',color:'rgba(255,255,255,.2)',letterSpacing:'3px'}}>— FIGHT CLUB</div>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

export interface EasterEggsConfig {
  matrixLine1?: string; matrixLine2?: string; matrixLine3?: string
  jokerPhrase?: string
  tarsLine1?: string; tarsLine2?: string
  marvinLine1?: string; marvinLine2?: string
  halLine1?: string; halLine2?: string
  nolanQuote?: string
  bondLine?: string
  noctamLine1?: string; noctamLine2?: string
  kennyText1?: string; kennyText2?: string
  randyQuote?: string
  fightClubGameOver?: string
  killBillEnd?: string
}

export default function EasterEggs({ config = {} }: { config?: EasterEggsConfig }) {
  const ee = {
    matrixLine1:     config.matrixLine1     ?? 'Wake up, Neo...',
    matrixLine2:     config.matrixLine2     ?? 'The Matrix has you.',
    matrixLine3:     config.matrixLine3     ?? 'Follow the white rabbit.',
    jokerPhrase:     config.jokerPhrase     ?? 'Why so serious? 🃏',
    tarsLine1:       config.tarsLine1       ?? "Niveau d'humour réglé à 75%.",
    tarsLine2:       config.tarsLine2       ?? "C'est honnête.",
    marvinLine1:     config.marvinLine1     ?? 'Encore un humain qui cherche la réponse à la question fondamentale sur la vie...',
    marvinLine2:     config.marvinLine2     ?? "C'est 42. C'est pathétique.",
    halLine1:        config.halLine1        ?? 'Je suis désolé, Dave.',
    halLine2:        config.halLine2        ?? "J'ai bien peur de ne pas pouvoir faire ça.",
    nolanQuote:      config.nolanQuote      ?? 'Le cinéma est la plus puissante façon de partager un rêve.',
    bondLine:        config.bondLine        ?? 'James Bond.',
    noctamLine1:     config.noctamLine1     ?? 'Tu regardes des films à cette heure-ci ?',
    noctamLine2:     config.noctamLine2     ?? 'Les vrais cinéphiles ne dorment pas.',
    kennyText1:      config.kennyText1      ?? 'Oh mon Dieu ! Ils ont tué Kenny !',
    kennyText2:      config.kennyText2      ?? "Espèce d'enfoirés !",
    randyQuote:      config.randyQuote      ?? "C'est pas de l'alcoolisme, c'est du vinomoussage... c'est une activité élégamment culturelle.",
    fightClubGameOver: config.fightClubGameOver ?? 'Tyler est toujours plus fort que toi...',
    killBillEnd:     config.killBillEnd     ?? "Pai mei t'a bien entraîné.",
  }
  const [showMatrix,     setShowMatrix]     = useState(false)
  const [showJoker,      setShowJoker]      = useState(false)
  const [showTars,       setShowTars]       = useState(false)
  const [showMarvin,     setShowMarvin]     = useState(false)
  const [showHal,        setShowHal]        = useState(false)
  const [showNolan,      setShowNolan]      = useState(false)
  const [showBond,       setShowBond]       = useState(false)
  const [showNoctambule, setShowNoctambule] = useState(false)
  const [showFightClub,  setShowFightClub]  = useState(false)
  const [fightClubRule,  setFightClubRule]  = useState<1|2|3|null>(null)
  const fightClubCount = useRef(0)
  const [showKenny,      setShowKenny]      = useState(false)
  const [showSouthPark,  setShowSouthPark]  = useState(false)
  const [showRandy,      setShowRandy]      = useState(false)
  const [showKillBill,   setShowKillBill]   = useState(false)
  const [showAVP,        setShowAVP]        = useState(false)
  const [showAlien,      setShowAlien]      = useState(false)
  const [showJaws,       setShowJaws]       = useState(false)
  const keyBuf = useRef<string[]>([])
  const tarsShown = useRef(false)
  const noctambuleShown = useRef(false)

  // Keyboard easter eggs
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const buf = [...keyBuf.current.slice(-19), e.key]
      keyBuf.current = buf

      // Konami → Joker
      if (buf.slice(-10).join('|') === KONAMI.join('|')) {
        setShowJoker(true)
        discoverEgg('joker')
        keyBuf.current = []
        return
      }
      // "red pill" → Matrix
      if (buf.slice(-8).join('').toLowerCase() === 'red pill') {
        setShowMatrix(true)
        discoverEgg('matrix')
        keyBuf.current = []
        return
      }
      // "42" → Marvin (standalone: not sandwiched between digits)
      if (buf.slice(-2).join('') === '42' && !/\d/.test(buf.at(-3) ?? '')) {
        setShowMarvin(true)
        discoverEgg('marvin')
        return
      }
      // "hal" → HAL 9000
      if (buf.slice(-3).join('').toLowerCase() === 'hal') {
        setShowHal(true)
        discoverEgg('hal')
        keyBuf.current = []
        return
      }
      // "nolan" → Nolan quote
      if (buf.slice(-5).join('').toLowerCase() === 'nolan') {
        setShowNolan(true)
        discoverEgg('nolan')
        keyBuf.current = []
        return
      }
      // "bond" → Bond intro
      if (buf.slice(-4).join('').toLowerCase() === 'bond') {
        setShowBond(true)
        discoverEgg('bond')
        keyBuf.current = []
        return
      }
      // "fight club" → règles 1-3 puis jeu à la 4e
      if (buf.slice(-10).join('').toLowerCase() === 'fight club') {
        fightClubCount.current = fightClubCount.current + 1
        keyBuf.current = []
        if (fightClubCount.current <= 3) {
          setFightClubRule(fightClubCount.current as 1|2|3)
          if (fightClubCount.current === 1) discoverEgg('fightclub')
        } else {
          fightClubCount.current = 0
          setShowFightClub(true)
        }
        return
      }
      // "kill kenny" → Kenny death scene (10 chars avec espace)
      if (buf.slice(-10).join('').toLowerCase() === 'kill kenny') {
        setShowKenny(true)
        keyBuf.current = []
        return
      }
      // "south park" → Bus stop scene (10 chars avec espace)
      if (buf.slice(-10).join('').toLowerCase() === 'south park') {
        setShowSouthPark(true)
        keyBuf.current = []
        return
      }
      // "randy" → Randy Marsh
      if (buf.slice(-5).join('').toLowerCase() === 'randy') {
        setShowRandy(true)
        keyBuf.current = []
        return
      }
      // "kill bill" → Kill Bill katana game (9 chars avec espace)
      if (buf.slice(-9).join('').toLowerCase() === 'kill bill') {
        setShowKillBill(true)
        keyBuf.current = []
        return
      }
      // "predator" → Alien vs Predator (alien 4 pattes, predator tire)
      if (buf.slice(-8).join('').toLowerCase() === 'predator') {
        setShowAVP(true)
        keyBuf.current = []
        return
      }
      // "alien" → Nostromo (alien tue l'équipage, facehugger sur Ripley)
      if (buf.slice(-5).join('').toLowerCase() === 'alien') {
        setShowAlien(true)
        keyBuf.current = []
        return
      }
      // "jaws" → Les Dents de la Mer
      if (buf.slice(-4).join('').toLowerCase() === 'jaws') {
        setShowJaws(true)
        discoverEgg('jaws')
        keyBuf.current = []
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 14:07 → TARS | midnight → Noctambule
  useEffect(() => {
    const check = () => {
      const now = new Date()
      const h = now.getHours(), m = now.getMinutes()

      if (h === 14 && m === 7 && !tarsShown.current) {
        tarsShown.current = true
        setShowTars(true)
        discoverEgg('tars')
      }
      if (h === 0 && m === 0) tarsShown.current = false

      if (h === 0 && m < 30 && !noctambuleShown.current) {
        noctambuleShown.current = true
        setShowNoctambule(true)
        discoverEgg('noctambule')
      }
      if (h === 1) noctambuleShown.current = false
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <style>{EE_STYLES}</style>
      {showMatrix     && <MatrixRain    onDone={() => setShowMatrix(false)}     line1={ee.matrixLine1} line2={ee.matrixLine2} line3={ee.matrixLine3} />}
      {showJoker      && <JokerWalk     onDone={() => setShowJoker(false)}      phrase={ee.jokerPhrase} />}
      {showTars       && <TarsNotif     onDone={() => setShowTars(false)}       line1={ee.tarsLine1} line2={ee.tarsLine2} />}
      {showMarvin     && <MarvinOverlay onDone={() => setShowMarvin(false)}     line1={ee.marvinLine1} line2={ee.marvinLine2} />}
      {showHal        && <HalOverlay    onDone={() => setShowHal(false)}        line1={ee.halLine1}    line2={ee.halLine2} />}
      {showNolan      && <NolanOverlay  onDone={() => setShowNolan(false)}      quote={ee.nolanQuote} />}
      {showBond       && <BondOverlay   onDone={() => setShowBond(false)}       bondLine={ee.bondLine} />}
      {showNoctambule && <NoctambuleNotif onDone={() => setShowNoctambule(false)} line1={ee.noctamLine1} line2={ee.noctamLine2} />}
      {fightClubRule  && <FightClubRule   rule={fightClubRule} onDone={() => setFightClubRule(null)} />}
      {showFightClub  && <FightClubGame   onDone={() => setShowFightClub(false)} gameOverText={ee.fightClubGameOver} />}
      {showKenny      && <KennyDeath      onDone={() => setShowKenny(false)}     text1={ee.kennyText1} text2={ee.kennyText2} />}
      {showSouthPark  && <SouthParkBus    onDone={() => setShowSouthPark(false)} />}
      {showRandy      && <RandyMarsh      onDone={() => setShowRandy(false)}     quote={ee.randyQuote} />}
      {showKillBill   && <KillBillGame    onDone={() => setShowKillBill(false)}  endText={ee.killBillEnd} />}
      {showAVP        && <AVPEgg          onDone={() => setShowAVP(false)} />}
      {showAlien      && <AlienEgg       onDone={() => setShowAlien(false)} />}
      {showJaws       && <JawsEgg        onDone={() => setShowJaws(false)} />}
    </>
  )
}
