'use client'

import { useEffect, useRef, useCallback } from 'react'

export default function ComediePoursuite() {
  const ref = useRef<HTMLDivElement>(null)
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMove = useCallback((e: PointerEvent | TouchEvent) => {
    const el = ref.current
    if (!el) return

    let x: number, y: number
    if ('touches' in e) {
      const t = e.touches[0]
      if (!t) return
      x = t.clientX
      y = t.clientY
    } else {
      x = e.clientX
      y = e.clientY
    }

    el.style.left = `${x}px`
    el.style.top = `${y}px`
    el.style.opacity = '1'

    if (fadeTimer.current) clearTimeout(fadeTimer.current)
    if ('touches' in e) {
      fadeTimer.current = setTimeout(() => {
        if (el) el.style.opacity = '0'
      }, 4000)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    document.addEventListener('pointermove', handleMove, { passive: true })
    document.addEventListener('touchmove', handleMove, { passive: true })
    return () => {
      document.removeEventListener('pointermove', handleMove)
      document.removeEventListener('touchmove', handleMove)
    }
  }, [handleMove])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,243,208,.08) 0%, transparent 70%)',
        mixBlendMode: 'screen',
        pointerEvents: 'none',
        zIndex: 'var(--z-fx, 50)' as any,
        transform: 'translate(-50%, -50%)',
        left: '-200px',
        top: '-200px',
        opacity: 0,
        transition: `left 140ms cubic-bezier(.34,1.4,.5,1), top 140ms cubic-bezier(.34,1.4,.5,1), opacity 400ms ease`,
      }}
    />
  )
}
