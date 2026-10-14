'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'

const STORAGE_KEY = 'cm_chemin'
const CAIRN_KEY = 'cm_cairn'

function getHistory(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

function setHistory(h: string[]) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(-6))) } catch {}
}

function detectCycle(history: string[]): boolean {
  if (history.length < 6) return false
  const last6 = history.slice(-6)
  const a = last6[0], b = last6[1], c = last6[2]
  if (a === b || b === c || a === c) return false
  return last6[3] === a && last6[4] === b && last6[5] === c
}

export default function HorreurCercleEgg() {
  const { armed } = useThemeEgg('theme-horreur-cercle')
  const pathname = usePathname()
  const [message, setMessage] = useState<string | null>(null)
  const [showCairn, setShowCairn] = useState(false)
  const discovered = useRef(false)
  const firedRef = useRef(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CAIRN_KEY)) setShowCairn(true)
    } catch {}
  }, [])

  useEffect(() => {
    if (!armed || !pathname || firedRef.current) return

    const path = pathname.split('?')[0]
    const history = getHistory()
    const last = history[history.length - 1]
    if (last === path) return

    history.push(path)
    setHistory(history)

    if (detectCycle(history)) {
      firedRef.current = true

      setMessage('Tu tournes en rond.')
      try { sessionStorage.setItem(CAIRN_KEY, '1') } catch {}
      setShowCairn(true)

      if (!discovered.current) {
        discovered.current = true
        discoverThemeEgg('theme-horreur-cercle')
      }
      setTimeout(() => setMessage(null), 4000)
    }
  }, [armed, pathname])

  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <>
      {message && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 'var(--z-fx, 450)' as any,
            pointerEvents: 'none',
            background: 'rgba(0,0,0,.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: reduced ? 'none' : 'cercleOverlay 1s ease',
          }}
        >
          <span style={{
            fontFamily: 'var(--f-main, var(--f-data))',
            fontSize: 18,
            color: 'var(--ink3)',
          }}>
            {message}
          </span>
        </div>
      )}
      {showCairn && (
        <div
          aria-hidden="true"
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '24px 0 8px',
          }}
        >
          <svg width="32" height="24" viewBox="0 0 32 24" style={{ opacity: 0.3 }}>
            <ellipse cx="16" cy="20" rx="12" ry="4" fill="var(--ink3)" />
            <circle cx="11" cy="14" r="5" fill="var(--s3)" stroke="var(--line)" strokeWidth="0.5" />
            <circle cx="20" cy="15" r="4" fill="var(--s3)" stroke="var(--line)" strokeWidth="0.5" />
            <circle cx="16" cy="9" r="4" fill="var(--s3)" stroke="var(--line)" strokeWidth="0.5" />
            <circle cx="16" cy="4" r="3" fill="var(--s3)" stroke="var(--line)" strokeWidth="0.5" />
          </svg>
        </div>
      )}
    </>
  )
}
