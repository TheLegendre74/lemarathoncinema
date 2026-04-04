'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isMarathonLive, CONFIG } from '@/lib/config'

// ── TMDB VERIFICATION ────────────────────────────────────────

// ── OMDB FALLBACK ────────────────────────────────────────────

async function searchOMDB(titre: string, annee: number): Promise<{
  imdbId?: string; posterUrl?: string; found: boolean
}> {
  const omdbKey = process.env.OMDB_API_KEY
  if (!omdbKey) return { found: false }

  try {
    // Try with year first, then without
    for (const yr of [annee, undefined]) {
      const url = yr
        ? `https://www.omdbapi.com/?t=${encodeURIComponent(titre)}&y=${yr}&type=movie&apikey=${omdbKey}`
        : `https://www.omdbapi.com/?t=${encodeURIComponent(titre)}&type=movie&apikey=${omdbKey}`
      const res = await fetch(url, { cache: 'no-store' })
      const data = await res.json()
      if (data.Response === 'True') {
        const movieYear = parseInt(data.Year ?? '0')
        if (!yr || Math.abs(movieYear - annee) <= 3) {
          return {
            found: true,
            imdbId: data.imdbID,
            posterUrl: data.Poster && data.Poster !== 'N/A' ? data.Poster : undefined,
          }
        }
      }
    }
  } catch { /* graceful */ }
  return { found: false }
}

