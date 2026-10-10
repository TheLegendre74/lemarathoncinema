'use client'

import { useEffect, useState } from 'react'

export default function WesternBarillet() {
  const [filled, setFilled] = useState(0)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (reduced) {
      setFilled(6)
      return
    }
    const t = setInterval(() => {
      setFilled(prev => {
        if (prev >= 6) {
          clearInterval(t)
          return 6
        }
        return prev + 1
      })
    }, 350)
    return () => clearInterval(t)
  }, [reduced])

  if (reduced) {
    return (
      <div className="western-barillet">
        <span style={{ fontFamily: 'var(--f-data)', fontSize: 14, color: 'var(--ink3)' }}>
          Chargement…
        </span>
      </div>
    )
  }

  return (
    <div className="western-barillet">
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className={`western-chambre${i < filled ? ' western-chambre-pleine' : ''}`}
        />
      ))}
    </div>
  )
}
