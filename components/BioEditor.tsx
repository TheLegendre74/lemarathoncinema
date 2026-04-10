'use client'

import { useState, useTransition } from 'react'
import { updateBio } from '@/lib/actions'

export default function BioEditor({ initial }: { initial: string | null }) {
  const [bio, setBio] = useState(initial ?? '')
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await updateBio(bio.trim())
      setEditing(false)
    })
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: '.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '.5rem' }}>
        Mini-bio
      </div>
      {editing ? (
        <div>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value.slice(0, 200))}
            placeholder="Présente-toi en quelques mots..."
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.7rem .9rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '.88rem', resize: 'vertical', minHeight: 80, outline: 'none', boxSizing: 'border-box' }}
            autoFocus
          />
          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginTop: '.4rem' }}>
            <button
              onClick={save}
              disabled={pending}
              className="btn btn-gold"
              style={{ fontSize: '.8rem', padding: '.4rem .9rem' }}
            >
              {pending ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button
              onClick={() => { setBio(initial ?? ''); setEditing(false) }}
              className="btn btn-outline"
              style={{ fontSize: '.8rem', padding: '.4rem .9rem' }}
            >
              Annuler
            </button>
            <span style={{ fontSize: '.68rem', color: 'var(--text3)', marginLeft: 'auto' }}>{bio.length}/200</span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.7rem .9rem', fontSize: '.88rem', color: bio ? 'var(--text2)' : 'var(--text3)', cursor: 'pointer', minHeight: 44, lineHeight: 1.6 }}
        >
          {bio || <span style={{ fontStyle: 'italic' }}>Clique pour ajouter une bio...</span>}
          <span style={{ float: 'right', fontSize: '.65rem', color: 'var(--text3)', marginLeft: '.5rem' }}>✏️</span>
        </div>
      )}
    </div>
  )
}
