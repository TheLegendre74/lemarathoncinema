'use client'

import { useCallback, useEffect, useState } from 'react'
import { useThemeEgg } from '@/lib/themes/useThemeEgg'
import { discoverThemeEgg } from '@/lib/actions'

export default function ComedieVertEgg() {
  const { armed } = useThemeEgg('theme-comedie-vert')
  const [grilled, setGrilled] = useState(false)

  useEffect(() => {
    if (!armed) return
    try {
      const stored = localStorage.getItem('cm_vert')
      if (stored) {
        const monday = getMondayKey()
        if (stored === monday) setGrilled(true)
      }
    } catch {}
  }, [armed])

  const handleClick = useCallback(async () => {
    if (!armed || grilled) return
    setGrilled(true)
    try {
      localStorage.setItem('cm_vert', getMondayKey())
    } catch {}
    await discoverThemeEgg('theme-comedie-vert')
  }, [armed, grilled])

  if (!armed) return null

  return (
    <GreenBulbSlot grilled={grilled} onClick={handleClick} />
  )
}

function GreenBulbSlot({ grilled, onClick }: { grilled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Ampoule de la rampe"
      type="button"
      data-comedie-vert=""
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: grilled ? 'var(--ink-ghost)' : 'var(--interdit)',
        boxShadow: grilled ? 'none' : '0 0 6px var(--interdit)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        position: 'relative',
        zIndex: 1,
        flexShrink: 0,
        minWidth: 44,
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: grilled ? 'var(--ink-ghost)' : 'var(--interdit)',
          boxShadow: grilled ? 'none' : '0 0 6px var(--interdit)',
          display: 'block',
        }}
      />
    </button>
  )
}

function getMondayKey(): string {
  const now = new Date()
  const d = now.getDay()
  const diff = d === 0 ? 6 : d - 1
  const monday = new Date(now)
  monday.setDate(monday.getDate() - diff)
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`
}
