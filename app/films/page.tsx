import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { CONFIG, isMarathonLive } from '@/lib/config'
import FilmsClient from './FilmsClient'

export const revalidate = 30

export default async function FilmsPage() {
  const cookieStore = await cookies()
  const age18confirmed = cookieStore.get('age18confirmed')?.value === 'true'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: films }, { data: userCount }, { data: weekFilm }] = await Promise.all([
    supabase.from('films').select('*').eq('pending_admin_approval', false).order('titre'),
    supabase.from('profiles').select('id', { count: 'exact' }),
    supabase.from('week_films').select('film_id').eq('active', true).single(),
  ])

  // User-specific data (empty for guests)
  let watched: any[] = []
  let ratings: any[] = []
  let profile = null

  if (user) {
    const [{ data: w }, { data: r }, { data: p }] = await Promise.all([
      supabase.from('watched').select('film_id, pre').eq('user_id', user.id),
      supabase.from('ratings').select('film_id, score').eq('user_id', user.id),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
    ])
    watched = w ?? []
    ratings = r ?? []
    profile = p
  }

  // Global watch counts per film
  const { data: allWatched } = await supabase.from('watched').select('film_id')
  const totalUsers = userCount?.length ?? 1
  const watchCountMap: Record<number, number> = {}
  allWatched?.forEach((w: { film_id: number }) => {
    watchCountMap[w.film_id] = (watchCountMap[w.film_id] ?? 0) + 1
  })

  // Average ratings per film
  const { data: allRatings } = await supabase.from('ratings').select('film_id, score')
  const ratingMap: Record<number, number[]> = {}
  allRatings?.forEach((r: { film_id: number; score: number }) => {
    if (!ratingMap[r.film_id]) ratingMap[r.film_id] = []
    ratingMap[r.film_id].push(r.score)
  })

  const watchedIds = new Set((watched.map((w: { film_id: number }) => w.film_id)) as number[])
  const watchedPreMap: Record<number, boolean> = {}
  watched.forEach((w: { film_id: number; pre: boolean }) => { watchedPreMap[w.film_id] = w.pre })
  const myRatings = Object.fromEntries(ratings.map((r: { film_id: number; score: number }) => [r.film_id, r.score]))
  const weekFilmId = (weekFilm as { film_id: number } | null)?.film_id ?? null

  return (
    <FilmsClient
      films={films ?? []}
      profile={profile}
      watchedIds={[...watchedIds]}
      watchedPreMap={watchedPreMap}
      myRatings={myRatings}
      watchCountMap={watchCountMap}
      ratingMap={ratingMap}
      totalUsers={totalUsers}
      weekFilmId={weekFilmId}
      isMarathonLive={isMarathonLive()}
      saisonNumero={CONFIG.SAISON_NUMERO}
      age18confirmed={age18confirmed}
    />
  )
}
