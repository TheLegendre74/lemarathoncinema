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
  const [films, profileCount, weekFilm, latestArchivedWeekFilm, statsRows, duelWinnersData] = await Promise.all([
    withCache('films:list', 300, async () => {
      const { data } = await supabase
        .from('films')
        .select('id, titre, annee, realisateur, genre, sousgenre, poster, saison, added_by, tmdb_id, flagged_18plus, flagged_16plus, flagged_18_pending, flagged_18strange, pending_admin_approval')
        .eq('pending_admin_approval', false)
        .order('titre')
      return data ?? []
    }),
    withCache('profiles:count', 300, async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      return count ?? 0
    }),
    supabase.from('week_films').select('id, film_id, created_at').eq('active', true).order('created_at', { ascending: false }).limit(1).single().then(({ data }) => data ?? null),
    supabase.from('week_films').select('id, film_id').eq('active', false).order('created_at', { ascending: false }).limit(1).single().then(({ data }) => data ?? null),
    withCache('film_stats', 90, async () => {
      const { data, error } = await (supabase as any).rpc('get_film_stats')
      return error ? null : (data ?? null)
    }),
    withCache(`duels:winners:v2:s${cfg.SAISON_NUMERO}`, 120, async () => {
      const { data } = await supabase
        .from('duels')
        .select('id, winner_id, closed_at, winner:films!duels_winner_id_fkey(saison)')
        .eq('closed', true)
        .not('winner_id', 'is', null)
      return (data ?? [])
        .filter((d: any) => d.winner?.saison === cfg.SAISON_NUMERO)
        .map((d: any) => ({ filmId: d.winner_id as number, duelId: d.id as number, closedAt: d.closed_at as string | null }))
    }),
  ])

  // Données utilisateur — toujours fraîches (spécifiques par utilisateur)
  let watched: any[] = []
  let ratings: any[] = []
  let profile = null
  let negativeRatings: any[] = []
  let hasRageuxEgg = false
  let userWatchlists: any[] = []
  let weekFilmBonusClaimed = false

  if (user) {
    const bonusTargetId = (latestArchivedWeekFilm as any)?.id ?? null
    const [{ data: w }, { data: r }, { data: p }, { data: nr }, { data: eggs }, wl, { data: bonusClaim }] = await Promise.all([
      supabase.from('watched').select('film_id, pre').eq('user_id', user.id),
      supabase.from('ratings').select('film_id, score').eq('user_id', user.id),
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      (supabase as any).from('negative_ratings').select('film_id, score').eq('user_id', user.id),
      supabase.from('discovered_eggs').select('egg_id').eq('user_id', user.id),
      getUserWatchlists(),
      bonusTargetId
        ? (supabase as any).from('week_film_bonus_claims').select('week_film_id').eq('user_id', user.id).eq('week_film_id', bonusTargetId).single()
        : Promise.resolve({ data: null }),
    ])
    watched = w ?? []
    ratings = r ?? []
    profile = p
    negativeRatings = nr ?? []
    hasRageuxEgg = (eggs ?? []).some((e: any) => e.egg_id === 'rageux')
    userWatchlists = wl ?? []
    weekFilmBonusClaimed = !!bonusClaim
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
  const weekFilmId = (weekFilm as any)?.film_id ?? null
  const weekFilmCreatedAt = (weekFilm as any)?.created_at ?? null
  // Bonus : cible le dernier film archivé, visible pendant 48h après l'annonce du nouveau
  const bonusFilmId = (latestArchivedWeekFilm as any)?.film_id ?? null
  const bonusWeekFilmDbId = (latestArchivedWeekFilm as any)?.id ?? null
  const bonusAvailable = !!(weekFilmCreatedAt && bonusFilmId && ((Date.now() - new Date(weekFilmCreatedAt).getTime()) / (1000 * 60 * 60) <= 48))

  // Filtrer les duel winners éligibles : user a voté + clôturé < 48h
  const now = Date.now()
  const duelWinnerIds = ((duelWinnersData ?? []) as { filmId: number; duelId: number; closedAt: string | null }[])
    .filter(d => {
      if (!d.closedAt) return false
      return (now - new Date(d.closedAt).getTime()) / (1000 * 60 * 60) <= 48
    })
    .map(d => d.filmId)

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
      preMarathonWindowUntil={(profile as any)?.pre_marathon_window_until ?? null}
      duelWinnerIds={duelWinnerIds}
      bonusFilmId={bonusFilmId}
      bonusWeekFilmDbId={bonusWeekFilmDbId}
      bonusAvailable={bonusAvailable}
      weekFilmBonusClaimed={weekFilmBonusClaimed}
    />
  )
}