async function tmdbFindByImdbId(imdbId: string, tmdbKey: string): Promise<any | null> {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/find/${imdbId}?api_key=${tmdbKey}&external_source=imdb_id`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    return data.movie_results?.[0] ?? null
  } catch { return null }
}

// ── TMDB + OMDB VERIFICATION ─────────────────────────────────

async function verifyWithTMDB(titre: string, annee: number): Promise<{
  ok: boolean; error?: string; tmdbId?: number; flagged18?: boolean; flagged16?: boolean; posterUrl?: string
}> {
  const key = process.env.TMDB_API_KEY
  if (!key) return { ok: true }

  async function searchTMDB(query: string, lang: string, year?: number) {
    const url = year
      ? `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&year=${year}&language=${lang}`
      : `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&language=${lang}`
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    return data.results ?? []
  }

  function findByYear(results: any[], annee: number, tolerance = 3) {
    return results.find(
      (m: any) => Math.abs(parseInt(m.release_date?.slice(0, 4) ?? '0') - annee) <= tolerance
    )
  }

  try {
    // 1. Search TMDB: FR avec année, FR sans année, EN avec année, EN sans année
    let results = await searchTMDB(titre, 'fr-FR', annee)
    if (!results.length) results = await searchTMDB(titre, 'fr-FR')
    if (!results.length) results = await searchTMDB(titre, 'en-US', annee)
    if (!results.length) results = await searchTMDB(titre, 'en-US')

    let movie = results.length === 1 ? results[0] : findByYear(results, annee, 3)

    // 2. Fallback OMDB (données IMDB) si TMDB ne trouve rien
    if (!movie) {
      const omdb = await searchOMDB(titre, annee)
      if (!omdb.found) {
        return { ok: false, error: `Film introuvable sur TMDB/IMDB pour "${titre}" (${annee}). Vérifiez le titre et l'année.` }
      }
      // Essayer de retrouver le film sur TMDB via l'IMDB ID pour les certifications
      if (omdb.imdbId) {
        movie = await tmdbFindByImdbId(omdb.imdbId, key)
      }
      // Si TMDB n'a pas le film, on accepte quand même avec l'affiche OMDB
      if (!movie) {
        return { ok: true, posterUrl: omdb.posterUrl }
      }
    }

    // Fetch certifications (release_dates déjà disponible, movie.adult déjà connu)
    const relRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}/release_dates?api_key=${key}`,
      { cache: 'no-store' }
    )
    const relData = await relRes.json()
    const { flagged18, flagged16 } = parseTMDBCertifications(relData.results ?? [], movie.adult === true)

    const posterUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : undefined

    return { ok: true, tmdbId: movie.id as number, flagged18, flagged16, posterUrl }
  } catch {
    return { ok: true }
  }
}

// Détermine les restrictions d'âge à partir des certifications TMDB (toutes régions)
// isAdult = flag TMDB movie.adult (films adultes explicites)
function parseTMDBCertifications(
  releaseDates: any[],
  isAdult = false
): { flagged18: boolean; flagged16: boolean; certs: Record<string, string> } {
  // Si TMDB marque le film comme "adult" → 18+ immédiat
  if (isAdult) return { flagged18: true, flagged16: false, certs: { adult: 'true' } }

  // getCert : préfère la sortie cinéma (type 3), puis limitée (type 2), puis n'importe laquelle
  const getCert = (iso: string): string => {
    const country = releaseDates.find((r: any) => r.iso_3166_1 === iso)
    if (!country?.release_dates?.length) return ''
    const withCert = (country.release_dates as any[]).filter(d => d.certification && d.certification !== '')
    if (!withCert.length) return ''
    // Priorité : type 3 (ciné) > 2 (ciné limité) > 4 (digital) > 5 (physique) > reste
    const priority = [3, 2, 4, 5, 1, 6]
    withCert.sort((a, b) => {
      const pa = priority.indexOf(a.type)
      const pb = priority.indexOf(b.type)
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
    })
    return withCert[0].certification
  }

  const fr = getCert('FR')
  const us = getCert('US')
  const gb = getCert('GB')
  const de = getCert('DE')
  const au = getCert('AU')
  const nl = getCert('NL')
  const it = getCert('IT')
  const es = getCert('ES')
  const jp = getCert('JP')
  const be = getCert('BE')
  const ch = getCert('CH')

  const certs: Record<string, string> = {}
  if (fr) certs['FR'] = fr
  if (us) certs['US'] = us
  if (gb) certs['GB'] = gb
  if (de) certs['DE'] = de
  if (au) certs['AU'] = au
  if (nl) certs['NL'] = nl
  if (it) certs['IT'] = it
  if (es) certs['ES'] = es
  if (jp) certs['JP'] = jp
  if (be) certs['BE'] = be
  if (ch) certs['CH'] = ch

  // ─── 18+ ────────────────────────────────────────────────
  // FR : CNC "18" (interdit -18 ans)
  if (fr === '18') return { flagged18: true, flagged16: false, certs }
  // US : NC-17 ou X (ancienne notation avant 1990)
  if (['NC-17', 'X'].includes(us)) return { flagged18: true, flagged16: false, certs }
  // GB : BBFC "18" ou "R18" (uniquement en sex shops)
  if (['18', 'R18'].includes(gb)) return { flagged18: true, flagged16: false, certs }
  // DE : FSK "18"
  if (de === '18') return { flagged18: true, flagged16: false, certs }
  // AU : "X18+" (classif. explicite) ou "RC" (Refused Classification)
  if (['X18+', 'RC'].includes(au)) return { flagged18: true, flagged16: false, certs }
  // NL : "18"
  if (nl === '18') return { flagged18: true, flagged16: false, certs }
  // IT : "VM18" (vietato minori 18 anni)
  if (it === 'VM18') return { flagged18: true, flagged16: false, certs }
  // ES : "18"
  if (es === '18') return { flagged18: true, flagged16: false, certs }
  // JP : "R18+"
  if (jp === 'R18+') return { flagged18: true, flagged16: false, certs }
  // BE : "18"
  if (be === '18') return { flagged18: true, flagged16: false, certs }
  // CH : "18"
  if (ch === '18') return { flagged18: true, flagged16: false, certs }

  // ─── 16+ ────────────────────────────────────────────────
  if (fr === '16') return { flagged18: false, flagged16: true, certs }
  if (us === 'R')  return { flagged18: false, flagged16: true, certs }
  if (gb === '15') return { flagged18: false, flagged16: true, certs }
  if (de === '16') return { flagged18: false, flagged16: true, certs }

  return { flagged18: false, flagged16: false, certs }
}

// ── TMDB SEARCH SUGGESTIONS ──────────────────────────────────

export type TMDBSuggestion = {
  tmdb_id: number
  titre: string
  titreOriginal: string
  annee: number | null
  realisateur: string
  genre: string
  sousgenre: string | null
  poster: string | null
  overview: string
}

const TMDB_GENRES: Record<number, string> = {
  28:'Action', 12:'Aventure', 16:'Animation', 35:'Comédie', 80:'Crime',
  18:'Drame', 10751:'Famille', 14:'Fantaisie', 36:'Histoire', 27:'Horreur',
  9648:'Policier', 878:'SF', 53:'Thriller', 10752:'Guerre', 37:'Western',
}

export async function searchFilmTMDB(query: string): Promise<TMDBSuggestion[]> {
  if (!query || query.trim().length < 2) return []
  const key = process.env.TMDB_API_KEY
  if (!key) return []

  try {
    const [resFR, resEN] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&language=fr-FR&page=1`, { cache: 'no-store' }),
      fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&language=en-US&page=1`, { cache: 'no-store' }),
    ])
    const [dataFR, dataEN] = await Promise.all([resFR.json(), resEN.json()])

    // Merge: FR results first, add EN results that aren't already in FR (by tmdb_id)
    const frResults: any[] = dataFR.results ?? []
    const enResults: any[] = dataEN.results ?? []
    const frIds = new Set(frResults.map((m: any) => m.id))
    const merged = [...frResults, ...enResults.filter((m: any) => !frIds.has(m.id))].slice(0, 6)

    if (!merged.length) return []

    // Fetch details + credits for each (parallel)
    const details = await Promise.all(
      merged.map((m: any) =>
        fetch(`https://api.themoviedb.org/3/movie/${m.id}?api_key=${key}&language=fr-FR&append_to_response=credits`, { cache: 'no-store' })
          .then(r => r.json())
          .catch(() => null)
      )
    )

    return details
      .filter(Boolean)
      .map((d: any) => {
        const director = d.credits?.crew?.find((c: any) => c.job === 'Director')
        const genres: string[] = (d.genres ?? []).map((g: any) =>
          TMDB_GENRES[g.id] ?? g.name
        )
        return {
          tmdb_id: d.id,
          titre: d.title ?? d.original_title ?? '',
          titreOriginal: d.original_title ?? '',
          annee: d.release_date ? parseInt(d.release_date.slice(0, 4)) : null,
          realisateur: director?.name ?? '',
          genre: genres[0] ?? 'Drame',
          sousgenre: genres[1] ?? null,
          poster: d.poster_path ? `https://image.tmdb.org/t/p/w92${d.poster_path}` : null,
          overview: (d.overview ?? '').slice(0, 100),
        } as TMDBSuggestion
      })
      .filter(s => s.titre)
  } catch {
    return []
  }
}

// ── AUTH ────────────────────────────────────────────────────

export async function signUp(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const pseudo = formData.get('pseudo') as string
  const password = formData.get('password') as string

  // Check pseudo uniqueness
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .ilike('pseudo', pseudo)
    .single()

  if (existing) return { error: 'Ce pseudo est déjà pris.' }

  const marathonLive = isMarathonLive()
  const saison = marathonLive ? CONFIG.SAISON_NUMERO + 1 : CONFIG.SAISON_NUMERO

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { pseudo, saison },
    },
  })

  if (error) return { error: error.message }

  // Update the profile with saison info (trigger creates the row)
  const { data: user } = await supabase.auth.getUser()
  if (user.user) {
    await supabase
      .from('profiles')
      .update({ saison })
      .eq('id', user.user.id)
  }

  return { success: true, s2: marathonLive }
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Email ou mot de passe incorrect.' }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}

