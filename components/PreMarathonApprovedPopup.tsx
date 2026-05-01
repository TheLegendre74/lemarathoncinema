'use client'

import { useState, useEffect } from 'react'

interface Props {
  userId: string
  preMarathonWindowUntil: string
}

export default function PreMarathonApprovedPopup({ userId, preMarathonWindowUntil }: Props) {
  const storageKey = `cm_join_popup_seen_${userId}`
  const [visible, setVisible] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setVisible(true)
    } catch { /* SSR */ }
  }, [storageKey])

  useEffect(() => {
    if (!visible) return
    function update() {
      const diff = new Date(preMarathonWindowUntil).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('expirée'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      setTimeLeft(`${h}h${String(m).padStart(2, '0')}min`)
    }
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [visible, preMarathonWindowUntil])

  function dismiss() {
    try { localStorage.setItem(storageKey, '1') } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
        onClick={dismiss}
      >
        <div
          style={{
            background: 'var(--bg2)', border: '2px solid rgba(79,217,138,.45)',
            borderRadius: 'var(--rl)', padding: '2rem 1.8rem',
            maxWidth: 460, width: '100%', position: 'relative',
            boxShadow: '0 8px 40px rgba(0,0,0,.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={dismiss}
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '1.1rem' }}
            aria-label="Fermer"
          >
            ✕
          </button>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>🎉</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--green)', lineHeight: 1.1 }}>
              Bienvenue dans le Marathon !
            </div>
          </div>

          <div style={{ fontSize: '.88rem', color: 'var(--text2)', lineHeight: 1.7, marginBottom: '1.2rem' }}>
            Tu as été accepté en cours de saison. Pour rattraper ton retard, tu disposes d'une{' '}
            <strong style={{ color: 'var(--text)' }}>fenêtre de 24h</strong> pour cocher les films que tu as{' '}
            <strong style={{ color: 'var(--text)' }}>déjà vus avant de rejoindre le marathon</strong>.
          </div>

          <div style={{
            background: 'rgba(79,217,138,.08)', border: '1px solid rgba(79,217,138,.3)',
            borderRadius: 'var(--r)', padding: '.8rem 1rem', marginBottom: '1.2rem',
          }}>
            <div style={{ fontSize: '.72rem', color: 'var(--text3)', marginBottom: '.3rem' }}>
              Temps restant pour cocher tes films pré-marathon
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--font-display)' }}>
              {timeLeft || '…'}
            </div>
          </div>

          <div style={{ fontSize: '.8rem', color: 'var(--text3)', lineHeight: 1.6, marginBottom: '1.4rem' }}>
            <strong style={{ color: 'var(--text2)' }}>Comment faire ?</strong><br />
            Va sur la page <strong>Films</strong>, ouvre la fiche d'un film que tu as déjà vu, et clique sur{' '}
            <span style={{ color: 'var(--gold)', fontStyle: 'italic' }}>"J'ai vu ce film (pré-marathon)"</span>.
            Ce bouton est exceptionnellement actif pour toi pendant 24h.<br /><br />
            Passé ce délai, tu ne pourras plus ajouter de films "pré-marathon" — seulement les films vus{' '}
            <strong>pendant</strong> le marathon.
          </div>

          <button
            onClick={dismiss}
            className="btn btn-green btn-full"
            style={{ padding: '.7rem', fontSize: '.9rem' }}
          >
            Compris — Allons cocher mes films !
          </button>
        </div>
      </div>

      <style>{`
        @keyframes popup-in {
          from { opacity: 0; transform: scale(.92); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
