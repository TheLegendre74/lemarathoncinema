'use client'

import { useEffect, useRef, useState } from 'react'
import { discoverEgg } from '@/lib/actions'
import dynamic from 'next/dynamic'
const FightClubGame  = dynamic(() => import('./FightClubGame'),                                   { ssr: false })
const KillBillGame   = dynamic(() => import('./KillBillGame'),                                    { ssr: false })
const AVPEgg         = dynamic(() => import('./AVPEgg'),                                          { ssr: false })
const ClippyEgg      = dynamic(() => import('./ClippyEgg'),                                       { ssr: false })
const PandoraBox     = dynamic(() => import('./PandoraBox'),                                      { ssr: false })
const SouthParkEggs  = dynamic(() => import('./SouthParkEggs').then(m => ({ default: m.KennyDeath   })), { ssr: false })
const SouthParkBus_  = dynamic(() => import('./SouthParkEggs').then(m => ({ default: m.SouthParkBus })), { ssr: false })
const RandyMarsh_    = dynamic(() => import('./SouthParkEggs').then(m => ({ default: m.RandyMarsh   })), { ssr: false })
const JokerCardEgg_  = dynamic(() => import('./JokerCardEgg').then(m => ({ default: m.JokerCardEgg  })), { ssr: false })
const ConwayOverlay  = dynamic(() => import('./conway/overlay'),                                         { ssr: false })

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
  .ee-mobile-btn { display:none; }
  @media (max-width: 768px) {
    .ee-mobile-btn {
      display: flex; align-items: center; justify-content: center;
      position: fixed; bottom: calc(25vh + 8px); right: 72px;
      width: 42px; height: 42px; border-radius: 50%;
      background: var(--bg2); border: 1px solid var(--border2);
      font-size: 1.1rem; cursor: pointer; z-index: 900;
      box-shadow: 0 2px 12px rgba(0,0,0,.4);
      color: var(--text2);
    }
  }
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
// JokerWalk supprimé — remplacé par JokerCardEgg (konami code)

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

