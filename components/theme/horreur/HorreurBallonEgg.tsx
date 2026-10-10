'use client'

import { useEffect, useRef, useState } from 'react'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'

export default function HorreurBallonEgg() {
  const { armed } = useThemeEgg('theme-horreur-ballon')
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const discovered = useRef(false)
  const clickCount = useRef(0)

  useEffect(() => {
    if (!armed) return
    const delay = 90_000 + Math.random() * 120_000
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [armed])

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => {
      setVisible(false)
      clickCount.current = 0
    }, 12_000)
    return () => clearTimeout(t)
  }, [visible])

  if (!armed || !visible) return null

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const handleClick = () => {
    clickCount.current++
    if (clickCount.current >= 1 && !discovered.current) {
      discovered.current = true
      setMessage('Tu le reverras.')
      discoverThemeEgg('theme-horreur-ballon')
      setTimeout(() => setMessage(null), 3000)
      setTimeout(() => setVisible(false), 3000)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: 'fixed',
          right: 30,
          bottom: reduced ? 100 : undefined,
          width: 20,
          height: 40,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          zIndex: 'var(--z-fx, 450)' as any,
          padding: 0,
          animation: reduced ? 'none' : 'ballonFloat 8s ease-in-out infinite',
        }}
      >
        <svg width="20" height="40" viewBox="0 0 20 40" aria-hidden="true">
          <ellipse cx="10" cy="14" rx="8" ry="12" fill="var(--bad, #B0141C)" opacity="0.85" />
          <line x1="10" y1="26" x2="10" y2="40" stroke="var(--ink3)" strokeWidth="0.5" />
        </svg>
      </button>
      {message && (
        <div
          style={{
            position: 'fixed',
            bottom: 40,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--f-main, var(--f-data))',
            fontSize: 16,
            color: 'var(--bad-fg)',
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
