'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import styles from './horreur-frame.module.css'

const IDLE_DELAY = 30_000

export default function HorreurFrame() {
  const lampeRef = useRef<HTMLDivElement>(null)
  const voileRef = useRef<HTMLDivElement>(null)
  const formeRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const fadeRef = useRef<number>(0)
  const idleRef = useRef<number>(0)
  const posRef = useRef({ x: 0.5, y: 0.5 })
  const formeUsedRef = useRef(false)
  const formeVisibleRef = useRef(false)
  const pathname = usePathname()

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

  const showForme = useCallback(() => {
    const el = formeRef.current
    if (!el || formeUsedRef.current) return
    formeUsedRef.current = true
    formeVisibleRef.current = true
    const side = posRef.current.x < 0.5 ? 'right' : 'left'
    el.style.left = side === 'left' ? '40px' : 'auto'
    el.style.right = side === 'right' ? '40px' : 'auto'
    el.style.display = 'block'
  }, [])

  const hideForme = useCallback(() => {
    const el = formeRef.current
    if (!el || !formeVisibleRef.current) return
    formeVisibleRef.current = false
    el.style.display = 'none'
  }, [])

  useEffect(() => {
    formeUsedRef.current = false
    formeVisibleRef.current = false
    if (formeRef.current) formeRef.current.style.display = 'none'
  }, [pathname])

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

    const startIdleTimer = () => {
      clearTimeout(idleRef.current)
      if (formeUsedRef.current) return
      idleRef.current = window.setTimeout(showForme, IDLE_DELAY)
    }

    const onGesture = () => {
      hideForme()
      startIdleTimer()
    }

    window.addEventListener('keydown', onGesture, { passive: true })
    window.addEventListener('scroll', onGesture, { passive: true })
    startIdleTimer()

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
        onGesture()
      }
      window.addEventListener('touchstart', onTouch, { passive: true })
      window.addEventListener('touchmove', onTouch, { passive: true })
      return () => {
        window.removeEventListener('touchstart', onTouch)
        window.removeEventListener('touchmove', onTouch)
        window.removeEventListener('keydown', onGesture)
        window.removeEventListener('scroll', onGesture)
        clearTimeout(fadeRef.current)
        clearTimeout(idleRef.current)
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
      }
    }

    const onPointer = (e: PointerEvent) => {
      posRef.current.x = e.clientX / window.innerWidth
      posRef.current.y = e.clientY / window.innerHeight
      scheduleUpdate()
      onGesture()
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    scheduleUpdate()
    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('keydown', onGesture)
      window.removeEventListener('scroll', onGesture)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearTimeout(idleRef.current)
    }
  }, [updateLampe, showForme, hideForme])

  useEffect(() => {
    const voile = voileRef.current
    if (!voile) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const handler = () => {
      if (prefersReduced) return
      voile.style.opacity = '0.6'
      setTimeout(() => { voile.style.opacity = '0' }, 1000)
    }
    window.addEventListener('cm:destruction', handler)
    return () => window.removeEventListener('cm:destruction', handler)
  }, [])

  return (
    <div className={styles.decor} aria-hidden="true">
      <div className={styles.bois} />
      <div className={styles.brume} />
      <div ref={formeRef} className={styles.forme} style={{ display: 'none' }} />
      <div ref={lampeRef} className={styles.lampe} />
      <div ref={voileRef} className={styles.voile} />
      <div className={styles.vign} />
      <div className={styles.grain} />
    </div>
  )
}
