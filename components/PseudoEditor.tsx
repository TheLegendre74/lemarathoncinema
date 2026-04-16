'use client'

import { useState, useTransition } from 'react'
import { changePseudo } from '@/lib/actions'

export default function PseudoEditor({ initial }: { initial: string }) {
  const [editing, setEditing]   = useState(false)
  const [value,   setValue]     = useState(initial)
  const [error,   setError]     = useState('')
  const [pending, startTransition] = useTransition()

  function save() {
    setError('')
    startTransition(async () => {
      const res = await changePseudo(value)
      if (res?.error) {
        setError(res.error)
      } else {
        setEditing(false)
      }
    })
  }

  function cancel() {
    setValue(initial)
    setError('')
    setEditing(false)
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '.5rem' }}>
        Pseudo
      </div>
      {editing ? (
        <div>
          <input
            value={value}
            onChange={e => setValue(e.target.value.slice(0, 20))}
            placeholder="Nouveau pseudo..."
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
            style={{ width: '100%', background: 'var(--bg3)', border: `1px solid ${error ? 'var(--red)' : 'var(--border2)'}`, borderRadius: 'var(--r)', padding: '.65rem .9rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.88rem', outline: 'none', boxSizing: 'border-box' }}
          />
          {error && <div style={{ fontSize: '.75rem', color: 'var(--red)', marginTop: '.3rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginTop: '.5rem' }}>
            <button onClick={save} disabled={pending} className="btn btn-gold" style={{ fontSize: '.8rem', padding: '.4rem .9rem' }}>
              {pending ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button onClick={cancel} className="btn btn-outline" style={{ fontSize: '.8rem', padding: '.4rem .9rem' }}>
              Annuler
            </button>
            <span style={{ fontSize: '.68rem', color: 'var(--text3)', marginLeft: 'auto' }}>{value.length}/20</span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.65rem .9rem', fontSize: '.88rem', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <span>{initial}</span>
          <span style={{ fontSize: '.65rem', color: 'var(--text3)' }}>✏️ Modifier</span>
        </div>
      )}
    </div>
  )
}
