import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import type { Film } from '@/lib/supabase/types'

export const revalidate = 60

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: films }, { data: allRatings }, { data: allNegRatings }, { data: eggs }] = await Promise.all([
    supabase.from('films').select('*').eq('saison', 1).order('titre'),
    supabase.from('ratings').select('film_id, score'),
    (supabase as any).from('negative_ratings').select('film_id, score'),
    user ? supabase.from('discovered_eggs').select('egg_id').eq('user_id', user.id) : Promise.resolve({ data: [] }),
  ])
  const hasRageuxEgg = (eggs ?? []).some((e: any) => e.egg_id === 'rageux')
  const showPires = hasRageuxEgg && tab === 'pires'

  const filmMap = Object.fromEntries((films ?? []).map((f: Film) => [f.id, f]))

  const ratingMap: Record<number, number[]> = {}
  allRatings?.forEach((r: { film_id: number; score: number }) => {
    if (!ratingMap[r.film_id]) ratingMap[r.film_id] = []
    ratingMap[r.film_id].push(r.score)
  })

  const negRatingMap: Record<number, number[]> = {}
  ;(allNegRatings ?? []).forEach((r: { film_id: number; score: number }) => {
    if (!negRatingMap[r.film_id]) negRatingMap[r.film_id] = []
    negRatingMap[r.film_id].push(r.score)
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
    ? Object.entries(negRatingMap)
        .map(([filmId, scores]) => ({
          film: filmMap[parseInt(filmId)],
          avg: scores.reduce((a, b) => a + b, 0) / scores.length,
          count: scores.length,
        }))
        .filter(x => x.film)
        .sort((a, b) => b.avg - a.avg || b.count - a.count)
    : []

  return (
    <div>
      {/* Header + onglets */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, marginBottom: '1rem' }}>
          {showPires ? '💀 Pires Films' : 'Classement des films'}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '.4rem', borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          <Link
            href="/notes"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '.4rem',
              padding: '.5rem 1rem', textDecoration: 'none', fontSize: '.85rem', fontWeight: 500,
              color: !showPires ? 'var(--gold)' : 'var(--text2)',
              borderBottom: !showPires ? '2px solid var(--gold)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            ⭐ Classement
          </Link>
          {hasRageuxEgg && (
            <Link
              href="/notes?tab=pires"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                padding: '.5rem 1rem', textDecoration: 'none', fontSize: '.85rem', fontWeight: 500,
                color: showPires ? 'var(--red)' : 'var(--text2)',
                borderBottom: showPires ? '2px solid var(--red)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              💀 Pires Films
            </Link>
          )}
        </div>
      </div>

      {/* Onglet Classement */}
      {!showPires && (
        <>
          <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginBottom: '1rem' }}>
            {ranked.length} film{ranked.length > 1 ? 's' : ''} noté{ranked.length > 1 ? 's' : ''} par la communauté
          </div>
          {ranked.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: '2.5rem', marginBottom: '.8rem' }}>⭐</div>
              Ouvre un film et note-le pour démarrer le classement.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {ranked.map(({ film, avg, count }, i) => (
                <FilmRow key={film.id} film={film} avg={avg} count={count} rank={i} mode="normal" />
              ))}
            </div>
          )}
        </>
      )}

      {/* Onglet Pires Films */}
      {showPires && (
        <>
          <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginBottom: '1rem' }}>
            Mode rageux activé — {worst.length} film{worst.length > 1 ? 's' : ''} noté{worst.length > 1 ? 's' : ''} négativement
          </div>
          {worst.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: '2.5rem', marginBottom: '.8rem' }}>💀</div>
              Personne n'a encore donné de notes négatives.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {worst.map(({ film, avg, count }, i) => (
                <FilmRow key={film.id} film={film} avg={avg} count={count} rank={i} mode="pires" />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function FilmRow({ film, avg, count, rank, mode }: { film: Film; avg: number; count: number; rank: number; mode: 'normal' | 'pires' }) {
  const isPires = mode === 'pires'
  const rankDisplay = !isPires
    ? rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`
    : `#${rank + 1}`
  const rankColor = !isPires
    ? rank === 0 ? '#ffd700' : rank === 1 ? '#c0c0c0' : rank === 2 ? '#cd7f32' : 'var(--text3)'
    : 'var(--red)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '1rem',
      background: 'var(--bg2)',
      border: `1px solid ${isPires ? 'rgba(232,90,90,.25)' : 'var(--border)'}`,
      borderRadius: 'var(--r)', padding: '.75rem 1rem',
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: rankColor, width: 30, textAlign: 'center', flexShrink: 0 }}>
        {rankDisplay}
      </div>
      <div style={{ width: 36, height: 54, borderRadius: 5, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
        {film.poster
          ? <Image src={film.poster} alt={film.titre} width={36} height={54} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🎬</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '.88rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
        <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{film.annee} · {film.realisateur}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: isPires ? 'var(--red)' : 'var(--gold)' }}>{avg.toFixed(1)}</div>
        <div style={{ fontSize: '.67rem', color: 'var(--text3)' }}>{count} vote{count > 1 ? 's' : ''}</div>
      </div>
    </div>
  )
}