// ── WATCHED ─────────────────────────────────────────────────

// Explicit pre/marathon mark (used by the two separate buttons)
export async function markWatched(filmId: number, pre: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  // Block marathon mark if marathon not live
  if (!pre && !isMarathonLive()) return { error: 'Le marathon n\'a pas encore commencé.' }

  const { data: existing } = await supabase
    .from('watched')
    .select('film_id, pre')
    .eq('user_id', user.id)
    .eq('film_id', filmId)
    .single()

  // Toggle off: if already watched with SAME pre value, remove
  if (existing && existing.pre === pre) {
    await supabase.from('watched').delete().eq('user_id', user.id).eq('film_id', filmId)
    if (!pre) {
      await supabase.rpc('decrement_exp', { user_id: user.id, amount: CONFIG.EXP_FILM })
    }
    revalidatePath('/films')
    return { action: 'removed' }
  }

  // Switch from pre→marathon or marathon→pre: delete existing first
  if (existing) {
    await supabase.from('watched').delete().eq('user_id', user.id).eq('film_id', filmId)
    // If switching from marathon to pre: remove marathon EXP
    if (existing.pre === false) {
      await supabase.rpc('decrement_exp', { user_id: user.id, amount: CONFIG.EXP_FILM })
    }
  }

  // Insert new record
  await supabase.from('watched').insert({ user_id: user.id, film_id: filmId, pre })
  if (!pre) {
    await supabase.rpc('increment_exp', { user_id: user.id, amount: CONFIG.EXP_FILM })
  }
  revalidatePath('/films')
  return { action: 'added', pre }
}

export async function toggleWatched(filmId: number, filmTitre: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: existing } = await supabase
    .from('watched')
    .select('film_id, pre')
    .eq('user_id', user.id)
    .eq('film_id', filmId)
    .single()

  if (existing) {
    // Remove
    await supabase.from('watched').delete().eq('user_id', user.id).eq('film_id', filmId)
    // Remove EXP if was marathon watch
    if (!existing.pre) {
      await supabase.rpc('decrement_exp', { user_id: user.id, amount: CONFIG.EXP_FILM })
    }
    revalidatePath('/films')
    return { action: 'removed' }
  } else {
    const pre = !isMarathonLive()
    await supabase.from('watched').insert({ user_id: user.id, film_id: filmId, pre })
    if (!pre) {
      // Calculate EXP (week film = more EXP)
      const { data: wf } = await supabase
        .from('week_films')
        .select('film_id')
        .eq('active', true)
        .eq('film_id', filmId)
        .single()
      const { data: duel } = await supabase
        .from('duels')
        .select('winner_id')
        .eq('winner_id', filmId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      const exp = wf ? CONFIG.EXP_FDLS : (duel ? CONFIG.EXP_DUEL_WIN : CONFIG.EXP_FILM)
      await supabase.rpc('increment_exp', { user_id: user.id, amount: exp })
    }
    revalidatePath('/films')
    return { action: 'added', pre }
  }
}

// ── RATINGS ─────────────────────────────────────────────────

export async function upsertRating(filmId: number, score: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  if (!Number.isInteger(score) || score < 1 || score > 10) return { error: 'Score invalide (1-10)' }

  await supabase.from('ratings').upsert(
    { user_id: user.id, film_id: filmId, score },
    { onConflict: 'user_id,film_id' }
  )
  revalidatePath('/films')
  revalidatePath('/classement')
  return { success: true }
}

// ── VOTES ────────────────────────────────────────────────────

export async function voteDuel(duelId: number, filmChoice: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: duel } = await supabase.from('duels').select('film1_id, film2_id, closed').eq('id', duelId).single()
  if (!duel || duel.closed) return { error: 'Ce duel est clôturé.' }
  if (filmChoice !== duel.film1_id && filmChoice !== duel.film2_id) return { error: 'Choix invalide.' }

  const { data: existing } = await supabase
    .from('votes')
    .select('duel_id')
    .eq('user_id', user.id)
    .eq('duel_id', duelId)
    .single()
  if (existing) return { error: 'Tu as déjà voté.' }

  await supabase.from('votes').insert({ user_id: user.id, duel_id: duelId, film_choice: filmChoice })
  await supabase.rpc('increment_exp', { user_id: user.id, amount: CONFIG.EXP_VOTE })

  revalidatePath('/duels')
  return { success: true }
}

// ── REPORTS ──────────────────────────────────────────────────

export async function reportFilm(filmId: number, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  if (!reason.trim()) return { error: 'Précise le problème.' }

  const { data: existing } = await supabase
    .from('reports')
    .select('id')
    .eq('film_id', filmId)
    .eq('user_id', user.id)
    .eq('resolved', false)
    .maybeSingle()

  if (existing) return { error: 'Tu as déjà signalé ce film (en attente de traitement).' }

  const { error } = await supabase.from('reports').insert({ film_id: filmId, user_id: user.id, reason: reason.trim() })
  if (error) return { error: error.message }
  return { success: true }
}

export async function adminResolveReport(reportId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const adminClient = createAdminClient()
  await adminClient.from('reports').update({ resolved: true, resolved_by: user.id }).eq('id', reportId)
  revalidatePath('/admin')
  return { success: true }
}

// ── SITE CONFIG ───────────────────────────────────────────────

