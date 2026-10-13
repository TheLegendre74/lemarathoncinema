'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { SITE_URL } from '@/lib/site'
import { STORAGE_PREFIXES, filterStorageKeys } from '@/lib/demenagement'

export default function DepartPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const vers = searchParams.get('vers') ?? '/'
    const safeDest = vers.startsWith('/') && !vers.startsWith('//') ? vers : '/'

    try {
      const allKeys = Object.keys(localStorage)
      const toTransfer = filterStorageKeys(allKeys)

      const data: Record<string, string> = {}
      for (const k of toTransfer) {
        const v = localStorage.getItem(k)
        if (v !== null) data[k] = v
      }

      document.cookie = 'cm_demenage=1; path=/; max-age=31536000; SameSite=Lax'

      if (Object.keys(data).length > 0) {
        const json = JSON.stringify(data)
        const encoded = btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        location.replace(`${SITE_URL}/demenagement/arrivee?vers=${encodeURIComponent(safeDest)}#${encoded}`)
      } else {
        location.replace(`${SITE_URL}${safeDest}`)
      }
    } catch {
      location.replace(`${SITE_URL}${safeDest}`)
    }
  }, [searchParams])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', color: '#aaa', fontFamily: 'system-ui' }}>
      <p>Transfert en cours…</p>
    </div>
  )
}
