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
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 1200 })
      return () => window.cancelIdleCallback(id)
    }

    const id = globalThis.setTimeout(() => setReady(true), 800)
    return () => globalThis.clearTimeout(id)
  }, [])

  return ready ? <EasterEggs {...props} /> : null
}
