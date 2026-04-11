'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { initOrGetTamagotchi } from '@/lib/actions'
import { TAMA_FRAMES, STAGE_COLORS, getTamaFrameKey } from '@/lib/tamaFrames'

const WIDGET_KEY = 'tama_widget_enabled'
const MINI_KEY   = 'tama_widget_mini'
const CACHE_KEY  = 'tama_widget_cache'
const CACHE_TTL  = 5 * 60 * 1000

const STAGE_ICON: Record<string, string> = {
  egg: '🥚', facehugger: '🤍', chestburster: '💥', xenomorph: '👾', dead: '💀',
}

function getMoodEmoji(pet: any) {
  if (pet.stage === 'dead') return '💀'
  if (pet.health < 20 || pet.hunger > 80 || pet.happiness < 20) return '😰'
  if (pet.hunger < 40 && pet.happiness > 60) return '😊'
  return '😐'
}

export default function TamagotchiWidget() {
  const [enabled,  setEnabled]  = useState(false)
  const [mini,     setMini]     = useState(false)
  const [pet,      setPet]      = useState<any>(null)
  const [tick,     setTick]     = useState(0)

  useEffect(() => {
    const isEnabled = localStorage.getItem(WIDGET_KEY) === 'true'
    const isMini    = localStorage.getItem(MINI_KEY)    === 'true'
    setEnabled(isEnabled)
    setMini(isMini)
    if (!isEnabled) return

    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL) { setPet(data); return }
      }
    } catch { /* ignore */ }

    fetchPet()
  }, [])

  async function fetchPet() {
    const res = await initOrGetTamagotchi()
    if (res.data) {
      setPet(res.data)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: res.data, ts: Date.now() })) } catch { /* ignore */ }
    }
  }

  useEffect(() => {
    if (!enabled || mini) return
    const id = setInterval(() => setTick(t => 1 - t), 900)
    return () => clearInterval(id)
  }, [enabled, mini])

  if (!enabled || !pet) return null

  const stageColor = STAGE_COLORS[pet.stage] ?? '#22d3ee'
  const icon       = STAGE_ICON[pet.stage] ?? '👾'
  const mood       = getMoodEmoji(pet)
  const frameKey   = getTamaFrameKey(pet)
  const frames     = TAMA_FRAMES[frameKey] ?? TAMA_FRAMES['egg']
  const frame      = frames[tick % frames.length]

  function toggleMini() {
    const next = !mini
    setMini(next)
    localStorage.setItem(MINI_KEY, String(next))
  }

  function close() {
    setEnabled(false)
    localStorage.setItem(WIDGET_KEY, 'false')
  }

  if (mini) {
    return (
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 800,
        background: 'var(--bg2)', border: `1px solid ${stageColor}44`,
        borderRadius: 99, padding: '6px 12px',
        boxShadow: `0 4px 20px ${stageColor}22`,
        display: 'flex', alignItems: 'center', gap: '.4rem',
        cursor: 'pointer',
      }} onClick={toggleMini} title={`${pet.name} — Cliquer pour agrandir`}>
        <span style={{ fontSize: '1.1rem', filter: `drop-shadow(0 0 4px ${stageColor})` }}>{icon}</span>
        <span style={{ fontSize: '.72rem', color: stageColor, fontFamily: 'var(--font-display)' }}>{pet.name}</span>
        <span style={{ fontSize: '.8rem' }}>{mood}</span>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 20, right: 20, zIndex: 800,
      background: 'var(--bg2)', border: `2px solid ${stageColor}44`,
      borderRadius: 'var(--rl)',
      boxShadow: `0 4px 24px ${stageColor}22`,
      width: 180,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 8px',
        background: `${stageColor}11`,
        borderBottom: `1px solid ${stageColor}22`,
      }}>
        <span style={{ fontSize: '.72rem', color: stageColor, fontFamily: 'var(--font-display)' }}>
          {icon} {pet.name}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={toggleMini} style={iconBtn} title="Réduire">─</button>
          <button onClick={close}      style={iconBtn} title="Masquer">✕</button>
        </div>
      </div>

      {/* ASCII screen */}
      <Link href="/tamagotchi" style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{
          padding: '8px 6px',
          background: 'var(--bg3)',
          textAlign: 'center',
          fontFamily: "'Courier New', monospace",
          fontSize: '.52rem',
          lineHeight: 1.4,
          color: stageColor,
          textShadow: `0 0 5px ${stageColor}66`,
          cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          {frame.map((line, i) => (
            <div key={i} style={{ whiteSpace: 'pre' }}>{line}</div>
          ))}
          <div style={{ fontSize: '.5rem', color: 'rgba(255,255,255,.2)', marginTop: 4, letterSpacing: 1 }}>
            {mood}
          </div>
        </div>
      </Link>

      {/* Stats row */}
      <div style={{ padding: '5px 8px', display: 'flex', gap: 4, flexDirection: 'column' }}>
        {[
          { label: '🥩', val: 100 - pet.hunger, color: '#f97316' },
          { label: '😊', val: pet.happiness,    color: '#a78bfa' },
          { label: '❤️', val: pet.health,        color: '#22d3ee' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '.6rem', width: 14 }}>{label}</span>
            <div style={{ flex: 1, height: 4, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, val))}%`, background: val < 25 ? '#ef4444' : color, borderRadius: 99, transition: 'width .3s' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function useWidgetEnabled(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    setEnabled(localStorage.getItem(WIDGET_KEY) === 'true')
  }, [])
  function toggle(v: boolean) {
    setEnabled(v)
    localStorage.setItem(WIDGET_KEY, String(v))
    try { localStorage.removeItem(CACHE_KEY) } catch { /* ignore */ }
    if (v) {
      // Refresh immediately so the widget appears on all pages right away
      setTimeout(() => window.location.reload(), 80)
    }
  }
  return [enabled, toggle]
}

const iconBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--text3)', fontSize: '.7rem', padding: '1px 4px',
  lineHeight: 1,
}
