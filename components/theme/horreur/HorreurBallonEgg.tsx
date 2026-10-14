'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { useTempsVisible } from '@/lib/themes/useTempsVisible'
import { discoverThemeEgg } from '@/lib/actions'

const BALLON_KEY = 'cm_ballon'
const TROUVE_KEY = 'cm_ballon_trouve'
const RISE_DURATION = 40_000
const REQUIRED_TIME = 120

function parisDay(): string {
  const now = new Date()
  const paris = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  const h = paris.getHours()
  if (h < 4) paris.setDate(paris.getDate() - 1)
  return paris.toISOString().slice(0, 10)
}

function alreadyShownToday(): boolean {
  try { return localStorage.getItem(BALLON_KEY) === parisDay() } catch { return true }
}

function markShownToday() {
  try { localStorage.setItem(BALLON_KEY, parisDay()) } catch {}
}

function alreadyFound(): boolean {
  try { return localStorage.getItem(TROUVE_KEY) === '1' } catch { return false }
}

export default function HorreurBallonEgg() {
  const { armed } = useThemeEgg('theme-horreur-ballon')
  const tempsVisible = useTempsVisible()
  const [phase, setPhase] = useState<'waiting' | 'rising' | 'caught' | 'done'>('waiting')
  const [message, setMessage] = useState<string | null>(null)
  const leftPct = useRef(10 + Math.random() * 80)
  const discovered = useRef(false)

  const canShow = armed && !alreadyFound() && !alreadyShownToday() && tempsVisible >= REQUIRED_TIME

  useEffect(() => {
    if (!canShow || phase !== 'waiting') return
    markShownToday()
    setPhase('rising')
  }, [canShow, phase])

  useEffect(() => {
    if (phase !== 'rising') return
    const t = setTimeout(() => setPhase('done'), RISE_DURATION)
    return () => clearTimeout(t)
  }, [phase])

  const handleClick = useCallback(() => {
    if (phase !== 'rising') return
    setPhase('caught')
    setMessage('Tu le reverras.')
    if (!discovered.current) {
      discovered.current = true
      try { localStorage.setItem(TROUVE_KEY, '1') } catch {}
      discoverThemeEgg('theme-horreur-ballon')
    }
    setTimeout(() => {
      setMessage(null)
      setPhase('done')
    }, 3000)
  }, [phase])

  if (phase === 'waiting' || phase === 'done') return null

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const navH = 56

  return (
    <>
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: `${leftPct.current}%`,
          top: navH,
          bottom: 0,
          width: 44,
          overflow: 'hidden',
          zIndex: 'var(--z-fx, 450)' as any,
          pointerEvents: 'none',
        }}
      >
        <button
          onClick={handleClick}
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: 'absolute',
            bottom: reduced ? '80%' : undefined,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 20,
            height: 70,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            pointerEvents: 'auto',
            animation: reduced ? 'none' : phase === 'caught'
              ? 'ballonCatch .8s ease-out forwards'
              : `ballonRise ${RISE_DURATION}ms linear forwards`,
          }}
        >
          <div style={{
            width: 15,
            height: 18,
            margin: '0 auto',
            borderRadius: '50% 50% 48% 48% / 55% 55% 45% 45%',
            background: 'radial-gradient(circle at 34% 30%, #E0575D, #B0141C 55%, #5A070B)',
            boxShadow: '0 0 14px -2px rgba(176,20,28,.5)',
          }} />
          <div style={{
            width: 1,
            height: 46,
            margin: '0 auto',
            background: 'linear-gradient(180deg, rgba(217,211,196,.5), transparent)',
            transform: 'rotate(4deg)',
            transformOrigin: 'top',
          }} />
        </button>
      </div>
      {message && (
        <div style={{
          position: 'fixed',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'var(--f-main, var(--f-data))',
          fontSize: 16,
          color: 'var(--bad-fg)',
          zIndex: 'var(--z-fx, 450)' as any,
          pointerEvents: 'none',
        }}>
          {message}
        </div>
      )}
    </>
  )
}
