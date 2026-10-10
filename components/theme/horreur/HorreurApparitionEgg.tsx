'use client'

import { useEffect, useRef, useState } from 'react'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'

export default function HorreurApparitionEgg() {
  const { armed } = useThemeEgg('theme-horreur-apparition')
  const [visible, setVisible] = useState(false)
  const [side, setSide] = useState<'left' | 'right'>('right')
  const discovered = useRef(false)

  useEffect(() => {
    if (!armed) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const delay = 120_000 + Math.random() * 180_000
    const t = setTimeout(() => {
      setSide(Math.random() > 0.5 ? 'right' : 'left')
      setVisible(true)

      if (!discovered.current) {
        discovered.current = true
        discoverThemeEgg('theme-horreur-apparition')
      }

      setTimeout(() => setVisible(false), 1500)
    }, delay)
    return () => clearTimeout(t)
  }, [armed])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '30%',
        [side]: 20,
        width: 24,
        height: 60,
        zIndex: 100,
        pointerEvents: 'none',
        opacity: 0.15,
        animation: 'apparitionFade 1.5s ease-out 1 forwards',
      }}
    >
      <svg width="24" height="60" viewBox="0 0 24 60" aria-hidden="true">
        <ellipse cx="12" cy="10" rx="8" ry="10" fill="var(--ink)" />
        <rect x="6" y="20" width="12" height="40" rx="4" fill="var(--ink)" />
      </svg>
    </div>
  )
}