export async function adminSetConfig(configs: Record<string, string>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const ALLOWED_CONFIG_KEYS = new Set([
    'marathon_start','saison_numero','saison_label','seance_jour','seance_heure',
    'fdls_jour','fdls_heure','seuil_majority','exp_film','exp_fdls','exp_duel_win','exp_vote',
    'accueil_sous_titre','matrix_line1','matrix_line2','matrix_line3','joker_phrase',
    'tars_line1','tars_line2','marvin_line1','marvin_line2','hal_line1','hal_line2',
    'nolan_quote','bond_line','noctam_line1','noctam_line2','kenny_text1','kenny_text2',
    'randy_quote','fightclub_gameover','killbill_end','MARATHON_RULES','TIPIAK_LINKS',
  ])

  const adminClient = createAdminClient()
  const entries = Object.entries(configs)
    .filter(([key]) => ALLOWED_CONFIG_KEYS.has(key))
    .map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }))
  if (!entries.length) return { error: 'Aucune clé valide' }
  const { error } = await adminClient.from('site_config').upsert(entries, { onConflict: 'key' })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  revalidatePath('/admin')
  return { success: true }
}

// ── POSTER VERIFICATION ───────────────────────────────────────

export async function adminVerifyPosters(fromId: number = 0) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const { data: films } = await supabase
    .from('films')
    .select('id, titre, poster')
    .not('poster', 'is', null)
    .gt('id', fromId)
    .order('id')
    .limit(40)

  if (!films?.length) return { success: true, broken: [], nextId: null }

  const broken: { id: number; titre: string; poster: string }[] = []

  await Promise.all(films.map(async (f) => {
    try {
      const res = await fetch(f.poster!, { method: 'HEAD', signal: AbortSignal.timeout(4000) })
      if (!res.ok) broken.push({ id: f.id, titre: f.titre, poster: f.poster! })
    } catch {
      broken.push({ id: f.id, titre: f.titre, poster: f.poster! })
    }
  }))

  const nextId = films.length === 40 ? films[films.length - 1].id : null
  return { success: true, broken, nextId, checked: films.length }
}

// ── FILMS ────────────────────────────────────────────────────

export async function updateFilm(filmId: number, updates: {
  genre?: string; titre?: string; annee?: number
  realisateur?: string; poster?: string | null; saison?: number; sousgenre?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const [{ data: profile }, { data: film }] = await Promise.all([
    supabase.from('profiles').select('is_admin').eq('id', user.id).single(),
    supabase.from('films').select('added_by').eq('id', filmId).single(),
  ])

  if (!film) return { error: 'Film introuvable.' }
  const isAdmin = !!profile?.is_admin
  const isAuthor = film.added_by === user.id
  if (!isAdmin && !isAuthor) return { error: 'Non autorisé.' }

  // Authors can only update genre
  const allowed = isAdmin
    ? updates
    : { genre: updates.genre }

  const clean = Object.fromEntries(Object.entries(allowed).filter(([, v]) => v !== undefined))
  if (!Object.keys(clean).length) return { error: 'Aucune modification.' }

  const { error } = await supabase.from('films').update(clean).eq('id', filmId)
  if (error) return { error: error.message }

  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true }
}

export async function addFilm(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const titre = (formData.get('titre') as string).trim()
  const annee = parseInt(formData.get('annee') as string)
  const realisateur = (formData.get('realisateur') as string).trim()
  const genre = ((formData.get('genre') as string) ?? '').trim().slice(0, 50)
  const manualPoster = (formData.get('poster') as string)?.trim() || null

  if (!titre || !annee || !realisateur || !genre) return { error: 'Champs requis manquants.' }
  if (annee < 1888 || annee > 2030) return { error: 'Année invalide.' }

  // Check duplicate
  const { data: dup } = await supabase
    .from('films')
    .select('id, titre')
    .ilike('titre', titre)
    .eq('annee', annee)
    .single()

  if (dup) return { error: `⚠️ "${dup.titre}" (${annee}) est déjà dans la liste !` }

  // TMDB verification: existence + adult content check
  const tmdb = await verifyWithTMDB(titre, annee)
  if (!tmdb.ok) return { error: tmdb.error }

  // Use manual poster URL if provided, otherwise use TMDB poster
  const poster = manualPoster || tmdb.posterUrl || null

  const saison = isMarathonLive() ? CONFIG.SAISON_NUMERO + 1 : CONFIG.SAISON_NUMERO

  const { error } = await supabase.from('films').insert({
    titre, annee, realisateur, genre, poster, saison, added_by: user.id,
    tmdb_id: tmdb.tmdbId ?? null,
    flagged_18plus: tmdb.flagged18 ?? false,
    flagged_16plus: tmdb.flagged16 ?? false,
  })

  if (error) return { error: error.message }
  revalidatePath('/films')
  return { success: true, saison, flagged18: tmdb.flagged18 ?? false, flagged16: tmdb.flagged16 ?? false }
}

// ── POSTS (forum) ────────────────────────────────────────────

export async function addPost(topic: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const safeTopic = topic?.trim().slice(0, 100) ?? ''
  if (!safeTopic) return { error: 'Topic invalide.' }
  if (!content.trim()) return { error: 'Message vide.' }

  const { data, error } = await supabase.from('posts').insert({ topic: safeTopic, user_id: user.id, content: content.trim().slice(0, 2000) }).select().single()
  if (error) return { error: error.message }
  revalidatePath('/films')
  revalidatePath('/duels')
  revalidatePath('/semaine')
  return { success: true, data }
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single()

  if (!post) return { error: 'Post introuvable.' }
  if (post.user_id !== user.id && !profile?.is_admin) return { error: 'Non autorisé.' }

  await supabase.from('posts').delete().eq('id', postId)
  return { success: true }
}

