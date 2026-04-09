'use client'

import { useState, useEffect, useRef } from 'react'
import { unlockRandomAccessory, type Accessory } from '@/lib/tamaAccessories'

interface Props {
  stage: string
  onFinish: (score: number) => void
  onClose: () => void
}

type GameId = 'timing' | 'paires' | 'rapide' | 'simon'
type Phase  = 'playing' | 'continue_prompt' | 'acc_unlock' | 'done'

const GAMES: { id: GameId; name: string; desc: string; icon: string }[] = [
  { id: 'timing', name: 'Réflexes', desc: 'Arrête la barre dans la zone verte !',           icon: '🎯' },
  { id: 'paires', name: 'Paires',   desc: 'Retrouve toutes les paires de cartes !',          icon: '🃏' },
  { id: 'rapide', name: 'Rapidité', desc: "Clique sur l'alien avant qu'il disparaisse !",    icon: '⚡' },
  { id: 'simon',  name: 'Simon',    desc: 'Répète la séquence de couleurs croissante !',     icon: '🌈' },
]

// ── SHARED UI ─────────────────────────────────────────────────────────────────
function ContinuePrompt({ title, perf, hint, onContinue, onTerminate }: {
  title: string; perf: string; hint: string; onContinue: () => void; onTerminate: (s: number) => void; score: number
}) {
  return (
    <div style={overlayStyle}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '.3rem' }}>⭐</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: '#22d3ee', marginBottom: '.3rem' }}>{title}</div>
        <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: '.5rem' }}>{perf}</div>
        <div style={{ fontSize: '.75rem', color: 'var(--text3)', background: 'rgba(255,255,255,.04)', padding: '.5rem .8rem', borderRadius: 8, lineHeight: 1.5, marginBottom: '1.2rem' }}>
          {hint}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          <button className="btn btn-gold" onClick={onContinue}>🔥 Mode infini</button>
          <button onClick={() => onTerminate(0)} style={smallBtn}>Terminer et récupérer</button>
        </div>
      </div>
    </div>
  )
}

