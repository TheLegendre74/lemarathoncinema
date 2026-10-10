'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '../ThemeProvider'

export default function ComedieTroisCoups() {
  const { key } = useTheme()
  const [coup, setCoup] = useState(0)

  useEffect(() => {
    if (key !== 'comedie') return
    const t1 = setTimeout(() => setCoup(1), 0)
    const t2 = setTimeout(() => setCoup(2), 400)
    const t3 = setTimeout(() => setCoup(3), 800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [key])

  if (key !== 'comedie') return null

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduced) {
    return (
      <div className="comedie-trois-coups" aria-hidden="true">
        <span className="comedie-trois-coups-text">Trois coups…</span>
      </div>
    )
  }

  return (
    <div className="comedie-trois-coups" aria-hidden="true">
      <span className={`comedie-coup ${coup >= 1 ? 'comedie-coup-lit' : ''}`} />
      <span className={`comedie-coup ${coup >= 2 ? 'comedie-coup-lit' : ''}`} />
      <span className={`comedie-coup ${coup >= 3 ? 'comedie-coup-lit' : ''}`} />
    </div>
  )
}
