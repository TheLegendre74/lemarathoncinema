'use client'

import { useEffect } from 'react'

export default function ThemeCursors() {
  useEffect(() => {
    const site = document.getElementById('site')
    if (!site) return

    let clicTimer: ReturnType<typeof setTimeout> | null = null

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      site.setAttribute('data-clic', '')
      if (clicTimer) clearTimeout(clicTimer)
      clicTimer = setTimeout(() => site.removeAttribute('data-clic'), 150)
    }

    const checkEggOverlay = () => {
      const bodyCursor = document.body.style.cursor
      if (bodyCursor && bodyCursor !== '' && bodyCursor !== 'auto') {
        site.setAttribute('data-sans-curseur', '')
        return
      }

      const fixed = document.querySelectorAll<HTMLElement>('[style*="position: fixed"], [style*="position:fixed"]')
      const ww = window.innerWidth
      const wh = window.innerHeight
      const halfScreen = (ww * wh) / 2

      for (const el of fixed) {
        const z = parseInt(getComputedStyle(el).zIndex || '0', 10)
        if (z < 800) continue
        const rect = el.getBoundingClientRect()
        const area = rect.width * rect.height
        if (area > halfScreen) {
          site.setAttribute('data-sans-curseur', '')
          return
        }
      }

      site.removeAttribute('data-sans-curseur')
    }

    const observer = new MutationObserver(checkEggOverlay)
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    observer.observe(document.body, { childList: true, subtree: true })

    site.addEventListener('pointerdown', onPointerDown)

    return () => {
      site.removeEventListener('pointerdown', onPointerDown)
      observer.disconnect()
      if (clicTimer) clearTimeout(clicTimer)
    }
  }, [])

  return null
}
