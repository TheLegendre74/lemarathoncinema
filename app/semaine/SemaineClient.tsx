'use client'

import { useState } from 'react'
import Image from 'next/image'
import Forum from '@/components/Forum'
import { adminDeleteWeekFilmArchive, markWeekFilmWatched } from '@/lib/actions'
import { useToast } from '@/components/ToastProvider'
import { CONFIG } from '@/lib/config'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/supabase/types'

interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

interface WatchProvidersFR {
  link: string
  flatrate?: WatchProvider[]
  rent?: WatchProvider[]
  buy?: WatchProvider[]
}

interface Props {
  profile: Profile | null
  weekFilm: any
  film: any
  isWatched: boolean
  watchProviders: WatchProvidersFR | null
  weekFilmHistory: any[]
  watchedFilmIds: number[]
  latestArchivedWeekFilmId: number | null
  canMarkLatestArchive: boolean
  watchCountMap: Record<number, number>
  totalUsers: number
}

export default function SemaineClient({ profile, weekFilm, film, isWatched, watchProviders, weekFilmHistory, watchedFilmIds, latestArchivedWeekFilmId, canMarkLatestArchive, watchCountMap, totalUsers }: Props) {
  const [forumOpen, setForumOpen] = useState(false)
  const [selectedArchive, setSelectedArchive] = useState<any | null>(null)
  const [markingWeekFilmId, setMarkingWeekFilmId] = useState<number | null>(null)
  const { addToast } = useToast()
  const router = useRouter()

  async function markSeen(entry: any) {
    const targetFilm = entry?.films ?? film
    if (!entry?.id || !targetFilm || watchedFilmIds.includes(targetFilm.id)) return

    setMarkingWeekFilmId(entry.id)
    const result = await markWeekFilmWatched(entry.id)
    setMarkingWeekFilmId(null)
    if (result.error) {
      addToast(result.error, '⚠️')
      return
    }
    addToast(result.alreadyWatched ? 'Film déjà marqué comme vu' : `+${CONFIG.EXP_FDLS} EXP - Film de la semaine vu !`, '⭐')
    router.refresh()
  }

  async function deleteArchive(entry: any) {
    const title = entry?.films?.titre ?? 'cette archive'
    if (!confirm(`Supprimer l'archive "${title}" ?`)) return
    const result = await adminDeleteWeekFilmArchive(entry.id)
    if (result.error) {
      addToast(result.error, '⚠️')
      return
    }
    addToast('Archive supprimée', '✕')
    if (selectedArchive?.id === entry.id) setSelectedArchive(null)
    router.refresh()
  }

  const watchedSet = new Set(watchedFilmIds)

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
                  ? <Image src={film.poster} alt={film.titre} width={130} height={195} style={{ objectFit: 'cover', width: '100%', height: '100%' }} priority />
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

                {profile ? (
                  !isWatched ? (
                    <button className="btn btn-gold" disabled={markingWeekFilmId === weekFilm?.id} onClick={() => markSeen(weekFilm)}>{markingWeekFilmId === weekFilm?.id ? 'Enregistrement...' : `✓ Marquer comme vu (+${CONFIG.EXP_FDLS} EXP)`}</button>
                  ) : (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'var(--green2)', border: '1px solid rgba(79,217,138,.3)', color: 'var(--green)', borderRadius: 99, padding: '.4rem 1rem', fontSize: '.82rem' }}>
                      ✓ Vu — +{CONFIG.EXP_FDLS} EXP gagné
                    </div>
                  )
                ) : (
                  <a href="/auth" className="btn btn-outline" style={{ fontSize: '.82rem' }}>Se connecter pour marquer comme vu</a>
                )}

                {/* Streaming */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div className="section-title">Où regarder</div>
                  {watchProviders && (watchProviders.flatrate?.length || watchProviders.rent?.length || watchProviders.buy?.length) ? (
                    <>
                      {watchProviders.flatrate?.map((p) => (
                        <a key={p.provider_id} href={`https://www.justwatch.com/fr/films?q=${encodeURIComponent(film.titre)}`} target="_blank" rel="noopener noreferrer" className="streaming-platform">
                          <Image src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} width={32} height={32} style={{ borderRadius: 6, objectFit: 'cover' }} />
                          <span style={{ flex: 1, fontSize: '.88rem', fontWeight: 500, color: 'var(--text)' }}>{p.provider_name}</span>
                          <span className="sp-type svod">Abonnement</span>
                          <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>↗</span>
                        </a>
                      ))}
                      {(() => {
                        const rentBuy = [...(watchProviders.rent ?? []), ...(watchProviders.buy ?? [])]
                        const seen = new Set<number>()
                        return rentBuy.filter(p => { if (seen.has(p.provider_id)) return false; seen.add(p.provider_id); return true }).map((p) => (
                          <a key={p.provider_id} href={`https://www.justwatch.com/fr/films?q=${encodeURIComponent(film.titre)}`} target="_blank" rel="noopener noreferrer" className="streaming-platform">
                            <Image src={`https://image.tmdb.org/t/p/w92${p.logo_path}`} alt={p.provider_name} width={32} height={32} style={{ borderRadius: 6, objectFit: 'cover' }} />
                            <span style={{ flex: 1, fontSize: '.88rem', fontWeight: 500, color: 'var(--text)' }}>{p.provider_name}</span>
                            <span className="sp-type tvod">Location/Achat</span>
                            <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>↗</span>
                          </a>
                        ))
                      })()}
                    </>
                  ) : null}
                  <a
                    href={`https://www.justwatch.com/fr/films?q=${encodeURIComponent(film.titre)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="streaming-platform"
                    style={{ marginTop: '.4rem', opacity: .75 }}
                  >
                    <div className="sp-icon" style={{ background: '#1e2030', color: '#fff' }}>🔍</div>
                    <span style={{ flex: 1, fontSize: '.85rem', color: 'var(--text2)' }}>Toutes les plateformes — JustWatch</span>
                    <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>↗</span>
                  </a>
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

      {weekFilmHistory.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <div className="section-title">Archives des films de la semaine</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '.8rem' }}>
            {weekFilmHistory.map((entry) => {
              const archivedFilm = entry.films
              if (!archivedFilm) return null
              const watchCount = watchCountMap[archivedFilm.id] ?? 0
              const watchPct = totalUsers ? Math.round((watchCount / totalUsers) * 100) : 0

              return (
                <button key={entry.id} className="card" type="button" onClick={() => setSelectedArchive(entry)} style={{ display: 'flex', gap: '.75rem', alignItems: 'center', padding: '.8rem', textAlign: 'left', width: '100%', cursor: 'pointer', position: 'relative' }}>
                  {profile?.is_admin && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => { event.stopPropagation(); deleteArchive(entry) }}
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); deleteArchive(entry) } }}
                      title="Supprimer l'archive"
                      style={{ position: 'absolute', top: 6, right: 6, border: '1px solid rgba(232,90,90,.35)', color: 'var(--red)', borderRadius: 99, width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem', background: 'rgba(232,90,90,.08)' }}
                    >
                      ×
                    </span>
                  )}
                  <div style={{ width: 46, height: 69, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                    {archivedFilm.poster ? (
                      <Image src={archivedFilm.poster} alt={archivedFilm.titre} width={46} height={69} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>ðŸŽ¬</div>
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', gap: '.45rem', alignItems: 'center', marginBottom: '.2rem' }}>
                      {entry.active && <span style={{ color: 'var(--gold)', border: '1px solid rgba(232,196,106,.35)', borderRadius: 99, padding: '1px 6px', fontSize: '.58rem', textTransform: 'uppercase', letterSpacing: 1 }}>Actuel</span>}
                      <span style={{ color: 'var(--text3)', fontSize: '.68rem' }}>
                        {new Date(entry.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '.95rem', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{archivedFilm.titre}</div>
                    <div style={{ color: 'var(--text3)', fontSize: '.72rem', marginTop: '.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {archivedFilm.annee}{archivedFilm.realisateur ? ` · ${archivedFilm.realisateur}` : ''}
                    </div>
                    <div style={{ color: 'var(--gold)', fontSize: '.68rem', marginTop: '.25rem' }}>{watchPct}% vus</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {selectedArchive && selectedArchive.films && (() => {
        const archivedFilm = selectedArchive.films
        const watchCount = watchCountMap[archivedFilm.id] ?? 0
        const watchPct = totalUsers ? Math.round((watchCount / totalUsers) * 100) : 0
        const alreadyWatched = watchedSet.has(archivedFilm.id)
        const canMarkArchive = selectedArchive.id === latestArchivedWeekFilmId && canMarkLatestArchive

        return (
          <div onClick={() => setSelectedArchive(null)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card" onClick={(event) => event.stopPropagation()} style={{ width: 'min(720px, 100%)', maxHeight: '88vh', overflow: 'auto', padding: '1.2rem', position: 'relative' }}>
              <button type="button" onClick={() => setSelectedArchive(null)} className="btn btn-ghost" style={{ position: 'absolute', top: '.7rem', right: '.7rem', padding: '.25rem .55rem' }}>×</button>
              <div style={{ display: 'flex', gap: '1.2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <div style={{ width: 110, height: 165, borderRadius: 'var(--r)', overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                  {archivedFilm.poster ? (
                    <Image src={archivedFilm.poster} alt={archivedFilm.titre} width={110} height={165} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>🎬</div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ color: 'var(--gold)', fontSize: '.65rem', letterSpacing: 2, textTransform: 'uppercase', marginBottom: '.45rem' }}>Archive film de la semaine</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', lineHeight: 1.1 }}>{archivedFilm.titre}</div>
                  <div style={{ color: 'var(--text2)', fontSize: '.82rem', marginTop: '.35rem' }}>{archivedFilm.annee} · {archivedFilm.realisateur}{archivedFilm.genre ? ` · ${archivedFilm.genre}` : ''}</div>
                  {archivedFilm.sousgenre && <div style={{ color: 'var(--text3)', fontSize: '.76rem', marginTop: '.2rem' }}>{archivedFilm.sousgenre}</div>}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '.6rem', marginTop: '1rem' }}>
                    <div className="stat"><div className="stat-l">Vus</div><div className="stat-v green">{watchCount}</div></div>
                    <div className="stat"><div className="stat-l">Joueurs</div><div className="stat-v">{totalUsers}</div></div>
                    <div className="stat"><div className="stat-l">Progression</div><div className="stat-v gold">{watchPct}%</div></div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    {profile ? (
                      alreadyWatched ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', background: 'var(--green2)', border: '1px solid rgba(79,217,138,.3)', color: 'var(--green)', borderRadius: 99, padding: '.4rem 1rem', fontSize: '.82rem' }}>✓ Vu</div>
                      ) : (
                        <button className="btn btn-gold" disabled={!canMarkArchive || markingWeekFilmId === selectedArchive.id} onClick={() => markSeen(selectedArchive)}>
                          {markingWeekFilmId === selectedArchive.id ? 'Enregistrement...' : `Marquer comme vu (+${CONFIG.EXP_FDLS} EXP)`}
                        </button>
                      )
                    ) : (
                      <a href="/auth" className="btn btn-outline" style={{ fontSize: '.82rem' }}>Se connecter pour marquer comme vu</a>
                    )}
                    {!alreadyWatched && !canMarkArchive && (
                      <div style={{ color: 'var(--text3)', fontSize: '.72rem', marginTop: '.55rem' }}>Seule la dernière archive peut être marquée vue le vendredi soir et le samedi.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