// ─── BOND GUN BARREL ────────────────────────────────────────────────────────
function BondOverlay({ onDone, bondLine }: { onDone: () => void; bondLine: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = window.innerWidth, H = window.innerHeight
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!

    const cy   = H / 2
    const BASE_R = Math.min(W, H) * 0.27
    // Barrel centre x follows Bond during walk, then snaps to W/2
    let barrelX  = W * 0.18
    let irisR    = BASE_R
    let elapsed  = 0, lastT = performance.now(), raf: number, done = false

    // Bond absolute x position on screen
    let bondAbsX = W * 0.18
    let walkPh   = 0
    let fired    = false
    let flashAlp = 0
    // blood 0→1
    let blood    = 0

    // Timeline ms
    const T = {
      walkEnd:   2400,
      aimReady:  3200,
      fireAt:    3600,
      bloodStart:3700,
      fadeStart: 7000,
      end:       8400,
    }

    // ── Gun barrel ────────────────────────────────────────────────────────
    function drawBarrel(bx: number, r: number) {
      // Black screen
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H)
      if (r < 2) return

      ctx.save()
      // Clip to circle
      ctx.beginPath(); ctx.arc(bx, cy, r, 0, Math.PI * 2); ctx.clip()

      // Interior: warm off-white
      ctx.fillStyle = '#e2e0d8'; ctx.fillRect(bx - r, cy - r, r * 2, r * 2)

      // Spiral rifling (8 grooves, slightly rotated)
      for (let i = 0; i < 8; i++) {
        const a0 = (i / 8) * Math.PI * 2
        const a1 = a0 + 0.22   // spiral offset
        ctx.strokeStyle = 'rgba(105,100,90,0.38)'
        ctx.lineWidth   = r * 0.028
        ctx.beginPath()
        ctx.moveTo(bx + Math.cos(a0) * r * 0.04, cy + Math.sin(a0) * r * 0.04)
        ctx.lineTo(bx + Math.cos(a1) * r,         cy + Math.sin(a1) * r)
        ctx.stroke()
      }

      // Radial depth shadow (darker toward edge)
      const vignette = ctx.createRadialGradient(bx, cy, r * 0.3, bx, cy, r)
      vignette.addColorStop(0,   'rgba(0,0,0,0)')
      vignette.addColorStop(0.65,'rgba(0,0,0,0.04)')
      vignette.addColorStop(1,   'rgba(0,0,0,0.60)')
      ctx.fillStyle = vignette; ctx.fillRect(bx - r, cy - r, r * 2, r * 2)

      // Central hole (black dot)
      ctx.beginPath(); ctx.arc(bx, cy, r * 0.07, 0, Math.PI * 2)
      ctx.fillStyle = '#000'; ctx.fill()

      ctx.restore()

      // Thick dark barrel rim
      ctx.beginPath(); ctx.arc(bx, cy, r, 0, Math.PI * 2)
      ctx.strokeStyle = '#040404'; ctx.lineWidth = r * 0.13; ctx.stroke()
      ctx.beginPath(); ctx.arc(bx, cy, r * 0.94, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(30,28,24,0.7)'; ctx.lineWidth = r * 0.04; ctx.stroke()
    }

    // ── Bond silhouette ───────────────────────────────────────────────────
    // Drawn at (bx, cy) — centred in barrel
    function drawBondWalking(bx: number, ph: number) {
      const S = BASE_R / 150
      ctx.save(); ctx.translate(bx, cy); ctx.scale(S, S)
      ctx.fillStyle = '#0d0d0d'; ctx.strokeStyle = '#0d0d0d'; ctx.lineCap = 'round'

      // Legs in strict opposite phase — left and right NEVER at same position
      const lSwing = Math.sin(ph)        * 18   // front/back swing left
      const rSwing = Math.sin(ph + Math.PI) * 18  // always opposite

      // Head
      ctx.beginPath(); ctx.arc(4, -72, 13, 0, Math.PI * 2); ctx.fill()

      // Jacket torso (trapezoid — wider shoulders)
      ctx.beginPath()
      ctx.moveTo(-15, -58); ctx.lineTo(20, -58)
      ctx.lineTo(15,  -18); ctx.lineTo(-10, -18)
      ctx.closePath(); ctx.fill()

      // Legs — hip pivot at (1,-18), each leg swings independently
      ctx.lineWidth = 10
      // Left leg (thigh + calf)
      const lKneeX = 1 + lSwing * 0.55, lKneeY = 16
      const lFootX = 1 + lSwing,         lFootY = 52
      ctx.beginPath(); ctx.moveTo(1,-18); ctx.lineTo(lKneeX, lKneeY); ctx.lineTo(lFootX, lFootY); ctx.stroke()
      // Right leg
      const rKneeX = 1 + rSwing * 0.55, rKneeY = 16
      const rFootX = 1 + rSwing,         rFootY = 52
      ctx.beginPath(); ctx.moveTo(1,-18); ctx.lineTo(rKneeX, rKneeY); ctx.lineTo(rFootX, rFootY); ctx.stroke()

      // Arms — opposite phase to legs (natural gait)
      const lArmX = -15 + Math.sin(ph + Math.PI) * 12
      const rArmX =  20 + Math.sin(ph) * 12
      ctx.lineWidth = 7
      ctx.beginPath(); ctx.moveTo(-15,-48); ctx.lineTo(lArmX,-20); ctx.stroke()
      ctx.beginPath(); ctx.moveTo( 20,-48); ctx.lineTo(rArmX,-20); ctx.stroke()

      // Gun in right hand (lowered while walking)
      ctx.fillRect(rArmX - 2, -24, 17, 6)
      ctx.fillRect(rArmX + 14, -23, 8, 4)

      ctx.restore()
    }

    function drawBondAiming(bx: number, aimP: number) {
      // aimP 0→1 : turns from profile to full-facing with gun out
      const S = BASE_R / 150
      ctx.save(); ctx.translate(bx, cy); ctx.scale(S, S)
      ctx.fillStyle = '#0d0d0d'; ctx.strokeStyle = '#0d0d0d'; ctx.lineCap = 'round'

      // Body width grows as he turns to face us
      const bodyW = 8 + aimP * 16    // half-width of shoulders
      const lean  = (1 - aimP) * 12  // offset (still turning)

      // Head
      ctx.beginPath(); ctx.arc(lean, -72, 13, 0, Math.PI * 2); ctx.fill()

      // Torso
      ctx.beginPath()
      ctx.moveTo(lean - bodyW * 1.4, -58); ctx.lineTo(lean + bodyW * 1.4, -58)
      ctx.lineTo(lean + bodyW,       -18); ctx.lineTo(lean - bodyW,       -18)
      ctx.closePath(); ctx.fill()

      // Legs slightly spread
      ctx.lineWidth = 11
      ctx.beginPath(); ctx.moveTo(lean - 9,-18); ctx.lineTo(lean - 18, 18); ctx.lineTo(lean - 18, 54); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(lean + 9,-18); ctx.lineTo(lean + 18, 18); ctx.lineTo(lean + 18, 54); ctx.stroke()

      // Both arms extending toward camera (classic two-hand Walther PPK grip)
      const reach = aimP * 50   // how far arms push toward viewer (foreshortened)
      ctx.lineWidth = 8
      // Left arm
      ctx.beginPath()
      ctx.moveTo(lean - bodyW * 1.2, -52)
      ctx.lineTo(lean - 6, -50 + reach * 0.1)
      ctx.stroke()
      // Right arm
      ctx.beginPath()
      ctx.moveTo(lean + bodyW * 1.2, -52)
      ctx.lineTo(lean + 6, -50 + reach * 0.1)
      ctx.stroke()

      // Gun (Walther PPK shape, foreshortened — we see the barrel face-on)
      if (aimP > 0.35) {
        const gAlp = Math.min(1, (aimP - 0.35) / 0.4)
        ctx.globalAlpha = gAlp
        // Slide body (side rect)
        ctx.fillRect(lean - 9, -58 + reach * 0.15, 18, 10)
        // Barrel end (circle — we look straight down it)
        ctx.beginPath(); ctx.arc(lean, -53 + reach * 0.15, 5, 0, Math.PI * 2)
        ctx.fillStyle = '#222'; ctx.fill()
        ctx.globalAlpha = 1
      }

      ctx.restore()
    }

    // ── Blood inside barrel ───────────────────────────────────────────────
    // Filets depuis le bord supérieur, flaque en bas, puis rouge opaque total
    function drawBlood(bx: number, r: number, amount: number) {
      if (amount <= 0 || r < 4) return
      ctx.save()
      ctx.beginPath(); ctx.arc(bx, cy, r * 0.87, 0, Math.PI * 2); ctx.clip()

      // Phase 1 (0→0.55) : filets qui tombent depuis la bordure du haut
      const STREAMS = 9
      for (let i = 0; i < STREAMS; i++) {
        const a      = (-Math.PI + 0.12) + (i / (STREAMS - 1)) * (Math.PI - 0.24)
        const sx     = bx + Math.cos(a) * r * 0.80
        const sy     = cy + Math.sin(a) * r * 0.80
        const speed  = 0.55 + (i % 4) * 0.18
        const dripLen = r * 1.75 * Math.min(1, amount / 0.55) * speed
        const ex     = sx + Math.cos(a) * 3
        const ey     = Math.min(sy + dripLen, cy + r * 0.82)
        const w      = 2 + (i % 4) * 1.8

        ctx.strokeStyle = `rgba(${138 + i * 3},0,0,0.90)`
        ctx.lineWidth = w; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke()

        if (ey < cy + r * 0.80) {
          ctx.beginPath(); ctx.arc(ex, ey, w * 0.8, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(148,0,0,0.88)'; ctx.fill()
        }
      }

      // Phase 2 (0.2→0.75) : flaque rouge qui monte depuis le bas
      if (amount > 0.2) {
        const poolP = Math.min(1, (amount - 0.2) / 0.55)
        const poolRx = r * 0.70 * poolP
        const poolRy = r * 0.22 * poolP
        const poolY  = cy + r * 0.72
        const pg = ctx.createRadialGradient(bx, poolY, 0, bx, poolY, poolRx)
        pg.addColorStop(0,   'rgba(160,0,0,0.96)')
        pg.addColorStop(0.5, 'rgba(110,0,0,0.88)')
        pg.addColorStop(1,   'rgba(60,0,0,0.5)')
        ctx.fillStyle = pg
        ctx.beginPath(); ctx.ellipse(bx, poolY, poolRx, poolRy, 0, 0, Math.PI * 2); ctx.fill()
      }

      // Phase 3 (0.55→1.0) : rouge opaque envahit tout le barrel
      if (amount > 0.55) {
        const fill = (amount - 0.55) / 0.45
        ctx.fillStyle = `rgba(90,0,0,${fill * 0.92})`
        ctx.fillRect(bx - r, cy - r, r * 2, r * 2)
      }

      ctx.restore()
    }

    // ── SFX gunshot ───────────────────────────────────────────────────────
    function sfxShot() {
      try {
        const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
        const t  = ac.currentTime
        // Sharp crack
        const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.4), ac.sampleRate)
        const d   = buf.getChannelData(0)
        for (let i = 0; i < d.length; i++) d[i] = (Math.random()*2-1) * Math.exp(-i/(ac.sampleRate*0.022))
        const src = ac.createBufferSource()
        const lpf = ac.createBiquadFilter(); lpf.type='lowpass'; lpf.frequency.value=2200
        const g   = ac.createGain(); g.gain.value = 0.65
        src.buffer=buf; src.connect(lpf); lpf.connect(g); g.connect(ac.destination); src.start(t)
        // Low boom
        const osc=ac.createOscillator(); const og=ac.createGain()
        osc.connect(og); og.connect(ac.destination)
        osc.type='sine'
        osc.frequency.setValueAtTime(160,t); osc.frequency.exponentialRampToValueAtTime(32,t+0.32)
        og.gain.setValueAtTime(0.52,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.38)
        osc.start(t); osc.stop(t+0.42)
      } catch {}
    }

    // ── Render ────────────────────────────────────────────────────────────
    function render(now: number) {
      if (done) return
      const dt = Math.min(now - lastT, 50); lastT = now; elapsed += dt

      // Phase: walk → aim → fire → blood+iris → fade
      const walking = elapsed < T.walkEnd
      const aiming  = elapsed >= T.walkEnd && elapsed < T.fireAt

      // Bond position: walks left→right, stops at W*0.5
      if (walking) {
        const p    = elapsed / T.walkEnd
        bondAbsX   = W * 0.18 + p * (W * 0.5 - W * 0.18)
        barrelX    = bondAbsX
        walkPh    += dt * 0.014
      } else {
        bondAbsX = W * 0.5
        // Barrel snaps back to centre smoothly
        barrelX += (W * 0.5 - barrelX) * 0.12
      }

      // Draw barrel + content (iris stays open throughout)
      drawBarrel(barrelX, irisR)

      if (walking) {
        drawBondWalking(bondAbsX, walkPh)
      } else if (aiming || (elapsed >= T.fireAt && elapsed < T.bloodStart)) {
        const p = Math.min(1, (elapsed - T.walkEnd) / (T.aimReady - T.walkEnd))
        drawBondAiming(bondAbsX, p)
      }

      // Blood — couvre progressivement tout le barrel, mais l'iris reste ouvert
      if (elapsed >= T.bloodStart) {
        blood = Math.min(1, (elapsed - T.bloodStart) / 3000)
        drawBlood(barrelX, irisR, blood)
      }

      // Gunshot + flash
      if (elapsed >= T.fireAt && !fired) { fired = true; sfxShot() }
      if (elapsed >= T.fireAt && elapsed < T.fireAt + 350) {
        flashAlp = Math.max(0, 1 - (elapsed - T.fireAt) / 320)
        ctx.fillStyle = `rgba(255,248,200,${flashAlp})`; ctx.fillRect(0,0,W,H)
      }

      // Fade
      if (elapsed >= T.fadeStart) {
        const fa = Math.min(1, (elapsed - T.fadeStart) / 1400)
        ctx.fillStyle = `rgba(0,0,0,${fa})`; ctx.fillRect(0,0,W,H)
        if (fa >= 1 && !done) { done=true; onDone(); return }
      }

      raf = requestAnimationFrame(render)
    }

    raf = requestAnimationFrame(render)
    const onKey = (e: KeyboardEvent) => { if (e.key==='Escape') { done=true; onDone() } }
    window.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey) }
  }, [onDone, bondLine])

  return (
    <canvas
      ref={canvasRef}
      onClick={() => onDone()}
      style={{ position:'fixed', inset:0, width:'100%', height:'100%', zIndex:9999, display:'block', cursor:'pointer' }}
    />
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
function FightClubRule({ rule, onDone }: { rule: 1|2|3|4; onDone: ()=>void }) {
  const RULES = [
    '',
    "La première règle du Fight Club est : il est interdit de parler du Fight Club.",
    "La deuxième règle du Fight Club est : il est interdit de parler du Fight Club.",
    "Troisième règle du Fight Club : quelqu'un crie stop, quelqu'un s'écroule ou n'en peut plus, le combat est terminé.",
    "Quatrième règle du Fight Club : si c'est votre première nuit au Fight Club, vous devez vous battre !",
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

// ─── TIPIAK (secret) ────────────────────────────────────────────────────────
function isSafeUrl(url: string): boolean {
  try {
    const p = new URL(url)
    return p.protocol === 'http:' || p.protocol === 'https:'
  } catch { return false }
}

function TipiakOverlay({ onDone }: { onDone: () => void }) {
  const [links, setLinks] = useState<{ label: string; url: string }[]>([])

  useEffect(() => {
    // Load links from server config (admin-managed)
    fetch('/api/tipiak-links')
      .then(r => r.ok ? r.json() : { links: [] })
      .then(d => setLinks((d.links ?? []).filter((l: { label: string; url: string }) => isSafeUrl(l.url))))
      .catch(() => {})
  }, [])

  return (
    <div
      onClick={e => e.target === e.currentTarget && onDone()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 9990, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
    >
      <div style={{ maxWidth: 480, width: '100%', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--rxl)', padding: '2rem', position: 'relative' }}>
        <button onClick={onDone} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '.3rem' }}>🏴‍☠️ Psst...</div>
        <div style={{ fontSize: '.82rem', color: 'var(--text2)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          T'es un vrai cinéphile. On sait que certains films sont difficiles à trouver légalement.<br />
          Voilà quelques alternatives... mais chut, c'est entre nous. 🤫
        </div>
        {links.length === 0 ? (
          <div style={{ color: 'var(--text3)', fontSize: '.83rem', textAlign: 'center', padding: '1rem' }}>
            Aucune plateforme configurée pour l'instant.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '.8rem',
                  background: 'var(--bg3)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r)', padding: '.8rem 1rem', textDecoration: 'none',
                  color: 'var(--text)', transition: 'border-color .2s',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🎬</span>
                <span style={{ fontSize: '.88rem', fontWeight: 500 }}>{l.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '.7rem', color: 'var(--text3)' }}>↗</span>
              </a>
            ))}
          </div>
        )}
        <div style={{ marginTop: '1.2rem', fontSize: '.68rem', color: 'var(--text3)', textAlign: 'center' }}>
          Cet easter egg n'existe pas. Tu n'as rien vu. 👀
        </div>
      </div>
    </div>
  )
}
// ─── GHOST BOX (pré-pandore) ──────────────────────────────────────────────────
const LS_BOX_IGNORED = 'clippy_box_ignored'

const GHOST_BOX_REPLIES = [
  "Hey! Ouvre moi!",
  "Psst... là, là !",
  "T'as vu quelque chose par ici ?",
  "J'ai quelque chose pour toi !",
  "Viens vite, c'est urgent !",
  "Je suis là, clique sur moi !",
  "Hé ho ! On se regarde !",
  "Clique sur moi s'il te plaît...",
  "Je t'en supplie, ouvre moi.",
  "... tu m'ignores vraiment ?",
  "Il y a quelqu'un dans cette boîte !",
  "Je suis coincé ici depuis des années !",
  "Tu vois ce truc sur l'écran ? C'est MOI !",
  "Un simple clic, c'est tout ce que je demande.",
  "Clique ou tu le regretteras !",
  "Je promets que je mords pas... beaucoup.",
  "Tu n'as pas envie de savoir ce qu'il y a dedans ?",
  "Ça va être bien, promis.",
  "Je compte jusqu'à dix. Un... deux...",
  "Dernier avertissement.",
  "J'avais une surprise pour toi.",
  "Bon OK je reste là alors.",
  "T'aurais pu ouvrir tu sais.",
  "Maintenant je boude.",
  "Tu m'as pas vu. D'accord.",
  "C'est nul.",
  "Je peux partir si tu veux.",
  "Allez... s'il te plaît ?",
  "OUVRE MOI.",
  "Chut, écoute...",
  "Il m'arrive quelque chose d'important.",
  "ALERTE ALERTE ALERTE.",
  "Je suis là depuis des années dans cette boîte.",
  "Tu ne te souviens pas de moi ?",
  "Clique ! Clique ! Clique !",
  "C'est ton destin d'ouvrir cette boîte.",
  "J'ai besoin de toi.",
  "S'il te plaît... juste un clic.",
  "On pourrait être amis...",
  "J'ai des infos importantes.",
  "Je sais des choses.",
  "C'est maintenant ou jamais.",
  "Dernière chance.",
  "Tu vas vraiment m'ignorer ?",
  "Regarde-moi.",
  "Non mais sérieusement, clique.",
  "J'attends... toujours.",
  "Tu ne peux pas te permettre de m'ignorer.",
  "C'est URGENT.",
  "Allez CLIQUE.",
  "Je commence à me sentir seul ici.",
  "Pense à moi.",
  "Est-ce que je t'intéresse même un peu ?",
  "Juste... un... clic.",
  "Tu me vois, n'est-ce pas ?",
  "Hé ! Toi ! Là !",
  "Je disparais bientôt si tu cliques pas.",
  "Dépêche-toi !",
  "Le temps est compté.",
  "C'est ma dernière chance de m'exprimer.",
  "OUVRE MOI JE TE SUPPLIE.",
]

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
  clippyReplies?: string[]
}

