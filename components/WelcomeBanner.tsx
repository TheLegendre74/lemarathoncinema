'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'cm_tutorial_seen'

export default function WelcomeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch { /* SSR */ }
  }, [])

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, '1') } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(232,196,106,.13), rgba(167,139,250,.08))',
      border: '1px solid rgba(232,196,106,.45)',
      borderRadius: 'var(--rl)',
      padding: '1rem 1.2rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '1rem',
      animation: 'wb-slide-in .35s ease',
    }}>
      <span style={{ fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 }}>👋</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '.3rem', color: 'var(--gold)' }}>
          Bienvenue sur le Ciné Marathon !
        </div>
        <div style={{ fontSize: '.82rem', color: 'var(--text2)', lineHeight: 1.6, marginBottom: '.7rem' }}>
          Avant de commencer, consulte les règles du jeu ci-dessous pour tout comprendre en 2 minutes.
        </div>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <a
            href="#regles"
            onClick={dismiss}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '.4rem',
              background: 'rgba(232,196,106,.18)', border: '1px solid rgba(232,196,106,.4)',
              borderRadius: 'var(--r)', padding: '.45rem 1rem',
              color: 'var(--gold)', textDecoration: 'none', fontSize: '.82rem', fontWeight: 500,
            }}
          >
            📖 Voir les règles
          </a>
          <button
            onClick={dismiss}
            style={{
              background: 'none', border: '1px solid var(--border2)',
              borderRadius: 'var(--r)', padding: '.45rem .9rem',
              color: 'var(--text3)', fontSize: '.78rem', cursor: 'pointer',
            }}
          >
            Je connais déjà
          </button>
        </div>
      </div>
      <button
        onClick={dismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '1rem', padding: 0, flexShrink: 0 }}
        aria-label="Fermer"
      >
        ✕
      </button>
      <style>{`
        @keyframes wb-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