function AccUnlockScreen({ accessory, isNew, onClose }: { accessory: Accessory; isNew: boolean; onClose: () => void }) {
  return (
    <div style={{ ...overlayStyle, background: 'rgba(0,8,4,.98)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '.72rem', color: '#a78bfa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: '.5rem' }}>
          {isNew ? '🎁 Nouvel accessoire !' : 'Déjà possédé…'}
        </div>
        <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 24px #a78bfa)', marginBottom: '.4rem' }}>{accessory.emoji}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: '#a78bfa', marginBottom: '.3rem' }}>{accessory.name}</div>
        <div style={{ fontSize: '.8rem', color: 'var(--text3)', marginBottom: '1rem' }}>
          {isNew ? 'Ton alien est aux anges !' : 'Mais +40 humeur quand même !'} ❤️
        </div>
        <button className="btn btn-gold" onClick={onClose} style={{ width: '100%' }}>Super !</button>
      </div>
    </div>
  )
}

// ── TIMING GAME ───────────────────────────────────────────────────────────────
// Base : 5 rounds | Infini : barre + rapide + zone + petite | Accessoire : round 15
const T_BASE = 5
const T_ACC  = 15
const T_GREEN_BASE = 24  // % width
const T_GREEN_MIN  = 5

function TimingGame({ onFinish, onClose }: { onFinish: (s: number) => void; onClose: () => void }) {
  const [phase,      setPhase]      = useState<Phase>('playing')
  const [totalRound, setTotalRound] = useState(0)
  const [hits,       setHits]       = useState(0)
  const [isInfinite, setIsInfinite] = useState(false)
  const [feedback,   setFeedback]   = useState<string | null>(null)
  const [pos,        setPos]        = useState(50)
  const [unlockedAcc, setUnlockedAcc] = useState<{ accessory: Accessory; isNew: boolean } | null>(null)

  const posRef  = useRef(50)
  const dirRef  = useRef(1)
  const rafRef  = useRef<number>()
  const lastRef = useRef(0)

  const infRound   = isInfinite ? totalRound - T_BASE : 0
  const greenWidth = isInfinite ? Math.max(T_GREEN_MIN, T_GREEN_BASE - infRound * 1.5) : T_GREEN_BASE
  const GREEN_MIN  = 50 - greenWidth / 2
  const GREEN_MAX  = 50 + greenWidth / 2
  // Base : vitesse fixe. Infini : accélère à chaque round.
  const speed      = isInfinite ? 60 + infRound * 10 : 60

  useEffect(() => {
    if (phase !== 'playing' || feedback) return
    posRef.current  = Math.random() * 100
    dirRef.current  = Math.random() > .5 ? 1 : -1
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
  }, [phase, totalRound, feedback]) // eslint-disable-line

  function stopBar() {
    if (phase !== 'playing' || feedback) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const hit = posRef.current >= GREEN_MIN && posRef.current <= GREEN_MAX
    if (hit) setHits(h => h + 1)
    setFeedback(hit ? '✓ Dans la zone !' : '✗ Raté !')

    setTimeout(() => {
      setFeedback(null)
      const next = totalRound + 1
      setTotalRound(next)

      if (next === T_ACC) {
        const result = unlockRandomAccessory()
        setUnlockedAcc(result)
        setPhase('acc_unlock')
        return
      }
      if (next === T_BASE && !isInfinite) {
        setPhase('continue_prompt')
        return
      }
    }, 700)
  }

  const score      = Math.round((hits / Math.max(1, totalRound)) * 10)
  const displayRound = totalRound + 1
  const showRound  = isInfinite ? `Round ${displayRound} (∞)` : `Round ${displayRound}/${T_BASE}`

  if (phase === 'acc_unlock' && unlockedAcc) {
    return <AccUnlockScreen {...unlockedAcc} onClose={() => setPhase('done')} />
  }
  if (phase === 'done') {
    const finalScore = unlockedAcc ? 10 : score
    return (
      <div style={overlayStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.4rem' }}>🎯</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#a78bfa', marginBottom: '.4rem' }}>
            {hits} / {totalRound} dans la zone
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: '1.2rem' }}>
            {hits >= totalRound * .8 ? '🔥 Réflexes légendaires !' : hits >= totalRound * .5 ? '👍 Pas mal !' : '😅 Continue à t\'entraîner…'}
          </div>
          <button className="btn btn-gold" onClick={() => onFinish(finalScore)} style={{ width: '100%' }}>
            Récupérer +{Math.max(10, Math.min(40, finalScore * 4))} humeur
          </button>
        </div>
      </div>
    )
  }
  if (phase === 'continue_prompt') {
    return (
      <ContinuePrompt
        title="Objectif atteint !"
        perf={`${hits}/${T_BASE} réussis`}
        hint={`Mode infini : la barre accélère et la zone verte rétrécit à chaque round. Atteins le round ${T_ACC} pour débloquer un accessoire !`}
        score={score}
        onContinue={() => { setIsInfinite(true); setPhase('playing') }}
        onTerminate={() => setPhase('done')}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--text2)' }}>
        <span>{showRound}</span>
        <span style={{ color: '#a78bfa', fontFamily: 'var(--font-display)' }}>✓ {hits}</span>
        {isInfinite && <span style={{ fontSize: '.7rem', color: '#a78bfa' }}>Objectif : round {T_ACC}</span>}
      </div>

      <div style={{ background: 'var(--bg3)', borderRadius: 'var(--r)', border: '1px solid rgba(167,139,250,.3)', padding: '2rem 1rem', textAlign: 'center', cursor: 'pointer' }} onClick={stopBar}>
        <div style={{ position: 'relative', height: 32, background: 'rgba(255,255,255,.05)', borderRadius: 99, overflow: 'hidden', marginBottom: '1rem' }}>
          <div style={{ position: 'absolute', left: `${GREEN_MIN}%`, width: `${greenWidth}%`, top: 0, bottom: 0, background: 'rgba(34,197,94,.2)', borderLeft: '2px solid #22c55e', borderRight: '2px solid #22c55e', transition: 'width .3s' }} />
          <div style={{ position: 'absolute', top: 4, bottom: 4, width: 8, left: `calc(${pos}% - 4px)`, background: '#a78bfa', borderRadius: 99, boxShadow: '0 0 8px #a78bfa' }} />
        </div>
        {feedback
          ? <div style={{ fontSize: '1rem', fontWeight: 700, color: feedback.startsWith('✓') ? '#22c55e' : '#ef4444' }}>{feedback}</div>
          : <><button className="btn btn-outline" onClick={e => { e.stopPropagation(); stopBar() }} style={{ fontSize: '.9rem', padding: '.5rem 2rem' }}>STOP !</button>
             <div style={{ fontSize: '.65rem', color: 'var(--text3)', marginTop: '.4rem' }}>Zone verte : {Math.round(greenWidth)}%</div></>
        }
      </div>
      <button onClick={onClose} style={abandonBtn}>Abandonner</button>
    </div>
  )
}

