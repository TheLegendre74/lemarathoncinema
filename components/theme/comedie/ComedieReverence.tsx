'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTheme } from '../ThemeProvider'

export default function ComedieReverence() {
  const { key } = useTheme()
  const [text, setText] = useState<string | null>(null)
  const recentRef = useRef<number[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFilmVu = useCallback((e: CustomEvent<{ id: number; exp: number }>) => {
    const now = Date.now()
    recentRef.current = [...recentRef.current.filter(t => now - t < 600_000), now]

    const label = recentRef.current.length >= 3 ? 'RAPPEL !' : 'BRAVO'

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    setText(label)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setText(null), reduced ? 1200 : 2000)
  }, [])

  useEffect(() => {
    if (key !== 'comedie') return
    const handler = (e: Event) => handleFilmVu(e as CustomEvent)
    window.addEventListener('cm:film-vu', handler)
    return () => window.removeEventListener('cm:film-vu', handler)
  }, [key, handleFilmVu])

  if (key !== 'comedie' || !text) return null

  return (
    <div className="comedie-reverence-overlay" aria-live="polite">
      <span className="comedie-reverence-text">{text}</span>
    </div>
  )
}
