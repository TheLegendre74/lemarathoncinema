import { createClient } from '@/lib/supabase/server'
import { getUserCached } from '@/lib/auth'
import SemaineClient from './SemaineClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function fetchWatchProviders(tmdbId: number) {
  const key = process.env.TMDB_API_KEY
  if (!key || !tmdbId) return null
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${key}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    return data.results?.FR ?? null
  } catch { return null }
}

export default async function SemainePage() {
  const [user, supabase] = await Promise.all([
    getUserCached(),
    createClient(),
  ])

  const [{ data: weekFilm }, { data: weekFilmHistory }, { count: totalUsers }] = await Promise.all([
    supabase.from('week_films').select('*, films(*)').eq('active', true).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('week_films').select('id, film_id, session_time, active, created_at, films(id, titre, annee, poster, realisateur, genre, sousgenre)').eq('active', false).order('created_at', { ascending: false }).limit(50),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
  ])

  const film = (weekFilm as any)?.films ?? null
  const archiveFilmIds = ((weekFilmHistory as any[]) ?? []).map((entry) => entry.film_id)
  const visibleFilmIds = [film?.id, ...archiveFilmIds].filter(Boolean) as number[]

  const [profileResult, isWatchedResult, watchedRowsResult, myWatchedRowsResult] = await Promise.all([
    user ? supabase.from('profiles').select('*').eq('id', user.id).single() : Promise.resolve({ data: null }),
    (film && user) ? supabase.from('watched').select('film_id').eq('user_id', user.id).eq('film_id', film.id).single() : Promise.resolve({ data: null }),
    visibleFilmIds.length ? supabase.from('watched').select('film_id').in('film_id', visibleFilmIds) : Promise.resolve({ data: [] }),
    (user && visibleFilmIds.length) ? supabase.from('watched').select('film_id').eq('user_id', user.id).in('film_id', visibleFilmIds) : Promise.resolve({ data: [] }),
  ])

  const profile = profileResult.data
  const isWatched = isWatchedResult.data
  const watchCountMap: Record<number, number> = {}
  ;(watchedRowsResult.data ?? []).forEach((row: { film_id: number }) => {
    watchCountMap[row.film_id] = (watchCountMap[row.film_id] ?? 0) + 1
  })
  const watchedFilmIds = (myWatchedRowsResult.data ?? []).map((row: { film_id: number }) => row.film_id)

  const watchProviders = film?.tmdb_id ? await fetchWatchProviders(film.tmdb_id) : null

  return (
    <SemaineClient
      profile={profile}
      weekFilm={weekFilm as any}
      film={film}
      isWatched={!!isWatched}
      watchProviders={watchProviders}
      weekFilmHistory={(weekFilmHistory as any[]) ?? []}
      watchedFilmIds={watchedFilmIds}
      latestArchivedWeekFilmId={(weekFilmHistory as any[])?.[0]?.id ?? null}
      canMarkLatestArchive={canMarkLatestArchiveNow()}
      watchCountMap={watchCountMap}
      totalUsers={totalUsers ?? 0}
    />
  )
}

function canMarkLatestArchiveNow() {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    hour: 'numeric',
  }).formatToParts(new Date())
  const weekday = parts.find(p => p.type === 'weekday')?.value
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0')
  return weekday === 'samedi' || (weekday === 'vendredi' && hour >= 22)
}
