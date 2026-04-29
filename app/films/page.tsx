import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { getServerConfig, isMarathonLiveFromConfig } from '@/lib/serverConfig'
import { getUserCached } from '@/lib/auth'
import { withCache } from '@/lib/redis'
import FilmsClient from './FilmsClient'
import { getUserWatchlists } from '@/lib/actions'

export const revalidate = 30

export default async function FilmsPage() {
  const cookieStore = await cookies()
  const age18confirmed = cookieStore.get('age18confirmed')?.value === 'true'

  const [user, cfg, supabase] = await Promise.all([
    getUserCached(),
    getServerConfig(),
    createClient(),
  ])

  // Données publiques cachées — identiques pour tous les utilisateurs
  const [films, profileCount, weekFilm, statsRows] = await Promise.all([
    withCache('films:list', 300, async () => {
      const { data } = await supabase.from('films').select('*').eq('pending_admin_approval', false).order('titre')
      return data ?? []
    }),
    withCache('profiles:count', 300, async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      return count ?? 0
    }),
    withCache('week_film:active', 3600, async () => {
      const { data } = await supabase.from('week_films').select('film_id').eq('active', true).single()
      return data ?? null
    }),
    withCache('film_stats', 90, async () => {
      const { data, error } = await (supabase as any).rpc('get_film_stats')
      return error ? null : (data ?? null)
    }),
  ])

  // Données utilisateur — toujours fraîches (spécifiques par utilisateur)
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

  // Agréger les stats globales par film
  const totalUsers = (profileCount as number) ?? 1
  const watchCountMap: Record<number, number> = {}
  const ratingMap: Record<number, number[]> = {}
  const negativeRatingMap: Record<number, number[]> = {}

  if (statsRows) {
    ;(statsRows as any[]).forEach((s) => {
      if (s.watch_count > 0) watchCountMap[s.film_id] = Number(s.watch_count)
      if (s.pos_scores?.length) ratingMap[s.film_id] = s.pos_scores
      if (s.neg_scores?.length) negativeRatingMap[s.film_id] = s.neg_scores
    })
  } else {
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

  const watchedIds = new Set(watched.map((w: { film_id: number }) => w.film_id) as number[])
  const watchedPreMap: Record<number, boolean> = {}
  watched.forEach((w: { film_id: number; pre: boolean }) => { watchedPreMap[w.film_id] = w.pre })
  const myRatings = Object.fromEntries(ratings.map((r: { film_id: number; score: number }) => [r.film_id, r.score]))
  const myNegativeRatings = Object.fromEntries(negativeRatings.map((r: { film_id: number; score: number }) => [r.film_id, r.score]))
  const weekFilmId = (weekFilm as { film_id: number } | null)?.film_id ?? null

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
      films={(films as any[]) ?? []}
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
