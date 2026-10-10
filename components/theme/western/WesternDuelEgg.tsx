'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'

export default function WesternDuelEgg() {
  const { armed } = useThemeEgg('theme-western-duel')
  const pathname = usePathname()
  const [phase, setPhase] = useState<'idle' | 'ready' | 'draw' | 'won' | 'lost'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const discovered = useRef(false)
  const drawTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drawTime = useRef(0)

  const isDuelPage = pathname?.startsWith('/duels')

  useEffect(() => {
    if (!armed || !isDuelPage) return
    const t = setTimeout(() => setPhase('ready'), 15000)
    return () => clearTimeout(t)
  }, [armed, isDuelPage])

  useEffect(() => {
    if (phase !== 'ready') return

    const delay = 2000 + Math.random() * 4000
    let lostTimer: ReturnType<typeof setTimeout> | null = null
    drawTimer.current = setTimeout(() => {
      drawTime.current = performance.now()
      setPhase('draw')

      lostTimer = setTimeout(() => {
        setPhase(prev => (prev === 'draw' ? 'lost' : prev))
      }, 1200)
    }, delay)

    return () => {
      if (drawTimer.current) clearTimeout(drawTimer.current)
      if (lostTimer) clearTimeout(lostTimer)
    }
  }, [phase])

  const handleClick = useCallback(() => {
    if (phase === 'draw') {
      const reaction = performance.now() - drawTime.current
      if (reaction < 600) {
        setPhase('won')
        setMessage(`${Math.round(reaction)} ms — Rapide.`)
        if (!discovered.current) {
          discovered.current = true
          discoverThemeEgg('theme-western-duel')
        }
      } else {
        setPhase('lost')
        setMessage('Trop lent, partenaire.')
      }
      setTimeout(() => {
        setMessage(null)
        setPhase('idle')
      }, 3000)
    } else if (phase === 'ready') {
      setPhase('lost')
      setMessage('Trop tôt. Pas encore.')
      if (drawTimer.current) clearTimeout(drawTimer.current)
      setTimeout(() => {
        setMessage(null)
        setPhase('idle')
      }, 3000)
    }
  }, [phase])

  if (!armed || !isDuelPage || phase === 'idle') return null

  return (
    <>
      {phase === 'ready' && (
        <button
          onClick={handleClick}
          style={{
            position: 'fixed',
            bottom: 60,
            right: 20,
            background: 'var(--s2)',
            border: '1px solid var(--laiton)',
            color: 'var(--ink3)',
            fontFamily: 'var(--f-data)',
            fontSize: 12,
            padding: '8px 16px',
            cursor: 'pointer',
            zIndex: 200,
          }}
        >
          Attends…
        </button>
      )}
      {phase === 'draw' && (
        <button
          onClick={handleClick}
          style={{
            position: 'fixed',
            bottom: 60,
            right: 20,
            background: 'var(--sang)',
            border: '1px solid var(--sang-vif)',
            color: 'var(--accent-ink)',
            fontFamily: 'var(--f-display)',
            fontSize: 18,
            padding: '12px 24px',
            cursor: 'pointer',
            zIndex: 200,
            animation: 'none',
          }}
        >
          TIRE !
        </button>
      )}
      {message && (
        <div
          style={{
            position: 'fixed',
            bottom: 110,
            right: 20,
            fontFamily: 'var(--f-data)',
            fontSize: 14,
            color: phase === 'won' ? 'var(--laiton-clair)' : 'var(--sang-vif)',
            zIndex: 200,
            pointerEvents: 'none',
          }}
        >
          {message}
        </div>
      )}
    </>
  )
}
