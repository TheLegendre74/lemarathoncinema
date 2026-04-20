import { getPublicWatchlists } from '@/lib/actions'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'

export const revalidate = 0

export default async function PublicWatchlistsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const watchlists = await getPublicWatchlists()

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Watchlists publiques</div>
          <div style={{ color: 'var(--text3)', fontSize: '.82rem', marginTop: '.4rem' }}>
            {watchlists.length} watchlist{watchlists.length !== 1 ? 's' : ''} partagée{watchlists.length !== 1 ? 's' : ''} par la communauté
          </div>
        </div>
        {user && (
          <Link href="/watchlist" style={{ fontSize: '.8rem', color: 'var(--text2)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '.4rem', background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--r)', padding: '.45rem .9rem' }}>
            ← Mes watchlists
          </Link>
        )}
      </div>

      {watchlists.length === 0 ? (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', padding: '4rem', textAlign: 'center', color: 'var(--text3)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📋</div>
          <div style={{ fontSize: '.9rem', marginBottom: '.5rem' }}>Aucune watchlist publique pour l'instant.</div>
          {user
            ? <Link href="/watchlist" style={{ fontSize: '.8rem', color: 'var(--gold)', textDecoration: 'none' }}>Partage la tienne !</Link>
            : <Link href="/auth" style={{ fontSize: '.8rem', color: 'var(--gold)', textDecoration: 'none' }}>Connecte-toi pour en créer une</Link>
          }
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
          {watchlists.map((wl: any) => {
            const items: any[] = wl.watchlist_items ?? []
            const author = wl.is_anonymous ? null : wl.profiles
            const previewFilms = items.slice(0, 4)
            return (
              <div key={wl.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--rl)', overflow: 'hidden', transition: 'border-color .2s, transform .2s, box-shadow .2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border2)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.35)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = '' }}
              >
                {/* Poster grid preview */}
                <div style={{ height: 110, background: 'var(--bg3)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', overflow: 'hidden' }}>
                  {previewFilms.length > 0
                    ? previewFilms.map((item: any) => (
                        <div key={item.film_id} style={{ position: 'relative', overflow: 'hidden' }}>
                          {item.films?.poster
                            ? <Image src={item.films.poster} alt={item.films.titre} fill style={{ objectFit: 'cover' }} sizes="80px" />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🎬</div>
                          }
                        </div>
                      ))
                    : (
                      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '2rem' }}>📋</div>
                    )
                  }
                  {/* Overlay gradient */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(15,15,26,.9))', gridColumn: '1/-1', pointerEvents: 'none' }} />
                </div>

                <div style={{ padding: '1rem' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', marginBottom: '.3rem', lineHeight: 1.2 }}>{wl.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>
                      {items.length} film{items.length !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '.72rem', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                      {author ? (
                        <>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--bg3)', border: '1px solid var(--border2)', overflow: 'hidden', flexShrink: 0 }}>
                            {author.avatar_url
                              ? <Image src={author.avatar_url} alt={author.pseudo} width={18} height={18} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.55rem' }}>{author.pseudo?.[0]?.toUpperCase()}</div>
                            }
                          </div>
                          {author.pseudo}
                        </>
                      ) : (
                        <>👤 Anonyme</>
                      )}
                    </div>
                  </div>

                  {/* Films list preview */}
                  {items.length > 0 && (
                    <div style={{ marginTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                      {items.slice(0, 5).map((item: any) => (
                        <div key={item.film_id} style={{ fontSize: '.75rem', color: 'var(--text2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          🎬 {item.films?.titre}
                        </div>
                      ))}
                      {items.length > 5 && (
                        <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>+ {items.length - 5} autre{items.length - 5 !== 1 ? 's' : ''}…</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
