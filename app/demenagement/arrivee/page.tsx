'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { filterStorageKeys } from '@/lib/demenagement'

const ANCIENS_HOSTS = (process.env.NEXT_PUBLIC_ANCIENS_DOMAINES ?? '')
  .split(',')
  .map(d => d.trim().toLowerCase())
  .filter(Boolean)

export default function ArriveePage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const vers = searchParams.get('vers') ?? '/'
    const safeDest = vers.startsWith('/') && !vers.startsWith('//') ? vers : '/'

    try {
      const referrerOrigin = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ''
      if (!ANCIENS_HOSTS.includes(referrerOrigin)) {
        location.replace(safeDest)
        return
      }

      const fragment = location.hash.slice(1)
      if (!fragment) {
        location.replace(safeDest)
        return
      }

      const padded = fragment.replace(/-/g, '+').replace(/_/g, '/')
      const json = atob(padded)
      const data = JSON.parse(json) as Record<string, string>

      const safeKeys = filterStorageKeys(Object.keys(data))
      for (const k of safeKeys) {
        if (localStorage.getItem(k) === null) {
          localStorage.setItem(k, data[k])
        }
      }

      history.replaceState(null, '', location.pathname + location.search)
    } catch {
      // silent — proceed to dest
    }

    location.replace(safeDest)
  }, [searchParams])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', color: '#aaa', fontFamily: 'system-ui' }}>
      <p>Installation…</p>
    </div>
  )
}