// ── PAIRES GAME ───────────────────────────────────────────────────────────────
// Remplace Memory. Base : trouver 8 paires | Accessoire : ≤ 3 erreurs sur une grille
const PAIR_EMOJIS = ['🤍', '👾', '💥', '🥚', '🌑', '💀', '👁️', '🦷']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makePairesCards() {
  return shuffle([...PAIR_EMOJIS, ...PAIR_EMOJIS]).map((emoji, id) => ({
    id, emoji, flipped: false, matched: false,
  }))
}

function PairesGame({ onFinish, onClose }: { onFinish: (s: number) => void; onClose: () => void }) {
  const [phase,      setPhase]      = useState<Phase>('playing')
  const [cards,      setCards]      = useState(makePairesCards)
  const [selected,   setSelected]   = useState<number | null>(null)
  const [wrongs,     setWrongs]     = useState(0)
  const [pairs,      setPairs]      = useState(0)
  const [isInfinite, setIsInfinite] = useState(false)
  const [grids,      setGrids]      = useState(1)   // grids completed in infinite
  const [locked,     setLocked]     = useState(false)
  const [unlockedAcc, setUnlockedAcc] = useState<{ accessory: Accessory; isNew: boolean } | null>(null)

  function flipCard(id: number) {
    if (locked || phase !== 'playing') return
    const card = cards.find(c => c.id === id)
    if (!card || card.matched || card.flipped) return

    if (selected === null) {
      setCards(cs => cs.map(c => c.id === id ? { ...c, flipped: true } : c))
      setSelected(id)
      return
    }

    // Second card
    const first = cards.find(c => c.id === selected)!
    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c)
    setCards(newCards)
    setSelected(null)
    setLocked(true)

    setTimeout(() => {
      if (first.emoji === card.emoji) {
        // Match
        const matched = newCards.map(c =>
          c.id === id || c.id === selected ? { ...c, matched: true } : c
        )
        setCards(matched)
        const newPairs = pairs + 1
        setPairs(newPairs)
        setLocked(false)

        if (newPairs === PAIR_EMOJIS.length) {
          // Grid complete
          if (wrongs <= 3) {
            const result = unlockRandomAccessory()
            setUnlockedAcc(result)
            setPhase('acc_unlock')
          } else {
            setPhase('continue_prompt')
          }
        }
      } else {
        // No match
        setCards(newCards.map(c => c.id === id || c.id === selected ? { ...c, flipped: false } : c))
        setWrongs(w => w + 1)
        setLocked(false)
      }
    }, 900)
  }

  const score = Math.round(Math.max(0, 10 - wrongs * 1.5))

  if (phase === 'acc_unlock' && unlockedAcc) {
    return <AccUnlockScreen {...unlockedAcc} onClose={() => setPhase('done')} />
  }
  if (phase === 'done') {
    const finalScore = unlockedAcc ? 10 : score
    return (
      <div style={overlayStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.4rem' }}>🃏</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#22d3ee', marginBottom: '.4rem' }}>
            {wrongs} erreur{wrongs > 1 ? 's' : ''} — {grids} grille{grids > 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: '1.2rem' }}>
            {wrongs <= 3 ? '🧠 Mémoire parfaite !' : wrongs <= 6 ? '👍 Bien joué !' : '😅 Entraîne-toi encore…'}
          </div>
          <button className="btn btn-gold" onClick={() => onFinish(finalScore)} style={{ width: '100%' }}>
            Récupérer +{Math.max(10, Math.min(40, finalScore * 4))} humeur
          </button>
        </div>
      </div>
    )
  }
  if (phase === 'continue_prompt') {
    return (
      <ContinuePrompt
        title="Grille terminée !"
        perf={`${wrongs} erreur${wrongs > 1 ? 's' : ''}`}
        hint={`Mode infini : nouvelles grilles à l'infini. Termine une grille avec ≤ 3 erreurs pour débloquer un accessoire !`}
        score={score}
        onContinue={() => {
          setCards(makePairesCards())
          setPairs(0)
          setSelected(null)
          setIsInfinite(true)
          setGrids(g => g + 1)
          setPhase('playing')
        }}
        onTerminate={() => setPhase('done')}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--text2)' }}>
        <span>Paires : {pairs}/{PAIR_EMOJIS.length}</span>
        <span style={{ color: wrongs > 3 ? '#ef4444' : '#22d3ee' }}>✗ {wrongs} erreur{wrongs > 1 ? 's' : ''}</span>
        {isInfinite && <span style={{ fontSize: '.7rem', color: '#22d3ee' }}>≤ 3 erreurs = accessoire</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
        {cards.map(card => (
          <button key={card.id} onClick={() => flipCard(card.id)}
            style={{
              aspectRatio: '1', background: card.matched ? 'rgba(34,197,94,.15)' : card.flipped ? 'var(--bg2)' : 'var(--bg3)',
              border: `1px solid ${card.matched ? '#22c55e44' : card.flipped ? 'var(--border2)' : 'var(--border)'}`,
              borderRadius: 8, fontSize: '1.4rem', cursor: card.matched || card.flipped ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .2s',
            }}>
            {(card.flipped || card.matched) ? card.emoji : '▪'}
          </button>
        ))}
      </div>

      <div style={{ fontSize: '.72rem', color: 'var(--text3)', textAlign: 'center' }}>
        Trouve toutes les paires — ≤ 3 erreurs pour un bonus !
      </div>
      <button onClick={onClose} style={abandonBtn}>Abandonner</button>
    </div>
  )
}

