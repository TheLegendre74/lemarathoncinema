'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from '../ThemeProvider'
import { usePathname } from 'next/navigation'

interface Impact {
  id: number
  x: number
  y: number
}

const MAX_IMPACTS = 12

export default function WesternImpact() {
  const { key } = useTheme()
  const pathname = usePathname()
  const [impacts, setImpacts] = useState<Impact[]>([])
  const nextId = useRef(0)
  const prevPathname = useRef(pathname)

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      setImpacts([])
      prevPathname.current = pathname
    }
  }, [pathname])

  const handleDestruction = useCallback((e: CustomEvent<{ x: number; y: number }>) => {
    if (key !== 'western') return
    const { x, y } = e.detail
    const id = nextId.current++
    setImpacts(prev => {
      const next = [...prev, { id, x: x + window.scrollX, y: y + window.scrollY }]
      if (next.length > MAX_IMPACTS) next.shift()
      return next
    })
  }, [key])

  useEffect(() => {
    if (key !== 'western') return
    const handler = (e: Event) => handleDestruction(e as CustomEvent)
    window.addEventListener('cm:destruction', handler)
    return () => window.removeEventListener('cm:destruction', handler)
  }, [key, handleDestruction])

  if (key !== 'western' || impacts.length === 0) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 90,
      }}
    >
      {impacts.map(imp => (
        <div
          key={imp.id}
          className="impact"
          style={{ left: imp.x, top: imp.y }}
        />
      ))}
    </div>
  )
}
