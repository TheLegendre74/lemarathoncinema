'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import type { GenreTheme } from '@/lib/weeklyTheme'

export default function ThemeOverlay({ genre }: { genre: GenreTheme }) {
  switch (genre) {
    case 'Action':    return <ActionOverlay />
    case 'Animation': return <AnimationOverlay />
    case 'Aventure':  return <AventureOverlay />
    case 'Comédie':   return <ComedieOverlay />
    case 'Crime':     return <CrimeOverlay />
    case 'Drame':     return <DrameOverlay />
    case 'Fantaisie': return <FantaisieOverlay />
    case 'Guerre':    return <GuerreOverlay />
    case 'Horreur':   return <HorreurOverlay />
    case 'Policier':  return <PolicierOverlay />
    case 'SF':        return <SFOverlay />
    case 'Thriller':  return <ThrillerOverlay />
    case 'Western':   return <WesternOverlay />
    default:          return null
  }
}

/* ── ACTION — Mad Max: Fury Road ── */
function ActionOverlay() {
  const embers = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => ({
      id: i,
      left: `${3 + Math.random() * 94}%`,
      size: 2 + Math.random() * 5,
      duration: 3 + Math.random() * 5,
      delay: Math.random() * 6,
    }))
  , [])

  return (
    <>
      <div className="action-vignette" />
      <div className="action-sandstorm" />
      <div className="chrome-text">WITNESS ME</div>
      <div className="war-rig-stripe" />
      <div className="theme-overlay">
        {embers.map(e => (
          <div key={e.id} className="ember" style={{
            left: e.left, width: e.size, height: e.size,
            animationDuration: `${e.duration}s`, animationDelay: `${e.delay}s`,
          }} />
        ))}
      </div>
    </>
  )
}

/* ── ANIMATION — Wall-E ── */
function AnimationOverlay() {
  const stars = useMemo(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 1 + Math.random() * 2.5,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 5,
    }))
  , [])

  return (
    <>
      <div className="theme-overlay">
        {stars.map(s => (
          <div key={s.id} className="star" style={{
            left: s.left, top: s.top, width: s.size, height: s.size,
            animationDuration: `${s.duration}s`, animationDelay: `${s.delay}s`,
          }} />
        ))}
      </div>
      <div className="eve-flyby" />
      <div className="plant-sprout">{'\u{1F331}'}</div>
      <div className="bnl-logo">BUY N LARGE</div>
      <div className="directive-text">DIRECTIVE:<br />CLASSIFY FOREIGN CONTAMINANT</div>
    </>
  )
}

/* ── AVENTURE — Indiana Jones ── */
function AventureOverlay() {
  return (
    <>
      <div className="parchment-overlay" />
      <div className="travel-line" />
      <div className="idol-glow">{'\u{1F3FA}'}</div>
      <div className="boulder" />
      <div className="snakes-text">{'"Snakes... Why did it have to be snakes?"'}</div>
    </>
  )
}

/* ── COMEDIE — The Grand Budapest Hotel ── */
function ComedieOverlay() {
  return (
    <>
      <div className="budapest-frame" />
      <div className="mendls-stack">
        <div className="mendls-box" />
        <div className="mendls-box" style={{ marginLeft: 2 }} />
        <div className="mendls-box" style={{ marginLeft: -1 }} />
      </div>
      <div className="lobby-boy" />
      <div className="concierge-text">THE SOCIETY OF THE CROSSED KEYS</div>
    </>
  )
}

/* ── CRIME — Le Parrain ── */
function CrimeOverlay() {
  const petals = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      duration: 10 + Math.random() * 8,
      delay: i * 4 + Math.random() * 3,
    }))
  , [])

  return (
    <>
      <div className="amber-light" />
      <div className="puppet-strings" />
      <div className="crime-stripe" />
      <div className="don-cat">{'\u{1F408}\u{200D}\u{2B1B}'}</div>
      <div className="offer-text">{"\"I'm gonna make him an offer he can't refuse.\""}</div>
      <div className="theme-overlay">
        {petals.map(p => (
          <div key={p.id} className="falling-rose" style={{
            left: p.left,
            animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
          }} />
        ))}
      </div>
    </>
  )
}

