'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addPost } from '@/lib/actions'
import { useToast } from './ToastProvider'
import type { Post, Profile } from '@/lib/supabase/types'

interface ForumProps {
  topic: string
  profile: Profile | null
  initialPosts?: (Post & { profiles: Pick<Profile, 'pseudo'> })[]
  filmTitle?: string
}

// ─── FIGHT CLUB ─────────────────────────────────────────────────────────────
const FC_RULES: Record<number, { title: string; text: string }> = {
  1: { title: 'Règle n°1', text: 'On ne parle pas du Fight Club.' },
  2: { title: 'Règle n°2', text: 'On ne parle pas du Fight Club.' },
  3: { title: 'Règle n°3', text: 'Quelqu\'un crie stop, quelqu\'un s\'écroule ou n\'en peut plus — le combat est terminé.' },
}

function FightClubRule({ rule, onClose }: { rule: 1 | 2 | 3; onClose: () => void }) {
  const { title, text } = FC_RULES[rule]
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <div style={{ textAlign: 'center', animation: 'ee-rule-in .35s ease', maxWidth: 560, padding: '0 2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem,6vw,3.5rem)', color: '#fff', textShadow: '0 0 40px rgba(255,255,255,.25)', lineHeight: 1.2 }}>
          {title}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem,3vw,1.7rem)', color: 'var(--red)', marginTop: '1rem', textShadow: '0 0 25px rgba(232,90,90,.6)', lineHeight: 1.4 }}>
          {text}
        </div>
        {rule === 3 && (
          <div style={{ color: 'var(--text2)', fontSize: '.82rem', marginTop: '1.2rem', fontStyle: 'italic' }}>
            Tu insistes encore ? Le combat commence…
          </div>
        )}
        <div style={{ color: 'var(--text3)', fontSize: '.75rem', marginTop: '1.5rem' }}>— Cliquer pour fermer —</div>
      </div>
    </div>
  )
}

