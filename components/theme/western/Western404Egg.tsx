'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'

export default function Western404Egg() {
  const { armed } = useThemeEgg('theme-western-404')
  const pathname = usePathname()
  const [tumbleweedVisible, setTumbleweedVisible] = useState(false)
  const discovered = useRef(false)
  const clickCount = useRef(0)

  const is404 = pathname === '/404' || pathname === '/not-found'

  useEffect(() => {
    if (!armed || !is404) return
    const t = setTimeout(() => setTumbleweedVisible(true), 3000)
    return () => clearTimeout(t)
  }, [armed, is404])

  if (!armed || !is404 || !tumbleweedVisible) return null

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const handleClick = () => {
    clickCount.current++
    if (clickCount.current >= 2 && !discovered.current) {
      discovered.current = true
      discoverThemeEgg('theme-western-404')
    }
  }

  return (
    <button
      onClick={handleClick}
      aria-hidden="true"
      tabIndex={-1}
      style={{
        position: 'fixed',
        bottom: '20%',
        left: reduced ? '50%' : undefined,
        width: 30,
        height: 30,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        zIndex: 100,
        padding: 0,
        animation: reduced ? 'none' : 'tumbleweed 12s linear infinite',
      }}
    >
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
        <circle cx="15" cy="15" r="12" fill="none" stroke="var(--ink3)" strokeWidth="1" opacity="0.5" />
        <circle cx="15" cy="15" r="8" fill="none" stroke="var(--ink3)" strokeWidth="0.5" opacity="0.3" />
        <line x1="3" y1="15" x2="27" y2="15" stroke="var(--ink3)" strokeWidth="0.5" opacity="0.3" />
        <line x1="15" y1="3" x2="15" y2="27" stroke="var(--ink3)" strokeWidth="0.5" opacity="0.3" />
      </svg>
    </button>
  )
}
