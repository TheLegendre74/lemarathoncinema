'use client'

import { useState, useEffect, useRef } from 'react'

interface Prey {
  id: number
  x: number   // 0-100 percent
  y: number   // 0-100 percent
  speed: number
  caught: boolean
}

interface Props {
  stage: string
  onFinish: (score: number, missed: number) => void
  onClose: () => void
  feedMode?: boolean
}

const GAME_DURATION = 20
const ALIEN_ICON: Record<string, string> = {
  egg:          '🥚',
  facehugger:   '🤍',
  chestburster: '💥',
  xenomorph:    '👾',
}

export default function MiniGame({ stage, onFinish, onClose, feedMode = false }: Props) {
  const [phase, setPhase]     = useState<'countdown' | 'playing' | 'done'>('countdown')
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft]   = useState(GAME_DURATION)
  const [score, setScore]         = useState(0)
  const [preys, setPreys]         = useState<Prey[]>([])
  const [missed, setMissed]       = useState(0)

  const nextId      = useRef(0)
  const rafRef      = useRef<number>()
  const lastFrame   = useRef(0)
  const lastSpawn   = useRef(0)
  const scoreRef    = useRef(0)
  const missedRef   = useRef(0)

  // Countdown phase
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown === 0) { setPhase('playing'); lastFrame.current = performance.now(); lastSpawn.current = performance.now(); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [phase, countdown])

  // Timer
  useEffect(() => {
    if (phase !== 'playing') return
    const t = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(t as any); endGame(); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [phase]) // eslint-disable-line

  // Game loop
  useEffect(() => {
    if (phase !== 'playing') return

    function loop(now: number) {
      const dt = Math.min((now - lastFrame.current) / 1000, 0.1)
      lastFrame.current = now

      // Spawn prey every 1.2s
      if (now - lastSpawn.current > 1200) {
        lastSpawn.current = now
        const speed = 18 + Math.random() * 14 // % per second
        setPreys(prev => [
          ...prev.slice(-10),
          { id: nextId.current++, x: 8 + Math.random() * 84, y: -5, speed, caught: false },
        ])
      }

      setPreys(prev => {
        const next: Prey[] = []
        for (const p of prev) {
          if (p.caught) continue
          const newY = p.y + p.speed * dt
          if (newY > 98) {
            missedRef.current++
            setMissed(missedRef.current)
            continue
          }
          next.push({ ...p, y: newY })
        }
        return next
      })

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [phase])

  function endGame() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setPhase('done')
  }

  function catch_(id: number) {
    if (phase !== 'playing') return
    setPreys(prev => prev.map(p => p.id === id ? { ...p, caught: true } : p))
    scoreRef.current++
    setScore(scoreRef.current)
  }

  if (phase === 'countdown') {
    return (
      <div style={overlay}>
        <div style={{ textAlign: 'center', color: '#22d3ee' }}>
          <div style={{ fontSize: '4rem', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
            {countdown === 0 ? 'GO !' : countdown}
          </div>
          <div style={{ fontSize: '.85rem', color: 'rgba(255,255,255,.5)', marginTop: '.5rem' }}>
            Attrape les humains avant qu&apos;ils s&apos;échappent !
          </div>
        </div>
        <button onClick={onClose} style={closeBtn}>Annuler</button>
      </div>
    )
  }

  if (phase === 'done') {
    const s = scoreRef.current
    const msg = s >= 10 ? '💥 Parfait ! Personne ne peut t\'échapper.'
              : s >= 6  ? '👾 Bien joué ! Ton alien grandit en sagesse.'
              : s >= 3  ? '🤍 Pas mal… l\'entraînement continue.'
              : '😔 Ils ont tous fui. La prochaine fois…'
    return (
      <div style={overlay}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>{ALIEN_ICON[stage] ?? '👾'}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#22d3ee', marginBottom: '.5rem' }}>
            {s} attrapé{s > 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: '.88rem', color: 'var(--text2)', lineHeight: 1.5, marginBottom: '1.2rem' }}>
            {msg}
          </div>
          {feedMode && missed === 0 && s > 0 && (
            <div style={{ color: '#fbbf24', fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '.4rem' }}>
              🌟 PARFAIT ! +10 EXP bonus
            </div>
          )}
          <button className="btn btn-gold" onClick={() => onFinish(s, missed)} style={{ width: '100%' }}>
            {feedMode
              ? `Nourrir +${Math.max(20, s * 2)} satiété${missed === 0 && s > 0 ? ' · 🌟 +10 EXP' : ''}`
              : `Continuer +${Math.max(10, Math.min(40, Math.round(s * 4)))} humeur`
            }
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      {/* HUD */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--text2)' }}>
        <span>⏱ {timeLeft}s</span>
        <span style={{ fontFamily: 'var(--font-display)', color: '#22d3ee', fontSize: '1rem' }}>🎯 {score}</span>
        <span style={{ color: 'var(--text3)' }}>✗ {missed}</span>
      </div>

      {/* Game area */}
      <div
        style={{
          position: 'relative', width: '100%', height: 260,
          background: 'var(--bg3)', borderRadius: 'var(--r)',
          border: '1px solid rgba(34,211,238,.3)',
          overflow: 'hidden', cursor: 'crosshair',
          userSelect: 'none',
        }}
      >
        {/* Stars background */}
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: `${(i * 37 + 13) % 100}%`,
            top: `${(i * 53 + 7) % 100}%`,
            width: i % 3 === 0 ? 2 : 1,
            height: i % 3 === 0 ? 2 : 1,
            background: '#fff',
            borderRadius: '50%',
            opacity: 0.3 + (i % 4) * 0.15,
          }} />
        ))}

        {/* Preys (humans falling) */}
        {preys.filter(p => !p.caught).map(p => (
          <button
            key={p.id}
            onClick={() => catch_(p.id)}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: 'translate(-50%, -50%)',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, lineHeight: 1,
              fontSize: '1.4rem',
              filter: 'drop-shadow(0 0 4px rgba(255,200,0,.8))',
              transition: 'transform .1s',
            }}
            title="Attrape !"
          >
            👤
          </button>
        ))}

        {/* Alien at bottom center */}
        <div style={{
          position: 'absolute', bottom: 10, left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '1.8rem', lineHeight: 1,
          filter: 'drop-shadow(0 0 8px #22d3ee)',
        }}>
          {ALIEN_ICON[stage] ?? '👾'}
        </div>

        {/* "In space" label */}
        <div style={{
          position: 'absolute', bottom: 4, width: '100%', textAlign: 'center',
          fontSize: '.55rem', color: 'rgba(34,211,238,.3)', letterSpacing: 2,
          fontFamily: 'monospace', textTransform: 'uppercase',
        }}>
          NOSTROMO — SECTEUR 7
        </div>
      </div>

      <div style={{ fontSize: '.72rem', color: 'var(--text3)', textAlign: 'center' }}>
        Clique sur les humains avant qu&apos;ils atteignent le bas !
      </div>

      <button onClick={onClose} style={{ ...closeBtn, position: 'static', padding: '.3rem .8rem' }}>
        Abandonner
      </button>
    </div>
  )
}

const overlay: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: 260, gap: '1rem', position: 'relative',
  background: 'var(--bg3)', borderRadius: 'var(--r)',
  border: '1px solid rgba(34,211,238,.3)', padding: '1.5rem',
}

const closeBtn: React.CSSProperties = {
  position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)',
  background: 'none', border: '1px solid var(--border)', borderRadius: 99,
  color: 'var(--text3)', fontSize: '.72rem', padding: '.25rem .75rem', cursor: 'pointer',
}