// ── RAPIDE GAME ───────────────────────────────────────────────────────────────
// Base : 15s | Infini : rounds de 15s de plus en plus rapides | Accessoire : 15 pts total
const R_ACC_SCORE = 15

const ALIEN_ICON_MAP: Record<string, string> = {
  egg: '🥚', facehugger: '🤍', chestburster: '💥', xenomorph: '👾',
}

function RapideGame({ stage, onFinish, onClose }: { stage: string; onFinish: (s: number) => void; onClose: () => void }) {
  const [phase,       setPhase]      = useState<Phase>('playing')
  const [timeLeft,    setTimeLeft]   = useState(15)
  const [totalScore,  setTotalScore] = useState(0)
  const [roundScore,  setRoundScore] = useState(0)
  const [visibleMs,   setVisibleMs]  = useState(700)   // alien visible duration
  const [alienPos,    setAlienPos]   = useState({ x: 50, y: 50 })
  const [visible,     setVisible]    = useState(true)
  const [isInfinite,  setIsInfinite] = useState(false)
  const [unlockedAcc, setUnlockedAcc] = useState<{ accessory: Accessory; isNew: boolean } | null>(null)

  const scoreRef  = useRef(0)
  const timerRef  = useRef<ReturnType<typeof setTimeout>>()
  const icon = ALIEN_ICON_MAP[stage] ?? '👾'

  function moveAlien(ms: number) {
    setAlienPos({ x: 8 + Math.random() * 84, y: 8 + Math.random() * 84 })
    setVisible(true)
    timerRef.current = setTimeout(() => {
      setVisible(false)
      timerRef.current = setTimeout(() => moveAlien(ms), 200)
    }, ms)
  }

  useEffect(() => {
    if (phase !== 'playing') return
    scoreRef.current = 0
    setRoundScore(0)
    moveAlien(visibleMs)
    const cd = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(cd)
          if (timerRef.current) clearTimeout(timerRef.current)
          const roundTotal = totalScore + scoreRef.current
          setTotalScore(roundTotal)

          if (roundTotal >= R_ACC_SCORE && !unlockedAcc) {
            const result = unlockRandomAccessory()
            setUnlockedAcc(result)
            setPhase('acc_unlock')
          } else {
            setPhase('continue_prompt')
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => {
      clearInterval(cd)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [phase]) // eslint-disable-line

  function catchAlien() {
    if (phase !== 'playing' || !visible) return
    scoreRef.current++
    setRoundScore(scoreRef.current)
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
    timerRef.current = setTimeout(() => moveAlien(visibleMs), 150)
  }

  if (phase === 'acc_unlock' && unlockedAcc) {
    return <AccUnlockScreen {...unlockedAcc} onClose={() => setPhase('done')} />
  }
  if (phase === 'done') {
    const finalScore = unlockedAcc ? 10 : Math.round(Math.min(10, totalScore * 10 / R_ACC_SCORE))
    return (
      <div style={overlayStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.4rem' }}>{icon}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#f97316', marginBottom: '.4rem' }}>
            {totalScore} attrapé{totalScore > 1 ? 's' : ''} au total
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: '1.2rem' }}>
            {totalScore >= R_ACC_SCORE ? '⚡ Fulgurant !' : totalScore >= 8 ? '👍 Réactif !' : '😅 Continue !'}
          </div>
          <button className="btn btn-gold" onClick={() => onFinish(finalScore)} style={{ width: '100%' }}>
            Récupérer +{Math.max(10, Math.min(40, finalScore * 4))} humeur
          </button>
        </div>
      </div>
    )
  }
  if (phase === 'continue_prompt') {
    return (
      <ContinuePrompt
        title="Round terminé !"
        perf={`${totalScore} attrapé${totalScore > 1 ? 's' : ''} au total`}
        hint={`Mode infini : l'alien disparaît de plus en plus vite ! Atteins ${R_ACC_SCORE} points au total pour débloquer un accessoire.`}
        score={Math.round(Math.min(10, totalScore * 10 / R_ACC_SCORE))}
        onContinue={() => {
          setIsInfinite(true)
          setVisibleMs(v => Math.max(250, Math.round(v * .8)))
          setTimeLeft(15)
          setPhase('playing')
        }}
        onTerminate={() => setPhase('done')}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--text2)' }}>
        <span>⏱ {timeLeft}s</span>
        <span style={{ color: '#f97316', fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{roundScore}</span>
        {isInfinite && <span style={{ fontSize: '.7rem', color: '#f97316' }}>Total : {totalScore} / {R_ACC_SCORE}</span>}
      </div>

      <div style={{ position: 'relative', width: '100%', height: 260, background: 'var(--bg3)', borderRadius: 'var(--r)', border: '1px solid rgba(249,115,22,.3)', overflow: 'hidden', cursor: 'crosshair', userSelect: 'none' }}>
        {[...Array(15)].map((_, i) => (
          <div key={i} style={{ position: 'absolute', left: `${(i * 43 + 17) % 100}%`, top: `${(i * 61 + 11) % 100}%`, width: 1, height: 1, background: '#fff', opacity: .2 }} />
        ))}
        {visible && (
          <button onClick={catchAlien} style={{
            position: 'absolute', left: `${alienPos.x}%`, top: `${alienPos.y}%`,
            transform: 'translate(-50%, -50%)', background: 'none', border: 'none',
            cursor: 'pointer', padding: 0, fontSize: '2rem', lineHeight: 1,
            filter: 'drop-shadow(0 0 8px #f97316)',
          }}>
            {icon}
          </button>
        )}
      </div>
      <button onClick={onClose} style={abandonBtn}>Abandonner</button>
    </div>
  )
}

// ── SIMON GAME ────────────────────────────────────────────────────────────────
// Base : 7 rounds | Infini : séquence continue | Accessoire : round 15
const SIMON_BASE = 7
const SIMON_ACC  = 15
const SIMON_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308']
const SIMON_LABELS = ['🔴', '🟢', '🔵', '🟡']

function SimonGame({ onFinish, onClose }: { onFinish: (s: number) => void; onClose: () => void }) {
  const [phase,      setPhase]      = useState<Phase>('playing')
  const [seq,        setSeq]        = useState<number[]>([])
  const [userSeq,    setUserSeq]    = useState<number[]>([])
  const [showPhase,  setShowPhase]  = useState(true)   // true = showing seq, false = input
  const [lit,        setLit]        = useState<number | null>(null)
  const [rounds,     setRounds]     = useState(0)
  const [failed,     setFailed]     = useState(false)
  const [isInfinite, setIsInfinite] = useState(false)
  const [unlockedAcc, setUnlockedAcc] = useState<{ accessory: Accessory; isNew: boolean } | null>(null)

  function showSequence(s: number[]) {
    setShowPhase(true)
    setUserSeq([])
    let i = 0
    function next() {
      if (i >= s.length) { setTimeout(() => setShowPhase(false), 400); return }
      setTimeout(() => {
        setLit(s[i])
        setTimeout(() => { setLit(null); i++; setTimeout(next, 300) }, 500)
      }, 100)
    }
    setTimeout(next, 600)
  }

  useEffect(() => {
    const initial = [Math.floor(Math.random() * 4)]
    setSeq(initial)
    showSequence(initial)
  }, []) // eslint-disable-line

  function handleClick(idx: number) {
    if (showPhase || phase !== 'playing') return
    const next = [...userSeq, idx]
    setUserSeq(next)
    setLit(idx)
    setTimeout(() => setLit(null), 200)

    if (next[next.length - 1] !== seq[next.length - 1]) {
      setFailed(true)
      setPhase('done')
      return
    }
    if (next.length === seq.length) {
      const newRounds = rounds + 1
      setRounds(newRounds)

      if (newRounds === SIMON_ACC) {
        const result = unlockRandomAccessory()
        setUnlockedAcc(result)
        setPhase('acc_unlock')
        return
      }
      if (newRounds === SIMON_BASE && !isInfinite) {
        setPhase('continue_prompt')
        return
      }
      const newSeq = [...seq, Math.floor(Math.random() * 4)]
      setSeq(newSeq)
      setTimeout(() => showSequence(newSeq), 600)
    }
  }

  const score = Math.round(Math.min(10, rounds / SIMON_BASE * 10))

  if (phase === 'acc_unlock' && unlockedAcc) {
    return <AccUnlockScreen {...unlockedAcc} onClose={() => setPhase('done')} />
  }
  if (phase === 'done') {
    const finalScore = unlockedAcc ? 10 : score
    return (
      <div style={overlayStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.4rem' }}>🌈</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: '#eab308', marginBottom: '.4rem' }}>
            {failed ? `Éliminé au round ${rounds + 1}` : `${rounds} rounds ✓`}
          </div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: '1.2rem' }}>
            {!failed ? '🌟 Parfait !' : rounds >= 10 ? '👍 Très bien !' : rounds >= 5 ? '💪 Pas mal !' : '😅 La séquence était longue…'}
          </div>
          <button className="btn btn-gold" onClick={() => onFinish(finalScore)} style={{ width: '100%' }}>
            Récupérer +{Math.max(10, Math.min(40, finalScore * 4))} humeur
          </button>
        </div>
      </div>
    )
  }
  if (phase === 'continue_prompt') {
    return (
      <ContinuePrompt
        title={`${SIMON_BASE} rounds réussis !`}
        perf="Impressionnant"
        hint={`Mode infini : la séquence continue de grandir. Atteins le round ${SIMON_ACC} pour débloquer un accessoire !`}
        score={10}
        onContinue={() => {
          setIsInfinite(true)
          const newSeq = [...seq, Math.floor(Math.random() * 4)]
          setSeq(newSeq)
          setTimeout(() => showSequence(newSeq), 300)
          setPhase('playing')
        }}
        onTerminate={() => setPhase('done')}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', color: 'var(--text2)' }}>
        <span>Round {rounds + 1}{isInfinite ? ' (∞)' : `/${SIMON_BASE}`} — {seq.length} couleurs</span>
        <span style={{ color: '#eab308' }}>{showPhase ? '👁 Regarde…' : '🎮 Reproduis !'}</span>
      </div>

      <div style={{ background: 'var(--bg3)', borderRadius: 'var(--r)', border: '1px solid rgba(234,179,8,.3)', padding: '1.5rem 1rem', textAlign: 'center' }}>
        {isInfinite && (
          <div style={{ fontSize: '.7rem', color: '#a78bfa', marginBottom: '.5rem' }}>
            Objectif : round {SIMON_ACC}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', maxWidth: 220, margin: '0 auto' }}>
          {SIMON_LABELS.map((label, idx) => (
            <button key={idx} onClick={() => handleClick(idx)} disabled={showPhase}
              style={{
                background: lit === idx ? SIMON_COLORS[idx] + 'cc' : SIMON_COLORS[idx] + '22',
                border: `2px solid ${SIMON_COLORS[idx]}`,
                borderRadius: 'var(--r)', padding: '1rem',
                fontSize: '1.8rem', cursor: showPhase ? 'default' : 'pointer',
                transition: 'background .15s',
                boxShadow: lit === idx ? `0 0 20px ${SIMON_COLORS[idx]}` : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: '1rem' }}>
          {seq.map((_, i) => (
            <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i < userSeq.length ? '#22c55e' : 'rgba(255,255,255,.15)' }} />
          ))}
        </div>
      </div>
      <button onClick={onClose} style={abandonBtn}>Abandonner</button>
    </div>
  )
}

// ── SELECTOR ──────────────────────────────────────────────────────────────────
export default function GameSelector({ stage, onFinish, onClose }: Props) {
  const [selected, setSelected] = useState<GameId | null>(null)
  function back() { setSelected(null) }

  if (selected === 'timing') return <TimingGame onFinish={onFinish} onClose={back} />
  if (selected === 'paires') return <PairesGame onFinish={onFinish} onClose={back} />
  if (selected === 'rapide') return <RapideGame stage={stage} onFinish={onFinish} onClose={back} />
  if (selected === 'simon')  return <SimonGame  onFinish={onFinish} onClose={back} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ fontSize: '.75rem', color: 'var(--text3)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>Choisir un jeu</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
        {GAMES.map(g => (
          <button key={g.id} onClick={() => setSelected(g.id)}
            style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', padding: '.9rem .75rem',
              cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg2)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';  (e.currentTarget as HTMLElement).style.background = 'var(--bg3)' }}
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

// ── STYLES ────────────────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: 260, background: 'var(--bg3)', borderRadius: 'var(--r)',
  border: '1px solid rgba(34,211,238,.3)', padding: '1.5rem',
}

const abandonBtn: React.CSSProperties = {
  background: 'none', border: '1px solid var(--border)', borderRadius: 99,
  color: 'var(--text3)', fontSize: '.72rem', padding: '.25rem .75rem',
  cursor: 'pointer', alignSelf: 'center',
}

const smallBtn: React.CSSProperties = {
  background: 'none', border: '1px solid var(--border)', borderRadius: 99,
  color: 'var(--text3)', fontSize: '.75rem', padding: '.3rem .9rem', cursor: 'pointer',
}
