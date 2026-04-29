'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { EasterEggsConfig } from './EasterEggs'

const EasterEggs = dynamic(() => import('./EasterEggs'), {
  ssr: false,
  loading: () => null,
})

interface EasterEggsLoaderProps {
  config?: EasterEggsConfig
  isGuest?: boolean
  watchedCount?: number
  hasClippyEgg?: boolean
  isAdmin?: boolean
  userId?: string
}

export default function EasterEggsLoader(props: EasterEggsLoaderProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Clippy actif → charger immédiatement (doit s'afficher dès le départ)
    if (
      localStorage.getItem('clippy_active') === '1' ||
      localStorage.getItem('clippy_is_larbin') === '1'
    ) {
      setReady(true)
      return
    }

    const load = () => setReady(true)

    // Charger au premier keystroke (l'utilisateur est en train de taper un code)
    window.addEventListener('keydown', load, { once: true, capture: true })

    // Fallback : charger après 5s d'inactivité max
    let cancelIdle: () => void
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(load, { timeout: 5000 })
      cancelIdle = () => window.cancelIdleCallback(id)
    } else {
      const id = globalThis.setTimeout(load, 5000)
      cancelIdle = () => globalThis.clearTimeout(id)
    }

    return () => {
      window.removeEventListener('keydown', load, true)
      cancelIdle()
    }
  }, [])

  return ready ? <EasterEggs {...props} /> : null
}
