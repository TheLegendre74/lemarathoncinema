'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'

export default function HorreurCercleEgg() {
  const { armed } = useThemeEgg('theme-horreur-cercle')
  const pathname = usePathname()
  const [message, setMessage] = useState<string | null>(null)
  const visited = useRef(new Map<string, number>())
  const discovered = useRef(false)

  useEffect(() => {
    if (!armed || !pathname) return
    const count = (visited.current.get(pathname) ?? 0) + 1
    visited.current.set(pathname, count)

    if (count >= 3 && !discovered.current) {
      discovered.current = true
      setMessage('On est déjà passés par ici.')
      discoverThemeEgg('theme-horreur-cercle')
      setTimeout(() => setMessage(null), 4000)
    }
  }, [armed, pathname])

  if (!message) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 40,
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'var(--f-main, var(--f-data))',
        fontSize: 16,
        color: 'var(--ink3)',
        zIndex: 200,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  )
}
