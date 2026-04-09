'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  stage: string
  onFinish: (score: number) => void
  onClose: () => void
}

type GameId = 'timing' | 'memory' | 'rapide' | 'simon'

const GAMES: { id: GameId; name: string; desc: string; icon: string }[] = [
  { id: 'timing', name: 'Réflexes',  desc: 'Arrête la barre dans la zone verte !', icon: '🎯' },
  { id: 'memory', name: 'Mémoire',   desc: 'Mémorise et reproduis la séquence !', icon: '🧠' },
  { id: 'rapide', name: 'Rapidité',  desc: "Clique sur l'alien avant qu'il disparaisse !", icon: '⚡' },
  { id: 'simon',  name: 'Simon',     desc: 'Répète la séquence de couleurs croissante !', icon: '🌈' },
]

// ── TIMING GAME ──────────────────────────────────────────────────────────────
function TimingGame({ onFinish, onClose }: { onFinish: (score: number) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<'playing' | 'done'>('playing')
  const [round, setRound] = useState(0)
  const [pos, setPos]     = useState(0)   // 0-100
  const [dir, setDir]     = useState(1)
  const [hits, setHits]   = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const posRef  = useRef(0)
  const dirRef  = useRef(1)
  const rafRef  = useRef<number>()
  const lastRef = useRef(0)
  const speed   = 55 + round * 5  // increases each round

  const TOTAL_ROUNDS = 5
  const GREEN_MIN    = 38
  const GREEN_MAX    = 62

  useEffect(() => {
    if (phase !== 'playing') return
    lastRef.current = performance.now()

    function loop(now: number) {
      const dt = Math.min((now - lastRef.current) / 1000, 0.1)
      lastRef.current = now
      posRef.current += dirRef.current * speed * dt
      if (posRef.current >= 100) { posRef.current = 100; dirRef.current = -1 }
      if (posRef.current <= 0)   { posRef.current = 0;   dirRef.current =  1 }
      setPos(posRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [phase, round]) // eslint-disable-line

  function stopBar() {
    if (phase !== 'playing') return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const hit = posRef.current >= GREEN_MIN && posRef.current <= GREEN_MAX
    if (hit) setHits(h => h + 1)
    setFeedback(hit ? '✓ Dans la zone !' : '✗ Raté !')
    setTimeout(() => {
      setFeedback(null)
      const nextRound = round + 1
      if (nextRound >= TOTAL_ROUNDS) {
        setPhase('done')
      } else {
        posRef.current = Math.random() * 100
        dirRef.current = Math.random() > 0.5 ? 1 : -1
        setRound(nextRound)
      }
    }, 700)
  }

  const finalScore = Math.round((hits / TOTAL_ROUNDS) * 10)

  if (phase === 'done') {
    return (
      <div style={overlay}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🎯</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#a78bfa', marginBottom: '.5rem' }}>
            {hits}/{TOTAL_ROUNDS} dans la zone
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: '1.2rem' }}>
            {hits >= 4 ? '🔥 Réflexes parfaits !' : hits >= 2 ? '👍 Pas mal !' : '😅 Entraîne-toi encore…'}
          </div>
          <button className="btn btn-gold" onClick={() => onFinish(finalScore)} style={{ width: '100%' }}>
            Continuer +{Math.max(10, Math.min(40, Math.round(finalScore * 4)))} humeur
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--text2)' }}>
        <span>Round {round + 1}/{TOTAL_ROUNDS}</span>
        <span style={{ color: '#a78bfa', fontFamily: 'var(--font-display)' }}>✓ {hits}</span>
      </div>

      <div style={{ background: 'var(--bg3)', borderRadius: 'var(--r)', border: '1px solid rgba(167,139,250,.3)', padding: '2rem 1rem', textAlign: 'center' }}>
        {/* Bar container */}
        <div style={{ position: 'relative', height: 32, background: 'rgba(255,255,255,.05)', borderRadius: 99, overflow: 'hidden', marginBottom: '1.5rem', cursor: 'pointer' }} onClick={stopBar}>
          {/* Green zone */}
          <div style={{ position: 'absolute', left: `${GREEN_MIN}%`, width: `${GREEN_MAX - GREEN_MIN}%`, top: 0, bottom: 0, background: 'rgba(34,197,94,.25)', borderLeft: '2px solid #22c55e', borderRight: '2px solid #22c55e' }} />
          {/* Indicator */}
          <div style={{ position: 'absolute', top: 4, bottom: 4, width: 8, left: `calc(${pos}% - 4px)`, background: '#a78bfa', borderRadius: 99, boxShadow: '0 0 8px #a78bfa', transition: 'none' }} />
        </div>

        {feedback && (
          <div style={{ fontSize: '1rem', color: feedback.startsWith('✓') ? '#22c55e' : '#ef4444', fontWeight: 700, marginBottom: '.5rem' }}>
            {feedback}
          </div>
        )}

        <button className="btn btn-outline" onClick={stopBar} style={{ fontSize: '.9rem', padding: '.5rem 2rem' }}>
          STOP !
        </button>
        <div style={{ fontSize: '.7rem', color: 'var(--text3)', marginTop: '.5rem' }}>Arrête le curseur dans la zone verte</div>
      </div>

      <button onClick={onClose} style={abandonBtn}>Abandonner</button>
    </div>
  )
}

// ── MEMORY GAME ──────────────────────────────────────────────────────────────
const MEM_SYMBOLS = ['🔴', '🟢', '🔵', '🟡']
const MEM_COLORS  = ['#ef4444', '#22c55e', '#3b82f6', '#eab308']

function MemoryGame({ onFinish, onClose }: { onFinish: (score: number) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<'show' | 'input' | 'feedback' | 'done'>('show')
  const [seq, setSeq]     = useState<number[]>([])
  const [lit, setLit]     = useState<number | null>(null)
  const [userSeq, setUserSeq]   = useState<number[]>([])
  const [round, setRound]       = useState(0)
  const [correct, setCorrect]   = useState(0)
  const [feedbackMsg, setFeedbackMsg] = useState('')

  const TOTAL_ROUNDS = 3
  const seqLen = round + 3  // 3, 4, 5

  // Generate and show sequence on round start
  useEffect(() => {
    if (round >= TOTAL_ROUNDS) { setPhase('done'); return }
    const newSeq = Array.from({ length: seqLen }, () => Math.floor(Math.random() * 4))
    setSeq(newSeq)
    setUserSeq([])
    setPhase('show')

    let i = 0
    function showNext() {
      if (i >= newSeq.length) { setTimeout(() => setPhase('input'), 400); return }
      setLit(newSeq[i])
      setTimeout(() => { setLit(null); setTimeout(() => { i++; showNext() }, 300) }, 600)
    }
    setTimeout(showNext, 500)
  }, [round]) // eslint-disable-line

  function handleClick(idx: number) {
    if (phase !== 'input') return
    const next = [...userSeq, idx]
    setUserSeq(next)
    setLit(idx)
    setTimeout(() => setLit(null), 200)

    const pos = next.length - 1
    if (next[pos] !== seq[pos]) {
      setFeedbackMsg('✗ Erreur !')
      setPhase('feedback')
      setTimeout(() => {
        setFeedbackMsg('')
        setRound(r => r + 1)
      }, 1000)
      return
    }
    if (next.length === seq.length) {
      setCorrect(c => c + next.length)
      setFeedbackMsg('✓ Parfait !')
      setPhase('feedback')
      setTimeout(() => {
        setFeedbackMsg('')
        setRound(r => r + 1)
      }, 800)
    }
  }

  const finalScore = Math.round((correct / (3 + 4 + 5)) * 10)

  if (phase === 'done') {
    return (
      <div style={overlay}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🧠</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#22d3ee', marginBottom: '.5rem' }}>
            {correct} / {3 + 4 + 5} corrects
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: '1.2rem' }}>
            {correct >= 10 ? '🧠 Mémoire parfaite !' : correct >= 6 ? '👍 Bien mémorisé !' : '😅 Continue à pratiquer…'}
          </div>
          <button className="btn btn-gold" onClick={() => onFinish(finalScore)} style={{ width: '100%' }}>
            Continuer +{Math.max(10, Math.min(40, Math.round(finalScore * 4)))} humeur
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--text2)' }}>
        <span>Séquence {round + 1}/{TOTAL_ROUNDS} — {seqLen} symboles</span>
        <span style={{ color: '#22d3ee' }}>{phase === 'show' ? 'Mémorise…' : phase === 'input' ? 'Reproduis !' : feedbackMsg}</span>
      </div>

      <div style={{ background: 'var(--bg3)', borderRadius: 'var(--r)', border: '1px solid rgba(34,211,238,.3)', padding: '1.5rem 1rem', textAlign: 'center' }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: '1rem' }}>
          {seq.map((_, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < userSeq.length ? '#22c55e' : 'rgba(255,255,255,.15)' }} />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', maxWidth: 200, margin: '0 auto' }}>
          {MEM_SYMBOLS.map((sym, idx) => (
            <button key={idx} onClick={() => handleClick(idx)} disabled={phase !== 'input'}
              style={{
                background: lit === idx ? MEM_COLORS[idx] + '88' : 'var(--bg2)',
                border: `2px solid ${MEM_COLORS[idx]}`,
                borderRadius: 'var(--r)', padding: '.8rem',
                fontSize: '1.6rem', cursor: phase === 'input' ? 'pointer' : 'default',
                transition: 'background .15s',
                boxShadow: lit === idx ? `0 0 16px ${MEM_COLORS[idx]}` : 'none',
              }}>
              {sym}
            </button>
          ))}
        </div>

        {feedbackMsg && (
          <div style={{ marginTop: '1rem', fontSize: '1rem', fontWeight: 700, color: feedbackMsg.startsWith('✓') ? '#22c55e' : '#ef4444' }}>
            {feedbackMsg}
          </div>
        )}
      </div>

      <button onClick={onClose} style={abandonBtn}>Abandonner</button>
    </div>
  )
}

// ── RAPIDE GAME ──────────────────────────────────────────────────────────────
const ALIEN_ICON_MAP: Record<string, string> = {
  egg: '🥚', facehugger: '🤍', chestburster: '💥', xenomorph: '👾',
}

function RapideGame({ stage, onFinish, onClose }: { stage: string; onFinish: (score: number) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<'playing' | 'done'>('playing')
  const [timeLeft, setTimeLeft] = useState(15)
  const [score, setScore]       = useState(0)
  const [alienPos, setAlienPos] = useState({ x: 50, y: 50 })
  const [visible, setVisible]   = useState(true)
  const scoreRef  = useRef(0)
  const timerRef  = useRef<ReturnType<typeof setTimeout>>()

  const icon = ALIEN_ICON_MAP[stage] ?? '👾'

  function moveAlien() {
    setAlienPos({ x: 8 + Math.random() * 84, y: 8 + Math.random() * 84 })
    setVisible(true)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(moveAlien, 200)
    }, 700)
  }

  useEffect(() => {
    moveAlien()
    const countDown = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(countDown); if (timerRef.current) clearTimeout(timerRef.current); setPhase('done'); return 0 }
        return t - 1
      })
    }, 1000)
    return () => { clearInterval(countDown); if (timerRef.current) clearTimeout(timerRef.current) }
  }, []) // eslint-disable-line

  function catchAlien() {
    if (phase !== 'playing' || !visible) return
    scoreRef.current++
    setScore(scoreRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
    setTimeout(moveAlien, 150)
  }

  const finalScore = Math.round((scoreRef.current / 15) * 10)

  if (phase === 'done') {
    return (
      <div style={overlay}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>{icon}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#f97316', marginBottom: '.5rem' }}>
            {scoreRef.current} attrapé{scoreRef.current > 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: '1.2rem' }}>
            {scoreRef.current >= 12 ? '⚡ Fulgurant !' : scoreRef.current >= 7 ? '👍 Réactif !' : '😅 Il était rapide, hein ?'}
          </div>
          <button className="btn btn-gold" onClick={() => onFinish(finalScore)} style={{ width: '100%' }}>
            Continuer +{Math.max(10, Math.min(40, Math.round(finalScore * 4)))} humeur
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--text2)' }}>
        <span>⏱ {timeLeft}s</span>
        <span style={{ color: '#f97316', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{score}</span>
      </div>

      <div style={{ position: 'relative', width: '100%', height: 260, background: 'var(--bg3)', borderRadius: 'var(--r)', border: '1px solid rgba(249,115,22,.3)', overflow: 'hidden', cursor: 'crosshair', userSelect: 'none' }}>
        {[...Array(15)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: `${(i * 43 + 17) % 100}%`, top: `${(i * 61 + 11) % 100}%`, width: 1, height: 1, background: '#fff', opacity: .2, borderRadius: '50%' }} />
        ))}
        {visible && (
          <button onClick={catchAlien} style={{
            position: 'absolute', left: `${alienPos.x}%`, top: `${alienPos.y}%`,
            transform: 'translate(-50%, -50%)', background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, fontSize: '2rem', lineHeight: 1,
            filter: 'drop-shadow(0 0 8px #f97316)',
            animation: 'tama-pop-in .1s ease',
          }}>
            {icon}
          </button>
        )}
      </div>

      <button onClick={onClose} style={abandonBtn}>Abandonner</button>
    </div>
  )
}

