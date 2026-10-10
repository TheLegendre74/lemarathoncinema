'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'cm_visite_s'

function readStored(): number {
  try {
    return parseInt(sessionStorage.getItem(STORAGE_KEY) ?? '0') || 0
  } catch {
    return 0
  }
}

function writeStored(n: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(n))
  } catch {}
}

export function useTempsVisible(): number {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    let s = readStored()
    setSeconds(s)

    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        s++
        writeStored(s)
        setSeconds(s)
      }
    }, 1000)

    return () => clearInterval(id)
  }, [])

  return seconds
}
