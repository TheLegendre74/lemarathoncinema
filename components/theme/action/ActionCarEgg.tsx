'use client'

import { useEffect, useRef, useCallback } from 'react'

const CURSOR_URLS = Array.from({ length: 8 }, (_, i) => `/cursors/action-car-${i}.png`)
const WRECK_URL = '/cursors/action-car-epave.png'
const RETICLE_URL = '/cursors/action-reticle.png'
const HISTORY_MS = 80
const MIN_SPEED_FOR_ROTATION = 150
const MAX_UPDATES_PER_SEC = 20
const EDGE_PX = 8
const CRASH_COOLDOWN = 2500
const WRECK_DURATION = 1500
const EXPLOSION_DURATION = 600

interface Props {
  armed: boolean
  crashSpeed: number
  onFirstCrash: () => void
}

function angleToBucket(dx: number, dy: number): number {
  const angle = Math.atan2(dy, dx) * (180 / Math.PI)
  const normalized = ((angle + 360 + 90) % 360)
  return Math.round(normalized / 45) % 8
}

function setCursor(el: HTMLElement, url: string) {
  el.style.cursor = `url("${url}") 16 16, auto`
}

export default function ActionCarEgg({ armed, crashSpeed, onFirstCrash }: Props) {
  const siteRef = useRef<HTMLElement | null>(null)
  const posHistory = useRef<{ x: number; y: number; t: number }[]>([])
  const lastUpdate = useRef(0)
  const lastCrash = useRef(0)
  const wrecked = useRef(false)
  const crashed = useRef(false)
  const explosionRef = useRef<HTMLDivElement | null>(null)
  const suppressedRef = useRef(false)
  const observerRef = useRef<MutationObserver | null>(null)

  const checkSuppressed = useCallback(() => {
    if (document.body.style.cursor) return true
    const fixed = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]')
    for (const el of fixed) {
      const z = parseInt(window.getComputedStyle(el).zIndex || '0')
      if (z < 800) continue
      const rect = (el as HTMLElement).getBoundingClientRect()
      const area = rect.width * rect.height
      const viewArea = window.innerWidth * window.innerHeight
      if (area > viewArea * 0.5) return true
    }
    return false
  }, [])

  useEffect(() => {
    if (!armed) return

    const site = document.getElementById('site')
    if (!site) return
    siteRef.current = site

    const imgs = [...CURSOR_URLS, WRECK_URL, RETICLE_URL]
    imgs.forEach(src => {
      const img = new Image()
      img.src = src
    })

    site.setAttribute('data-car', '')
    setCursor(site, CURSOR_URLS[0])

    const observer = new MutationObserver(() => {
      const suppressed = checkSuppressed()
      if (suppressed !== suppressedRef.current) {
        suppressedRef.current = suppressed
        if (suppressed) {
          site.removeAttribute('data-car')
          site.style.cursor = ''
        } else if (!wrecked.current) {
          site.setAttribute('data-car', '')
          setCursor(site, CURSOR_URLS[0])
        }
      }
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'] })
    observer.observe(document.body, { childList: true, subtree: true })
    observerRef.current = observer

    function handleMove(e: MouseEvent) {
      if (suppressedRef.current || wrecked.current) return
      const now = performance.now()
      posHistory.current.push({ x: e.clientX, y: e.clientY, t: now })
      posHistory.current = posHistory.current.filter(p => now - p.t <= HISTORY_MS)

      if (now - lastUpdate.current < 1000 / MAX_UPDATES_PER_SEC) return
      lastUpdate.current = now

      if (posHistory.current.length >= 2) {
        const first = posHistory.current[0]
        const last = posHistory.current[posHistory.current.length - 1]
        const dx = last.x - first.x
        const dy = last.y - first.y
        const dt = (last.t - first.t) / 1000
        if (dt > 0) {
          const speed = Math.sqrt(dx * dx + dy * dy) / dt
          if (speed > MIN_SPEED_FOR_ROTATION) {
            const bucket = angleToBucket(dx, dy)
            setCursor(site!, CURSOR_URLS[bucket])
          }

          if (speed > crashSpeed && now - lastCrash.current > CRASH_COOLDOWN) {
            const el = document.elementFromPoint(e.clientX, e.clientY)
            if (el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ||
                el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable)) {
              return
            }

            const nearEdge =
              e.clientX <= EDGE_PX || e.clientX >= window.innerWidth - EDGE_PX ||
              e.clientY <= EDGE_PX || e.clientY >= window.innerHeight - EDGE_PX
            const brand = document.querySelector('[data-brand-title]')
            const hitBrand = brand && brand.getBoundingClientRect &&
              (() => { const r = brand.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom })()

            if (nearEdge || hitBrand) {
              doCrash(e.clientX, e.clientY)
            }
          }
        }
      }
    }

    function doCrash(x: number, y: number) {
      const now = performance.now()
      lastCrash.current = now
      wrecked.current = true

      const cx = Math.max(20, Math.min(x, window.innerWidth - 20))
      const cy = Math.max(20, Math.min(y, window.innerHeight - 20))

      setCursor(site!, WRECK_URL)

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const explosion = document.createElement('div')
      explosion.style.cssText = `
        position: fixed;
        left: ${cx}px; top: ${cy}px;
        width: 0; height: 0;
        z-index: var(--z-fx, 450);
        pointer-events: none;
        transform: translate(-50%, -50%);
      `

      if (prefersReduced) {
        explosion.style.width = '40px'
        explosion.style.height = '40px'
        explosion.style.borderRadius = '50%'
        explosion.style.background = 'radial-gradient(circle, rgba(255,107,31,.4), rgba(255,162,61,.1) 70%, transparent)'
      } else {
        explosion.style.borderRadius = '50%'
        explosion.style.background = 'radial-gradient(circle, rgba(255,107,31,.8), rgba(255,162,61,.3) 60%, transparent)'
        explosion.animate([
          { width: '0px', height: '0px', opacity: 1 },
          { width: '80px', height: '80px', opacity: 0.8, offset: 0.3 },
          { width: '120px', height: '120px', opacity: 0 },
        ], { duration: EXPLOSION_DURATION, easing: 'cubic-bezier(.2,.8,.2,1)' })
      }

      document.body.appendChild(explosion)
      explosionRef.current = explosion

      if (!crashed.current) {
        crashed.current = true
        onFirstCrash()
      }

      const cleanupTime = prefersReduced ? WRECK_DURATION : EXPLOSION_DURATION
      setTimeout(() => {
        explosion.remove()
      }, cleanupTime)

      setTimeout(() => {
        wrecked.current = false
        if (!suppressedRef.current && site) {
          setCursor(site, CURSOR_URLS[0])
        }
      }, WRECK_DURATION)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleMove)
      observer.disconnect()
      site.removeAttribute('data-car')
      site.style.cursor = ''
      if (explosionRef.current) {
        explosionRef.current.remove()
        explosionRef.current = null
      }
    }
  }, [armed, crashSpeed, onFirstCrash, checkSuppressed])

  return null
}