// ── SIMON GAME ───────────────────────────────────────────────────────────────
const SIMON_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308']
const SIMON_LABELS = ['🔴', '🟢', '🔵', '🟡']

function SimonGame({ onFinish, onClose }: { onFinish: (score: number) => void; onClose: () => void }) {
  const [phase, setPhase] = useState<'show' | 'input' | 'done'>('show')
  const [seq, setSeq]     = useState<number[]>([])
  const [userSeq, setUserSeq] = useState<number[]>([])
  const [lit, setLit]     = useState<number | null>(null)
  const [rounds, setRounds]   = useState(0)
  const [failed, setFailed]   = useState(false)

  const MAX_ROUNDS = 7

  useEffect(() => {
    const newSeq = [Math.floor(Math.random() * 4)]
    setSeq(newSeq)
    setUserSeq([])
    showSeq(newSeq)
  }, []) // eslint-disable-line

  function showSeq(s: number[]) {
    setPhase('show')
    let i = 0
    function next() {
      if (i >= s.length) { setTimeout(() => setPhase('input'), 400); return }
      setTimeout(() => {
        setLit(s[i])
        setTimeout(() => { setLit(null); i++; setTimeout(next, 300) }, 500)
      }, 100)
    }
    setTimeout(next, 600)
  }

  function handleClick(idx: number) {
    if (phase !== 'input') return
    const next = [...userSeq, idx]
    setUserSeq(next)
    setLit(idx)
    setTimeout(() => setLit(null), 200)

    const pos = next.length - 1
    if (next[pos] !== seq[pos]) {
      setFailed(true)
      setPhase('done')
      return
    }
    if (next.length === seq.length) {
      const nextRound = rounds + 1
      setRounds(nextRound)
      if (nextRound >= MAX_ROUNDS) { setPhase('done'); return }
      const newSeq = [...seq, Math.floor(Math.random() * 4)]
      setSeq(newSeq)
      setUserSeq([])
      setTimeout(() => showSeq(newSeq), 600)
    }
  }

  const finalScore = Math.round((rounds / MAX_ROUNDS) * 10)

  if (phase === 'done') {
    return (
      <div style={overlay}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🌈</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#eab308', marginBottom: '.5rem' }}>
            {failed ? `Round ${rounds + 1} / ${MAX_ROUNDS}` : `${MAX_ROUNDS} / ${MAX_ROUNDS} ✓`}
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: '1.2rem' }}>
            {!failed ? '🌟 Parfait ! Mémoire légendaire !' : rounds >= 4 ? '👍 Bien joué !' : '😅 La séquence était longue…'}
          </div>
          <button className="btn btn-gold" onClick={() => onFinish(finalScore)} style={{ width: '100%' }}>
            Continuer +{Math.max(10, Math.min(40, Math.round(finalScore * 4)))} humeur
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--text2)' }}>
        <span>Round {rounds + 1}/{MAX_ROUNDS} — {seq.length} couleurs</span>
        <span style={{ color: '#eab308' }}>{phase === 'show' ? 'Regarde…' : 'Reproduis !'}</span>
      </div>

      <div style={{ background: 'var(--bg3)', borderRadius: 'var(--r)', border: '1px solid rgba(234,179,8,.3)', padding: '1.5rem 1rem', textAlign: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', maxWidth: 220, margin: '0 auto' }}>
          {SIMON_LABELS.map((label, idx) => (
            <button key={idx} onClick={() => handleClick(idx)} disabled={phase !== 'input'}
              style={{
                background: lit === idx ? SIMON_COLORS[idx] + 'cc' : SIMON_COLORS[idx] + '22',
                border: `2px solid ${SIMON_COLORS[idx]}`,
                borderRadius: 'var(--r)', padding: '1rem',
                fontSize: '1.8rem', cursor: phase === 'input' ? 'pointer' : 'default',
                transition: 'background .15s',
                boxShadow: lit === idx ? `0 0 20px ${SIMON_COLORS[idx]}` : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Sequence progress */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: '1rem' }}>
          {seq.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i < userSeq.length ? '#22c55e' : 'rgba(255,255,255,.15)' }} />
          ))}
        </div>
      </div>

      <button onClick={onClose} style={abandonBtn}>Abandonner</button>
    </div>
  )
}

