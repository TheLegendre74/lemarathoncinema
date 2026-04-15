'use client'

import { useEffect, useRef } from 'react'
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

const CHATANGO_ID = 'cid0020000437239044688'

function ChatangoEmbed() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const old = document.getElementById(CHATANGO_ID)
    if (old) old.remove()
    const script = document.createElement('script')
    script.id = CHATANGO_ID
    script.setAttribute('data-cfasync', 'false')
    script.async = true
    script.src = '//st.chatango.com/js/gz/emb.js'
    script.style.cssText = 'width:100%;height:100%;'
    // Pas de pos:'br' ni cv:1 — on veut un embed inline, pas un widget flottant
    script.textContent = JSON.stringify({
      handle: 'lemarathoncinema',
      arch: 'js',
      styles: {
        a: '6600cc', b: 70, c: 'FFFFFF', d: 'FFFFFF',
        f: 70, i: 70,
        k: '6600cc', l: '6600cc', m: '6600cc', n: 'FFFFFF',
        o: 70, p: '10', q: '6600cc', r: 70,
      },
    })
    containerRef.current.appendChild(script)
  }, [])

  return (
    <>
      <div ref={containerRef} className="chatango-desktop" style={{ width: '100%', height: 500 }} />
      <div className="chatango-mobile" style={{
        display: 'none',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '1rem', padding: '2rem 1.5rem', minHeight: 180,
      }}>
        <div style={{ fontSize: '2rem' }}>💬</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: '.35rem' }}>Le Salon — Chat en direct</div>
          <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginBottom: '1rem' }}>
            L'embed n'est pas disponible sur mobile
          </div>
          <a href={CHATANGO_URL} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: '.5rem',
            background: 'rgba(232,196,106,.15)', border: '1px solid rgba(232,196,106,.4)',
            borderRadius: 'var(--r)', padding: '.75rem 1.5rem',
            color: 'var(--gold)', textDecoration: 'none', fontSize: '.88rem', fontWeight: 500,
          }}>
            💬 Rejoindre le chat ↗
          </a>
        </div>
      </div>
    </>
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
        background: 'linear-gradient(135deg, rgba(232,196,106,.07), rgba(232,160,60,.04))',
        border: '1px solid rgba(232,196,106,.35)',
        borderRadius: 'var(--rl)',
        marginBottom: '2rem',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1rem 1.4rem',
          borderBottom: '1px solid rgba(232,196,106,.2)',
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
