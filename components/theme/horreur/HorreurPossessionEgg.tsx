'use client'

import { useEffect, useRef } from 'react'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'

export default function HorreurPossessionEgg() {
  const { armed } = useThemeEgg('theme-horreur-possession')
  const discovered = useRef(false)
  const bufferRef = useRef('')
  const touchCountRef = useRef(0)
  const touchTimerRef = useRef<number>(0)

  useEffect(() => {
    if (!armed) return

    const trigger = () => {
      const site = document.getElementById('site')
      if (!site) return

      const tags = 'h1,h2,h3,h4,h5,h6,p,a,button,label,li,td,th,span,figcaption,blockquote'
      document.documentElement.classList.add('possede')

      window.dispatchEvent(new CustomEvent('cm:horreur-froid-force'))
      const voile = document.querySelector('[class*="voile"]') as HTMLElement | null
      if (voile) {
        voile.style.opacity = '1'
      }

      setTimeout(() => {
        document.documentElement.classList.remove('possede')
        if (voile) voile.style.opacity = '0'
      }, 2000)

      if (!discovered.current) {
        discovered.current = true
        discoverThemeEgg('theme-horreur-possession')
      }
    }

    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || (active as HTMLElement).isContentEditable)) return

      if (e.key.length === 1) {
        bufferRef.current = (bufferRef.current + e.key.toLowerCase()).slice(-9)
        if (bufferRef.current.endsWith('exorciste')) {
          bufferRef.current = ''
          trigger()
        }
      }
    }

    const onTouch = (e: TouchEvent) => {
      const brand = (e.target as HTMLElement)?.closest?.('[data-brand-title]')
      if (!brand) {
        touchCountRef.current = 0
        return
      }
      touchCountRef.current++
      clearTimeout(touchTimerRef.current)
      touchTimerRef.current = window.setTimeout(() => {
        touchCountRef.current = 0
      }, 3000)
      if (touchCountRef.current >= 5) {
        touchCountRef.current = 0
        trigger()
      }
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('touchstart', onTouch, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('touchstart', onTouch)
      clearTimeout(touchTimerRef.current)
    }
  }, [armed])

  return null
}
