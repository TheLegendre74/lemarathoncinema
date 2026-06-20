import type { SupabaseClient } from '@supabase/supabase-js'
import type { FilmCombatant, FilmRow } from './types'
import { BALANCE } from './config/balance.config'
import { buildFilmCombatant, buildDemoTeam } from './battleEngine'

export interface TeamResult {
  team: FilmCombatant[]
  isDemo: boolean
  error?: string
}

export interface AllFilmsResult {
  allFilms: FilmCombatant[]
  isDemo: boolean
}

async function fetchFilmsAndRatings(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ films: FilmRow[]; ratingMap: Map<number, number> } | null> {
  const { data: watched, error: wErr } = await supabase
    .from('watched')
    .select('film_id')
    .eq('user_id', userId)

  if (wErr || !watched || watched.length === 0) return null

  const filmIds = watched.map((w: { film_id: number }) => w.film_id)

  const { data: films, error: fErr } = await supabase
    .from('films')
    .select('id, titre, annee, genre, sousgenre, poster, realisateur')
    .in('id', filmIds)

  if (fErr || !films || films.length === 0) return null

  const { data: ratings } = await supabase
    .from('ratings')
    .select('film_id, score')
    .eq('user_id', userId)
    .in('film_id', filmIds)

  const ratingMap = new Map<number, number>()
  if (ratings) {
    for (const r of ratings) ratingMap.set(r.film_id, r.score)
  }

  return { films: films as FilmRow[], ratingMap }
}

export async function loadAllWatchedFilms(
  supabase: SupabaseClient,
  userId: string,
): Promise<AllFilmsResult> {
  const result = await fetchFilmsAndRatings(supabase, userId)

  if (!result || result.films.length < BALANCE.TAILLE_EQUIPE_MIN) {
    return { allFilms: buildDemoTeam(), isDemo: true }
  }

  const allFilms = result.films.map((f: FilmRow) =>
    buildFilmCombatant(f, result.ratingMap.get(f.id))
  )

  return { allFilms, isDemo: false }
}

export async function loadTeam(
  supabase: SupabaseClient,
  userId: string,
): Promise<TeamResult> {
  const result = await fetchFilmsAndRatings(supabase, userId)

  if (!result) {
    return { team: buildDemoTeam(), isDemo: true, error: 'Aucun film vu ! Équipe de démonstration chargée.' }
  }

  if (result.films.length < BALANCE.TAILLE_EQUIPE_MIN) {
    return { team: buildDemoTeam(), isDemo: true }
  }

  const mode = BALANCE.MODE_EQUIPE
  const maxTeam = BALANCE.TAILLE_EQUIPE
  let selectedFilms: FilmRow[]

  if (mode === 'recents') {
    const { data: recentWatched } = await supabase
      .from('watched')
      .select('film_id')
      .eq('user_id', userId)
      .order('watched_at', { ascending: false })
      .limit(maxTeam)

    const recentIds = new Set((recentWatched ?? []).map((w: { film_id: number }) => w.film_id))
    selectedFilms = result.films
      .filter((f: FilmRow) => recentIds.has(f.id))
      .slice(0, maxTeam)
  } else {
    const shuffled = [...result.films].sort(() => Math.random() - 0.5)
    selectedFilms = shuffled.slice(0, maxTeam)
  }

  const team = selectedFilms.map((f: FilmRow) =>
    buildFilmCombatant(f, result.ratingMap.get(f.id))
  )

  return { team, isDemo: false }
}
