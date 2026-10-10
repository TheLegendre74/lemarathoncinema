'use client'

import { useEffect, useRef } from 'react'
import styles from './horreur-frame.module.css'

export default function HorreurFrame() {
  const lampeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = lampeRef.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      el.style.setProperty('--mx', `${e.clientX}px`)
      el.style.setProperty('--my', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', handler, { passive: true })
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  return (
    <>
      <div className={styles.grain} />
      <div ref={lampeRef} className={styles.lampe} />
      <div className={styles.rec}>
        <span className={styles.recDot} />
        REC
      </div>
    </>
  )
}
