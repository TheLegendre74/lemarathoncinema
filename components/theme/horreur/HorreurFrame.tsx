'use client'

import { useEffect, useRef, useCallback } from 'react'
import styles from './horreur-frame.module.css'

export default function HorreurFrame() {
  const lampeRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const fadeRef = useRef<number>(0)
  const posRef = useRef({ x: 0.5, y: 0.5 })

  const updateLampe = useCallback(() => {
    const el = lampeRef.current
    if (!el) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cx = posRef.current.x * vw
    const cy = posRef.current.y * vh
    el.style.transform = `translate3d(${cx - vw}px, ${cy - vh}px, 0)`
    rafRef.current = 0
  }, [])

  useEffect(() => {
    const el = lampeRef.current
    if (!el) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      el.classList.add(styles.lampeFixe)
      return
    }

    const isMobile = window.matchMedia('(max-width: 768px)').matches

    const scheduleUpdate = () => {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(updateLampe)
      }
    }

    if (isMobile) {
      el.classList.add(styles.lampeMobile)
      const onTouch = (e: TouchEvent) => {
        const t = e.touches[0] || e.changedTouches[0]
        if (!t) return
        posRef.current.x = t.clientX / window.innerWidth
        posRef.current.y = t.clientY / window.innerHeight
        el.style.opacity = '1'
        scheduleUpdate()
        clearTimeout(fadeRef.current)
        fadeRef.current = window.setTimeout(() => {
          el.style.opacity = '0'
        }, 4000)
      }
      window.addEventListener('touchstart', onTouch, { passive: true })
      window.addEventListener('touchmove', onTouch, { passive: true })
      return () => {
        window.removeEventListener('touchstart', onTouch)
        window.removeEventListener('touchmove', onTouch)
        clearTimeout(fadeRef.current)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }

    const onPointer = (e: PointerEvent) => {
      posRef.current.x = e.clientX / window.innerWidth
      posRef.current.y = e.clientY / window.innerHeight
      scheduleUpdate()
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    scheduleUpdate()
    return () => {
      window.removeEventListener('pointermove', onPointer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [updateLampe])

  return (
    <div className={styles.decor} aria-hidden="true">
      <div className={styles.bois} />
      <div className={styles.brume} />
      <div ref={lampeRef} className={styles.lampe} />
      <div className={styles.vign} />
      <div className={styles.grain} />
    </div>
  )
}