/* ── DRAME — Forrest Gump ── */
function DrameOverlay() {
  return (
    <>
      <div className="sky-gradient" />
      <div className="floating-feather">
        <svg viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 2 C18 8 16 14 14 20 C12 26 10 32 6 38" stroke="white" strokeWidth="0.5" opacity="0.4" />
          <path d="M20 2 C19 6 17 10 16 14 C14 18 13 22 11 26 C9 30 8 34 6 38 C10 32 12 28 13 24 C14 20 16 16 17 12 C18 8 19 4 20 2Z" fill="white" opacity="0.85" />
          <path d="M20 2 C22 6 21 10 20 14 C18 18 16 22 14 26 C12 30 9 34 6 38" stroke="rgba(255,255,255,0.3)" strokeWidth="0.3" />
        </svg>
      </div>
      <div className="bench-silhouette">
        <svg viewBox="0 0 50 25" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="8" width="40" height="3" rx="1" fill="rgba(126,200,227,0.3)" />
          <rect x="5" y="13" width="40" height="2" rx="1" fill="rgba(126,200,227,0.25)" />
          <rect x="8" y="15" width="3" height="10" fill="rgba(126,200,227,0.2)" />
          <rect x="39" y="15" width="3" height="10" fill="rgba(126,200,227,0.2)" />
          <rect x="3" y="4" width="2" height="12" rx="1" fill="rgba(126,200,227,0.2)" />
          <rect x="45" y="4" width="2" height="12" rx="1" fill="rgba(126,200,227,0.2)" />
        </svg>
      </div>
      <div className="chocolates-text">{'"Life is like a box of chocolates. You never know what you\'re gonna get."'}</div>
      <div className="run-text">RUN FORREST RUN</div>
    </>
  )
}

/* ── FANTAISIE — Le Seigneur des Anneaux ── */
function FantaisieOverlay() {
  const fireflies = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      top: `${10 + Math.random() * 80}%`,
      size: 2 + Math.random() * 3,
      duration: 4 + Math.random() * 6,
      delay: Math.random() * 8,
    }))
  , [])

  return (
    <>
      <div className="mist-bottom" />
      <div className="sauron-eye" />
      <div className="shire-door" />
      <div className="elvish-inscription">
        One Ring to rule them all,<br />
        One Ring to find them,<br />
        One Ring to bring them all,<br />
        and in the darkness bind them.
      </div>
      <div className="theme-overlay">
        {fireflies.map(f => (
          <div key={f.id} className="firefly" style={{
            left: f.left, top: f.top, width: f.size, height: f.size,
            animationDuration: `${f.duration}s`, animationDelay: `${f.delay}s`,
          }} />
        ))}
      </div>
    </>
  )
}

/* ── GUERRE — Il faut sauver le soldat Ryan ── */
function GuerreOverlay() {
  const drops = useMemo(() =>
    Array.from({ length: 35 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      height: 15 + Math.random() * 25,
      duration: 0.5 + Math.random() * 0.6,
      delay: Math.random() * 2,
    }))
  , [])

  return (
    <>
      <div className="guerre-grain" />
      <div className="medic-cross" />
      <div className="dog-tags" />
      <div className="earn-this">{'"Earn this."'}</div>
      <div className="theme-overlay">
        {drops.map(d => (
          <div key={d.id} className="rain-drop" style={{
            left: d.left, height: `${d.height}px`,
            animationDuration: `${d.duration}s`, animationDelay: `${d.delay}s`,
          }} />
        ))}
      </div>
    </>
  )
}

/* ── HORREUR — Shining ── */
function HorreurOverlay() {
  const drips = useMemo(() =>
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      left: `${15 + Math.random() * 70}%`,
      duration: 5 + Math.random() * 5,
      delay: i * 3 + Math.random() * 2,
    }))
  , [])

  return (
    <>
      <div className="carpet-pattern" />
      <div className="redrum">REDRUM</div>
      <div className="flicker-overlay" />
      <div className="room-237">ROOM 237</div>
      <div className="typewriter-text">
        All work and no play makes Jack a dull boy.{' '}
        All work and no play makes Jack a dull boy.{' '}
        All work and no play makes Jack a dull boy.{' '}
        All work and no play makes Jack a dull boy.{' '}
        All work and no play makes Jack a dull boy.
      </div>
      <div className="twins-flash" />
      {drips.map(d => (
        <div key={d.id} className="blood-drip" style={{
          left: d.left,
          animationDuration: `${d.duration}s`, animationDelay: `${d.delay}s`,
        }} />
      ))}
    </>
  )
}

