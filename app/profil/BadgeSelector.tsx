'use client'

import { useState, useTransition } from 'react'
import { setActiveBadge } from '@/lib/actions'
import type { Badge } from '@/lib/config'
import type { SpecialBadge } from '@/lib/config'

interface Props {
  expBadges: (Badge & { unlocked: boolean })[]
  specialBadges: SpecialBadge[]
  activeBadge: string | null
}

export default function BadgeSelector({ expBadges, specialBadges, activeBadge }: Props) {
  const [active, setActive] = useState(activeBadge)
  const [pending, startTransition] = useTransition()

  function select(id: string | null) {
    const next = active === id ? 'none' : id
    setActive(next)
    startTransition(() => { setActiveBadge(next) })
  }

  const unlocked = expBadges.filter(b => b.unlocked)

  return (
    <div>
      <div className="section-title" style={{ marginBottom: '.6rem' }}>Badge actif <span style={{ color: 'var(--text3)', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0, fontSize: '.68rem' }}>— cliquer pour activer / désactiver</span></div>

      {specialBadges.length > 0 && (
        <>
          <div style={{ fontSize: '.65rem', color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '.4rem' }}>Secrets débloqués</div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {specialBadges.map(b => {
              const isActive = active === b.id
              return (
                <button
                  key={b.id}
                  disabled={pending}
                  onClick={() => select(b.id)}
                  title={b.desc}
                  className={`badge-pill ${b.cls}`}
                  style={{
                    cursor: 'pointer', border: 'none',
                    outline: isActive ? '2px solid currentColor' : 'none',
                    outlineOffset: 2,
                    opacity: pending ? .6 : 1,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{b.icon}</span>
                  {b.label}
                  {isActive && <span style={{ fontSize: '.6rem', opacity: .7 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </>
      )}

      {unlocked.length > 0 && (
        <>
          <div style={{ fontSize: '.65rem', color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '.4rem' }}>Badges EXP</div>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {unlocked.map(b => {
              const isActive = active === b.id
              return (
                <button
                  key={b.id}
                  disabled={pending}
                  onClick={() => select(b.id)}
                  title={b.desc}
                  className={`badge-pill ${b.cls}`}
                  style={{
                    cursor: 'pointer', border: 'none',
                    outline: isActive ? '2px solid currentColor' : 'none',
                    outlineOffset: 2,
                    opacity: pending ? .6 : 1,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{b.icon}</span>
                  {b.label}
                  {isActive && <span style={{ fontSize: '.6rem', opacity: .7 }}>✓</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
