'use client'

import { useEffect, useRef, useState } from 'react'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'

export default function HorreurPossessionEgg() {
  const { armed } = useThemeEgg('theme-horreur-possession')
  const [glitching, setGlitching] = useState(false)
  const discovered = useRef(false)

  useEffect(() => {
    if (!armed) return
    const delay = 180_000 + Math.random() * 240_000
    const t = setTimeout(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduced) return

      setGlitching(true)
      if (!discovered.current) {
        discovered.current = true
        discoverThemeEgg('theme-horreur-possession')
      }
      setTimeout(() => setGlitching(false), 800)
    }, delay)
    return () => clearTimeout(t)
  }, [armed])

  if (!glitching) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 900,
        pointerEvents: 'none',
        background: 'rgba(176,20,28,.06)',
        mixBlendMode: 'multiply',
        animation: 'possessionFlicker 0.8s steps(4) 1',
      }}
    />
  )
}