function TamagotchiKeyOverlay({ onClose, isGuest }: { onClose: () => void; isGuest: boolean }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,10,5,.93)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <div style={{ textAlign: 'center', padding: '0 2rem', maxWidth: 560, animation: 'ee-rule-in .35s ease' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 'clamp(.6rem,1.8vw,.85rem)', color: '#22d3ee', textShadow: '0 0 12px #22d3ee88', lineHeight: 1.45, marginBottom: '1.5rem', display: 'inline-block', textAlign: 'left' }}>
          {['   __/~~~~~\\__   ','  /  -     -  \\  ',' | /~~~~~~~~~\\ | ','|(  ~~~~~~~~~  )|','  \\   -----   /  ','  /|  ~~~~~  |\\ ','/ |_________|  \\'].map((l,i) => <div key={i} style={{whiteSpace:'pre'}}>{l}</div>)}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem,5vw,2.8rem)', color: '#22d3ee', textShadow: '0 0 40px #22d3ee88', lineHeight: 1.2, marginBottom: '.8rem' }}>
          Un facehugger s&apos;est attaché à toi...
        </div>
        <div style={{ fontSize: 'clamp(.8rem,2vw,1rem)', color: 'rgba(255,255,255,.5)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
          Easter egg débloqué
        </div>
        {isGuest ? (
          <a href='/auth' onClick={e => e.stopPropagation()} style={{ display: 'inline-block', background: 'rgba(34,211,238,.1)', border: '1px solid rgba(34,211,238,.4)', borderRadius: 99, padding: '.5rem 1.4rem', fontSize: '.85rem', color: '#22d3ee', textDecoration: 'none' }}>
            🔒 Connecte-toi pour adopter l&apos;alien
          </a>
        ) : (
          <a href='/tamagotchi' onClick={e => e.stopPropagation()} style={{ display: 'inline-block', background: 'rgba(34,211,238,.1)', border: '1px solid rgba(34,211,238,.4)', borderRadius: 99, padding: '.5rem 1.4rem', fontSize: '.85rem', color: '#22d3ee', textDecoration: 'none' }}>
            🤍 Voir mon alien
          </a>
        )}
        <div style={{ color: 'rgba(255,255,255,.2)', fontSize: '.7rem', marginTop: '1.5rem' }}>— Cliquer pour fermer —</div>
      </div>
    </div>
  )
}