export async function editPost(postId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const sanitized = content.trim().slice(0, 2000)
  if (!sanitized) return { error: 'Message vide.' }

  const { data: post } = await supabase.from('posts').select('user_id').eq('id', postId).single()
  if (!post) return { error: 'Post introuvable.' }
  if (post.user_id !== user.id) return { error: 'Non autorisé.' }

  const { error } = await (supabase as any).from('posts').update({ content: sanitized }).eq('id', postId)
  if (error) return { error: error.message }
  return { success: true }
}

// ── ADMIN ────────────────────────────────────────────────────

export async function adminCreateDuel(film1Id: number, film2Id: number, weekNum: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const { error } = await supabase.from('duels').insert({ film1_id: film1Id, film2_id: film2Id, week_num: weekNum })
  if (error) return { error: error.message }
  revalidatePath('/duels')
  revalidatePath('/admin')
  return { success: true }
}

export async function adminCloseDuel(duelId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  // Count votes
  const { data: votes } = await supabase
    .from('votes')
    .select('film_choice')
    .eq('duel_id', duelId)

  const { data: duel } = await supabase.from('duels').select('film1_id, film2_id').eq('id', duelId).single()
  if (!duel || !votes) return { error: 'Duel introuvable.' }

  const v1 = votes.filter((v: { film_choice: number }) => v.film_choice === duel.film1_id).length
  const v2 = votes.filter((v: { film_choice: number }) => v.film_choice === duel.film2_id).length
  const winnerId = v1 >= v2 ? duel.film1_id : duel.film2_id

  await supabase.from('duels').update({ winner_id: winnerId, closed: true }).eq('id', duelId)
  revalidatePath('/duels')
  revalidatePath('/admin')
  return { success: true, winnerId }
}

export async function adminSetWeekFilm(filmId: number, sessionTime?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  // Deactivate previous
  await supabase.from('week_films').update({ active: false }).eq('active', true)
  // Create new
  await supabase.from('week_films').insert({ film_id: filmId, active: true, session_time: sessionTime ?? `${CONFIG.FDLS_JOUR} à ${CONFIG.FDLS_HEURE}` })

  revalidatePath('/semaine')
  revalidatePath('/admin')
  revalidatePath('/')
  return { success: true }
}

export async function adminDeleteFilm(filmId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  await supabase.from('films').delete().eq('id', filmId)
  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true }
}

export async function adminSetAdmin(userId: string, makeAdmin: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  // Empêche de se retirer soi-même les droits admin
  if (userId === user.id && !makeAdmin) return { error: 'Impossible de se retirer ses propres droits admin.' }

  await supabase.from('profiles').update({ is_admin: makeAdmin }).eq('id', userId)
  revalidatePath('/admin')
  return { success: true }
}

export async function adminDeleteUser(userId: string) {
  const adminClient = createAdminClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  await adminClient.auth.admin.deleteUser(userId)
  revalidatePath('/admin')
  return { success: true }
}

export async function adminGrantExp(userId: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  await supabase.rpc('increment_exp', { user_id: userId, amount })
  revalidatePath('/admin')
  revalidatePath('/classement')
  return { success: true }
}

export async function adminCleanDuels() {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  // Delete duel forum posts first
  await adminClient.from('posts').delete().like('topic', 'duel_%')
  // Delete all duels — votes cascade automatically (ON DELETE CASCADE)
  await adminClient.from('duels').delete().gte('id', 0)

  revalidatePath('/duels')
  revalidatePath('/admin')
  return { success: true }
}

// Marquer / démarquer un film comme 18+ — ne supprime JAMAIS le film
// Clear aussi flagged_18_pending (décision prise, plus en attente)
export async function adminSet18Flag(filmId: number, is18: boolean) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  await adminClient.from('films').update({ flagged_18plus: is18, flagged_18_pending: false }).eq('id', filmId)
  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true }
}

export async function adminApproveFlaggedFilm(filmId: number) {
  return adminSet18Flag(filmId, false)
}

export async function adminBatchFlaggedDecisions(decisions: Record<string, 'approve' | 'reject'>) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  // "approve" = confirmer 18+, "reject" = retirer le flag 18+ — JAMAIS de suppression
  const toMark18 = Object.entries(decisions)
    .filter(([, d]) => d === 'approve')
    .map(([id]) => parseInt(id, 10))
    .filter(n => !Number.isNaN(n))
  const toUnflag = Object.entries(decisions)
    .filter(([, d]) => d === 'reject')
    .map(([id]) => parseInt(id, 10))
    .filter(n => !Number.isNaN(n))

  if (toMark18.length)  await adminClient.from('films').update({ flagged_18plus: true  }).in('id', toMark18)
  if (toUnflag.length)  await adminClient.from('films').update({ flagged_18plus: false }).in('id', toUnflag)

  revalidatePath('/films')
  return { approved: toMark18.length, rejected: toUnflag.length }
}

// Valide TOUS les films en attente de vérification 18+ d'un coup
export async function adminApproveAllPending() {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const { data: pending } = await supabase.from('films').select('id').eq('flagged_18_pending', true)
  if (!pending?.length) return { success: true, count: 0 }

  const ids = pending.map((f: { id: number }) => f.id)
  await adminClient.from('films').update({ flagged_18plus: true, flagged_18_pending: false, flagged_16plus: false }).in('id', ids)

  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true, count: ids.length }
}

// ── POSTER MANAGEMENT ────────────────────────────────────────

