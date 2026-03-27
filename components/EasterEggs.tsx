'use client'

import { useEffect, useRef, useState } from 'react'

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
`

// ─── MATRIX RAIN ────────────────────────────────────────────────────────────
function MatrixRain({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const cols = Math.floor(canvas.width / 16)
    const drops: number[] = Array(cols).fill(1)
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01アムネ10010セソ0ABCDEF☰☷☵'

    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      drops.forEach((y, i) => {
        ctx.fillStyle = i % 8 === 0 ? '#aaffaa' : '#00ff41'
        ctx.font = `${Math.random() > .9 ? 'bold ' : ''}14px monospace`
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 16, y * 16)
        if (y * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      })
    }

    const interval = setInterval(draw, 50)
    const timeout = setTimeout(() => { clearInterval(interval); onDone() }, 5000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [onDone])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        color: '#00ff41', fontFamily: 'monospace', textAlign: 'center', lineHeight: 2,
        textShadow: '0 0 20px #00ff41',
        animation: 'ee-matrix-text 5s ease forwards',
      }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>Wake up, Neo...</div>
        <div style={{ fontSize: '1rem', opacity: .8 }}>The Matrix has you.</div>
        <div style={{ fontSize: '.8rem', opacity: .6 }}>Follow the white rabbit.</div>
      </div>
    </div>
  )
}

// ─── JOKER ──────────────────────────────────────────────────────────────────
function JokerWalk({ onDone }: { onDone: () => void }) {
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
        Why so serious? 🃏
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
function TarsNotif({ onDone }: { onDone: () => void }) {
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
        Niveau d'humour réglé à <span style={{ color: 'var(--gold)', fontWeight: 700 }}>75%</span>.
      </div>
      <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginTop: '.4rem', fontStyle: 'italic' }}>
        "C'est honnête."
      </div>
    </div>
  )
}

// ─── MARVIN ──────────────────────────────────────────────────────────────────
function MarvinOverlay({ onDone }: { onDone: () => void }) {
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
          Encore un humain qui cherche la réponse à la question fondamentale sur la vie...
        </div>
        <div style={{ color: 'var(--text3)', fontSize: '.78rem', marginTop: '.4rem', fontStyle: 'italic' }}>
          C'est 42. C'est pathétique.
        </div>
        <div style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '8px solid rgba(12,12,20,.97)' }} />
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

export default function EasterEggs() {
  const [showMatrix, setShowMatrix] = useState(false)
  const [showJoker, setShowJoker] = useState(false)
  const [showTars, setShowTars] = useState(false)
  const [showMarvin, setShowMarvin] = useState(false)
  const keyBuf = useRef<string[]>([])
  const tarsShown = useRef(false)

  // Keyboard easter eggs
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const buf = [...keyBuf.current.slice(-19), e.key]
      keyBuf.current = buf

      // Konami → Joker
      if (buf.slice(-10).join('|') === KONAMI.join('|')) {
        setShowJoker(true)
        keyBuf.current = []
        return
      }
      // "red pill" → Matrix
      if (buf.slice(-8).join('').toLowerCase() === 'red pill') {
        setShowMatrix(true)
        keyBuf.current = []
        return
      }
      // "42" (not preceded by another digit) → Marvin
      const last3 = buf.slice(-3).join('')
      if (last3.slice(-2) === '42' && !/\d/.test(last3[0] ?? '')) {
        setShowMarvin(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 14:07 → TARS
  useEffect(() => {
    const check = () => {
      const now = new Date()
      if (now.getHours() === 14 && now.getMinutes() === 7 && !tarsShown.current) {
        tarsShown.current = true
        setShowTars(true)
      }
      if (now.getHours() === 0 && now.getMinutes() === 0) tarsShown.current = false
    }
    check()
    const id = setInterval(check, 30_000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <style>{EE_STYLES}</style>
      {showMatrix && <MatrixRain onDone={() => setShowMatrix(false)} />}
      {showJoker  && <JokerWalk  onDone={() => setShowJoker(false)}  />}
      {showTars   && <TarsNotif  onDone={() => setShowTars(false)}   />}
      {showMarvin && <MarvinOverlay onDone={() => setShowMarvin(false)} />}
    </>
  )
}
