'use client'

import { useEffect, useRef, useCallback } from 'react'

interface Props {
  armed: boolean
  playerLevel: number | null
  onFirstTrigger: () => void
}

const KEYWORD = 'nakatomi'
const TOTAL_DURATION = 3200
const CLIMB_DURATION = 1200
const CRACK_DURATION = 600
const HOLD_DURATION = 1000
const FADE_DURATION = 400

export default function ActionNakatomiEgg({ armed, playerLevel, onFirstTrigger }: Props) {
  const triggered = useRef(false)
  const bufferRef = useRef('')
  const playing = useRef(false)

  const play = useCallback(() => {
    if (playing.current) return
    playing.current = true

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const rail = document.querySelector('[class*="rail"]') as HTMLElement | null
    const railFloors = rail?.querySelectorAll('[class*="railFloor"]') as NodeListOf<HTMLElement> | undefined
    const badge = document.querySelector('[data-etage-badge]') as HTMLElement | null

    const crackOverlay = document.createElement('div')
    crackOverlay.style.cssText = `
      position: fixed; inset: 0;
      z-index: var(--z-fx, 450);
      pointer-events: none;
      opacity: 0;
    `
    crackOverlay.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 1200 800" preserveAspectRatio="none" style="width:100%;height:100%">
      <g stroke="rgba(232,237,242,.25)" stroke-width="1.5" fill="none" stroke-linecap="round">
        <path d="M600 400 L580 360 L560 340 L530 350 L500 330"/>
        <path d="M600 400 L620 370 L650 355 L680 360 L710 340"/>
        <path d="M600 400 L590 430 L570 460 L555 450"/>
        <path d="M600 400 L615 440 L640 465 L660 455"/>
        <path d="M600 400 L575 395 L540 400 L510 390"/>
        <path d="M600 400 L630 395 L665 405 L700 395"/>
        <path d="M580 360 L565 330 L550 300"/>
        <path d="M620 370 L640 340 L655 310"/>
        <path d="M590 430 L600 470 L595 500"/>
        <path d="M615 440 L625 475 L640 500"/>
      </g>
      <circle cx="600" cy="400" r="4" fill="rgba(232,237,242,.15)"/>
    </svg>`
    document.body.appendChild(crackOverlay)

    if (prefersReduced) {
      crackOverlay.style.opacity = '1'

      if (badge) {
        const original = badge.textContent
        badge.textContent = 'ÉTAGE 12'
        setTimeout(() => { badge.textContent = original }, HOLD_DURATION + CLIMB_DURATION)
      }

      setTimeout(() => {
        crackOverlay.style.opacity = '0'
        crackOverlay.style.transition = `opacity ${FADE_DURATION}ms`
        setTimeout(() => {
          crackOverlay.remove()
          playing.current = false
        }, FADE_DURATION)
      }, HOLD_DURATION + CLIMB_DURATION)
    } else {
      if (railFloors && railFloors.length > 0) {
        const activeClass = Array.from(railFloors[0].classList).find(c => c.includes('Active'))
        let currentIdx = -1
        railFloors.forEach((f, i) => { if (f.classList.contains(activeClass || '')) currentIdx = i })

        const stepDur = CLIMB_DURATION / railFloors.length
        railFloors.forEach((f, i) => {
          setTimeout(() => {
            railFloors.forEach(ff => {
              if (activeClass) ff.classList.remove(activeClass)
              ff.style.color = ''
              ff.style.fontWeight = ''
            })
            f.style.color = 'var(--accent-fg)'
            f.style.fontWeight = '700'
            const floorNum = 12 - i
            f.textContent = `▸${String(floorNum).padStart(2, '0')}`
          }, stepDur * i)
        })

        setTimeout(() => {
          railFloors.forEach((f, i) => {
            f.style.color = ''
            f.style.fontWeight = ''
            const floorNum = 12 - i
            const isActive = playerLevel !== null && floorNum === Math.min(playerLevel, 12)
            f.textContent = `${isActive ? '▸' : ' '}${String(floorNum).padStart(2, '0')}`
            if (isActive && activeClass) f.classList.add(activeClass)
          })
        }, CLIMB_DURATION + CRACK_DURATION + HOLD_DURATION)
      } else if (badge) {
        const original = badge.textContent
        let floor = 1
        const stepDur = CLIMB_DURATION / 12
        const interval = setInterval(() => {
          floor++
          badge.textContent = `ÉTAGE ${String(floor).padStart(2, '0')}`
          if (floor >= 12) clearInterval(interval)
        }, stepDur)

        setTimeout(() => {
          badge.textContent = original
        }, CLIMB_DURATION + CRACK_DURATION + HOLD_DURATION)
      }

      setTimeout(() => {
        crackOverlay.style.opacity = '1'
        crackOverlay.style.transition = `opacity ${CRACK_DURATION}ms`
      }, CLIMB_DURATION)

      setTimeout(() => {
        crackOverlay.style.opacity = '0'
        crackOverlay.style.transition = `opacity ${FADE_DURATION}ms`
        setTimeout(() => {
          crackOverlay.remove()
          playing.current = false
        }, FADE_DURATION)
      }, CLIMB_DURATION + CRACK_DURATION + HOLD_DURATION)
    }

    if (!triggered.current) {
      triggered.current = true
      onFirstTrigger()
    }
  }, [playerLevel, onFirstTrigger])

  useEffect(() => {
    if (!armed) return

    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement || (e.target as HTMLElement)?.isContentEditable) {
        return
      }

      const ch = e.key.length === 1 ? e.key.toLowerCase() : null
      if (!ch || !/[a-z]/.test(ch)) return

      bufferRef.current = (bufferRef.current + ch).slice(-KEYWORD.length)
      if (bufferRef.current === KEYWORD) {
        bufferRef.current = ''
        play()
      }
    }

    function handleSecours() {
      play()
    }

    window.addEventListener('keydown', handleKey)
    window.addEventListener('action:nakatomi-secours', handleSecours)

    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('action:nakatomi-secours', handleSecours)
    }
  }, [armed, play])

  return null
}