async function tmdbSearchMovie(titre: string, annee: number, key: string) {
  async function search(lang: string, year?: number) {
    const url = year
      ? `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(titre)}&year=${year}&language=${lang}`
      : `https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(titre)}&language=${lang}`
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    return (data.results ?? []) as any[]
  }
  let results = await search('fr-FR', annee)
  if (!results.length) results = await search('fr-FR')
  if (!results.length) results = await search('en-US', annee)
  if (!results.length) results = await search('en-US')

  const tmdbMatch = results.find(
    (m: any) => Math.abs(parseInt(m.release_date?.slice(0, 4) ?? '0') - annee) <= 3
  ) ?? results[0] ?? null

  if (tmdbMatch) return tmdbMatch

  // Fallback OMDB → TMDB /find via IMDB ID
  const omdb = await searchOMDB(titre, annee)
  if (omdb.imdbId) {
    const byImdb = await tmdbFindByImdbId(omdb.imdbId, key)
    if (byImdb) return byImdb
  }
  // Dernier recours : retourner un objet minimal avec le poster OMDB
  if (omdb.found && omdb.posterUrl) {
    return { id: null, poster_path: null, _omdbPoster: omdb.posterUrl }
  }
  return null
}

export async function adminFetchFilmPoster(filmId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const { data: film } = await supabase.from('films').select('titre, annee, tmdb_id').eq('id', filmId).single()
  if (!film) return { error: 'Film introuvable.' }

  const key = process.env.TMDB_API_KEY
  if (!key) return { error: 'Clé TMDB_API_KEY manquante dans les variables d\'environnement.' }

  try {
    let movie: any = null
    if (film.tmdb_id) {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${film.tmdb_id}?api_key=${key}&language=fr-FR`,
        { cache: 'no-store' }
      )
      movie = await res.json()
    } else {
      movie = await tmdbSearchMovie(film.titre, film.annee, key)
    }

    const posterUrl = movie?.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : movie?._omdbPoster ?? null

    if (!posterUrl) return { error: 'Aucune affiche trouvée sur TMDB/IMDB pour ce film.' }

    const adminClient = createAdminClient()
    await adminClient.from('films').update({
      poster: posterUrl,
      ...(movie?.id && !film.tmdb_id ? { tmdb_id: movie.id } : {}),
    }).eq('id', filmId)

    revalidatePath('/films')
    revalidatePath('/admin')
    return { success: true, posterUrl }
  } catch {
    return { error: 'Erreur réseau lors de la recherche TMDB.' }
  }
}

export async function adminUploadFilmPoster(filmId: number, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const file = formData.get('poster') as File
  if (!file || !file.size) return { error: 'Aucun fichier sélectionné.' }
  if (file.size > 5 * 1024 * 1024) return { error: 'Image trop lourde (max 5 Mo).' }

  const adminClient = createAdminClient()

  // Create bucket if it doesn't exist yet
  await adminClient.storage.createBucket('posters', { public: true }).catch(() => {})

  const ALLOWED_IMG_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp'])
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_IMG_EXTS.has(ext)) return { error: 'Format invalide (jpg, png, webp)' }
  const filename = `film-${filmId}-${Date.now()}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await adminClient.storage
    .from('posters')
    .upload(filename, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = adminClient.storage.from('posters').getPublicUrl(filename)

  await adminClient.from('films').update({ poster: publicUrl }).eq('id', filmId)

  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true, posterUrl: publicUrl }
}

export async function adminRefreshMissingPosters() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const key = process.env.TMDB_API_KEY
  if (!key) return { error: 'Clé TMDB_API_KEY manquante dans les variables d\'environnement.' }

  const { data: films } = await supabase
    .from('films')
    .select('id, titre, annee, tmdb_id')
    .is('poster', null)
    .limit(30)

  if (!films?.length) return { success: true, count: 0 }

  const adminClient = createAdminClient()
  let count = 0

  for (const film of films) {
    try {
      let movie: any = null
      if (film.tmdb_id) {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${film.tmdb_id}?api_key=${key}`,
          { cache: 'no-store' }
        )
        movie = await res.json()
      } else {
        movie = await tmdbSearchMovie(film.titre, film.annee, key)
      }
      const poster = movie?.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : movie?._omdbPoster ?? null
      if (poster) {
        await adminClient.from('films').update({
          poster,
          ...(movie?.id && !film.tmdb_id ? { tmdb_id: movie.id } : {}),
        }).eq('id', film.id)
        count++
      }
    } catch { /* skip */ }
  }

  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true, count }
}

export async function adminFetchFrenchPosters(fromId: number = 0) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const key = process.env.TMDB_API_KEY
  if (!key) return { error: 'Clé TMDB_API_KEY manquante.' }

  const { data: films } = await supabase
    .from('films')
    .select('id, titre, annee, tmdb_id')
    .gt('id', fromId)
    .order('id')
    .limit(40)

  if (!films?.length) return { success: true, count: 0, nextId: null }

  const adminClient = createAdminClient()
  let count = 0

  for (const film of films) {
    try {
      let tmdbId = film.tmdb_id

      // Si pas de tmdb_id, chercher d'abord
      if (!tmdbId) {
        const found = await tmdbSearchMovie(film.titre, film.annee, key)
        if (found?.id) {
          tmdbId = found.id
          await adminClient.from('films').update({ tmdb_id: tmdbId }).eq('id', film.id)
        }
      }
      if (!tmdbId) continue

      // 1. Essayer d'obtenir une affiche française via /images
      const imgRes = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${key}&include_image_language=fr,null`,
        { cache: 'no-store' }
      )
      const imgData = await imgRes.json()
      const posters: any[] = imgData.posters ?? []

      // Priorité : fr > null (international) > fallback movie details
      const frPoster   = posters.find((p: any) => p.iso_639_1 === 'fr')
      const intlPoster = posters.find((p: any) => p.iso_639_1 === null)
      const bestPath   = (frPoster ?? intlPoster)?.file_path

      let posterUrl: string | null = null
      if (bestPath) {
        posterUrl = `https://image.tmdb.org/t/p/w500${bestPath}`
      } else {
        // 2. Fallback : movie details en fr-FR
        const detRes = await fetch(
          `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${key}&language=fr-FR`,
          { cache: 'no-store' }
        )
        const det = await detRes.json()
        if (det.poster_path) posterUrl = `https://image.tmdb.org/t/p/w500${det.poster_path}`
      }

      if (posterUrl) {
        await adminClient.from('films').update({ poster: posterUrl }).eq('id', film.id)
        count++
      }
    } catch { /* skip */ }
  }

  const nextId = films.length === 40 ? films[films.length - 1].id : null
  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true, count, nextId }
}

