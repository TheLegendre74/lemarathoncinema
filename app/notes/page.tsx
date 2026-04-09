import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import type { Film } from '@/lib/supabase/types'

export const revalidate = 60

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: films }, { data: allRatings }, { data: eggs }] = await Promise.all([
    supabase.from('films').select('*').eq('saison', 1).order('titre'),
    supabase.from('ratings').select('film_id, score'),
    user ? supabase.from('discovered_eggs').select('egg_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
  ])
  const hasRageuxEgg = (eggs ?? []).some((e: any) => e.egg_id === 'rageux')

  const filmMap = Object.fromEntries((films ?? []).map((f: Film) => [f.id, f]))
  const ratingMap: Record<number, number[]> = {}
  allRatings?.forEach((r: { film_id: number; score: number }) => {
    if (!ratingMap[r.film_id]) ratingMap[r.film_id] = []
    ratingMap[r.film_id].push(r.score)
  })

  const ranked = Object.entries(ratingMap)
    .map(([filmId, scores]) => ({
      film: filmMap[parseInt(filmId)],
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }))
    .filter(x => x.film)
    .sort((a, b) => b.avg - a.avg || b.count - a.count)

  const worst = hasRageuxEgg
    ? [...ranked].sort((a, b) => a.avg - b.avg || b.count - a.count).slice(0, 10)
    : []

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Classement des films</div>
        <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>{ranked.length} film{ranked.length > 1 ? 's' : ''} noté{ranked.length > 1 ? 's' : ''} par la communauté</div>
      </div>

      {ranked.length === 0 && (
        <div className="empty">
          <div style={{ fontSize: '2.5rem', marginBottom: '.8rem' }}>⭐</div>
          Ouvre un film et note-le pour démarrer le classement.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
        {ranked.map(({ film, avg, count }, i) => (
          <div key={film.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.75rem 1rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'var(--text3)', width: 30, textAlign: 'center', flexShrink: 0 }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </div>
            <div style={{ width: 36, height: 54, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
              {film.poster
                ? <Image src={film.poster} alt={film.titre} width={36} height={54} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🎬</div>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '.88rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
              <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{film.annee} · {film.realisateur}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--gold)' }}>{avg.toFixed(1)}</div>
              <div style={{ fontSize: '.67rem', color: 'var(--text3)' }}>{count} vote{count > 1 ? 's' : ''}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Pires films — visible uniquement pour les rageuxs */}
      {hasRageuxEgg && worst.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1, color: 'var(--red)' }}>💀 Classement des pires films</div>
            <div style={{ color: 'var(--text3)', fontSize: '.78rem', marginTop: '.3rem' }}>Mode rageux activé — les nuls sont exposés</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {worst.map(({ film, avg, count }, i) => (
              <div key={film.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg2)', border: '1px solid rgba(232,90,90,.2)', borderRadius: 'var(--r)', padding: '.75rem 1rem' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--red)', width: 30, textAlign: 'center', flexShrink: 0 }}>
                  #{i + 1}
                </div>
                <div style={{ width: 36, height: 54, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                  {film.poster
                    ? <Image src={film.poster} alt={film.titre} width={36} height={54} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🎬</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.88rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{film.annee} · {film.realisateur}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--red)' }}>{avg.toFixed(1)}</div>
                  <div style={{ fontSize: '.67rem', color: 'var(--text3)' }}>{count} vote{count > 1 ? 's' : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
