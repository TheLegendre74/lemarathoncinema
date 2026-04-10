'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import ForumTopicModal from './ForumTopicModal'
import type { Profile } from '@/lib/supabase/types'

interface Props {
  profile: Profile | null
  otherTopics: any[]
  lastPostMap: Record<string, any>
  countMap: Record<string, number>
  totalTopics: number
}

const CHATANGO_URL = 'https://lemarathoncinema.chatango.com'

function ChatangoEmbed() {
  const ref = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  // Injecte le script Chatango sur desktop
  useEffect(() => {
    if (isMobile !== false) return
    const container = ref.current
    if (!container) return
    container.innerHTML = ''
    const s = document.createElement('script')
    s.setAttribute('data-cfasync', 'false')
    s.async = true
    s.innerHTML = JSON.stringify({
      handle: 'lemarathoncinema',
      arch: 'js',
      styles: {
        a: 'ff9900', b: 100, c: '000000', d: '000000',
        k: 'ff9900', l: 'ff9900', m: 'ff9900',
        p: '13.14', q: 'ff9900', r: 100, cnrs: '0.35', fwtickm: 1,
      },
    })
    s.src = '//st.chatango.com/js/gz/emb.js'
    container.appendChild(s)
  }, [isMobile])

  // Avant détection : rien (évite le flash)
  if (isMobile === null) return null

  // Sur mobile : l'embed génère une URL interne qui retourne 404
  // → bouton d'accès direct au chat Chatango mobile
  if (isMobile) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '1rem', padding: '2rem 1.5rem', minHeight: 200,
      }}>
        <div style={{ fontSize: '2.5rem' }}>💬</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', marginBottom: '.35rem' }}>
            Le Salon — Chat en direct
          </div>
          <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginBottom: '1.2rem' }}>
            L'embed n'est pas disponible sur mobile,<br/>ouvre le chat directement :
          </div>
          <a
            href={CHATANGO_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '.5rem',
              background: 'rgba(130,80,220,.15)',
              border: '1px solid rgba(130,80,220,.4)',
              borderRadius: 'var(--r)',
              padding: '.75rem 1.5rem',
              color: '#c084fc',
              textDecoration: 'none',
              fontSize: '.88rem', fontWeight: 500,
            }}
          >
            💬 Rejoindre le chat ↗
          </a>
        </div>
      </div>
    )
  }

  // Desktop : conteneur où le script Chatango sera injecté
  return (
    <div
      ref={ref}
      style={{ width: '100%', position: 'relative' }}
      className="chatango-frame"
    />
  )
}

export default function ForumPageClient({
  profile, otherTopics, lastPostMap, countMap, totalTopics
}: Props) {
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Forum</div>
          <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>
            {totalTopics} topic{totalTopics !== 1 ? 's' : ''} · chat en direct
          </div>
        </div>
        {profile && <ForumTopicModal />}
      </div>

      {/* ─── LE SALON (Chatango embed) ─── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(100,60,200,.08), rgba(60,120,200,.06))',
        border: '1px solid rgba(130,80,220,.35)',
        borderRadius: 'var(--rl)',
        marginBottom: '2rem',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1rem 1.4rem',
          borderBottom: '1px solid rgba(130,80,220,.2)',
          display: 'flex', alignItems: 'center', gap: '.85rem',
        }}>
          <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>💬</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Le Salon</div>
            <div style={{ fontSize: '.72rem', color: 'var(--text3)', marginTop: '.1rem' }}>Chat en temps réel</div>
          </div>
          <div style={{
            marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%',
            background: '#22cc66', boxShadow: '0 0 6px #22cc66',
          }} title="En direct" />
        </div>
        <ChatangoEmbed />
      </div>

      {/* ─── TOPICS ─── */}
      <div className="section-title" style={{ marginBottom: '1rem' }}>Topics</div>
      {otherTopics.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>📝</div>
          {profile ? 'Aucun topic pour l\'instant. Crée le premier !' : 'Aucun topic pour l\'instant.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {otherTopics.map((t: any) => (
            <Link key={t.id} href={`/forum/${t.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                background: 'var(--bg2)',
                border: `1px solid ${t.pinned ? 'rgba(232,196,106,.3)' : 'var(--border)'}`,
                borderRadius: 'var(--r)', padding: '.9rem 1.1rem',
                transition: 'border-color .2s',
              }}>
                <div style={{ fontSize: '1.3rem' }}>{t.pinned ? '📌' : '💬'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.88rem', fontWeight: 500, marginBottom: '.15rem', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    {t.title}
                    {t.pinned && (
                      <span style={{ fontSize: '.6rem', color: 'var(--gold)', border: '1px solid rgba(232,196,106,.3)', borderRadius: 99, padding: '1px 6px' }}>
                        ÉPINGLÉ
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <div style={{ fontSize: '.73rem', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.description}
                    </div>
                  )}
                  {lastPostMap[t.id] && (
                    <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginTop: '.2rem' }}>
                      Dernier message de <strong>{lastPostMap[t.id].profiles?.pseudo}</strong> · {new Date(lastPostMap[t.id].created_at).toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text2)' }}>
                    {countMap[t.id] ?? 0}
                  </div>
                  <div style={{ fontSize: '.63rem', color: 'var(--text3)' }}>messages</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!profile && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '.83rem', color: 'var(--text3)' }}>
          <Link href="/auth" style={{ color: 'var(--gold)' }}>Connecte-toi</Link> pour créer des topics et participer aux discussions.
        </div>
      )}
    </div>
  )
}