function FightGame({ onClose }: { onClose: () => void }) {
  const ARENA_W = 620
  const CHAR_W = 40

  const [p1, setP1] = useState({ x: 60, hp: 100, punching: false })
  const [p2, setP2] = useState({ x: ARENA_W - 60 - CHAR_W, hp: 100, punching: false })
  const [winner, setWinner] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const keys = useRef<Set<string>>(new Set())
  const p1Ref = useRef(p1)
  const p2Ref = useRef(p2)
  const winnerRef = useRef<string | null>(null)
  p1Ref.current = p1; p2Ref.current = p2

  // Game loop
  useEffect(() => {
    if (winner) return
    const id = setInterval(() => {
      // Player 1 (← → Z)
      setP1(prev => {
        let { x, hp, punching } = prev
        if (keys.current.has('ArrowLeft')) x = Math.max(10, x - 7)
        if (keys.current.has('ArrowRight')) x = Math.min(ARENA_W - CHAR_W - 10, x + 7)
        punching = keys.current.has('z') || keys.current.has('Z')
        if (punching) {
          const dist = Math.abs(p2Ref.current.x - x)
          if (dist < 85) setP2(p => ({ ...p, hp: Math.max(0, p.hp - 7) }))
        }
        return { x, hp, punching }
      })
      // AI player 2
      setP2(prev => {
        let { x, hp, punching } = prev
        const p1x = p1Ref.current.x
        const dist = Math.abs(p1x - x)
        if (dist > 70) x += p1x > x ? 4 : -4
        x = Math.max(10, Math.min(ARENA_W - CHAR_W - 10, x))
        punching = dist < 85 && Math.random() < 0.12
        if (punching) setP1(p => ({ ...p, hp: Math.max(0, p.hp - 5) }))
        return { x, hp, punching }
      })
    }, 50)
    return () => clearInterval(id)
  }, [winner])

  // Win condition
  useEffect(() => {
    if (winnerRef.current) return
    if (p1.hp <= 0) { setWinner('Tyler Durden'); winnerRef.current = 'Tyler Durden' }
    if (p2.hp <= 0) { setWinner('Toi'); winnerRef.current = 'Toi' }
  }, [p1.hp, p2.hp])

  // Timer
  useEffect(() => {
    if (winner) return
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          const w = p1Ref.current.hp >= p2Ref.current.hp ? 'Toi' : 'Tyler Durden'
          setWinner(w); winnerRef.current = w; return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [winner])

  // Keys
  useEffect(() => {
    const gameKeys = new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','z','Z'])
    const dn = (e: KeyboardEvent) => { if (gameKeys.has(e.key)) { e.preventDefault(); e.stopPropagation() } keys.current.add(e.key) }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key)
    window.addEventListener('keydown', dn, true)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', dn, true); window.removeEventListener('keyup', up) }
  }, [])

  const Fighter = ({ pos, hp, punching, color, name, flip }: { pos: number; hp: number; punching: boolean; color: string; name: string; flip?: boolean }) => (
    <div style={{ position: 'absolute', bottom: 52, left: pos, width: CHAR_W, transform: flip ? 'scaleX(-1)' : undefined }}>
      {/* HP bar */}
      <div style={{ position: 'absolute', top: -18, left: '50%', transform: `translateX(-50%)${flip ? ' scaleX(-1)' : ''}`, width: 56, height: 5, background: '#333', borderRadius: 3 }}>
        <div style={{ width: `${hp}%`, height: '100%', background: hp > 50 ? '#22cc44' : hp > 25 ? '#ffcc00' : '#cc2222', borderRadius: 3, transition: 'width .08s' }} />
      </div>
      {/* Head */}
      <div style={{ width: 30, height: 28, borderRadius: '50%', background: '#f5c6a0', border: '2px solid #c8956a', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 5, height: 5, background: '#222', borderRadius: '50%' }} />
          <div style={{ width: 5, height: 5, background: '#222', borderRadius: '50%' }} />
        </div>
        <div style={{ width: 12, height: 4, border: '1px solid #555', borderRadius: 2 }} />
      </div>
      {/* Body */}
      <div style={{ width: CHAR_W, height: 46, background: color, border: '2px solid #333', borderRadius: '3px 3px 0 0', margin: '2px auto 0', position: 'relative' }}>
        {punching && <div style={{ position: 'absolute', right: -30, top: 10, width: 30, height: 10, background: color, border: '2px solid #333', borderRadius: 5 }} />}
      </div>
      {/* Legs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
        <div style={{ width: 14, height: 24, background: '#1a3a8c', border: '1px solid #122a6a', borderRadius: '0 0 4px 4px' }} />
        <div style={{ width: 14, height: 24, background: '#1a3a8c', border: '1px solid #122a6a', borderRadius: '0 0 4px 4px' }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: '.6rem', color: 'var(--text3)', marginTop: 1, transform: flip ? 'scaleX(-1)' : undefined }}>{name}</div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 9001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: ARENA_W, maxWidth: '95vw', background: '#131313', border: '2px solid #3a3a3a', borderRadius: 'var(--rl)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#0a0a0a', padding: '.65rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', color: 'var(--red)', fontSize: '1.05rem', letterSpacing: 1 }}>⚔️ FIGHT CLUB</div>
          <div style={{ display: 'flex', gap: '.8rem', alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', color: timeLeft < 10 ? 'var(--red)' : 'var(--gold)', fontSize: '.9rem' }}>⏱ {timeLeft}s</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 .2rem' }}>✕</button>
          </div>
        </div>

        {/* Arena */}
        <div style={{ height: 250, position: 'relative', background: 'linear-gradient(to bottom, #0f0f1a, #1a1030)', overflow: 'hidden' }}>
          {/* Crowd silhouettes */}
          <div style={{ position: 'absolute', bottom: 36, left: 0, right: 0, height: 24, background: 'rgba(0,0,0,.5)', borderTop: '1px solid #222' }} />
          {/* Floor */}
          <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, height: 20, background: '#2a2a2a', borderTop: '3px solid #444' }} />
          {/* Ring ropes */}
          <div style={{ position: 'absolute', bottom: 54, left: 20, right: 20, height: 2, background: '#cc4400', opacity: .7 }} />
          <div style={{ position: 'absolute', bottom: 70, left: 20, right: 20, height: 2, background: '#cc4400', opacity: .5 }} />

          <Fighter pos={p1.x} hp={p1.hp} punching={p1.punching} color="#cc4400" name="Toi" />
          <Fighter pos={p2.x} hp={p2.hp} punching={p2.punching} color="#4a4a8a" name="Tyler" flip />

          {winner && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.78)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', animation: 'ee-fadein .4s ease' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem,4vw,2.8rem)', color: 'var(--gold)' }}>{winner} gagne !</div>
                <div style={{ color: 'var(--text2)', fontSize: '.88rem', marginTop: '.5rem' }}>
                  {winner === 'Toi' ? '"Tu es Tyler Durden." 🏆' : '"La première règle du Fight Club..."'}
                </div>
                <button onClick={onClose} className="btn btn-outline" style={{ marginTop: '1.2rem', fontSize: '.8rem' }}>Fermer</button>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ background: '#0a0a0a', padding: '.6rem 1rem', display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', color: 'var(--text3)' }}>
          <span>← → Se déplacer · Z Frapper</span>
          <span>Toi: {p1.hp}hp · Tyler: {p2.hp}hp</span>
        </div>
      </div>
    </div>
  )
}

