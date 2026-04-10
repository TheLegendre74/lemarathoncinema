'use client'

import { useState, useTransition } from 'react'
import { toggleMarathonNotification } from '@/lib/actions'

export default function MarathonNotifyToggle({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      await toggleMarathonNotification(next)
    })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--r)', padding: '.75rem 1rem',
      marginBottom: '1.5rem', gap: '1rem',
    }}>
      <div>
        <div style={{ fontSize: '.85rem', fontWeight: 500 }}>
          🔔 Me prévenir par e-mail
        </div>
        <div style={{ fontSize: '.72rem', color: 'var(--text3)', marginTop: '.15rem' }}>
          Reçois un mail 3 jours avant le lancement du marathon
        </div>
      </div>
      <button
        onClick={toggle}
        disabled={pending}
        style={{
          flexShrink: 0,
          width: 44, height: 24,
          borderRadius: 12,
          border: 'none',
          cursor: pending ? 'default' : 'pointer',
          background: enabled ? 'var(--gold)' : 'var(--bg3)',
          position: 'relative',
          transition: 'background .2s',
          opacity: pending ? .6 : 1,
        }}
        aria-label={enabled ? 'Désactiver les notifications' : 'Activer les notifications'}
      >
        <span style={{
          position: 'absolute',
          top: 3, left: enabled ? 23 : 3,
          width: 18, height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.3)',
        }} />
      </button>
    </div>
  )
}
