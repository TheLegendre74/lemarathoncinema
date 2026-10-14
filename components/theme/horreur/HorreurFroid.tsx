'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getLastDestructClick } from '@/lib/destruction'

export default function HorreurFroid() {
  const pathname = usePathname()

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const handler = () => {
      const info = getLastDestructClick()
      if (!info?.target) return
      if (pathname === '/films') return

      const el = info.target
      if (prefersReduced) {
        el.style.filter = 'grayscale(1) brightness(.7)'
        return
      }
      el.style.transition = 'filter 2s ease'
      el.style.filter = 'grayscale(1) brightness(.7)'
    }

    window.addEventListener('cm:destruction', handler)
    return () => window.removeEventListener('cm:destruction', handler)
  }, [pathname])

  return null
}
