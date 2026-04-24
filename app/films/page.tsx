import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getServerConfig, isMarathonLiveFromConfig } from '@/lib/serverConfig'
import FilmsClient from './FilmsClient'
import { getUserWatchlists } from '@/lib/actions'

export const revalidate = 30

export default async function FilmsPage() {
  const cookieStore = await cookies()
  const age18confirmed = cookieStore.get('age18confirmed')?.value === 'true'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cfg = await getServerConfig()

  const [
    { data: films },
    { count: profileCount },
    { data: weekFilm },
    { data: statsRows, error: statsError },
  ] = await Promise.all([
    supabase.from('films').select('*').eq('pending_admin_approval', false).order('titre'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('week_films').select('film_id').eq('active', true).single(),
    // RPC get_film_stats remplace 3 requêtes globales — exécuter supabase/rpc_film_stats.sql d'abord
    (supabase as any).rpc('get_film_stats'),
  ])

  // User-specific data (empty for guests)
  let watched: any[] = []
  let ratings: any[] = []
  let profile = null
  let negativeRatings: any[] = []
  let hasRageuxEgg = false

  let userWatchlists: any[] = []
  if (user) {
    const [{ data: w }, { data: r }, { data: p }, { data: nr }, { data: eggs }, wl] = await Promise.all([
      supabase.from('watched').select('film_id, pre').eq('user_id', user.id),
      supabase.from('ratings').select('film_id, score').eq('user_id', user.id),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      (supabase as any).from('negative_ratings').select('film_id, score').eq('user_id', user.id),
      supabase.from('discovered_eggs').select('egg_id').eq('user_id', user.id),
      getUserWatchlists(),
    ])
    watched = w ?? []
    ratings = r ?? []
    profile = p
    negativeRatings = nr ?? []
    hasRageuxEgg = (eggs ?? []).some((e: any) => e.egg_id === 'rageux')
    userWatchlists = wl ?? []
  }

  // Global stats per film — built from RPC (1 query) or fallback (3 queries)
  const totalUsers = profileCount ?? 1
  const watchCountMap: Record<number, number> = {}
  const ratingMap: Record<number, number[]> = {}
  const negativeRatingMap: Record<number, number[]> = {}

  if (!statsError && statsRows) {
    // RPC path — pre-aggregated in SQL
    ;(statsRows as any[]).forEach((s) => {
      if (s.watch_count > 0) watchCountMap[s.film_id] = Number(s.watch_count)
      if (s.pos_scores?.length) ratingMap[s.film_id] = s.pos_scores
      if (s.neg_scores?.length) negativeRatingMap[s.film_id] = s.neg_scores
    })
  } else {
    // Fallback si la fonction SQL n'a pas encore été créée (voir supabase/rpc_film_stats.sql)
    const [{ data: allWatched }, { data: allRatings }, { data: allNegRatings }] = await Promise.all([
      supabase.from('watched').select('film_id'),
      supabase.from('ratings').select('film_id, score'),
      (supabase as any).from('negative_ratings').select('film_id, score'),
    ])
    allWatched?.forEach((w: { film_id: number }) => {
      watchCountMap[w.film_id] = (watchCountMap[w.film_id] ?? 0) + 1
    })
    allRatings?.forEach((r: { film_id: number; score: number }) => {
      if (!ratingMap[r.film_id]) ratingMap[r.film_id] = []
      ratingMap[r.film_id].push(r.score)
    })
    ;(allNegRatings ?? []).forEach((r: { film_id: number; score: number }) => {
      if (!negativeRatingMap[r.film_id]) negativeRatingMap[r.film_id] = []
      negativeRatingMap[r.film_id].push(r.score)
    })
  }

  const watchedIds = new Set((watched.map((w: { film_id: number }) => w.film_id)) as number[])
  const watchedPreMap: Record<number, boolean> = {}
  watched.forEach((w: { film_id: number; pre: boolean }) => { watchedPreMap[w.film_id] = w.pre })
  const myRatings = Object.fromEntries(ratings.map((r: { film_id: number; score: number }) => [r.film_id, r.score]))
  const myNegativeRatings = Object.fromEntries(negativeRatings.map((r: { film_id: number; score: number }) => [r.film_id, r.score]))
  const weekFilmId = (weekFilm as { film_id: number } | null)?.film_id ?? null

  // Rattrapage map pour admin (film_id → niveau)
  let rattrapageMap: Record<number, string> = {}
  if (profile?.is_admin) {
    const { data: rattrapageData } = await (supabase as any)
      .from('recommendation_films')
      .select('film_id, niveau')
      .not('film_id', 'is', null)
    ;(rattrapageData ?? []).forEach((r: any) => {
      if (r.film_id) rattrapageMap[r.film_id] = r.niveau
    })
  }

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
      isMarathonLive={isMarathonLiveFromConfig(cfg)}
      saisonNumero={cfg.SAISON_NUMERO}
      age18confirmed={age18confirmed}
      myNegativeRatings={myNegativeRatings}
      negativeRatingMap={negativeRatingMap}
      hasRageuxEgg={hasRageuxEgg}
      rattrapageMap={rattrapageMap}
      userWatchlists={userWatchlists}
    />
  )
}