// Scan par lot les restrictions d'âge de tous les films via TMDB
export async function adminScanAgeRestrictions(fromId: number = 0) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const key = process.env.TMDB_API_KEY
  if (!key) return { error: 'Clé TMDB_API_KEY manquante.' }

  // Inclure flagged_18plus pour ne pas re-pendre les films déjà confirmés manuellement
  const { data: films } = await supabase
    .from('films')
    .select('id, titre, annee, tmdb_id, flagged_18plus')
    .gt('id', fromId)
    .order('id')
    .limit(40)

  if (!films?.length) return { success: true, count: 0, pendingCount: 0, nextId: null, details: [] }

  const adminClient = createAdminClient()
  let count = 0
  let pendingCount = 0
  const details: Array<{ id: number; titre: string; tmdbId: number | null; flagged18: boolean; flagged16: boolean; certs: Record<string, string>; status: string }> = []

  for (const film of films) {
    try {
      let tmdbId = film.tmdb_id

      if (!tmdbId) {
        const found = await tmdbSearchMovie(film.titre, film.annee, key)
        if (found?.id) {
          tmdbId = found.id
          await adminClient.from('films').update({ tmdb_id: tmdbId }).eq('id', film.id)
        }
      }

      if (!tmdbId) {
        // Pas de TMDB : impossible de déterminer → nettoyer flagged_18_pending pour ne pas laisser en queue
        await adminClient.from('films').update({ flagged_18_pending: false }).eq('id', film.id)
        details.push({ id: film.id, titre: film.titre, tmdbId: null, flagged18: false, flagged16: false, certs: {}, status: 'no_tmdb' })
        count++
        continue
      }

      // Fetch release_dates ET détails du film (flag adult) en parallèle
      const [relRes, detailRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates?api_key=${key}`, { cache: 'no-store' }),
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${key}`, { cache: 'no-store' }),
      ])
      const [relData, detailData] = await Promise.all([relRes.json(), detailRes.json()])
      const isAdult = detailData.adult === true
      const { flagged18, flagged16, certs } = parseTMDBCertifications(relData.results ?? [], isAdult)

      if (flagged18 && !film.flagged_18plus) {
        // TMDB détecte 18+ et pas encore confirmé → mettre en attente de validation manuelle
        await adminClient.from('films')
          .update({ flagged_16plus: false, flagged_18_pending: true })
          .eq('id', film.id)
        details.push({ id: film.id, titre: film.titre, tmdbId, flagged18: true, flagged16: false, certs, status: 'pending' })
        pendingCount++
      } else if (flagged18 && film.flagged_18plus) {
        // Déjà confirmé manuellement → ne pas toucher
        details.push({ id: film.id, titre: film.titre, tmdbId, flagged18: true, flagged16: false, certs, status: 'already_confirmed' })
      } else {
        // Pas 18+ → nettoyer automatiquement
        await adminClient.from('films')
          .update({ flagged_18plus: false, flagged_18_pending: false, flagged_16plus: flagged16 })
          .eq('id', film.id)
        details.push({ id: film.id, titre: film.titre, tmdbId, flagged18: false, flagged16, certs, status: flagged16 ? 'cleared_16plus' : 'cleared' })
      }
      count++
    } catch (err) {
      // En cas d'erreur API → nettoyer flagged_18_pending pour ne pas laisser en queue
      try { await adminClient.from('films').update({ flagged_18_pending: false }).eq('id', film.id) } catch { /* best-effort */ }
      details.push({ id: film.id, titre: film.titre, tmdbId: film.tmdb_id, flagged18: false, flagged16: false, certs: {}, status: `error: ${String(err).slice(0, 80)}` })
      count++
    }
  }

  const nextId = films.length === 40 ? films[films.length - 1].id : null
  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true, count, pendingCount, nextId, details }
}