// ─── HAL 9000 ────────────────────────────────────────────────────────────────
const HAL_MSG = "Je suis désolé, Dave. Je ne peux pas faire ça."

function HalOverlay({ onClose }: { onClose: () => void }) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      if (i <= HAL_MSG.length) { setTyped(HAL_MSG.slice(0, i)); i++ }
      else clearInterval(id)
    }, 48)
    return () => clearInterval(id)
  }, [])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 130, height: 130, borderRadius: '50%',
          background: 'radial-gradient(circle at 38% 38%, #ff6633, #cc0000, #660000, #0a0000)',
          boxShadow: '0 0 60px rgba(255,50,0,.9), 0 0 130px rgba(180,0,0,.5)',
          margin: '0 auto 2rem',
          animation: 'ee-hal-pulse 2.4s ease-in-out infinite',
        }} />
        <div style={{ fontFamily: 'monospace', fontSize: 'clamp(.9rem,2.5vw,1.25rem)', color: '#ff5555', textShadow: '0 0 18px rgba(255,60,0,.8)', maxWidth: 420, lineHeight: 1.7, minHeight: '2em', padding: '0 1rem' }}>
          {typed}<span style={{ animation: 'ee-blink 1s infinite' }}>|</span>
        </div>
        <div style={{ color: 'var(--text3)', fontSize: '.72rem', marginTop: '1.8rem' }}>— Cliquer pour fermer —</div>
      </div>
    </div>
  )
}

// ─── FORREST GUMP ────────────────────────────────────────────────────────────
const FORREST_QUOTES = [
  "Run, Forrest, run!",
  "Stupid is as stupid does.",
  "Jenny... I love you.",
  "That's all I have to say about that.",
  "Mama always said life was like a box of chocolates.",
  "My mama always said you've got to put the past behind you.",
]

function ForrestOverlay({ onClose }: { onClose: () => void }) {
  const [drops, setDrops] = useState<{ id: number; text: string; x: number; y: number }[]>([])
  const counterRef = useRef(0)

  useEffect(() => {
    const addDrop = setInterval(() => {
      const quote = FORREST_QUOTES[counterRef.current % FORREST_QUOTES.length]
      setDrops(d => [...d, { id: counterRef.current++, text: quote, x: Math.random() * 78 + 2, y: -8 }])
    }, 700)
    const fallTick = setInterval(() => {
      setDrops(d => d.map(q => ({ ...q, y: q.y + 1.6 })).filter(q => q.y < 108))
    }, 50)
    const timeout = setTimeout(() => { clearInterval(addDrop); clearInterval(fallTick); onClose() }, 7000)
    return () => { clearInterval(addDrop); clearInterval(fallTick); clearTimeout(timeout) }
  }, [onClose])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', zIndex: 9000, overflow: 'hidden', cursor: 'pointer' }}>
      {/* Box */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', animation: 'ee-fadein .5s ease', pointerEvents: 'none' }}>
        <div style={{ fontSize: '5rem', lineHeight: 1 }}>🍫</div>
        <div style={{ fontFamily: 'var(--font-display)', color: '#d4a256', fontSize: 'clamp(1rem,3vw,1.4rem)', marginTop: '.7rem', textShadow: '0 2px 10px rgba(0,0,0,.8)' }}>
          Life is like a box of chocolates...
        </div>
        <div style={{ color: 'var(--text3)', fontSize: '.72rem', marginTop: '1rem' }}>Cliquer pour fermer</div>
      </div>

      {/* Falling quotes */}
      {drops.map(q => (
        <div key={q.id} style={{
          position: 'absolute', left: `${q.x}%`, top: `${q.y}%`,
          color: '#d4a256', fontFamily: 'var(--font-display)', fontSize: '.88rem',
          whiteSpace: 'nowrap', pointerEvents: 'none', textShadow: '0 2px 6px rgba(0,0,0,.9)',
        }}>
          {q.text}
        </div>
      ))}
    </div>
  )
}