/* ── POLICIER — Se7en ── */
function PolicierOverlay() {
  const drops = useMemo(() =>
    Array.from({ length: 45 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      height: 12 + Math.random() * 20,
      duration: 0.4 + Math.random() * 0.6,
      delay: Math.random() * 3,
    }))
  , [])

  const pins = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      top: `${15 + Math.random() * 60}%`,
      right: `${5 + Math.random() * 30}%`,
    }))
  , [])

  return (
    <>
      <div className="seven-vignette" />
      <div className="seven-grain" />
      <div className="evidence-board" />
      <div className="notebook-scrawl">
        GLUTTONY<br />GREED<br />SLOTH<br />WRATH<br />PRIDE<br />LUST<br />ENVY
      </div>
      <div className="whats-in-box">{'"What\'s in the box?!"'}</div>
      {pins.map(p => (
        <div key={p.id} className="evidence-pin" style={{ top: p.top, right: p.right }} />
      ))}
      <div className="theme-overlay">
        {drops.map(d => (
          <div key={d.id} className="rain-drop" style={{
            left: d.left, height: `${d.height}px`,
            animationDuration: `${d.duration}s`, animationDelay: `${d.delay}s`,
          }} />
        ))}
      </div>
    </>
  )
}

/* ── SF — Matrix ── */
function SFOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [showMsg, setShowMsg] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShowMsg(false), 4500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = Array(columns).fill(1)
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789'

    let animId: number
    function draw() {
      ctx!.fillStyle = 'rgba(0, 8, 0, 0.05)'
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)
      ctx!.fillStyle = '#00ff41'
      ctx!.font = `${fontSize}px monospace`
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)]
        ctx!.fillText(char, i * fontSize, drops[i] * fontSize)
        if (drops[i] * fontSize > canvas!.height && Math.random() > 0.975) drops[i] = 0
        drops[i]++
      }
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId) }
  }, [])

  return (
    <>
      <canvas ref={canvasRef} className="matrix-canvas" />
      <div className="matrix-scanline" />
      <div className="no-spoon">There is no spoon.</div>
      <div className="white-rabbit">{'\u{1F407}'} Follow the white rabbit</div>
      {showMsg && <div className="wake-up-neo">Wake up, Neo...</div>}
    </>
  )
}

/* ── THRILLER — Psychose ── */
function ThrillerOverlay() {
  return (
    <>
      <div className="thriller-vignette" />
      <div className="venetian-blinds" />
      <div className="shower-curtain" />
      <div className="bates-motel">BATES MOTEL</div>
      <div className="mothers-quote">{'"A boy\'s best friend is his mother."'}</div>
      <div className="hitchcock-silhouette">
        <svg viewBox="0 0 50 70" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="28" cy="18" rx="14" ry="16" fill="#888" />
          <path d="M10 70 L10 35 Q10 25 20 20 L36 20 Q42 22 44 30 L44 70Z" fill="#888" />
          <ellipse cx="22" cy="14" rx="3" ry="2" fill="#555" />
        </svg>
      </div>
    </>
  )
}

/* ── WESTERN — Le Bon, la Brute et le Truand ── */
function WesternOverlay() {
  const dust = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      bottom: `${Math.random() * 25}%`,
      duration: 4 + Math.random() * 5,
      delay: Math.random() * 8,
    }))
  , [])

  return (
    <>
      <div className="sepia-vignette" />
      <div className="poncho-fringe" />
      <div className="noon-sun" />
      <div className="tumbleweed" />
      <div className="standoff-circle" />
      <div className="two-categories">{'"You see, in this world there\'s two kinds of people, my friend: Those with loaded guns and those who dig."'}</div>
      <div className="theme-overlay">
        {dust.map(d => (
          <div key={d.id} className="dust-particle" style={{
            left: d.left, bottom: d.bottom,
            animationDuration: `${d.duration}s`, animationDelay: `${d.delay}s`,
          }} />
        ))}
      </div>
    </>
  )
}
