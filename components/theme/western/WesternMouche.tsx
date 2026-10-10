'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'

type FlyState = 'hidden' | 'flying' | 'landed' | 'spooked'

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function isInteractive(x: number, y: number): boolean {
  const el = document.elementFromPoint(x, y)
  if (!el) return false
  return el.matches('a, button, input, select, textarea, label, [role="button"], [tabindex]')
}

function findLandingSpot(): { x: number; y: number } | null {
  for (let attempt = 0; attempt < 20; attempt++) {
    const x = randomBetween(40, window.innerWidth - 40)
    const y = randomBetween(80, window.innerHeight - 80)
    if (!isInteractive(x, y)) return { x, y }
  }
  return null
}

export default function WesternMouche() {
  const { armed } = useThemeEgg('theme-western-mouche')
  const [state, setState] = useState<FlyState>('hidden')
  const [pos, setPos] = useState({ x: -100, y: -100 })
  const [message, setMessage] = useState<string | null>(null)
  const clickCount = useRef(0)
  const discovered = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!armed) return

    const delay = randomBetween(60_000, 120_000)
    const t = setTimeout(() => {
      const spot = findLandingSpot()
      if (spot) {
        setPos(spot)
        setState('landed')
      }
    }, delay)

    return () => clearTimeout(t)
  }, [armed])

  useEffect(() => {
    if (state !== 'landed') return
    timerRef.current = setTimeout(() => {
      setState('hidden')
      clickCount.current = 0
      const nextDelay = randomBetween(240_000, 360_000)
      setTimeout(() => {
        const spot = findLandingSpot()
        if (spot) {
          setPos(spot)
          setState('landed')
        }
      }, nextDelay)
    }, 20_000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [state, pos])

  const handleClick = useCallback(() => {
    if (state !== 'landed') return
    clickCount.current++

    if (clickCount.current >= 3) {
      if (!discovered.current) {
        discovered.current = true
        setMessage('Elle est toujours là.')
        discoverThemeEgg('theme-western-mouche')
        setTimeout(() => setMessage(null), 3000)
      }
    }

    const dx = randomBetween(-300, 300)
    const dy = randomBetween(-200, 200)
    const newX = Math.max(20, Math.min(window.innerWidth - 20, pos.x + dx))
    const newY = Math.max(60, Math.min(window.innerHeight - 60, pos.y + dy))
    setPos({ x: newX, y: newY })
  }, [state, pos])

  if (!armed || state === 'hidden') return null

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <>
      <button
        onClick={handleClick}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: 'fixed',
          left: pos.x - 16,
          top: pos.y - 16,
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          zIndex: 'var(--z-fx, 450)' as any,
          padding: 0,
          transition: reduced ? 'none' : 'left 0.6s, top 0.6s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <ellipse cx="7" cy="8" rx="3" ry="4" fill="var(--encre, #3E2D1C)" />
          <ellipse cx="7" cy="6" rx="2.5" ry="2" fill="var(--ink-ghost, #6E5E45)" />
          <line x1="3" y1="5" x2="1" y2="2" stroke="var(--ink-ghost)" strokeWidth="0.5" />
          <line x1="11" y1="5" x2="13" y2="2" stroke="var(--ink-ghost)" strokeWidth="0.5" />
          <ellipse cx="4" cy="4" rx="3" ry="1.5" fill="var(--ink-ghost)" opacity="0.3" transform="rotate(-20 4 4)" />
          <ellipse cx="10" cy="4" rx="3" ry="1.5" fill="var(--ink-ghost)" opacity="0.3" transform="rotate(20 10 4)" />
        </svg>
      </button>
      {message && (
        <div
          style={{
            position: 'fixed',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--f-data)',
            fontSize: 14,
            color: 'var(--ink2)',
            zIndex: 'var(--z-fx, 450)' as any,
            pointerEvents: 'none',
          }}
        >
          {message}
        </div>
      )}
    </>
  )
}