// ─── PULP FICTION ────────────────────────────────────────────────────────────
const PULP_LINES = [
  { speaker: 'Vincent', text: "T'as essayé le Royale with Cheese ?" },
  { speaker: 'Jules',   text: "Comment ça s'appelle un Quarter Pounder en France ?" },
  { speaker: 'Vincent', text: "Un Royale with Cheese. À cause du système métrique." },
  { speaker: 'Jules',   text: "Royale with Cheese... Putain, j'aurais pas trouvé." },
  { speaker: 'Vincent', text: "Et le Big Mac, c'est quoi ?" },
  { speaker: 'Jules',   text: "Big Mac, c'est Big Mac. Mais ils disent 'Le Big Mac'." },
  { speaker: 'Vincent', text: "Le Big Mac..." },
  { speaker: 'Jules',   text: "Ouais. C'est un peu leur Quart de Livre avec fromage." },
]

function PulpFictionTerminal({ onClose }: { onClose: () => void }) {
  const [done, setDone] = useState<typeof PULP_LINES>([])
  const [lineIdx, setLineIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [current, setCurrent] = useState('')

  useEffect(() => {
    if (lineIdx >= PULP_LINES.length) return
    const line = PULP_LINES[lineIdx]
    if (charIdx < line.text.length) {
      const t = setTimeout(() => { setCurrent(line.text.slice(0, charIdx + 1)); setCharIdx(c => c + 1) }, 38)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => { setDone(d => [...d, line]); setCurrent(''); setCharIdx(0); setLineIdx(i => i + 1) }, 700)
      return () => clearTimeout(t)
    }
  }, [lineIdx, charIdx])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.88)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '1rem' }}>
      <div style={{ width: 520, maxWidth: '94vw', background: '#0c0c0c', border: '1px solid #2a2a2a', borderRadius: 10, fontFamily: 'monospace', overflow: 'hidden' }}>
        <div style={{ background: '#1e1e1e', padding: '.5rem 1rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
          <span style={{ color: '#666', fontSize: '.72rem', marginLeft: '.4rem' }}>pulp_fiction.sh — bash</span>
        </div>
        <div style={{ padding: '1.2rem', minHeight: 220, maxHeight: '70vh', overflowY: 'auto' }}>
          {done.map((line, i) => (
            <div key={i} style={{ marginBottom: '.55rem', lineHeight: 1.5 }}>
              <span style={{ color: line.speaker === 'Jules' ? '#22cc66' : '#cc7722', fontWeight: 700 }}>{line.speaker}: </span>
              <span style={{ color: '#e0e0e0' }}>{line.text}</span>
            </div>
          ))}
          {lineIdx < PULP_LINES.length && (
            <div style={{ marginBottom: '.55rem', lineHeight: 1.5 }}>
              <span style={{ color: PULP_LINES[lineIdx].speaker === 'Jules' ? '#22cc66' : '#cc7722', fontWeight: 700 }}>{PULP_LINES[lineIdx].speaker}: </span>
              <span style={{ color: '#e0e0e0' }}>{current}<span style={{ animation: 'ee-blink 1s infinite' }}>█</span></span>
            </div>
          )}
          {lineIdx >= PULP_LINES.length && (
            <div style={{ color: '#555', fontSize: '.78rem', marginTop: '1rem' }}>[end of script] — Cliquer pour fermer.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── THE SHINING ─────────────────────────────────────────────────────────────
function ShiningEffect({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<'redrum' | 'murder'>('redrum')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('murder'), 1400)
    const t2 = setTimeout(onClose, 5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      animation: phase === 'murder' ? 'ee-shake .6s ease' : undefined,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(3rem,12vw,8rem)',
          color: '#cc0000',
          textShadow: '0 0 50px rgba(200,0,0,.9)',
          letterSpacing: '.15em',
          transition: 'all 1.4s ease',
          transform: phase === 'redrum' ? 'scaleX(-1)' : 'scaleX(1)',
          filter: phase === 'redrum' ? 'blur(2px)' : 'none',
        }}>
          {phase === 'redrum' ? 'REDRUM' : 'MURDER'}
        </div>
        {phase === 'murder' && (
          <div style={{ color: 'rgba(200,0,0,.6)', fontSize: '1.5rem', marginTop: '.5rem', letterSpacing: '.3em' }}>
            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
          </div>
        )}
        <div style={{ color: 'var(--text3)', fontSize: '.72rem', marginTop: '1.8rem' }}>— Cliquer pour fermer —</div>
      </div>
    </div>
  )
}

// ─── MAIN FORUM COMPONENT ────────────────────────────────────────────────────
export default function Forum({ topic, profile, initialPosts = [], filmTitle }: ForumProps) {
  const [posts, setPosts] = useState(initialPosts)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()

  // Easter egg states
  const [fightRule, setFightRule] = useState<1 | 2 | null>(null)
  const [showFightGame, setShowFightGame] = useState(false)
  const [showHal, setShowHal] = useState(false)
  const [showForrest, setShowForrest] = useState(false)
  const [showPulp, setShowPulp] = useState(false)
  const [showShining, setShowShining] = useState(false)

  const isFightClubForum = filmTitle?.toLowerCase().includes('fight club') ?? false
  const is2001Forum = (filmTitle?.toLowerCase().includes('2001') || filmTitle?.toLowerCase().includes('odyssée')) ?? false

  function checkEasterEggs(content: string) {
    const low = content.toLowerCase()

    // Fight Club (only in FC forum)
    if (isFightClubForum && low.includes('fight club')) {
      const key = `ee_fc_${topic}`
      const count = (parseInt(localStorage.getItem(key) ?? '0') + 1)
      localStorage.setItem(key, String(count))
      if (count === 1) setFightRule(1)
      else if (count === 2) setFightRule(2)
      else { setFightRule(null); setShowFightGame(true) }
      return
    }
    // HAL 9000 (only in 2001 forum)
    if (is2001Forum && low.includes('open the pod bay doors')) { setShowHal(true); return }
    // Forrest Gump (any forum)
    if (low.includes('life is like a box of chocolates')) { setShowForrest(true); return }
    // Pulp Fiction (any forum)
    if (low.includes('royale with cheese')) { setShowPulp(true); return }
    // The Shining (any forum)
    if (low.includes('redrum')) { setShowShining(true); return }
  }

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`forum:${topic}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts', filter: `topic=eq.${topic}` },
        async (payload) => {
          const { data: prof } = await supabase.from('profiles').select('pseudo').eq('id', payload.new.user_id).single()
          const newPost = { ...payload.new, profiles: prof } as unknown as Post & { profiles: Pick<Profile, 'pseudo'> }
          setPosts(prev => [...prev, newPost])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [topic])

  async function submit() {
    if (!text.trim() || loading) return
    setLoading(true)
    const content = text.trim()
    const result = await addPost(topic, content)
    if (result.error) addToast(result.error, '⚠️')
    else {
      setText('')
      checkEasterEggs(content)
    }
    setLoading(false)
  }

  return (
    <div>
      {posts.length === 0 && (
        <div style={{ color: 'var(--text3)', fontSize: '.82rem', textAlign: 'center', padding: '1.5rem', background: 'var(--bg3)', borderRadius: 'var(--r)' }}>
          Aucun message — sois le premier à donner ton avis !
        </div>
      )}

      <div style={{ maxHeight: 400, overflowY: 'auto', paddingRight: 4 }}>
        {posts.map(p => (
          <div key={p.id} className="forum-post">
            <div className="forum-post-head">
              <div className="forum-ava">{p.profiles?.pseudo?.slice(0, 2).toUpperCase()}</div>
              <span style={{ fontSize: '.8rem', fontWeight: 500 }}>{p.profiles?.pseudo}</span>
              <span style={{ fontSize: '.67rem', color: 'var(--text3)', marginLeft: 'auto' }}>
                {new Date(p.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div style={{ fontSize: '.83rem', color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {profile ? (
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'flex-end', marginTop: '1rem' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit() }}
            placeholder="Ton commentaire… (Ctrl+Entrée pour envoyer)"
            style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.6rem .8rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.83rem', resize: 'vertical', minHeight: 65, outline: 'none' }}
            onFocus={e => { e.target.style.borderColor = 'var(--gold)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border2)' }}
          />
          <button className="btn btn-gold" onClick={submit} disabled={loading} style={{ alignSelf: 'flex-end' }}>
            {loading ? '…' : 'Poster'}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '.82rem', color: 'var(--text3)' }}>
          <a href="/auth" style={{ color: 'var(--gold)', textDecoration: 'none' }}>Connecte-toi</a> pour participer à la discussion.
        </div>
      )}

      {/* Easter egg overlays */}
      {fightRule !== null && <FightClubRule rule={fightRule} onClose={() => setFightRule(null)} />}
      {showFightGame    && <FightGame   onClose={() => setShowFightGame(false)}  />}
      {showHal          && <HalOverlay  onClose={() => setShowHal(false)}        />}
      {showForrest      && <ForrestOverlay onClose={() => setShowForrest(false)} />}
      {showPulp         && <PulpFictionTerminal onClose={() => setShowPulp(false)} />}
      {showShining      && <ShiningEffect onClose={() => setShowShining(false)}  />}
    </div>
  )
}
