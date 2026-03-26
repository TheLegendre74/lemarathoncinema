'use client'

import { useState } from 'react'
import Image from 'next/image'
import Forum from '@/components/Forum'
import { toggleWatched } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { getStreamingPlatforms, CONFIG } from '@/lib/config'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/supabase/types'

interface Props {
  profile: Profile
  weekFilm: any
  film: any
  isWatched: boolean
}

export default function SemaineClient({ profile, weekFilm, film, isWatched }: Props) {
  const [forumOpen, setForumOpen] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()
  const platforms = film ? getStreamingPlatforms(film.id, film.titre) : []
  const typeLabel: Record<string, string> = { svod: 'Abonnement', tvod: 'Location/Achat', free: 'Gratuit légal' }

  async function markSeen() {
    if (!film || isWatched) return
    await toggleWatched(film.id, film.titre)
    addToast(`+${CONFIG.EXP_FDLS} EXP — Film de la semaine vu !`, '⭐')
    router.refresh()
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Film de la Semaine</div>
        <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>Séance collective — chaque {CONFIG.FDLS_JOUR} à {CONFIG.FDLS_HEURE}</div>
      </div>

      {!film ? (
        <div className="empty">
          <div style={{ fontSize: '2.5rem', marginBottom: '.8rem' }}>📽️</div>
          Pas encore annoncé pour cette semaine.<br />Reviens {CONFIG.FDLS_JOUR} !
        </div>
      ) : (
        <>
          <div style={{ background: 'linear-gradient(135deg, var(--bg2), var(--bg3))', border: '1px solid var(--border2)', borderRadius: 'var(--rxl)', overflow: 'hidden', marginBottom: '1.5rem', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, var(--gold), transparent)' }} />
            <div style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ width: 130, height: 195, borderRadius: 'var(--r)', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                {film.poster
                  ? <Image src={film.poster} alt={film.titre} width={130} height={195} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem' }}>🎬</div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: '.6rem', letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '.5rem' }}>
                  🎬 Film de la semaine{weekFilm?.created_at ? ` — ${new Date(weekFilm.created_at).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1.1, marginBottom: '.4rem' }}>{film.titre}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text2)', marginBottom: '.8rem' }}>{film.annee} · {film.realisateur} · {film.genre}</div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'rgba(232,196,106,.1)', border: '1px solid rgba(232,196,106,.28)', color: 'var(--gold)', fontSize: '.8rem', padding: '.3rem .85rem', borderRadius: 99, fontWeight: 500, marginBottom: '1rem' }}>
                  +{CONFIG.EXP_FDLS} EXP si vu ce {CONFIG.FDLS_JOUR}
                </div>

                {weekFilm?.session_time && (
                  <div style={{ fontSize: '.83rem', color: 'var(--text2)', marginBottom: '1rem' }}>
                    📅 Rendez-vous : <strong style={{ color: 'var(--text)' }}>{weekFilm.session_time}</strong>
                  </div>
                )}

                {!isWatched ? (
                  <button className="btn btn-gold" onClick={markSeen}>✓ Marquer comme vu (+{CONFIG.EXP_FDLS} EXP)</button>
                ) : (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'var(--green2)', border: '1px solid rgba(79,217,138,.3)', color: 'var(--green)', borderRadius: 99, padding: '.4rem 1rem', fontSize: '.82rem' }}>
                    ✓ Vu — +{CONFIG.EXP_FDLS} EXP gagné
                  </div>
                )}

                {/* Streaming */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div className="section-title">Où regarder</div>
                  {platforms.map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="streaming-platform">
                      <div className="sp-icon" style={{ background: p.color, color: '#fff' }}>{p.icon}</div>
                      <span style={{ flex: 1, fontSize: '.88rem', fontWeight: 500, color: 'var(--text)' }}>{p.name}</span>
                      <span className={`sp-type ${p.type}`}>{typeLabel[p.type]}</span>
                      <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>↗</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Forum */}
          <div className="card">
            <button className="btn btn-ghost" style={{ marginBottom: '.8rem' }} onClick={() => setForumOpen(!forumOpen)}>
              💬 Discuter du film {forumOpen ? '▲' : '▼'}
            </button>
            {forumOpen && <Forum topic={`week_${weekFilm?.id ?? 'cur'}`} profile={profile} />}
          </div>
        </>
      )}
    </div>
  )
}
