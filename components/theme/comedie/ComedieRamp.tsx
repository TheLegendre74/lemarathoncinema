'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTheme } from '../ThemeProvider'
import { usePathname } from 'next/navigation'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'
import styles from './comedie-frame.module.css'

function getMondayKey(): string {
  const now = new Date()
  const d = now.getDay()
  const diff = d === 0 ? 6 : d - 1
  const monday = new Date(now)
  monday.setDate(monday.getDate() - diff)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}

export default function ComedieRamp() {
  const { key } = useTheme()
  const pathname = usePathname()
  const { armed } = useThemeEgg('theme-comedie-vert')
  const [grilled, setGrilled] = useState(false)
  const [flashing, setFlashing] = useState(false)

  const isHome = pathname === '/'

  useEffect(() => {
    if (!armed) return
    try {
      const stored = localStorage.getItem('cm_vert')
      if (stored === getMondayKey()) setGrilled(true)
    } catch {}
  }, [armed])

  const handleGreenClick = useCallback(async () => {
    if (grilled || !armed) return
    setGrilled(true)
    setFlashing(true)
    try { localStorage.setItem('cm_vert', getMondayKey()) } catch {}

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!prefersReduced) {
      setTimeout(() => setFlashing(false), 1000)
    } else {
      setFlashing(false)
    }
    await discoverThemeEgg('theme-comedie-vert')
  }, [grilled, armed])

  if (key !== 'comedie') return null

  const bulbCount = 20
  const greenIndex = 7

  return (
    <>
      <div className={`${styles.ramp} ${flashing ? styles.rampFlash : ''}`}>
        {Array.from({ length: bulbCount }, (_, i) => {
          const isGreen = isHome && armed && i === greenIndex
          if (isGreen) {
            return (
              <button
                key={i}
                className={`${styles.rampBulb} ${grilled ? styles.rampBulbDead : styles.rampBulbGreen}`}
                onClick={handleGreenClick}
                aria-label="Ampoule de la rampe"
                type="button"
              />
            )
          }
          return <span key={i} className={styles.rampBulb} />
        })}
      </div>
      <div className={styles.floor} />
    </>
  )
}