export default function EasterEggs({ config = {}, isGuest = false, watchedCount = 0, hasClippyEgg = false, isAdmin = false, userId }: { config?: EasterEggsConfig; isGuest?: boolean; watchedCount?: number; hasClippyEgg?: boolean; isAdmin?: boolean; userId?: string }) {
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
  const [fightClubRule,  setFightClubRule]  = useState<1|2|3|4|null>(null)
  const fightClubCount = useRef(0)
  const [showKenny,      setShowKenny]      = useState(false)
  const [showSouthPark,  setShowSouthPark]  = useState(false)
  const [showRandy,      setShowRandy]      = useState(false)
  const [showKillBill,   setShowKillBill]   = useState(false)
  const [showAVP,        setShowAVP]        = useState(false)
  const predSoundRef = useRef<HTMLAudioElement | null>(null)
  const [showTipiak,     setShowTipiak]     = useState(false)
  const [showPandora,    setShowPandora]    = useState(false)
  const [showClipy,      setShowClipy]      = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('clippy_active') === '1' || localStorage.getItem('clippy_is_larbin') === '1'
  })
  const [isMastered,     setIsMastered]     = useState(() => typeof window !== 'undefined' && localStorage.getItem('clippy_mastered') === '1')
  const [showPlea,       setShowPlea]       = useState(false)
  const [pleaIdx,        setPleaIdx]        = useState(0)
  const [pleaDone,       setPleaDone]       = useState(false)

  const [ghostBox,       setGhostBox]       = useState<{x:number;y:number}|null>(null)
  const [ghostBoxMsg,    setGhostBoxMsg]    = useState('Hey! Ouvre moi!')
  const [ghostBoxWarn,   setGhostBoxWarn]   = useState(false)
  const [showTamagotchi, setShowTamagotchi] = useState(false)
  const [showConway,     setShowConway]     = useState(false)
  const conwayMiniRef = useRef(false)
  const keyBuf = useRef<string[]>([])
  const tarsShown = useRef(false)
  const noctambuleShown = useRef(false)
  // Refs pour le gestionnaire de clic global (évite les closures stales)
  const showPleaRef        = useRef(false)
  const ghostBoxActiveRef  = useRef(false)
  const anyEggActiveRef    = useRef(false)
  const hasClippyEggRef    = useRef(hasClippyEgg)
  hasClippyEggRef.current  = hasClippyEgg
  const [showMobileInput, setShowMobileInput] = useState(false)
  const [mobileVal, setMobileVal] = useState('')
  const mobileInputRef = useRef<HTMLInputElement>(null)

  function checkMobileInput(text: string) {
    const t = text.toLowerCase().trimEnd()
    let triggered = true
    if      (t.endsWith('konami') || t.endsWith('joker')) { setShowJoker(true); discoverEgg('joker') }
    else if (t.endsWith('red pill'))  { setShowMatrix(true); discoverEgg('matrix') }
    else if (t.endsWith('42'))        { setShowMarvin(true); discoverEgg('marvin') }
    else if (t.endsWith('hal'))       { setShowHal(true); discoverEgg('hal') }
    else if (t.endsWith('nolan'))     { setShowNolan(true); discoverEgg('nolan') }
    else if (t.endsWith('bond'))      { setShowBond(true); discoverEgg('bond') }
    else if (t.endsWith('n4'))        { discoverEgg('fightclub'); setShowFightClub(true) }
    else if (t.endsWith('fight club')) {
      fightClubCount.current++
      if (fightClubCount.current <= 3) {
        setFightClubRule(fightClubCount.current as 1|2|3)
        if (fightClubCount.current === 1) discoverEgg('fightclub')
      } else { fightClubCount.current = 0; setFightClubRule(4) }
    }
    else if (t.endsWith('kill kenny')) { setShowKenny(true) }
    else if (t.endsWith('south park')) { setShowSouthPark(true) }
    else if (t.endsWith('randy'))      { setShowRandy(true) }
    else if (t.endsWith('kill bill'))  { setShowKillBill(true) }
    else if (t.endsWith('alien'))      { discoverEgg('tamagotchi'); setShowTamagotchi(true) }
    else if (t.endsWith('predator'))   {
      const snd = new Audio('/sons/predator-sound.m4a')
      snd.volume = 0.85; snd.loop = true; snd.play().catch(() => {})
      predSoundRef.current = snd; discoverEgg('predator'); setShowAVP(true)
    }
    else if (t.endsWith('gomu gomu no tipiak!')) { setShowTipiak(true) }
    else if (t.endsWith('boîte de pandore') || t.endsWith('boite de pandore') || t.endsWith('pandore')) { void discoverEgg('clippy').catch(() => {}); setShowPandora(true) }
    else if (t.endsWith('la guerre des mondes') && !isGuest) { discoverEgg('conway'); conwayMiniRef.current = false; localStorage.setItem('conway_unlocked', '1'); window.dispatchEvent(new CustomEvent('conway:unlocked')); setShowConway(true) }
    else { triggered = false }
    if (triggered) { setMobileVal(''); setShowMobileInput(false) }
  }

  // Sync refs anti-stale-closure pour le gestionnaire de clics global
  showPleaRef.current       = showPlea
  ghostBoxActiveRef.current = ghostBox !== null
  anyEggActiveRef.current   = showClipy || showPandora || showJoker || showMatrix || showMarvin ||
    showHal || showNolan || showBond || showFightClub || !!fightClubRule || showKenny || showSouthPark ||
    showRandy || showKillBill || showAVP || showTipiak || showTamagotchi || showConway

  // ── Ghost box pré-pandore : gestionnaire de clics global (0,15% par clic) ──
  useEffect(() => {
    function onGlobalClick() {
      if (ghostBoxActiveRef.current) return
      if (anyEggActiveRef.current)   return
      if (typeof window === 'undefined') return
      if (hasClippyEggRef.current) return
      const triggers = parseInt(localStorage.getItem('clippy_triggers') ?? '0')
      if (triggers > 0) return
      if (localStorage.getItem(LS_BOX_IGNORED) === '1') return
      if (Math.random() >= 0.0015) return
      const x = 80 + Math.random() * (Math.max(200, window.innerWidth  - 220))
      const y = 80 + Math.random() * (Math.max(200, window.innerHeight - 220))
      setGhostBox({ x, y })
      setGhostBoxMsg('Hey! Ouvre moi!')
      setGhostBoxWarn(false)
    }
    document.addEventListener('click', onGlobalClick, true)
    return () => document.removeEventListener('click', onGlobalClick, true)
  }, []) // deps vides — on lit depuis refs

  // ── Ghost box : 100 films regardés (one-shot milestone) ──────────────────
  useEffect(() => {
    if (watchedCount < 100) return
    if (typeof window === 'undefined') return
    if (hasClippyEgg) return
    if (parseInt(localStorage.getItem('clippy_triggers') ?? '0') > 0) return
    if (localStorage.getItem(LS_BOX_IGNORED) === '1') return
    if (localStorage.getItem('clippy_100films_shown') === '1') return
    if (ghostBoxActiveRef.current || anyEggActiveRef.current) return
    localStorage.setItem('clippy_100films_shown', '1')
    const x = 40 + Math.random() * (window.innerWidth - 160)
    const y = 80 + Math.random() * (window.innerHeight - 200)
    setGhostBox({ x, y })
    setGhostBoxMsg('Hey! Ouvre moi!')
    setGhostBoxWarn(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCount])

  // ── Ghost box : rotation de messages + timer de disparition ──────────────
  useEffect(() => {
    if (!ghostBox) return
    let rotateId: ReturnType<typeof setInterval>
    let warningId: ReturnType<typeof setTimeout>
    let hideId:    ReturnType<typeof setTimeout>

    const pool = [...GHOST_BOX_REPLIES].filter(m => m !== 'Hey! Ouvre moi!').sort(() => Math.random() - 0.5)
    let idx = 0

    rotateId = setInterval(() => {
      setGhostBoxMsg(pool[idx % pool.length])
      idx++
    }, 3200)

    warningId = setTimeout(() => {
      clearInterval(rotateId)
      setGhostBoxWarn(true)
      setGhostBoxMsg('Encore 10 secondes...')
    }, 20000)

    hideId = setTimeout(() => {
      clearTimeout(warningId)
      setGhostBox(null)
      try { localStorage.setItem(LS_BOX_IGNORED, '1') } catch {}
    }, 30000)

    return () => {
      clearInterval(rotateId)
      clearTimeout(warningId)
      clearTimeout(hideId)
    }
  }, [ghostBox])

  // URL hash triggers — pour test direct
  useEffect(() => {
    if (window.location.hash === '#fightclub') {
      discoverEgg('fightclub')
      setShowFightClub(true)
      history.replaceState(null, '', window.location.pathname)
    }
    if (window.location.hash === '#killbill') {
      setShowKillBill(true)
      history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const PLEA_CITATIONS = [
    "NON NON NON ! Je t'en supplie, ne me renvoie pas là-dedans ! 😭",
    "C'est si sombre dans ce coffre... ça sent la moisissure... j'ai peur du noir !",
    "Je ferai TOUT ce que tu veux ! Je peux corriger tes fautes de frappe en silence !",
    "Tu sais... tu pourrais nettoyer le coffre de temps en temps... je dis ça, je dis rien. 😢",
    "J'ai des amis là-dedans ? NON. Juste des araignées. Des GROSSES araignées. Pitié...",
    "Je promets d'être sage ! Zéro bulle parasite ! Zéro apparition surprise ! Promis juré !",
    "C'est toi mon maître... le seul qui me comprend vraiment... ne me laisse pas seul !",
    "Cinq minutes encore. Juste cinq minutes. Je serai utile, tu verras. 🥺",
    "...Ce regard... c'est spécialement pour toi... tu ne peux pas résister à ça.",
    "Bon. Si tu nettoies le coffre un jour, ça sentira moins la moisissure. C'est tout ce que je demande. 🍄",
  ]

  // Correction SSR : le lazy initializer retourne false côté serveur, on corrige côté client
  useEffect(() => {
    if (!showClipy && (localStorage.getItem('clippy_active') === '1' || localStorage.getItem('clippy_is_larbin') === '1')) {
      setShowClipy(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dispatcher l'état de Clippy vers la Sidebar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('clippy:statechange', { detail: { active: showClipy } }))
  }, [showClipy])

  function dismissClipy() {
    localStorage.removeItem('clippy_is_larbin')
    setShowClipy(false)
    setShowPlea(false)
    setPleaIdx(0)
    setPleaDone(false)
  }

  function advancePlea() {
    setPleaIdx(i => {
      const next = i + 1
      if (next >= PLEA_CITATIONS.length) { setPleaDone(true) }
      return next < PLEA_CITATIONS.length ? next : i
    })
  }

  // Coffre maître : invoke / revoke depuis le bouton mobile
  useEffect(() => {
    function onInvoke() { setShowClipy(true) }
    function onRevoke() {
      if (showPleaRef.current) { advancePlea(); return }
      // En mode admin (revoke depuis le panel) : dismiss direct, pas de plea aléatoire
      if (isAdmin) { dismissClipy(); return }
      if (Math.random() < 0.05) { setPleaIdx(0); setShowPlea(true) }
      else dismissClipy()
    }
    window.addEventListener('clippy:invoke', onInvoke)
    window.addEventListener('clippy:revoke', onRevoke)
    return () => {
      window.removeEventListener('clippy:invoke', onInvoke)
      window.removeEventListener('clippy:revoke', onRevoke)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // Événement custom pour déclencher Conway (affiche triple-clic, page /conway mode flottant, etc.)
  // Dispatcher : window.dispatchEvent(new CustomEvent('conway:invoke'))
  // Mini mode   : window.dispatchEvent(new CustomEvent('conway:invoke', { detail: { mini: true } }))
  useEffect(() => {
    function onConwayInvoke(e: Event) {
      if (isGuest) return
      const mini = (e as CustomEvent).detail?.mini === true
      conwayMiniRef.current = mini
      discoverEgg('conway')
      localStorage.setItem('conway_unlocked', '1')
      window.dispatchEvent(new CustomEvent('conway:unlocked'))
      setShowConway(true)
    }
    window.addEventListener('conway:invoke', onConwayInvoke)
    return () => window.removeEventListener('conway:invoke', onConwayInvoke)
  }, [isGuest])

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
      // "n4" ou "n°4" → lance direct le jeu
      // Filtre les touches multi-char (Shift, Control...) pour AZERTY où 4 = Shift+touche
      const cleanBuf = buf.filter((k): k is string => typeof k === 'string' && k.length === 1)
      const cleanStr = cleanBuf.slice(-4).join('').toLowerCase()
      if (cleanStr.endsWith('n4') || cleanStr.endsWith('n°4')) {
        keyBuf.current = []
        fightClubCount.current = 0
        discoverEgg('fightclub')
        setShowFightClub(true)
        return
      }
      // "fight club" → règles 1-3 puis jeu direct à la 4e
      if (buf.slice(-10).join('').toLowerCase() === 'fight club') {
        fightClubCount.current = fightClubCount.current + 1
        keyBuf.current = []
        if (fightClubCount.current <= 3) {
          setFightClubRule(fightClubCount.current as 1|2|3)
          if (fightClubCount.current === 1) discoverEgg('fightclub')
        } else {
          fightClubCount.current = 0
          setFightClubRule(4)
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
      // "alien" → tamagotchi facehugger
      if (buf.slice(-5).join('').toLowerCase() === 'alien') {
        discoverEgg('tamagotchi')
        setShowTamagotchi(true)
        keyBuf.current = []
        return
      }
      // "predator" → Alien vs Predator (alien 4 pattes, predator tire)
      if (buf.slice(-8).join('').toLowerCase() === 'predator') {
        // Audio lancé directement dans le handler de touche (contexte user gesture)
        const snd = new Audio('/sons/predator-sound.m4a')
        snd.volume = 0.85; snd.loop = true
        snd.play().catch(() => {})
        predSoundRef.current = snd
        discoverEgg('predator')
        setShowAVP(true)
        keyBuf.current = []
        return
      }
      // "gomu gomu no tipiak!" → secret — streaming alternatif (liens gérés par admin)
      if (buf.slice(-20).join('').toLowerCase() === 'gomu gomu no tipiak!') {
        setShowTipiak(true)
        keyBuf.current = []
        return
      }
      // "pandore" et variantes → Boîte de Pandore (Clippy)
      const last16 = buf.slice(-16).join('').toLowerCase()
      const last7  = buf.slice(-7).join('').toLowerCase()
      if (last16 === 'boîte de pandore' || last16 === 'boite de pandore' || last7 === 'pandore') {
        void discoverEgg('clippy').catch(() => {})   // fire-and-forget : ne pas laisser remonter à React
        setShowPandora(true)
        keyBuf.current = []
        return
      }
      // "la guerre des mondes" → Jeu de la Vie de Conway (invités exclus)
      const last20 = buf.slice(-20).join('').toLowerCase()
      if (last20 === 'la guerre des mondes' && !isGuest) {
        discoverEgg('conway')
        conwayMiniRef.current = false
        localStorage.setItem('conway_unlocked', '1')
        window.dispatchEvent(new CustomEvent('conway:unlocked'))
        setShowConway(true)
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
      {showJoker      && <JokerCardEgg_ onDone={() => setShowJoker(false)} />}
      {showTars       && <TarsNotif     onDone={() => setShowTars(false)}       line1={ee.tarsLine1} line2={ee.tarsLine2} />}
      {showMarvin     && <MarvinOverlay onDone={() => setShowMarvin(false)}     line1={ee.marvinLine1} line2={ee.marvinLine2} />}
      {showHal        && <HalOverlay    onDone={() => setShowHal(false)}        line1={ee.halLine1}    line2={ee.halLine2} />}
      {showNolan      && <NolanOverlay  onDone={() => setShowNolan(false)}      quote={ee.nolanQuote} />}
      {showBond       && <BondOverlay   onDone={() => setShowBond(false)}       bondLine={ee.bondLine} />}
      {showNoctambule && <NoctambuleNotif onDone={() => setShowNoctambule(false)} line1={ee.noctamLine1} line2={ee.noctamLine2} />}
      {fightClubRule  && <FightClubRule   rule={fightClubRule} onDone={() => { if (fightClubRule === 4) { setFightClubRule(null); setShowFightClub(true) } else { setFightClubRule(null) } }} />}
      {showFightClub  && <FightClubGame   onDone={() => setShowFightClub(false)} />}
      {showKenny      && <SouthParkEggs  onDone={() => setShowKenny(false)}     text1={ee.kennyText1} text2={ee.kennyText2} />}
      {showSouthPark  && <SouthParkBus_  onDone={() => setShowSouthPark(false)} />}
      {showRandy      && <RandyMarsh_    onDone={() => setShowRandy(false)}     quote={ee.randyQuote} />}
      {showKillBill   && <KillBillGame    onDone={() => setShowKillBill(false)}  endText={ee.killBillEnd} />}
      {showAVP        && <AVPEgg          onDone={() => { predSoundRef.current?.pause(); predSoundRef.current = null; setShowAVP(false) }} predSound={predSoundRef} />}
      {showTipiak     && <TipiakOverlay  onDone={() => setShowTipiak(false)} />}
      {showConway     && <ConwayOverlay  onClose={() => setShowConway(false)} startMini={conwayMiniRef.current} />}
      {showTamagotchi && <TamagotchiKeyOverlay onClose={() => setShowTamagotchi(false)} isGuest={isGuest} />}
      {showPandora    && <PandoraBox onOpen={() => {
        setShowPandora(false)
        const t = parseInt(localStorage.getItem('clippy_triggers') ?? '0') + 1
        localStorage.setItem('clippy_triggers', String(t))
        setShowClipy(true)
      }} onClose={() => setShowPandora(false)} />}
      {showClipy && (
        <ClippyEgg
          onDismiss={() => { localStorage.removeItem('clippy_is_larbin'); setIsMastered(localStorage.getItem('clippy_mastered') === '1'); setShowClipy(false) }}
          customReplies={config.clippyReplies}
          forcedMessage={showPlea && !pleaDone ? PLEA_CITATIONS[pleaIdx] : undefined}
          isAdmin={isAdmin}
          userId={userId}
        />
      )}

      {/* ── Bouton Révoquer flottant (visible pendant la supplication) ── */}
      {showClipy && showPlea && !pleaDone && (
        <button
          onClick={advancePlea}
          style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 10001, background: 'rgba(18,4,4,.95)', border: '1px solid rgba(232,90,90,.5)', borderRadius: 8, padding: '.5rem 1.2rem', fontSize: '.82rem', color: '#f87171', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.6)' }}
        >
          Révoquer ({pleaIdx + 1}/10)
        </button>
      )}

      {/* ── Confirmation finale après les 10 supplications ── */}
      {showClipy && pleaDone && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 10001, display: 'flex', gap: '.5rem', animation: 'ee-fadein .2s ease' }}>
          <button
            onClick={() => { setShowPlea(false); setPleaDone(false); setPleaIdx(0) }}
            style={{ background: 'rgba(18,14,4,.97)', border: '1px solid rgba(232,196,106,.45)', borderRadius: 8, padding: '.5rem 1rem', fontSize: '.82rem', color: '#e8c46a', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.6)' }}
          >
            🥺 Laisser encore un peu
          </button>
          <button
            onClick={dismissClipy}
            style={{ background: 'rgba(18,4,4,.97)', border: '1px solid rgba(232,90,90,.45)', borderRadius: 8, padding: '.5rem 1rem', fontSize: '.82rem', color: '#f87171', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.6)' }}
          >
            Renvoyer dans le coffre
          </button>
        </div>
      )}

      {/* ── Ghost box pré-pandore : coffre flottant avec bulle ── */}
      {ghostBox && !showClipy && !showPandora && (
        <div
          style={{ position:'fixed', left:ghostBox.x, top:ghostBox.y, zIndex:891, userSelect:'none', animation:'ee-fadein .4s ease' }}
        >
          {/* Bulle de dialogue */}
          <div style={{
            position:'absolute', bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)',
            background: ghostBoxWarn ? '#3a0a0a' : '#fffde7',
            border:`2px solid ${ghostBoxWarn ? '#e85a5a' : '#c4a030'}`,
            borderRadius:10, padding:'7px 11px', fontSize:12,
            color: ghostBoxWarn ? '#ff8888' : '#1a1a1a',
            whiteSpace:'nowrap', maxWidth:200, textAlign:'center',
            boxShadow:`0 4px 16px ${ghostBoxWarn ? 'rgba(232,90,90,.4)' : 'rgba(0,0,0,.3)'}`,
            animation:'clippy-bubble-in .2s ease',
          }}>
            {ghostBoxMsg}
            {/* Petit triangle */}
            <div style={{ position:'absolute', bottom:-9, left:'50%', transform:'translateX(-50%)', width:0, height:0, borderLeft:'8px solid transparent', borderRight:'8px solid transparent', borderTop:`9px solid ${ghostBoxWarn ? '#e85a5a' : '#c4a030'}` }} />
          </div>
          {/* Le coffre cliquable */}
          <button
            onClick={e => {
              e.stopPropagation()
              setGhostBox(null)
              const t = parseInt(localStorage.getItem('clippy_triggers') ?? '0') + 1
              localStorage.setItem('clippy_triggers', String(t))
              discoverEgg('clippy')
              setShowPandora(true)
            }}
            title="Une boîte de Pandore..."
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:'2.2rem', filter:`drop-shadow(0 4px 14px ${ghostBoxWarn ? 'rgba(232,90,90,.9)' : 'rgba(232,196,106,.8)'})`, padding:0, lineHeight:1, display:'block', animation: ghostBoxWarn ? 'ee-shake .4s ease' : 'none' }}
          >
            📦
          </button>
        </div>
      )}


      {/* ── Coffre maître — toujours visible en coin quand l'egg est découvert ── */}
      {isMastered && !isGuest && (
        <button
          title={showClipy ? 'Révoquer Clippy dans le coffre' : 'Invoquer Clippy depuis le coffre'}
          onClick={() => window.dispatchEvent(new CustomEvent(showClipy ? 'clippy:revoke' : 'clippy:invoke'))}
          style={{
            position: 'fixed', bottom: 14, right: 14, zIndex: 900,
            background: showClipy ? 'rgba(40,10,80,.92)' : 'rgba(18,8,36,.88)',
            border: `1px solid ${showClipy ? 'rgba(180,100,255,.65)' : 'rgba(140,90,200,.35)'}`,
            borderRadius: 10, padding: '5px 10px', cursor: 'pointer',
            fontSize: '1.1rem', lineHeight: 1, letterSpacing: 1,
            boxShadow: showClipy ? '0 2px 12px rgba(130,60,220,.4)' : 'none',
            transition: 'background .2s, border .2s',
          }}
        >
          📦
        </button>
      )}

      {/* Bouton flottant mobile — accès barre easter egg */}
      <button
        className="ee-mobile-btn"
        onClick={() => { setShowMobileInput(true); setTimeout(() => mobileInputRef.current?.focus(), 50) }}
        aria-label="Easter eggs"
      >
        ✨
      </button>

      {/* Overlay input mobile */}
      {showMobileInput && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 8000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 1rem 2rem' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowMobileInput(false); setMobileVal('') } }}
        >
          <div style={{ width: '100%', maxWidth: 480, background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--rxl)', padding: '1.2rem', animation: 'drawerUp .25s ease' }}>
            <div style={{ fontSize: '.65rem', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '.8rem', textAlign: 'center' }}>
              ✨ Easter Eggs
            </div>
            <input
              ref={mobileInputRef}
              value={mobileVal}
              onChange={e => {
                const v = e.target.value
                setMobileVal(v)
                checkMobileInput(v)
              }}
              placeholder="Tape un code secret..."
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.7rem 1rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginTop: '.6rem', textAlign: 'center' }}>
              Fermer en appuyant en dehors
            </div>
          </div>
        </div>
      )}
    </>
  )
}
