'use client'

import { useEffect, useState } from 'react'

export default function RankDisplay({ fallback }: { fallback: number }) {
  const [rank, setRank] = useState<number>(fallback)

  useEffect(() => {
    fetch('/api/me/rank')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.rank != null) setRank(d.rank) })
      .catch(() => {})
  }, [])

  return <>#{rank}</>
}