// ── SELECTOR ─────────────────────────────────────────────────────────────────
export default function GameSelector({ stage, onFinish, onClose }: Props) {
  const [selected, setSelected] = useState<GameId | null>(null)

  function handleBack() { setSelected(null) }

  if (selected === 'timing') return <TimingGame onFinish={onFinish} onClose={handleBack} />
  if (selected === 'memory') return <MemoryGame onFinish={onFinish} onClose={handleBack} />
  if (selected === 'rapide') return <RapideGame stage={stage} onFinish={onFinish} onClose={handleBack} />
  if (selected === 'simon')  return <SimonGame  onFinish={onFinish} onClose={handleBack} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ fontSize: '.75rem', color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
        Choisir un jeu
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
        {GAMES.map(g => (
          <button key={g.id} onClick={() => setSelected(g.id)}
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', padding: '.9rem .75rem',
              cursor: 'pointer', textAlign: 'left',
              transition: 'border-color .2s, background .2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '.3rem' }}>{g.icon}</div>
            <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: '.2rem' }}>{g.name}</div>
            <div style={{ fontSize: '.7rem', color: 'var(--text3)', lineHeight: 1.4 }}>{g.desc}</div>
          </button>
        ))}
      </div>
      <button onClick={onClose} style={abandonBtn}>Annuler</button>
    </div>
  )
}

const overlay: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: 260, gap: '1rem', position: 'relative',
  background: 'var(--bg3)', borderRadius: 'var(--r)',
  border: '1px solid rgba(34,211,238,.3)', padding: '1.5rem',
}

const abandonBtn: React.CSSProperties = {
  background: 'none', border: '1px solid var(--border)', borderRadius: 99,
  color: 'var(--text3)', fontSize: '.72rem', padding: '.25rem .75rem',
  cursor: 'pointer', alignSelf: 'center',
}