export async function adminForceRefreshAllPosters(fromId: number = 0) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const key = process.env.TMDB_API_KEY
  if (!key) return { error: 'Clé TMDB_API_KEY manquante dans les variables d\'environnement.' }

  // Fetch next 50 films starting from fromId
  const { data: films } = await supabase
    .from('films')
    .select('id, titre, annee, tmdb_id')
    .gt('id', fromId)
    .order('id')
    .limit(50)

  if (!films?.length) return { success: true, count: 0, nextId: null }

  const adminClient = createAdminClient()
  let count = 0

  for (const film of films) {
    try {
      let movie: any = null
      if (film.tmdb_id) {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${film.tmdb_id}?api_key=${key}`,
          { cache: 'no-store' }
        )
        movie = await res.json()
      } else {
        movie = await tmdbSearchMovie(film.titre, film.annee, key)
      }
      const poster = movie?.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : movie?._omdbPoster ?? null
      if (poster) {
        await adminClient.from('films').update({
          poster,
          ...(movie?.id && !film.tmdb_id ? { tmdb_id: movie.id } : {}),
        }).eq('id', film.id)
        count++
      }
    } catch { /* skip */ }
  }

  const nextId = films.length === 50 ? films[films.length - 1].id : null

  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true, count, nextId }
}

// ── WATCH PROVIDERS (public — appelé depuis FilmsClient) ──────

export async function getFilmWatchProviders(tmdbId: number | null): Promise<{
  flatrate?: { provider_id: number; provider_name: string; logo_path: string }[]
  rent?: { provider_id: number; provider_name: string; logo_path: string }[]
  buy?: { provider_id: number; provider_name: string; logo_path: string }[]
} | null> {
  if (!tmdbId) return null
  const key = process.env.TMDB_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${key}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    return data.results?.FR ?? null
  } catch { return null }
}

// ── EASTER EGGS ───────────────────────────────────────────────

export async function discoverEgg(eggId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('discovered_eggs').upsert(
    { user_id: user.id, egg_id: eggId },
    { onConflict: 'user_id,egg_id', ignoreDuplicates: true }
  )
}

// ── FORUM ─────────────────────────────────────────────────────

export async function createForumTopic(title: string, description: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const sanitized = title.slice(0, 100).trim()
  if (!sanitized) return { error: 'Titre requis' }

  const { data, error } = await (supabase as any)
    .from('forum_topics')
    .insert({ title: sanitized, description: description.slice(0, 300), created_by: user.id })
    .select()
    .single()

  if (error) return { error: 'Erreur lors de la création' }
  revalidatePath('/forum')
  return { data }
}

export async function addForumPost(topicId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const sanitized = content.slice(0, 2000).trim()
  if (!sanitized) return { error: 'Message vide' }

  const { data, error } = await (supabase as any)
    .from('forum_posts')
    .insert({ topic_id: topicId, user_id: user.id, content: sanitized })
    .select()
    .single()

  if (error) return { error: 'Erreur lors de l\'envoi' }
  revalidatePath(`/forum/${topicId}`)
  return { data }
}

export async function deleteForumPost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: post } = await (supabase as any).from('forum_posts').select('user_id, topic_id').eq('id', postId).single()
  if (!post) return { error: 'Message introuvable' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (post.user_id !== user.id && !profile?.is_admin) return { error: 'Permission refusée' }

  await (supabase as any).from('forum_posts').delete().eq('id', postId)
  revalidatePath(`/forum/${post.topic_id}`)
  return { error: null }
}

export async function deleteForumTopic(topicId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Réservé aux admins' }
  const { data: topic } = await (supabase as any).from('forum_topics').select('is_social').eq('id', topicId).single()
  if (topic?.is_social) return { error: 'Le Salon ne peut pas être supprimé' }
  await (supabase as any).from('forum_topics').delete().eq('id', topicId)
  revalidatePath('/forum')
  return { error: null }
}

// ── NEWS ──────────────────────────────────────────────────────

export async function adminAddNews(title: string, content: string, pinned = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Réservé aux admins' }

  const { data, error } = await (supabase as any)
    .from('news')
    .insert({ title: title.slice(0, 200), content: content.slice(0, 5000), created_by: user.id, pinned })
    .select().single()

  if (error) return { error: 'Erreur lors de la création' }
  revalidatePath('/')
  return { data }
}

export async function adminDeleteNews(newsId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Réservé aux admins' }
  await (supabase as any).from('news').delete().eq('id', newsId)
  revalidatePath('/')
  return { error: null }
}

// ── AVATAR ────────────────────────────────────────────────────

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const file = formData.get('avatar') as File | null
  if (!file || !file.size) return { error: 'Fichier manquant' }
  if (file.size > 2 * 1024 * 1024) return { error: 'Image trop volumineuse (max 2 Mo)' }
  const ALLOWED_AVATAR_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp'])
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_AVATAR_EXTS.has(ext) || !file.type.startsWith('image/')) return { error: 'Format invalide (jpg, png, webp)' }
  const path = `avatars/${user.id}.${ext}`

  const adminClient = createAdminClient()

  // Ensure bucket exists and is public
  await adminClient.storage.createBucket('posters', { public: true }).catch(() => {})

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await adminClient.storage
    .from('posters')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: { publicUrl } } = adminClient.storage.from('posters').getPublicUrl(path)

  await adminClient.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
  revalidatePath('/profil')
  return { url: publicUrl }
}

// ── RECOMMENDATIONS ───────────────────────────────────────────

export async function adminAddRecommendation(
  niveau: 'debutant' | 'intermediaire' | 'confirme',
  titre: string, annee: number | null, realisateur: string,
  description: string, position: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Réservé aux admins' }

  const { data, error } = await (supabase as any)
    .from('recommendation_films')
    .insert({ niveau, titre: titre.trim(), annee, realisateur: realisateur.trim(), description: description.trim(), position })
    .select().single()

  if (error) return { error: 'Erreur lors de l\'ajout' }
  revalidatePath('/rattrapage')
  return { data }
}

export async function adminDeleteRecommendation(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Réservé aux admins' }
  await (supabase as any).from('recommendation_films').delete().eq('id', id)
  revalidatePath('/rattrapage')
  return { error: null }
}

// ── SEASON MANAGEMENT ─────────────────────────────────────────

export async function adminEndSeason(saisonNum: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé' }

  const adminClient = createAdminClient()
  const { error } = await (adminClient as any).rpc('end_season', { saison_num: saisonNum })
  if (error) return { error: error.message }

  revalidatePath('/classement')
  revalidatePath('/admin')
  return { success: true }
}
