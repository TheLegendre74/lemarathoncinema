'use client'

import { useState } from 'react'
import { submitSeasonJoinRequest } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'

type JoinStatus = {
  id: string
  status: 'pending' | 'approved_current' | 'approved_next' | 'rejected'
  message: string | null
  created_at: string
} | null

interface Props {
  initialStatus: JoinStatus
  preMarathonWindowUntil: string | null
}

export default function JoinMarathonBanner({ initialStatus, preMarathonWindowUntil }: Props) {
  const { addToast } = useToast()
  const [status, setStatus] = useState<JoinStatus>(initialStatus)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const hasActiveWindow = preMarathonWindowUntil
    ? new Date(preMarathonWindowUntil) > new Date()
    : false

  // Ne rien afficher si déjà accepté pour cette saison avec une fenêtre active
  if (hasActiveWindow) return null

  // Ne rien afficher si accepté pour la saison prochaine (juste une info dans le profil)
  if (status?.status === 'approved_next') {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(79,217,138,.08), rgba(79,217,138,.04))',
        border: '1px solid rgba(79,217,138,.3)',
        borderRadius: 'var(--rl)',
        padding: '1rem 1.2rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
      }}>
        <span style={{ fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 }}>✅</span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '.95rem', marginBottom: '.25rem', color: 'var(--green)' }}>
            Inscription acceptée — Saison 2
          </div>
          <div style={{ fontSize: '.8rem', color: 'var(--text2)', lineHeight: 1.5 }}>
            Tu es inscrit pour la prochaine saison. Tu pourras participer pleinement dès son lancement.
          </div>
        </div>
      </div>
    )
  }

  if (status?.status === 'pending') {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(232,196,106,.08), rgba(232,196,106,.04))',
        border: '1px solid rgba(232,196,106,.35)',
        borderRadius: 'var(--rl)',
        padding: '1rem 1.2rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '1rem',
      }}>
        <span style={{ fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 }}>⏳</span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '.95rem', marginBottom: '.25rem', color: 'var(--gold)' }}>
            Demande en attente de validation
          </div>
          <div style={{ fontSize: '.8rem', color: 'var(--text2)', lineHeight: 1.5 }}>
            Ton inscription en cours de saison a bien été envoyée à l'admin. Tu recevras une réponse prochainement.
          </div>
          {status.message && (
            <div style={{ fontSize: '.75rem', color: 'var(--text3)', fontStyle: 'italic', marginTop: '.4rem' }}>
              Ton message : "{status.message}"
            </div>
          )}
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await submitSeasonJoinRequest(message)
    setLoading(false)
    if (res?.error) { addToast(res.error, '⚠️'); return }
    addToast('Demande envoyée ! L\'admin va la traiter prochainement.', '✅')
    setStatus({ id: '', status: 'pending', message: message.trim() || null, created_at: new Date().toISOString() })
    setMessage('')
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(167,139,250,.08), rgba(167,139,250,.04))',
      border: '1px solid rgba(167,139,250,.35)',
      borderRadius: 'var(--rl)',
      padding: '1.2rem 1.4rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.8rem', marginBottom: '.9rem' }}>
        <span style={{ fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 }}>🎬</span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--purple, #a78bfa)', marginBottom: '.2rem' }}>
            Rejoindre le Marathon en cours
          </div>
          <div style={{ fontSize: '.8rem', color: 'var(--text2)', lineHeight: 1.6 }}>
            Le marathon est déjà lancé. Tu peux demander à rejoindre la saison en cours. L'admin validera ta demande.{' '}
            {status?.status === 'rejected' && (
              <span style={{ color: 'var(--red)', fontWeight: 500 }}>Ta précédente demande a été refusée — tu peux en envoyer une nouvelle.</span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Message optionnel à l'admin (présente-toi, explique pourquoi tu veux rejoindre...)"
          maxLength={500}
          rows={2}
          style={{
            width: '100%', background: 'var(--bg3)', border: '1px solid var(--border2)',
            borderRadius: 'var(--r)', padding: '.55rem .8rem', color: 'var(--text)',
            fontFamily: 'var(--font-body)', fontSize: '.83rem', resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
          <span style={{ fontSize: '.68rem', color: 'var(--text3)' }}>
            {message.length}/500 caractères
          </span>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-gold"
            style={{ padding: '.45rem 1.2rem', fontSize: '.82rem', whiteSpace: 'nowrap' }}
          >
            {loading ? '…' : 'Envoyer la demande'}
          </button>
        </div>
      </form>
    </div>
  )
}
