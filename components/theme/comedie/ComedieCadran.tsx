'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../ThemeProvider'

interface ComedieCadranProps {
  film1Pct: number
  film2Pct: number
}

export default function ComedieCadran({ film1Pct, film2Pct }: ComedieCadranProps) {
  const { key } = useTheme()
  const [wobble, setWobble] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (key !== 'comedie') return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    let phase = 0
    const tick = () => {
      phase += 0.03
      setWobble(Math.sin(phase) * 1.5)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [key])

  if (key !== 'comedie') return null

  const baseAngle = film1Pct === 0 && film2Pct === 0
    ? 0
    : ((film2Pct - film1Pct) / 100) * 60

  const angle = baseAngle + wobble

  return (
    <div className="comedie-cadran">
      <svg viewBox="0 0 200 120" width="200" height="120" aria-hidden="true">
        <path
          d="M 20 110 A 80 80 0 0 1 180 110"
          fill="none"
          stroke="var(--or-eteint)"
          strokeWidth="2"
        />
        {[-60, -40, -20, 0, 20, 40, 60].map(tick => {
          const rad = ((tick - 90) * Math.PI) / 180
          const x1 = 100 + 70 * Math.cos(rad)
          const y1 = 110 + 70 * Math.sin(rad)
          const x2 = 100 + 78 * Math.cos(rad)
          const y2 = 110 + 78 * Math.sin(rad)
          return (
            <line
              key={tick}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="var(--or-eteint)"
              strokeWidth="1.5"
            />
          )
        })}
        <line
          x1="100"
          y1="110"
          x2={100 + 60 * Math.cos(((angle - 90) * Math.PI) / 180)}
          y2={110 + 60 * Math.sin(((angle - 90) * Math.PI) / 180)}
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="100" cy="110" r="4" fill="var(--or)" />
      </svg>
    </div>
  )
}
