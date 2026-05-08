'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isMarathonLive, CONFIG } from '@/lib/config'
import { getUnreadMessageCount as getUnreadMessageCountFromMessages } from '@/lib/messages'
import { deleteCacheKeys } from '@/lib/redis'

const WEEK_FILM_CACHE_KEYS = ['week_film:active', 'week_film:full']

async function invalidateWeekFilmCaches() {
  revalidatePath('/semaine')
  revalidatePath('/films')
  revalidatePath('/admin')
  revalidatePath('/')
  await deleteCacheKeys(WEEK_FILM_CACHE_KEYS)
}

function canMarkLatestWeekArchiveNow() {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    hour: 'numeric',
  }).formatToParts(new Date())
  const weekday = parts.find(p => p.type === 'weekday')?.value
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0')
  return weekday === 'samedi' || (weekday === 'vendredi' && hour >= 22)
}

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

// Détermine les restrictions d'âge à partir des certifications TMDB (TOUTES régions)
function parseTMDBCertifications(
  releaseDates: any[],
  isAdult = false
): { flagged18: boolean; flagged16: boolean; certs: Record<string, string> } {
  if (isAdult) return { flagged18: true, flagged16: false, certs: { adult: 'true' } }

  // Extrait la meilleure certification pour un pays donné
  // Priorité : type 3 (ciné) > 2 (limité) > 4 (digital) > 5 (physique) > reste
  const extractBestCert = (country: any): string => {
    const dates = (country.release_dates ?? []) as any[]
    const withCert = dates.filter((d: any) => d.certification && d.certification.trim() !== '')
    if (!withCert.length) return ''
    const priority = [3, 2, 4, 5, 1, 6]
    withCert.sort((a: any, b: any) => {
      const pa = priority.indexOf(a.type)
      const pb = priority.indexOf(b.type)
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
    })
    return withCert[0].certification.trim()
  }

  // Collecte TOUTES les certifications de TOUS les pays retournés par TMDB
  const certs: Record<string, string> = {}
  for (const country of releaseDates) {
    const iso = country.iso_3166_1 as string
    const cert = extractBestCert(country)
    if (cert) certs[iso] = cert
  }

  // Détecte si 18+ : vérifie TOUTES les certifications connues pour "18+"
  const is18 = (c: string): boolean => {
    const u = c.toUpperCase()
    return (
      u === '18' ||          // FR, DE, NL, ES, BE, CH, PT, PL, CZ, HU, RO, etc.
      u === '18+' ||
      u === '18A' ||         // Canada Alberta
      u === 'NC-17' ||       // US
      u === 'X' ||           // US (avant 1990), ancienne notation
      u === 'R18' ||         // UK (sexshops)
      u === 'R18+' ||        // Japon
      u === 'RX' ||          // Japon (explicite)
      u === 'X18+' ||        // Australie
      u === 'RC' ||          // Australie (Refused Classification)
      u === 'VM18' ||        // Italie (Vietato Minori 18)
      u === 'D' ||           // Suède (Vuxna/Adults)
      u === 'XXX' ||
      u === 'AO'             // Adults Only (ESRB-style)
    )
  }

  // Détecte 16+
  const is16 = (c: string): boolean => {
    const u = c.toUpperCase()
    return (
      u === '16' || u === '16+' ||
      u === 'R' ||           // US (Restricted, 17+)
      u === '15' ||          // UK
      u === 'VM16' ||        // Italie
      u === '14A' || u === '14' // Canada
    )
  }

  // Priorité aux certifications des pays clés (FR, DE, GB, US) sinon prend n'importe quel pays
  const keyCountries = ['FR', 'DE', 'GB', 'US', 'BE', 'CH', 'NL', 'ES', 'IT', 'AU', 'JP']
  for (const iso of keyCountries) {
    const c = certs[iso]
    if (!c) continue
    if (is18(c)) return { flagged18: true, flagged16: false, certs }
    if (is16(c)) return { flagged18: false, flagged16: true, certs }
  }

  // Si aucun pays clé → cherche dans TOUS les pays
  for (const c of Object.values(certs)) {
    if (is18(c)) return { flagged18: true, flagged16: false, certs }
  }
  for (const c of Object.values(certs)) {
    if (is16(c)) return { flagged18: false, flagged16: true, certs }
  }

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

export async function searchFilmTMDB(params: { titre?: string; realisateur?: string; annee?: string; genre?: string }): Promise<TMDBSuggestion[]> {
  const { titre = '', realisateur = '', annee = '', genre = '' } = params
  const key = process.env.TMDB_API_KEY
  if (!key) return []

  const titreQ = titre.trim()
  const realQ = realisateur.trim()
  const anneeN = annee ? parseInt(annee) : null

  if (titreQ.length < 2 && realQ.length < 2) return []

  try {
    const seenIds = new Set<number>()
    const allMovies: any[] = []

    // ── Recherche par titre (FR + EN) ──
    if (titreQ.length >= 2) {
      const [resFR, resEN] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(titreQ)}&language=fr-FR&page=1`, { cache: 'no-store' }),
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(titreQ)}&language=en-US&page=1`, { cache: 'no-store' }),
      ])
      const [dataFR, dataEN] = await Promise.all([resFR.json(), resEN.json()])
      const frResults: any[] = dataFR.results ?? []
      const enResults: any[] = dataEN.results ?? []
      const frIds = new Set(frResults.map((m: any) => m.id))
      ;[...frResults, ...enResults.filter((m: any) => !frIds.has(m.id))].forEach(m => {
        if (!seenIds.has(m.id)) { seenIds.add(m.id); allMovies.push(m) }
      })
    }

    // ── Recherche par réalisateur (en parallèle si titre présent aussi) ──
    if (realQ.length >= 2) {
      const personRes = await fetch(
        `https://api.themoviedb.org/3/search/person?api_key=${key}&query=${encodeURIComponent(realQ)}&language=fr-FR`,
        { cache: 'no-store' }
      )
      const personData = await personRes.json()
      const person = (personData.results ?? [])[0]
      if (person) {
        const creditsRes = await fetch(
          `https://api.themoviedb.org/3/person/${person.id}/movie_credits?api_key=${key}&language=fr-FR`,
          { cache: 'no-store' }
        )
        const creditsData = await creditsRes.json()
        const directed: any[] = (creditsData.crew ?? []).filter((m: any) => m.job === 'Director')

        // Si titre aussi présent, ne garder que les films dont le titre contient un mot du titre cherché
        const titleWords = titreQ.length >= 2
          ? titreQ.toLowerCase().split(/\s+/).filter(w => w.length > 1)
          : []

        const relevant = titleWords.length > 0
          ? directed.filter(m => {
              const t = (m.title ?? m.original_title ?? '').toLowerCase()
              return titleWords.some(w => t.includes(w))
            })
          : directed.sort((a: any, b: any) => (b.vote_count ?? 0) - (a.vote_count ?? 0))

        relevant.forEach((m: any) => {
          if (!seenIds.has(m.id)) { seenIds.add(m.id); allMovies.push(m) }
        })
      }
    }

    // ── Filtre par année (±2) ──
    let candidates = allMovies
    if (anneeN) {
      candidates = candidates.filter((m: any) => {
        const yr = parseInt((m.release_date ?? '').slice(0, 4))
        return !yr || Math.abs(yr - anneeN) <= 2
      })
    }

    candidates = candidates.slice(0, 12)
    if (!candidates.length) return []

    // ── Fetch details + credits pour chaque candidat ──
    const details = await Promise.all(
      candidates.map((m: any) =>
        fetch(`https://api.themoviedb.org/3/movie/${m.id}?api_key=${key}&language=fr-FR&append_to_response=credits`, { cache: 'no-store' })
          .then(r => r.json())
          .catch(() => null)
      )
    )

    let suggestions = details
      .filter(Boolean)
      .map((d: any) => {
        const director = d.credits?.crew?.find((c: any) => c.job === 'Director')
        const genres: string[] = (d.genres ?? []).map((g: any) => TMDB_GENRES[g.id] ?? g.name)
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

    // Filtre par genre si sélectionné
    if (genre) {
      suggestions = suggestions.filter(s => s.genre === genre || s.sousgenre === genre)
    }

    return suggestions
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

// Version qui accepte les strings directement (appelée depuis AuthPageClient)
export async function signInDirect(email: string, password: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) return { error: 'Email ou mot de passe incorrect.' }
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
const MARATHON_SOFT_LIMIT = 4   // 4 films max/jour avant demande admin
const MARATHON_HARD_LIMIT = 8   // 8 films max/jour après approbation admin

export async function getMarathonDailyStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { count: 0, blocked: false, pendingRequest: false, approvedToday: false }

  // Date du jour en heure de Paris (CEST = UTC+2 pendant le marathon)
  const todayParis = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })
  const dayStart = new Date(todayParis + 'T00:00:00+02:00').toISOString()
  const dayEnd   = new Date(todayParis + 'T23:59:59.999+02:00').toISOString()

  const [
    { count: watchedToday },
    { data: profile },
    { data: requests },
  ] = await Promise.all([
    (supabase as any)
      .from('watched')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('pre', false)
      .gte('watched_at', dayStart)
      .lte('watched_at', dayEnd),
    supabase.from('profiles').select('marathon_blocked_until').eq('id', user.id).single(),
    (supabase as any)
      .from('marathon_watch_requests')
      .select('status')
      .eq('user_id', user.id)
      .eq('day', todayParis),
  ])

  const blocked = profile?.marathon_blocked_until
    ? new Date(profile.marathon_blocked_until) > new Date()
    : false
  const pendingRequest = (requests ?? []).some((r: any) => r.status === 'pending')
  const approvedToday = (requests ?? []).some((r: any) => r.status === 'approved')

  return {
    count: watchedToday ?? 0,
    blocked,
    pendingRequest,
    approvedToday,
    limit: approvedToday ? MARATHON_HARD_LIMIT : MARATHON_SOFT_LIMIT,
  }
}

export async function submitMarathonWatchRequest(message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const todayParis = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' })

  // Check if request already exists
  const { data: existing } = await (supabase as any)
    .from('marathon_watch_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('day', todayParis)
    .single()
  if (existing) return { error: 'Tu as déjà soumis une demande aujourd\'hui.' }

  // Insert request
  await (supabase as any).from('marathon_watch_requests').insert({
    user_id: user.id,
    message: message.trim().slice(0, 500) || null,
    day: todayParis,
  })

  // Block user for 24h
  const blockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await supabase.from('profiles')
    .update({ marathon_blocked_until: blockedUntil } as any)
    .eq('id', user.id)

  revalidatePath('/films')
  return { success: true }
}

export async function adminGetMarathonRequests() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user?.id ?? '').single()
  if (!me?.is_admin) return []

  const { data } = await (supabase as any)
    .from('marathon_watch_requests')
    .select('id, user_id, message, day, status, created_at, profiles!user_id(pseudo, avatar_url)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function adminReviewMarathonRequest(requestId: string, action: 'approve' | 'reject') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user?.id ?? '').single()
  if (!me?.is_admin) return { error: 'Non autorisé' }

  const { data: req } = await (supabase as any)
    .from('marathon_watch_requests')
    .select('user_id')
    .eq('id', requestId)
    .single()
  if (!req) return { error: 'Requête introuvable' }

  await (supabase as any)
    .from('marathon_watch_requests')
    .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)

  if (action === 'approve') {
    // Débloquer l'utilisateur
    await supabase.from('profiles')
      .update({ marathon_blocked_until: null } as any)
      .eq('id', req.user_id)
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function markWatched(filmId: number, pre: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  // Bloquer les films de saison future
  const { data: filmCheck } = await supabase.from('films').select('saison').eq('id', filmId).single()
  if (filmCheck && filmCheck.saison > CONFIG.SAISON_NUMERO) {
    return { error: 'Ce film sera disponible lors de la saison suivante.' }
  }

  // Block marathon mark if marathon not live
  if (!pre && !isMarathonLive()) return { error: 'Le marathon n\'a pas encore commencé.' }

  // Vérification limite quotidienne marathon
  if (!pre) {
    const status = await getMarathonDailyStatus()
    if (status.blocked) return { error: 'BLOCKED', blockedUntil: status.blocked }
    // Ne bloquer que si on AJOUTE (pas si on enlève)
    const { data: existing } = await supabase.from('watched').select('pre').eq('user_id', user.id).eq('film_id', filmId).single()
    const isAdding = !existing
    if (isAdding && status.count >= status.limit!) {
      if (status.pendingRequest) return { error: 'PENDING_REQUEST' }
      return { error: 'LIMIT_REACHED', count: status.count }
    }
  }

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
    await deleteCacheKeys([`user:${user.id}:watched_count`, `user:${user.id}:profile`])
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
  await deleteCacheKeys([`user:${user.id}:watched_count`, `user:${user.id}:profile`])
  revalidatePath('/films')
  return { action: 'added', pre }
}

export async function toggleWatched(filmId: number, filmTitre: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  // Bloquer les films de saison future
  const { data: filmCheck } = await supabase.from('films').select('saison').eq('id', filmId).single()
  if (filmCheck && filmCheck.saison > CONFIG.SAISON_NUMERO) {
    return { error: 'Ce film sera disponible lors de la saison suivante.' }
  }

  const { data: existing } = await supabase
    .from('watched')
    .select('film_id, pre')
    .eq('user_id', user.id)
    .eq('film_id', filmId)
    .single()

  // Vérification limite quotidienne lors d'un ajout marathon
  if (!existing && isMarathonLive()) {
    const status = await getMarathonDailyStatus()
    if (status.blocked) return { error: 'BLOCKED' }
    if (status.count >= status.limit!) {
      if (status.pendingRequest) return { error: 'PENDING_REQUEST' }
      return { error: 'LIMIT_REACHED', count: status.count }
    }
  }

  if (existing) {
    // Remove
    await supabase.from('watched').delete().eq('user_id', user.id).eq('film_id', filmId)
    // Remove EXP if was marathon watch
    if (!existing.pre) {
      await supabase.rpc('decrement_exp', { user_id: user.id, amount: CONFIG.EXP_FILM })
    }
    await deleteCacheKeys([`user:${user.id}:watched_count`, `user:${user.id}:profile`])
    revalidatePath('/films')
    return { action: 'removed' }
  } else {
    const pre = !isMarathonLive()
    await supabase.from('watched').insert({ user_id: user.id, film_id: filmId, pre })
    if (!pre) {
      const [{ data: wf }, { data: duel }] = await Promise.all([
        supabase.from('week_films').select('film_id').eq('active', true).eq('film_id', filmId).single(),
        supabase.from('duels').select('winner_id').eq('winner_id', filmId).order('created_at', { ascending: false }).limit(1).single(),
      ])
      const exp = wf ? CONFIG.EXP_FDLS : (duel ? CONFIG.EXP_DUEL_WIN : CONFIG.EXP_FILM)
      await supabase.rpc('increment_exp', { user_id: user.id, amount: exp })
    }
    await deleteCacheKeys([`user:${user.id}:watched_count`, `user:${user.id}:profile`])
    revalidatePath('/films')
    return { action: 'added', pre }
  }
}

// Marquer le film de la semaine actif, ou la derniere archive pendant la fenetre autorisee.
export async function markWeekFilmWatched(weekFilmId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecte' }
  if (!isMarathonLive()) return { error: 'Le marathon n\'a pas encore commence.' }

  const { data: weekFilm, error: weekFilmError } = await supabase
    .from('week_films')
    .select('id, film_id, active, created_at')
    .eq('id', weekFilmId)
    .single()

  if (weekFilmError || !weekFilm) return { error: 'Film de la semaine introuvable.' }

  if (!weekFilm.active) {
    const { data: latestArchive } = await supabase
      .from('week_films')
      .select('id')
      .eq('active', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (latestArchive?.id !== weekFilm.id) {
      return { error: 'Seule la derniere archive du film de la semaine peut etre marquee comme vue.' }
    }
    if (!canMarkLatestWeekArchiveNow()) {
      return { error: 'La derniere archive peut etre marquee vue seulement le vendredi soir ou le samedi.' }
    }
  }

  const { data: filmCheck } = await supabase.from('films').select('saison').eq('id', weekFilm.film_id).single()
  if (filmCheck && filmCheck.saison > CONFIG.SAISON_NUMERO) {
    return { error: 'Ce film sera disponible lors de la saison suivante.' }
  }

  const { data: existing } = await supabase
    .from('watched')
    .select('film_id, pre')
    .eq('user_id', user.id)
    .eq('film_id', weekFilm.film_id)
    .single()

  if (existing) return { success: true, alreadyWatched: true, filmId: weekFilm.film_id }

  await supabase.from('watched').insert({ user_id: user.id, film_id: weekFilm.film_id, pre: false })
  await supabase.rpc('increment_exp', { user_id: user.id, amount: CONFIG.EXP_FDLS })
  await deleteCacheKeys([`user:${user.id}:watched_count`, `user:${user.id}:profile`])
  revalidatePath('/semaine')
  revalidatePath('/films')
  revalidatePath('/profil')
  revalidatePath('/classement')
  return { success: true, filmId: weekFilm.film_id }
}

// Marquer un film vainqueur de duel comme vu pendant la séance du duel
export async function markWatchedDuelWinner(filmId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  if (!isMarathonLive()) return { error: 'Le marathon n\'a pas encore commencé.' }

  const { data: filmCheck } = await supabase.from('films').select('saison').eq('id', filmId).single()
  if (filmCheck && filmCheck.saison > CONFIG.SAISON_NUMERO) {
    return { error: 'Ce film sera disponible lors de la saison suivante.' }
  }

  const { data: duel } = await supabase
    .from('duels').select('winner_id').eq('winner_id', filmId).eq('closed', true).limit(1).single()
  if (!duel) return { error: 'Ce film n\'est pas vainqueur d\'un duel.' }

  const { data: existing } = await supabase
    .from('watched').select('pre').eq('user_id', user.id).eq('film_id', filmId).single()

  // Déjà enregistré comme vu pendant le marathon — pas de double bonus
  if (existing && !existing.pre) return { error: 'ALREADY_MARATHON' }

  // Vérification limite quotidienne uniquement si nouveau (pas déjà en pre)
  if (!existing) {
    const status = await getMarathonDailyStatus()
    if (status.blocked) return { error: 'BLOCKED', blockedUntil: status.blocked }
    if (status.count >= status.limit!) {
      if (status.pendingRequest) return { error: 'PENDING_REQUEST' }
      return { error: 'LIMIT_REACHED', count: status.count }
    }
  }

  // Supprimer l'entrée pré-marathon si elle existe
  if (existing) {
    await supabase.from('watched').delete().eq('user_id', user.id).eq('film_id', filmId)
  }

  await supabase.from('watched').insert({ user_id: user.id, film_id: filmId, pre: false })
  await supabase.rpc('increment_exp', { user_id: user.id, amount: CONFIG.EXP_DUEL_WIN })
  await deleteCacheKeys([`user:${user.id}:watched_count`, `user:${user.id}:profile`])
  revalidatePath('/films')
  return { action: 'added' }
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

export async function upsertNegativeRating(filmId: number, score: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  if (!Number.isInteger(score) || score < 1 || score > 10) return { error: 'Score invalide (1-10)' }

  await (supabase as any).from('negative_ratings').upsert(
    { user_id: user.id, film_id: filmId, score },
    { onConflict: 'user_id,film_id' }
  )
  revalidatePath('/films')
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
    .select('film_choice')
    .eq('user_id', user.id)
    .eq('duel_id', duelId)
    .single()

  const adminClient = createAdminClient()
  if (existing) {
    if (existing.film_choice === filmChoice) return { success: true, changed: false }
    // Changer le vote : supprimer l'ancien et insérer le nouveau
    await adminClient.from('votes').delete().eq('user_id', user.id).eq('duel_id', duelId)
    await adminClient.from('votes').insert({ user_id: user.id, duel_id: duelId, film_choice: filmChoice })
  } else {
    await adminClient.from('votes').insert({ user_id: user.id, duel_id: duelId, film_choice: filmChoice })
    await supabase.rpc('increment_exp', { user_id: user.id, amount: CONFIG.EXP_VOTE })
  }

  revalidatePath('/duels')
  return { success: true, changed: !!existing, isNew: !existing }
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
    'CLIPPY_REPLIES',
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
    if (await isPosterUrlBroken(f.poster)) {
      broken.push({ id: f.id, titre: f.titre, poster: f.poster! })
    }
  }))

  const nextId = films.length === 40 ? films[films.length - 1].id : null
  return { success: true, broken, nextId, checked: films.length }
}

export async function adminRepairBrokenPosters(ids: number[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const key = process.env.TMDB_API_KEY
  if (!key) return { error: 'Clé TMDB_API_KEY manquante.' }

  if (!ids.length) return { success: true, count: 0 }

  const adminClient = createAdminClient()

  // 1. Remettre poster = null pour forcer la réparation
  await adminClient.from('films').update({ poster: null }).in('id', ids)

  // 2. Récupérer les métadonnées de ces films
  const { data: films } = await supabase
    .from('films')
    .select('id, titre, annee, tmdb_id')
    .in('id', ids)

  if (!films?.length) return { success: true, count: 0 }

  let count = 0
  for (const film of films) {
    try {
      const { posterUrl: poster, tmdbId } = await findBestPosterForFilm(film, key)
      if (poster) {
        await adminClient.from('films').update({
          poster,
          ...(tmdbId && !film.tmdb_id ? { tmdb_id: tmdbId } : {}),
        }).eq('id', film.id)
        count++
      }
    } catch { /* skip */ }
  }

  await invalidatePosterCaches()
  return { success: true, count, total: ids.length }
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
  const sousgenre = ((formData.get('sousgenre') as string) ?? '').trim().slice(0, 50) || null
  const tmdbIdRaw = formData.get('tmdb_id') as string | null
  const tmdbId = tmdbIdRaw ? parseInt(tmdbIdRaw) : null
  const isPending = formData.get('is_pending') === 'true'

  if (!titre || !annee || !realisateur || !genre) return { error: 'Champs requis manquants.' }
  if (annee < 1888 || annee > 2030) return { error: 'Année invalide.' }

  // Check duplicate par titre+année
  const { data: dup } = await supabase
    .from('films')
    .select('id, titre')
    .ilike('titre', titre)
    .eq('annee', annee)
    .single()
  if (dup) return { error: `⚠️ "${dup.titre}" (${annee}) est déjà dans la liste !` }

  let finalTmdbId: number | null = null
  let flagged18 = false
  let flagged16 = false
  let posterUrl: string | null = null
  let overviewText: string | null = null

  if (tmdbId && !isPending) {
    // User selected film from TMDB suggestions — fetch directly by ID (no search ambiguity)
    const key = process.env.TMDB_API_KEY
    if (key) {
      try {
        const [movieRes, relRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${key}&language=fr-FR`, { cache: 'no-store' }),
          fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates?api_key=${key}`, { cache: 'no-store' }),
        ])
        const [movie, relData] = await Promise.all([movieRes.json(), relRes.json()])

        if (movie.id) {
          finalTmdbId = movie.id

          // Check duplicate par tmdb_id
          const { data: dupTmdb } = await supabase
            .from('films')
            .select('id, titre')
            .eq('tmdb_id', movie.id as number)
            .single()
          if (dupTmdb) return { error: `⚠️ "${dupTmdb.titre}" est déjà dans la liste (même film TMDB) !` }

          const parsed = parseTMDBCertifications(relData.results ?? [], movie.adult === true)
          flagged18 = parsed.flagged18
          flagged16 = parsed.flagged16
          posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null
          overviewText = movie.overview ? (movie.overview as string) : null
        }
      } catch { /* ignore — add without TMDB metadata */ }
    }
  }

  const saison = isMarathonLive() ? CONFIG.SAISON_NUMERO + 1 : CONFIG.SAISON_NUMERO

  const { error } = await supabase.from('films').insert({
    titre, annee, realisateur, genre,
    sousgenre,
    poster: posterUrl,
    saison,
    added_by: user.id,
    tmdb_id: finalTmdbId,
    flagged_18plus: false,
    flagged_16plus: flagged16,
    flagged_18_pending: flagged18,
    pending_admin_approval: isPending,
    overview: overviewText,
  } as any)

  if (error) return { error: error.message }

  const { data: inserted } = await supabase.from('films').select('id').ilike('titre', titre).eq('annee', annee).single()
  const filmId = inserted?.id ?? null

  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true, saison, flagged18, flagged16, isPending, filmId }
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

  // Easter eggs forum\n  // rageux : insultes
  if (/\b(merde|nul|nulle|nules|nulles)\b/i.test(content)) {
    await supabase.from('discovered_eggs').upsert(
      { user_id: user.id, egg_id: 'rageux' },
      { onConflict: 'user_id,egg_id', ignoreDuplicates: true }
    )
  }
  // alien : débloque le tamagotchi facehugger
  if (/alien/i.test(content)) {
    await supabase.from('discovered_eggs').upsert(
      { user_id: user.id, egg_id: 'tamagotchi' },
      { onConflict: 'user_id,egg_id', ignoreDuplicates: true }
    )
  }

  revalidatePath('/films')
  revalidatePath('/duels')
  revalidatePath('/semaine')
  return { success: true, data }
}

export async function setActiveBadge(badgeId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  await supabase.from('profiles').update({ active_badge: badgeId } as any).eq('id', user.id)
  await deleteCacheKeys([`user:${user.id}:profile`])
  revalidatePath('/profil')
  revalidatePath('/classement')
  return { success: true }
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

  const adminDb = createAdminClient()

  const { data: newWeekFilm, error: insertError } = await adminDb
    .from('week_films')
    .insert({ film_id: filmId, active: true, session_time: sessionTime ?? `${CONFIG.FDLS_JOUR} à ${CONFIG.FDLS_HEURE}` })
    .select('id')
    .single()
  if (insertError) return { error: insertError.message }
  if (!newWeekFilm) return { error: 'Film de la semaine non cree.' }

  const { error: archiveError } = await adminDb
    .from('week_films')
    .update({ active: false })
    .eq('active', true)
    .neq('id', newWeekFilm.id)
  if (archiveError) return { error: archiveError.message }

  await invalidateWeekFilmCaches()
  return { success: true }
}

export async function adminClearWeekFilm() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connectÃ©' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisÃ©.' }

  const adminDb = createAdminClient()
  const { error } = await adminDb.from('week_films').update({ active: false }).eq('active', true)
  if (error) return { error: error.message }
  await invalidateWeekFilmCaches()
  return { success: true }
}

export async function adminDeleteWeekFilmArchive(weekFilmId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecte' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorise.' }

  const adminDb = createAdminClient()
  const { error } = await adminDb
    .from('week_films')
    .delete()
    .eq('id', weekFilmId)
    .eq('active', false)

  if (error) return { error: error.message }
  await invalidateWeekFilmCaches()
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
  await deleteCacheKeys([`user:${userId}:profile`])
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

  // Séparer les updates pour éviter l'échec silencieux si une colonne n'existe pas encore
  const { error } = await adminClient.from('films').update({ flagged_18plus: is18 }).eq('id', filmId)
  if (error) return { error: error.message }
  await adminClient.from('films').update({ flagged_18_pending: false } as any).eq('id', filmId)
  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true }
}

// Test TMDB certification pour un film spécifique (debug)
export async function adminTestFilmCertification(filmId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const key = process.env.TMDB_API_KEY
  if (!key) return { error: 'Clé TMDB_API_KEY manquante.' }

  const { data: film } = await supabase.from('films').select('id, titre, annee, tmdb_id').eq('id', filmId).single()
  if (!film) return { error: 'Film introuvable.' }

  let tmdbId = film.tmdb_id
  if (!tmdbId) {
    const found = await tmdbSearchMovie(film.titre, film.annee, key)
    tmdbId = found?.id ?? null
  }
  if (!tmdbId) return { error: `Aucun ID TMDB trouvé pour "${film.titre}"`, titre: film.titre }

  const [relRes, detailRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates?api_key=${key}`, { cache: 'no-store' }),
    fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${key}`, { cache: 'no-store' }),
  ])
  const [relData, detailData] = await Promise.all([relRes.json(), detailRes.json()])

  const isAdult = detailData.adult === true
  const { flagged18, flagged16, certs } = parseTMDBCertifications(relData.results ?? [], isAdult)

  // Retourner toutes les certifications brutes pour debug
  const rawCerts: Record<string, string[]> = {}
  for (const country of (relData.results ?? [])) {
    const dates = (country.release_dates ?? []) as any[]
    const certsForCountry = dates.filter((d: any) => d.certification && d.certification.trim() !== '').map((d: any) => `type${d.type}:${d.certification}`)
    if (certsForCountry.length) rawCerts[country.iso_3166_1] = certsForCountry
  }

  return { titre: film.titre, tmdbId, isAdult, flagged18, flagged16, certs, rawCerts }
}

// Catégorisation manuelle admin : normal / 18+ / 18+ étrange
export async function adminSetFilmCategory(filmId: number, category: 'normal' | '18plus' | 'strange') {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const base18 = category !== 'normal'

  // Update flagged_18plus (colonne de base, existe toujours)
  const { error: baseErr } = await adminClient.from('films')
    .update({ flagged_18plus: base18 })
    .eq('id', filmId)
  if (baseErr) return { error: baseErr.message }

  // Tenter flagged_18_pending séparément (colonne optionnelle — migration requise)
  await adminClient.from('films')
    .update({ flagged_18_pending: false } as any)
    .eq('id', filmId)

  // Tenter flagged_18strange séparément (colonne optionnelle — migration requise)
  await adminClient.from('films')
    .update({ flagged_18strange: category === 'strange' } as any)
    .eq('id', filmId)

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

  const allIds = [...toMark18, ...toUnflag]
  if (toMark18.length)  await adminClient.from('films').update({ flagged_18plus: true,  flagged_18_pending: false } as any).in('id', toMark18)
  if (toUnflag.length)  await adminClient.from('films').update({ flagged_18plus: false, flagged_18_pending: false } as any).in('id', toUnflag)

  revalidatePath('/films')
  revalidatePath('/admin')
  return { approved: toMark18.length, rejected: toUnflag.length }
}

// Approuve un film soumis sans correspondance TMDB automatique
export async function adminApproveFilmRequest(filmId: number) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const { error } = await adminClient.from('films').update({ pending_admin_approval: false } as any).eq('id', filmId)
  if (error) return { error: error.message }
  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true }
}

// Rejette (supprime) un film soumis sans correspondance TMDB automatique
export async function adminRejectFilmRequest(filmId: number) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const { error } = await adminClient.from('films').delete().eq('id', filmId)
  if (error) return { error: error.message }
  revalidatePath('/films')
  revalidatePath('/admin')
  return { success: true }
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

type PosterLookupResult = {
  posterUrl: string | null
  tmdbId?: number | null
}

const POSTER_CACHE_KEYS = ['films:list', 'film_stats', ...WEEK_FILM_CACHE_KEYS]

function hasUsablePosterValue(poster: string | null | undefined): poster is string {
  return typeof poster === 'string' && poster.trim().length > 0
}

async function invalidatePosterCaches() {
  revalidatePath('/films')
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/semaine')
  await deleteCacheKeys(POSTER_CACHE_KEYS)
}

async function isPosterUrlBroken(posterUrl: string | null | undefined): Promise<boolean> {
  if (!hasUsablePosterValue(posterUrl)) return true
  const url = (posterUrl as string).trim()
  try {
    let res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000), cache: 'no-store' })
    if (res.ok) return false

    // Some image hosts reject HEAD even when the image works.
    if ([403, 405, 501].includes(res.status)) {
      res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        signal: AbortSignal.timeout(6000),
        cache: 'no-store',
      })
      return !res.ok
    }

    return true
  } catch {
    return true
  }
}

function tmdbImageUrl(path: string | null | undefined) {
  return path ? `https://image.tmdb.org/t/p/w500${path}` : null
}

async function findBestPosterForFilm(
  film: { titre: string; annee: number; tmdb_id?: number | null },
  key: string
): Promise<PosterLookupResult> {
  let tmdbId = film.tmdb_id ?? null
  let movie: any = null

  if (tmdbId) {
    const detailRes = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${key}&language=fr-FR`,
      { cache: 'no-store' }
    )
    if (detailRes.ok) {
      movie = await detailRes.json()
      if (movie?.status_code) movie = null
    }
  }

  if (!movie) {
    movie = await tmdbSearchMovie(film.titre, film.annee, key)
    tmdbId = movie?.id ?? tmdbId
  }

  if (tmdbId) {
    try {
      const imgRes = await fetch(
        `https://api.themoviedb.org/3/movie/${tmdbId}/images?api_key=${key}&include_image_language=fr,null,en`,
        { cache: 'no-store' }
      )
      if (imgRes.ok) {
        const imgData = await imgRes.json()
        const posters: any[] = imgData.posters ?? []
        // TMDB poster images expose a language code, not a country. The fr-FR detail
        // request above plus iso_639_1=fr is the closest signal for France-first artwork.
        const sorted = [...posters].sort((a: any, b: any) => {
          const langScore = (p: any) => p.iso_639_1 === 'fr' ? 0 : p.iso_639_1 === null ? 1 : p.iso_639_1 === 'en' ? 2 : 3
          const voteScore = (b.vote_average ?? 0) - (a.vote_average ?? 0)
          return langScore(a) - langScore(b) || voteScore || ((b.vote_count ?? 0) - (a.vote_count ?? 0))
        })
        const bestPath = sorted[0]?.file_path
        if (bestPath) return { posterUrl: tmdbImageUrl(bestPath), tmdbId }
      }
    } catch { /* fallback below */ }
  }

  return {
    posterUrl: tmdbImageUrl(movie?.poster_path) ?? movie?._omdbPoster ?? null,
    tmdbId,
  }
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
    const { posterUrl, tmdbId } = await findBestPosterForFilm(film, key)

    if (!posterUrl) return { error: 'Aucune affiche trouvée sur TMDB/IMDB pour ce film.' }

    const adminClient = createAdminClient()
    await adminClient.from('films').update({
      poster: posterUrl,
      ...(tmdbId && !film.tmdb_id ? { tmdb_id: tmdbId } : {}),
    }).eq('id', filmId)

    await invalidatePosterCaches()
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

  await invalidatePosterCaches()
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
    .select('id, titre, annee, tmdb_id, poster')
    .eq('pending_admin_approval', false)
    .order('id')
    .limit(80)

  const missingPosterFilms = (films ?? [])
    .filter(film => !hasUsablePosterValue(film.poster))
    .slice(0, 30)

  if (!missingPosterFilms.length) return { success: true, count: 0 }

  const adminClient = createAdminClient()
  let count = 0

  for (const film of missingPosterFilms) {
    try {
      const { posterUrl: poster, tmdbId } = await findBestPosterForFilm(film, key)
      if (poster) {
        await adminClient.from('films').update({
          poster,
          ...(tmdbId && !film.tmdb_id ? { tmdb_id: tmdbId } : {}),
        }).eq('id', film.id)
        count++
      }
    } catch { /* skip */ }
  }

  await invalidatePosterCaches()
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
  await invalidatePosterCaches()
  return { success: true, count, nextId }
}

// Scan par lot les restrictions d'âge de tous les films via TMDB
export async function adminDiagnostic() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const adminClient = createAdminClient()

  // Test 1: count avec adminClient
  const { data: d1, error: e1 } = await adminClient.from('films').select('id', { count: 'exact', head: true })
  // Test 2: select id simple avec adminClient
  const { data: d2, error: e2 } = await adminClient.from('films').select('id').limit(3)
  // Test 3: select avec supabase normal
  const { data: d3, error: e3 } = await supabase.from('films').select('id').limit(3)
  // Test 4: clé TMDB
  const tmdbKey = process.env.TMDB_API_KEY

  return {
    adminCount: { data: d1, error: e1?.message ?? null },
    adminSelect: { data: d2, error: e2?.message ?? null },
    userSelect: { data: d3, error: e3?.message ?? null },
    tmdbKey: tmdbKey ? `présente (${tmdbKey.slice(0, 8)}...)` : 'MANQUANTE',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'présente' : 'MANQUANTE',
  }
}

export async function adminScanAgeRestrictions(fromId: number = 0) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  const adminClient = createAdminClient()

  // 1. Vérifier DB d'abord (adminClient bypasse RLS)
  const { data: films, error: filmsErr } = await adminClient
    .from('films')
    .select('id, titre, annee, tmdb_id, flagged_18plus')
    .gt('id', fromId)
    .order('id')
    .limit(40)

  if (filmsErr) return { error: `Erreur DB : ${filmsErr.message}` }
  if (!films?.length) return { success: true, count: 0, pendingCount: 0, nextId: null, details: [] }

  // 2. Vérifier clé TMDB (après la DB pour diagnostic clair)
  const key = process.env.TMDB_API_KEY
  if (!key) return { error: `Clé TMDB_API_KEY manquante sur Vercel. ${films.length} films trouvés en DB.` }

  // 3. Vérifier validité de la clé TMDB
  const testRes = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${key}`, { cache: 'no-store' })
  const testData = await testRes.json()
  if (testData.status_code) {
    return { error: `Clé TMDB invalide ou expirée : ${testData.status_message ?? testData.status_code}` }
  }

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
        details.push({ id: film.id, titre: film.titre, tmdbId: null, flagged18: false, flagged16: false, certs: {}, status: 'no_tmdb' })
        count++
        continue
      }

      // Fetch release_dates ET détails du film en parallèle
      const [relRes, detailRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates?api_key=${key}`, { cache: 'no-store' }),
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${key}`, { cache: 'no-store' }),
      ])

      // Si TMDB retourne une erreur HTTP (401 rate limit, 404, etc.) → skip sans modifier la DB
      if (!relRes.ok || !detailRes.ok) {
        details.push({ id: film.id, titre: film.titre, tmdbId, flagged18: false, flagged16: false, certs: {}, status: `http_error: ${relRes.status}/${detailRes.status}` })
        count++
        continue
      }

      const [relData, detailData] = await Promise.all([relRes.json(), detailRes.json()])

      // Si TMDB retourne un status_code → erreur applicative (ex: film introuvable)
      if (relData.status_code) {
        details.push({ id: film.id, titre: film.titre, tmdbId, flagged18: false, flagged16: false, certs: {}, status: `tmdb_err: ${relData.status_message ?? relData.status_code}` })
        count++
        continue
      }

      const isAdult = detailData.adult === true
      const { flagged18, flagged16, certs } = parseTMDBCertifications(relData.results ?? [], isAdult)

      if (flagged18) {
        if (!film.flagged_18plus) {
          // Nouveau 18+ détecté → flagged_18_pending = true pour que l'admin valide
          const { error: updErr } = await adminClient.from('films')
            .update({ flagged_18plus: true, flagged_18_pending: true } as any)
            .eq('id', film.id)
          const status = updErr ? `db_error: ${updErr.message}` : 'newly_set'
          details.push({ id: film.id, titre: film.titre, tmdbId, flagged18: true, flagged16: false, certs, status })
          if (!updErr) pendingCount++
        } else {
          // Déjà 18+ en DB → ne pas retoucher
          details.push({ id: film.id, titre: film.titre, tmdbId, flagged18: true, flagged16: false, certs, status: 'already_18plus' })
        }
      } else {
        // TMDB dit pas 18+ → ne JAMAIS effacer un flag mis par l'admin
        if (film.flagged_18plus) {
          details.push({ id: film.id, titre: film.titre, tmdbId, flagged18: false, flagged16, certs, status: 'admin_override' })
        } else {
          await adminClient.from('films').update({ flagged_16plus: flagged16 }).eq('id', film.id)
          details.push({ id: film.id, titre: film.titre, tmdbId, flagged18: false, flagged16, certs, status: flagged16 ? 'cleared_16plus' : 'cleared' })
        }
      }
      count++
    } catch (err) {
      // Erreur réseau ou parsing → skip sans modifier la DB (on ne veut pas effacer un flag existant)
      details.push({ id: film.id, titre: film.titre, tmdbId: film.tmdb_id, flagged18: false, flagged16: false, certs: {}, status: `error: ${String(err).slice(0, 100)}` })
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

  // Scan all films in batches, but only replace missing or broken poster URLs.
  const adminClient = createAdminClient()
  const { data: films, error: filmsErr } = await adminClient
    .from('films')
    .select('id, titre, annee, tmdb_id, poster')
    .eq('pending_admin_approval', false)
    .gt('id', fromId)
    .order('id')
    .limit(30)

  if (filmsErr) return { error: `Erreur DB : ${filmsErr.message}` }
  if (!films?.length) return { success: true, count: 0, checked: 0, broken: 0, missing: 0, nextId: null }

  let count = 0
  let broken = 0
  let missing = 0

  for (const film of films) {
    try {
      const hasPoster = hasUsablePosterValue(film.poster)
      const needsPoster = !hasPoster || await isPosterUrlBroken(film.poster)
      if (!needsPoster) continue
      if (hasPoster) broken++
      else missing++

      const { posterUrl: poster, tmdbId } = await findBestPosterForFilm(film, key)
      if (poster) {
        await adminClient.from('films').update({
          poster,
          ...(tmdbId && !film.tmdb_id ? { tmdb_id: tmdbId } : {}),
        }).eq('id', film.id)
        count++
      }
    } catch { /* skip */ }
  }

  const nextId = films.length === 30 ? films[films.length - 1].id : null

  await invalidatePosterCaches()
  return { success: true, count, checked: films.length, broken, missing, nextId }
}

// ── WATCH PROVIDERS (public — appelé depuis FilmsClient) ──────

export async function getFilmWatchProviders(tmdbId: number | null): Promise<{
  link?: string
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
  await deleteCacheKeys([`user:${user.id}:eggs`])
}

export async function unlockAgentOfChaos() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  // 1. Enregistre la découverte (débloque le badge dans le profil)
  await supabase.from('discovered_eggs').upsert(
    { user_id: user.id, egg_id: 'agent-of-chaos' },
    { onConflict: 'user_id,egg_id', ignoreDuplicates: true }
  )
  // 2. Auto-équipe le badge uniquement si l'utilisateur n'a pas déjà un badge spécial actif
  const { data: profile } = await supabase.from('profiles').select('active_badge').eq('id', user.id).single()
  const currentBadge = (profile as any)?.active_badge
  const specialIds = ['rageux', 'agent-of-chaos', 'tama_explorateur', 'tama_chasseur', 'tama_legende', 'tama_maitre']
  const hasSpecialEquipped = currentBadge && specialIds.includes(currentBadge) && currentBadge !== 'agent-of-chaos'
  if (!hasSpecialEquipped) {
    await supabase.from('profiles').update({ active_badge: 'agent-of-chaos' } as any).eq('id', user.id)
  }
  await deleteCacheKeys([`user:${user.id}:eggs`, `user:${user.id}:profile`])
  revalidatePath('/profil')
  revalidatePath('/classement')
  revalidatePath('/marathoniens')
  return { success: true }
}

export async function getClippyDefeats(): Promise<number> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { data } = await supabase.from('profiles').select('clippy_defeats').eq('id', user.id).single()
  return (data as any)?.clippy_defeats ?? 0
}

export async function setClippyDefeatsDB(defeats: number): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles')
    .update({ clippy_defeats: defeats } as any)
    .eq('id', user.id)
    .lt('clippy_defeats', defeats)  // n'écrase jamais une progression supérieure
}

export async function unlockClippyMaster() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  await supabase.from('discovered_eggs').upsert(
    { user_id: user.id, egg_id: 'legende-vivante' },
    { onConflict: 'user_id,egg_id', ignoreDuplicates: true }
  )
  const { data: profile } = await supabase.from('profiles').select('active_badge').eq('id', user.id).single()
  const currentBadge = (profile as any)?.active_badge
  const priorityIds = ['legende-vivante']
  const hasHigherPriority = currentBadge && !priorityIds.includes(currentBadge) && ['rageux','agent-of-chaos','tama_explorateur','tama_chasseur','tama_legende','tama_maitre'].includes(currentBadge) && false
  if (!hasHigherPriority) {
    await supabase.from('profiles').update({ active_badge: 'legende-vivante' } as any).eq('id', user.id)
  }
  await deleteCacheKeys([`user:${user.id}:eggs`, `user:${user.id}:profile`])
  revalidatePath('/profil')
  revalidatePath('/classement')
  revalidatePath('/marathoniens')
  return { success: true }
}

export async function unlockFeverNight() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  await supabase.from('discovered_eggs').upsert(
    { user_id: user.id, egg_id: 'rythme-dans-la-peau' },
    { onConflict: 'user_id,egg_id', ignoreDuplicates: true }
  )
  await supabase.from('profiles').update({ active_badge: 'fever-night' } as any).eq('id', user.id)
  await deleteCacheKeys([`user:${user.id}:eggs`, `user:${user.id}:profile`])
  revalidatePath('/profil')
  revalidatePath('/classement')
  revalidatePath('/marathoniens')
  return { success: true }
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
  const { data: topic } = await (supabase as any).from('forum_topics').select('created_by, is_social').eq('id', topicId).single()
  if (!topic) return { error: 'Topic introuvable' }
  if (topic.is_social) return { error: 'Le Salon ne peut pas être supprimé' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (topic.created_by !== user.id && !profile?.is_admin) return { error: 'Permission refusée' }
  await (supabase as any).from('forum_topics').delete().eq('id', topicId)
  revalidatePath('/forum')
  return { error: null }
}

export async function updateForumTopic(topicId: string, title: string, description: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: topic } = await (supabase as any).from('forum_topics').select('created_by').eq('id', topicId).single()
  if (!topic) return { error: 'Topic introuvable' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (topic.created_by !== user.id && !profile?.is_admin) return { error: 'Permission refusée' }
  const sanitized = title.slice(0, 100).trim()
  if (!sanitized) return { error: 'Titre requis' }
  await (supabase as any).from('forum_topics').update({ title: sanitized, description: description.slice(0, 300) }).eq('id', topicId)
  revalidatePath(`/forum/${topicId}`)
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

// ── ADMIN : remplir les overviews depuis TMDB ─────────────────
export async function adminFetchOverviews(): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, count: 0, error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { success: false, count: 0, error: 'Non autorisé' }

  const key = process.env.TMDB_API_KEY
  if (!key) return { success: false, count: 0, error: 'Clé TMDB manquante' }

  const adminClient = createAdminClient()

  // Films avec tmdb_id mais sans overview
  const { data: films } = await adminClient
    .from('films')
    .select('id, titre, tmdb_id')
    .not('tmdb_id', 'is', null)
    .is('overview', null)
    .limit(100)

  if (!films?.length) return { success: true, count: 0 }

  let count = 0
  for (const film of films) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${film.tmdb_id}?api_key=${key}&language=fr-FR`,
        { cache: 'no-store' }
      )
      const movie = await res.json()
      if (movie.overview) {
        await adminClient
          .from('films')
          .update({ overview: movie.overview as string } as any)
          .eq('id', film.id)
        count++
      }
    } catch { /* skip */ }
  }

  revalidatePath('/films')
  return { success: true, count }
}

// ── TAMAGOTCHI ALIEN ──────────────────────────────────────────

// ── Streak helper ─────────────────────────────────────────────────────────────
function computeStreak(pet: any, todayStr: string) {
  const lastDate = pet.last_care_date ?? ''
  if (lastDate === todayStr) return { care_streak: pet.care_streak ?? 1, last_care_date: todayStr }
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (lastDate === yesterday) return { care_streak: (pet.care_streak ?? 0) + 1, last_care_date: todayStr }
  return { care_streak: 1, last_care_date: todayStr }
}

const X2_PENDING = '1970-01-01T00:00:00.000Z'

function applyTamaDecay(pet: any): { pet: any; evolved: boolean; evolvedTo: string | null } {
  const now = Date.now()
  const lastSync = new Date(pet.last_sync).getTime()
  const hoursElapsed = Math.min((now - lastSync) / 3_600_000, 120)

  if (hoursElapsed < 0.05) return { pet, evolved: false, evolvedTo: null }

  let { hunger, happiness, health, age_hours, stage } = pet
  let energy      = Math.max(0, Math.min(100, pet.energy      ?? 100))
  let isSleeping  = pet.is_sleeping ?? false
  let isSick      = pet.is_sick     ?? false
  let lastNeglectPenaltyAt: string | null = pet.last_neglect_penalty_at ?? null
  let x2ExpUntil: string | null = pet.x2_exp_until ?? null

  age_hours = Math.round(age_hours + hoursElapsed)

  if (isSleeping) {
    energy = Math.min(100, Math.round(energy + hoursElapsed * 20))
    hunger = Math.min(100, Math.round(hunger + hoursElapsed * 0.8))
    if (energy >= 100) isSleeping = false
  } else {
    energy    = Math.max(0,   Math.round(energy    - hoursElapsed * 7))
    hunger    = Math.min(100, Math.round(hunger    + hoursElapsed * 2))
    happiness = Math.max(0,   Math.round(happiness - hoursElapsed * 1))

    // -2 humeur par 3h supplémentaires si pas caressé/joué
    const lastInteracted = pet.last_interacted_at ? new Date(pet.last_interacted_at).getTime() : 0
    if (lastInteracted > 0) {
      happiness = Math.max(0, Math.round(happiness - (2 / 3) * hoursElapsed))
    }

    if (hunger > 70)    health = Math.max(0, Math.round(health - hoursElapsed * 3))
    if (happiness < 30) health = Math.max(0, Math.round(health - hoursElapsed * 2))
    if (isSick)         health = Math.max(0, Math.round(health - hoursElapsed * 4))

    const poopCount = pet.poop_count ?? 0
    if (poopCount > 0) {
      happiness = Math.max(0, Math.round(happiness - hoursElapsed * poopCount * 2))
      if (poopCount >= 3) health = Math.max(0, Math.round(health - hoursElapsed * poopCount))
    }

    if (energy <= 0) isSleeping = true

    if (!isSick && hunger > 80) {
      if (Math.random() < hoursElapsed * 0.05) isSick = true
    }

    // -40 humeur si pas joué en 24h (max 1x par 24h)
    const lastPlayed = pet.last_played ? new Date(pet.last_played).getTime() : 0
    const lastNeglect = lastNeglectPenaltyAt ? new Date(lastNeglectPenaltyAt).getTime() : 0
    const H24 = 24 * 3_600_000
    if ((now - lastPlayed) >= H24 && (now - lastNeglect) >= H24) {
      happiness = Math.max(0, happiness - 40)
      lastNeglectPenaltyAt = new Date().toISOString()
      const x2Expired = x2ExpUntil && x2ExpUntil !== X2_PENDING && new Date(x2ExpUntil).getTime() <= now
      if (!x2ExpUntil || x2Expired) x2ExpUntil = X2_PENDING
    }
  }

  const prevStage = stage
  if (stage === 'egg'          && age_hours >= 12  )                       stage = 'facehugger'
  if (stage === 'facehugger'   && age_hours >= 72  && health > 30)         stage = 'chestburster'
  if (stage === 'chestburster' && age_hours >= 168 && health > 30)         stage = 'xenomorph'
  if (health <= 0 && stage !== 'dead') { health = 0; stage = 'dead' }

  const evolved = stage !== prevStage && stage !== 'dead'
  return {
    pet: { ...pet, hunger, happiness, health, age_hours, stage, energy, is_sleeping: isSleeping, is_sick: isSick, last_sync: new Date().toISOString(), last_neglect_penalty_at: lastNeglectPenaltyAt, x2_exp_until: x2ExpUntil },
    evolved,
    evolvedTo: evolved ? stage : null,
  }
}

export async function initOrGetTamagotchi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté', isNew: false, evolved: false, evolvedTo: null }

  const { data: existing } = await (supabase as any)
    .from('tamagotchi').select('*').eq('user_id', user.id).single()

  if (!existing) {
    const { data: newPet, error } = await (supabase as any)
      .from('tamagotchi').insert({ user_id: user.id }).select().single()
    return { data: newPet, error: error ? 'Erreur création' : null, isNew: true, evolved: false, evolvedTo: null }
  }

  const { pet: updated, evolved, evolvedTo } = applyTamaDecay(existing)

  // Auto-cycle : si le xénomorphe est atteint ET que le joueur a déjà chassé, repasser en œuf directement
  let cycleRestarted = false
  if (updated.stage === 'xenomorph' && (existing.hunt_count ?? 0) > 0) {
    const cycleNow = new Date().toISOString()
    Object.assign(updated, {
      stage: 'egg', age_hours: 0, hunger: 0, happiness: 80, health: 100, energy: 100,
      is_sleeping: false, is_sick: false, poop_count: 0,
      last_fed: null, last_healed: null, last_sync: cycleNow,
    })
    cycleRestarted = true
  }

  const neglectPenalty = updated.last_neglect_penalty_at !== existing.last_neglect_penalty_at

  if (updated.last_sync !== existing.last_sync) {
    const dbPayload: Record<string, any> = {
      hunger: updated.hunger, happiness: updated.happiness, health: updated.health,
      age_hours: updated.age_hours, stage: updated.stage, last_sync: updated.last_sync,
      energy: updated.energy, is_sleeping: updated.is_sleeping, is_sick: updated.is_sick,
      last_neglect_penalty_at: updated.last_neglect_penalty_at,
      x2_exp_until: updated.x2_exp_until,
    }
    if (cycleRestarted) Object.assign(dbPayload, { poop_count: 0, last_fed: null, last_healed: null })
    await (supabase as any).from('tamagotchi').update(dbPayload).eq('user_id', user.id)
  }

  return { data: updated, error: null, isNew: false, evolved: cycleRestarted ? false : evolved, evolvedTo: cycleRestarted ? null : evolvedTo, cycleRestarted, neglectPenalty }
}

// Niveau 9+ : XP × 1.5 sur toutes les actions tamagotchi
function tamaXpGain(pet: any, base: number): number {
  const lvl = 1 + Math.floor((pet?.xp ?? 0) / 30)
  return lvl >= 9 ? Math.round(base * 1.5) : base
}

export async function feedTamagotchi(score: number = 5, perfect: boolean = false) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté' }

  const { data: pet } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!pet) return { data: null, error: 'Pas de tamagotchi' }
  if (pet.stage === 'dead') return { data: null, error: 'Ton alien est mort...' }

  if (pet.last_fed) {
    const diff = Date.now() - new Date(pet.last_fed).getTime()
    if (diff < 2 * 60 * 60 * 1000) {
      const m = Math.ceil((2 * 60 * 60 * 1000 - diff) / 60000)
      return { data: null, error: `Encore ${m}min avant de nourrir` }
    }
  }

  const { pet: synced } = applyTamaDecay(pet)
  if (synced.stage === 'dead') return { data: null, error: 'Ton alien est mort...' }
  if (synced.is_sleeping) return { data: null, error: "Ton alien dort… réveille-le d'abord ! 💤" }
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const hungerReduction = Math.max(20, score * 2)
  const xpGain = tamaXpGain(pet, 15 + (perfect ? 10 : 0))

  // Colonnes toujours présentes
  const updates: Record<string, any> = {
    hunger: Math.max(0, synced.hunger - hungerReduction),
    happiness: synced.happiness,
    health: synced.health,
    age_hours: synced.age_hours,
    stage: synced.stage,
    energy: synced.energy,
    is_sleeping: synced.is_sleeping,
    is_sick: synced.is_sick,
    last_fed: now,
    last_sync: now,
    poop_count: Math.min(5, (pet.poop_count ?? 0) + (Math.random() < 0.6 ? 1 : 0)),
    xp: Math.min(9999, (pet.xp ?? 0) + xpGain),
  }
  // Colonnes optionnelles — incluses seulement si elles existent dans la DB
  if ('care_streak' in pet)              Object.assign(updates, computeStreak(pet, today))
  if ('last_neglect_penalty_at' in pet)  updates.last_neglect_penalty_at = synced.last_neglect_penalty_at ?? null
  if ('x2_exp_until' in pet)             updates.x2_exp_until = synced.x2_exp_until ?? null

  // Séparer update et select pour éviter les erreurs RLS sur le retour
  const { error: dbError } = await (supabase as any)
    .from('tamagotchi').update(updates).eq('user_id', user.id)
  if (dbError) return { data: null, error: `Erreur sauvegarde repas (${dbError.code ?? dbError.message})` }
  const { data } = await (supabase as any)
    .from('tamagotchi').select('*').eq('user_id', user.id).single()
  return { data, error: null }
}

export async function playWithTamagotchi(score: number = 5) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté' }

  const { data: pet } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!pet) return { data: null, error: 'Pas de tamagotchi' }
  if (pet.stage === 'dead') return { data: null, error: 'Ton alien est mort...' }

  const { pet: synced } = applyTamaDecay(pet)
  if (synced.is_sleeping) return { data: null, error: "Ton alien dort… réveille-le d'abord ! 💤" }
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const happinessGain = Math.max(10, Math.min(40, Math.round(score * 4)))

  // x2 EXP : activé si bonus en attente (X2_PENDING) ou timer encore actif
  let x2Multiplier = 1
  let x2ExpUpdate: string | null = synced.x2_exp_until ?? null
  if (synced.x2_exp_until === X2_PENDING) {
    x2ExpUpdate = new Date(Date.now() + 3_600_000).toISOString()
    x2Multiplier = 2
  } else if (synced.x2_exp_until && new Date(synced.x2_exp_until) > new Date()) {
    x2Multiplier = 2
  } else if (synced.x2_exp_until && synced.x2_exp_until !== X2_PENDING && new Date(synced.x2_exp_until) <= new Date()) {
    x2ExpUpdate = null
  }

  const xpGain = tamaXpGain(pet, Math.max(10, Math.min(25, Math.round(score * 2)))) * x2Multiplier
  const updates: Record<string, any> = {
    happiness: Math.min(100, synced.happiness + happinessGain),
    hunger: synced.hunger, health: synced.health,
    age_hours: synced.age_hours, stage: synced.stage,
    energy: synced.energy, is_sleeping: synced.is_sleeping, is_sick: synced.is_sick,
    last_played: now, last_sync: now,
    xp: Math.min(9999, (pet.xp ?? 0) + xpGain),
  }
  if ('last_interacted_at' in pet)       updates.last_interacted_at = now
  if ('x2_exp_until' in pet)             updates.x2_exp_until = x2ExpUpdate
  if ('last_neglect_penalty_at' in pet)  updates.last_neglect_penalty_at = synced.last_neglect_penalty_at ?? null
  if ('care_streak' in pet)              Object.assign(updates, computeStreak(pet, today))
  await (supabase as any).from('tamagotchi').update(updates).eq('user_id', user.id)
  const { data } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  return { data, error: null }
}

export async function healTamagotchi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté' }

  const { data: pet } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!pet) return { data: null, error: 'Pas de tamagotchi' }
  if (pet.stage === 'dead') return { data: null, error: 'Ton alien est mort...' }

  if (pet.last_healed) {
    const diff = Date.now() - new Date(pet.last_healed).getTime()
    if (diff < 24 * 60 * 60 * 1000) {
      const min = Math.ceil((24 * 60 * 60 * 1000 - diff) / 60000)
      return { data: null, error: `Encore ${min} min avant de soigner` }
    }
  }

  const { pet: synced } = applyTamaDecay(pet)
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const updates = {
    health: Math.min(100, synced.health + 30),
    hunger: synced.hunger, happiness: synced.happiness,
    age_hours: synced.age_hours, stage: synced.stage,
    energy: synced.energy, is_sleeping: synced.is_sleeping, is_sick: synced.is_sick,
    last_healed: now, last_sync: now,
    last_neglect_penalty_at: synced.last_neglect_penalty_at,
    x2_exp_until: synced.x2_exp_until,
    xp: Math.min(9999, (pet.xp ?? 0) + tamaXpGain(pet, 10)),
    ...computeStreak(pet, today),
  }
  const { data } = await (supabase as any).from('tamagotchi').update(updates).eq('user_id', user.id).select().single()
  return { data, error: null }
}

export async function reviveTamagotchi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté' }

  const { data: petRaw } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!petRaw) return { data: null, error: 'Pas de tamagotchi' }

  // Appliquer le decay pour avoir l'état réel (sync DB peut avoir échoué silencieusement)
  const { pet: petDecayed } = applyTamaDecay(petRaw)
  // Considéré mort si stage='dead' OU health<=0 (évite le bug d'early-return du decay)
  const effectivelyDead = petDecayed.stage === 'dead' || petDecayed.health <= 0
  if (!effectivelyDead) return { data: null, error: 'Ton alien est encore en vie !' }

  const now = new Date().toISOString()
  // Colonnes toujours présentes dans le schéma de base
  const revivePayload: Record<string, any> = {
    stage: 'egg', hunger: 20, happiness: 80, health: 100, energy: 100,
    age_hours: 0, last_fed: null, last_healed: null,
    is_sleeping: false, is_sick: false, poop_count: 0,
    xp: 0, last_sync: now,
  }
  // Colonnes optionnelles — inclure seulement si elles existent dans la DB (pattern identique aux autres actions)
  if ('last_played'            in petRaw) revivePayload.last_played            = null
  if ('caresses_today'         in petRaw) revivePayload.caresses_today         = 0
  if ('last_caresse_date'      in petRaw) revivePayload.last_caresse_date      = null
  if ('care_streak'            in petRaw) revivePayload.care_streak            = 0
  if ('last_care_date'         in petRaw) revivePayload.last_care_date         = null
  if ('last_interacted_at'     in petRaw) revivePayload.last_interacted_at     = null
  if ('last_neglect_penalty_at' in petRaw) revivePayload.last_neglect_penalty_at = null
  if ('x2_exp_until'           in petRaw) revivePayload.x2_exp_until           = null
  if ('deaths'                 in petRaw) revivePayload.deaths                 = (petRaw.deaths ?? 0) + 1

  const { error: dbError } = await (supabase as any).from('tamagotchi').update(revivePayload).eq('user_id', user.id)
  if (dbError) return { data: null, error: `Erreur réincarnation (${dbError.code ?? dbError.message})` }
  const { data } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  return { data, error: null }
}

export async function nameTamagotchi(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const safe = name.trim().slice(0, 20)
  if (!safe) return { error: 'Nom invalide' }
  await (supabase as any).from('tamagotchi').update({ name: safe }).eq('user_id', user.id)
  return { error: null }
}

// ── ADMIN TAMAGOTCHI COMMANDS ─────────────────────────────────────────────────

async function getOrCreateAdminPet() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' as string, supabase, user: null as null, pet: null as null }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Accès refusé' as string, supabase, user: null as null, pet: null as null }

  let { data: pet } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!pet) {
    // Crée automatiquement le tamagotchi pour l'admin si absent
    const { data: newPet } = await (supabase as any).from('tamagotchi').insert({ user_id: user.id }).select().single()
    pet = newPet
  }
  if (!pet) return { error: 'Impossible de créer le tamagotchi' as string, supabase, user: null as null, pet: null as null }

  return { error: null as null, supabase, user, pet }
}

export async function adminEvolveAlien() {
  const { error, supabase, user, pet } = await getOrCreateAdminPet()
  if (error || !user || !pet) return { data: null, error }

  const NEXT: Record<string, string> = {
    egg: 'facehugger', facehugger: 'chestburster',
    chestburster: 'xenomorph', xenomorph: 'egg', dead: 'egg',
  }
  const AGE_FOR: Record<string, number> = {
    facehugger: 13, chestburster: 73, xenomorph: 169, egg: 0,
  }
  const nextStage = NEXT[pet.stage] ?? 'facehugger'
  const now = new Date().toISOString()
  const { data, error: dbErr } = await (supabase as any).from('tamagotchi').update({
    stage: nextStage, age_hours: AGE_FOR[nextStage] ?? 0,
    hunger: 20, happiness: 80, health: 100, last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: dbErr ? 'Erreur DB' : null }
}

export async function adminAgeAlien() {
  const { error, supabase, user, pet } = await getOrCreateAdminPet()
  if (error || !user || !pet) return { data: null, error }

  const now = new Date().toISOString()
  const { data, error: dbErr } = await (supabase as any).from('tamagotchi').update({
    age_hours: (pet.age_hours ?? 0) + 25,
    hunger: Math.min(100, (pet.hunger ?? 0) + 30),
    happiness: Math.max(0, (pet.happiness ?? 80) - 20),
    last_fed: null, last_played: null, last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: dbErr ? 'Erreur DB' : null }
}

export async function adminKillAlien() {
  const { error, supabase, user, pet } = await getOrCreateAdminPet()
  if (error || !user || !pet) return { data: null, error }

  const now = new Date().toISOString()
  const { data, error: dbErr } = await (supabase as any).from('tamagotchi').update({
    stage: 'dead', health: 0, last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: dbErr ? 'Erreur DB' : null }
}

export async function adminAddPoop() {
  const { error, supabase, user, pet } = await getOrCreateAdminPet()
  if (error || !user || !pet) return { data: null, error }
  const now = new Date().toISOString()
  const { data, error: dbErr } = await (supabase as any).from('tamagotchi').update({
    poop_count: Math.min(5, (pet.poop_count ?? 0) + 1), last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: dbErr ? 'Erreur DB' : null }
}

export async function adminResetCaresses() {
  const { error, supabase, user, pet } = await getOrCreateAdminPet()
  if (error || !user || !pet) return { data: null, error }
  const now = new Date().toISOString()
  const { data, error: dbErr } = await (supabase as any).from('tamagotchi').update({
    caresses_today: 0, last_caresse_date: null, last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: dbErr ? 'Erreur DB' : null }
}

export async function adminToggleSick() {
  const { error, supabase, user, pet } = await getOrCreateAdminPet()
  if (error || !user || !pet) return { data: null, error }
  const now = new Date().toISOString()
  const { data, error: dbErr } = await (supabase as any).from('tamagotchi').update({
    is_sick: !pet.is_sick, last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: dbErr ? 'Erreur DB' : null }
}

export async function adminToggleSleep() {
  const { error, supabase, user, pet } = await getOrCreateAdminPet()
  if (error || !user || !pet) return { data: null, error }
  const now = new Date().toISOString()
  const { data, error: dbErr } = await (supabase as any).from('tamagotchi').update({
    is_sleeping: !pet.is_sleeping, energy: pet.is_sleeping ? 100 : 0, last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: dbErr ? 'Erreur DB' : null }
}

export async function adminDrainEnergy() {
  const { error, supabase, user, pet } = await getOrCreateAdminPet()
  if (error || !user || !pet) return { data: null, error }
  const now = new Date().toISOString()
  const { data, error: dbErr } = await (supabase as any).from('tamagotchi').update({
    energy: Math.max(0, (pet.energy ?? 100) - 40), last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: dbErr ? 'Erreur DB' : null }
}

// ── TAMAGOTCHI V3 ACTIONS ─────────────────────────────────────────────────

export async function huntTamagotchi(score: number, caught: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté', cycleRestarted: false }
  const { data: pet } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!pet) return { data: null, error: 'Pas de tamagotchi', cycleRestarted: false }
  if (pet.stage !== 'xenomorph') return { data: null, error: "Seul le xénomorphe peut chasser !", cycleRestarted: false }

  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const lastHunted = pet.last_hunted ? new Date(pet.last_hunted).getTime() : 0
  const cooldownMs = 4 * 60 * 60 * 1000
  if (Date.now() - lastHunted < cooldownMs) {
    const remaining = cooldownMs - (Date.now() - lastHunted)
    const h = Math.floor(remaining / 3_600_000)
    const m = Math.ceil((remaining % 3_600_000) / 60_000)
    return { data: pet, error: `Prochain chassé disponible dans ${h}h${m}m`, cycleRestarted: false }
  }

  const xpGain = tamaXpGain(pet, caught ? 40 + Math.round(score / 5) : 10 + Math.round(score / 10))
  const huntCount = (pet.hunt_count ?? 0) + 1

  // Achievements
  const achievements: string[] = Array.isArray(pet.achievements) ? [...pet.achievements] : []
  if (caught && !achievements.includes('first_hunt'))  achievements.push('first_hunt')
  if (huntCount >= 5  && !achievements.includes('hunter'))      achievements.push('hunter')
  if (huntCount >= 20 && !achievements.includes('apex_hunter')) achievements.push('apex_hunter')
  if (score >= 100 && !achievements.includes('perfect_hunt'))   achievements.push('perfect_hunt')
  if (!achievements.includes('le_cycle')) achievements.push('le_cycle')

  // Le xénomorphe pond un œuf et le cycle recommence
  const cycleUpdates: Record<string, any> = {
    stage: 'egg',
    age_hours: 0,
    hunger: 0,
    happiness: 80,
    health: 100,
    energy: 100,
    is_sleeping: false,
    is_sick: false,
    last_fed: null,
    last_healed: null,
    poop_count: 0,
    last_sync: now,
    xp: Math.min(9999, (pet.xp ?? 0) + xpGain),
  }
  // Colonnes optionnelles — seulement si elles existent dans la DB
  if ('last_interacted_at'      in pet) cycleUpdates.last_interacted_at      = now
  if ('last_neglect_penalty_at' in pet) cycleUpdates.last_neglect_penalty_at = null
  if ('hunt_count'              in pet) cycleUpdates.hunt_count               = huntCount
  if ('last_hunted'             in pet) cycleUpdates.last_hunted              = now
  if ('achievements'            in pet) cycleUpdates.achievements             = achievements
  if ('care_streak'             in pet) Object.assign(cycleUpdates, computeStreak(pet, today))

  const { error: dbError } = await (supabase as any)
    .from('tamagotchi').update(cycleUpdates).eq('user_id', user.id)
  if (dbError) return { data: null, error: `Erreur sauvegarde (${dbError.code ?? dbError.message})`, cycleRestarted: false }
  const { data } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  return { data, error: null, cycleRestarted: true }
}

export async function checkInTamagotchi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté' }
  const { data: pet } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!pet) return { data: null, error: 'Pas de tamagotchi' }
  if (pet.stage === 'dead') return { data: null, error: 'Ton alien est mort...' }

  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const lastCheckin = pet.last_checkin ? pet.last_checkin.slice(0, 10) : ''
  if (lastCheckin === today) return { data: pet, error: 'Déjà check-in aujourd\'hui !' }

  const { pet: synced } = applyTamaDecay(pet)
  const streak = computeStreak(pet, today)
  const bonusXp = 15 + Math.min(streak.care_streak * 5, 50)
  const bonusHappiness = 10

  const achievements: string[] = Array.isArray(pet.achievements) ? [...pet.achievements] : []
  if (streak.care_streak >= 7  && !achievements.includes('streak_week'))  achievements.push('streak_week')
  if (streak.care_streak >= 30 && !achievements.includes('streak_month')) achievements.push('streak_month')

  const { data } = await (supabase as any).from('tamagotchi').update({
    last_checkin: now,
    happiness: Math.min(100, synced.happiness + bonusHappiness),
    hunger: synced.hunger, health: synced.health,
    age_hours: synced.age_hours, stage: synced.stage,
    energy: synced.energy, is_sleeping: synced.is_sleeping, is_sick: synced.is_sick,
    last_neglect_penalty_at: synced.last_neglect_penalty_at,
    x2_exp_until: synced.x2_exp_until,
    last_sync: now,
    xp: Math.min(9999, (pet.xp ?? 0) + tamaXpGain(pet, bonusXp)),
    achievements,
    ...streak,
  }).eq('user_id', user.id).select().single()
  return { data, error: null, bonusXp }
}

export async function adminTestHunt() {
  const { error, supabase, user, pet } = await getOrCreateAdminPet()
  if (error || !user || !pet) return { data: null, error }
  const now = new Date().toISOString()
  // Force stage to xenomorph and reset cooldown for testing
  const { data, error: dbErr } = await (supabase as any).from('tamagotchi').update({
    stage: 'xenomorph',
    last_hunted: null,
    last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: dbErr ? 'Erreur DB' : null }
}

export async function adminResetCheckin() {
  const { error, supabase, user, pet } = await getOrCreateAdminPet()
  if (error || !user || !pet) return { data: null, error }
  const now = new Date().toISOString()
  const { data, error: dbErr } = await (supabase as any).from('tamagotchi').update({
    last_checkin: null, last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: dbErr ? 'Erreur DB' : null }
}

export async function caresserTamagotchi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté' }

  const { data: pet } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!pet) return { data: null, error: 'Pas de tamagotchi' }
  if (pet.stage === 'dead') return { data: null, error: 'Ton alien est mort...' }

  const today = new Date().toISOString().slice(0, 10)
  const lastDate = pet.last_caresse_date ?? ''
  const caressesToday = lastDate === today ? (pet.caresses_today ?? 0) : 0
  const caresseLimit = (1 + Math.floor((pet.xp ?? 0) / 30)) >= 6 ? 6 : 5
  if (caressesToday >= caresseLimit) return { data: pet, error: `Limite de câlins atteinte (${caresseLimit}/jour) 💔` }

  const { pet: synced } = applyTamaDecay(pet)
  const now = new Date().toISOString()
  const updates: Record<string, any> = {
    happiness: Math.min(100, synced.happiness + 8),
    hunger: synced.hunger, health: synced.health,
    age_hours: synced.age_hours, stage: synced.stage,
    energy: synced.energy, is_sleeping: synced.is_sleeping, is_sick: synced.is_sick,
    last_sync: now,
    caresses_today: caressesToday + 1,
    last_caresse_date: today,
    xp: Math.min(9999, (pet.xp ?? 0) + tamaXpGain(pet, 3)),
  }
  if ('last_interacted_at'      in pet) updates.last_interacted_at      = now
  if ('last_neglect_penalty_at' in pet) updates.last_neglect_penalty_at = synced.last_neglect_penalty_at
  if ('x2_exp_until'            in pet) updates.x2_exp_until            = synced.x2_exp_until
  if ('care_streak'             in pet) Object.assign(updates, computeStreak(pet, today))
  const { error: dbError } = await (supabase as any).from('tamagotchi').update(updates).eq('user_id', user.id)
  if (dbError) return { data: null, error: `Erreur câlin (${dbError.code ?? dbError.message})` }
  const { data } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  return { data, error: null }
}

export async function nettoyerTamagotchi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté' }

  const { data: pet } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!pet) return { data: null, error: 'Pas de tamagotchi' }
  if (pet.stage === 'dead') return { data: null, error: 'Ton alien est mort...' }

  const { pet: synced } = applyTamaDecay(pet)
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const updates: Record<string, any> = {
    poop_count: 0,
    happiness: Math.min(100, synced.happiness + 5),
    hunger: synced.hunger, health: synced.health,
    age_hours: synced.age_hours, stage: synced.stage,
    energy: synced.energy, is_sleeping: synced.is_sleeping, is_sick: synced.is_sick,
    last_sync: now,
    xp: Math.min(9999, (pet.xp ?? 0) + tamaXpGain(pet, 8)),
  }
  if ('care_streak'             in pet) Object.assign(updates, computeStreak(pet, today))
  if ('last_neglect_penalty_at' in pet) updates.last_neglect_penalty_at = synced.last_neglect_penalty_at
  if ('x2_exp_until'            in pet) updates.x2_exp_until            = synced.x2_exp_until
  const { error: dbError } = await (supabase as any).from('tamagotchi').update(updates).eq('user_id', user.id)
  if (dbError) return { data: null, error: `Erreur nettoyage (${dbError.code ?? dbError.message})` }
  const { data } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  return { data, error: null }
}

export async function dormirTamagotchi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté' }
  const { data: pet } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!pet) return { data: null, error: 'Pas de tamagotchi' }
  if (pet.stage === 'dead') return { data: null, error: 'Ton alien est mort...' }
  if (pet.is_sleeping) return { data: pet, error: 'Il dort déjà ! 💤' }
  const { pet: synced } = applyTamaDecay(pet)
  const now = new Date().toISOString()
  const { data } = await (supabase as any).from('tamagotchi').update({
    is_sleeping: true,
    hunger: synced.hunger, happiness: synced.happiness, health: synced.health,
    age_hours: synced.age_hours, stage: synced.stage, energy: synced.energy, is_sick: synced.is_sick,
    last_neglect_penalty_at: synced.last_neglect_penalty_at,
    x2_exp_until: synced.x2_exp_until,
    last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: null }
}

export async function reveillerTamagotchi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté' }
  const { data: pet } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!pet) return { data: null, error: 'Pas de tamagotchi' }
  if (!pet.is_sleeping) return { data: pet, error: 'Il est déjà réveillé !' }
  const { pet: synced } = applyTamaDecay(pet)
  const now = new Date().toISOString()
  const { data } = await (supabase as any).from('tamagotchi').update({
    is_sleeping: false,
    hunger: synced.hunger, happiness: synced.happiness, health: synced.health,
    age_hours: synced.age_hours, stage: synced.stage,
    energy: Math.max(20, synced.energy), // minimum 20 pour éviter le re-dodo immédiat
    is_sick: synced.is_sick,
    last_neglect_penalty_at: synced.last_neglect_penalty_at,
    x2_exp_until: synced.x2_exp_until,
    last_sync: now,
  }).eq('user_id', user.id).select().single()
  return { data, error: null }
}

export async function guerirTamagotchi() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté' }
  const { data: pet } = await (supabase as any).from('tamagotchi').select('*').eq('user_id', user.id).single()
  if (!pet) return { data: null, error: 'Pas de tamagotchi' }
  if (pet.stage === 'dead') return { data: null, error: 'Ton alien est mort...' }
  if (!pet.is_sick) return { data: pet, error: "Il n'est pas malade !" }
  const { pet: synced } = applyTamaDecay(pet)
  const now = new Date().toISOString()
  const today = now.slice(0, 10)
  const { data } = await (supabase as any).from('tamagotchi').update({
    is_sick: false,
    health: Math.min(100, synced.health + 20),
    hunger: synced.hunger, happiness: synced.happiness,
    age_hours: synced.age_hours, stage: synced.stage,
    energy: synced.energy, is_sleeping: synced.is_sleeping,
    last_neglect_penalty_at: synced.last_neglect_penalty_at,
    x2_exp_until: synced.x2_exp_until,
    last_sync: now,
    xp: Math.min(9999, (pet.xp ?? 0) + tamaXpGain(pet, 12)),
    ...computeStreak(pet, today),
  }).eq('user_id', user.id).select().single()
  return { data, error: null }
}

// ── PROFIL BIO ────────────────────────────────────────────────

export async function updateBio(bio: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('profiles').update({ bio: bio.slice(0, 200) } as any).eq('id', user.id)
  revalidatePath('/profil')
  revalidatePath('/marathoniens')
}

// ── PSEUDO CHANGE ─────────────────────────────────────────────

export async function changePseudo(pseudo: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté.' }

  const trimmed = pseudo.trim()
  if (!trimmed || trimmed.length < 2 || trimmed.length > 20)
    return { error: 'Pseudo invalide (2 à 20 caractères).' }
  if (!/^[a-zA-Z0-9_\-éèêàùûôîïçœæ ]+$/.test(trimmed))
    return { error: 'Caractères non autorisés.' }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .ilike('pseudo', trimmed)
    .neq('id', user.id)
    .maybeSingle()

  if (existing) return { error: 'Ce pseudo est déjà pris.' }

  const { error } = await supabase
    .from('profiles')
    .update({ pseudo: trimmed } as any)
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profil')
  revalidatePath('/marathoniens')
  revalidatePath('/classement')
  return {}
}

// ── MARATHON NOTIFICATIONS ─────────────────────────────────────

export async function toggleMarathonNotification(notify: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await (supabase as any).from('profiles').update({ notify_marathon: notify }).eq('id', user.id)
  revalidatePath('/')
}

// ── RATTRAPAGE ADMIN ──────────────────────────────────────────

export async function setFilmRattrapage(filmId: number, niveau: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé' }

  // Supprimer l'entrée existante pour ce film
  await (supabase as any).from('recommendation_films').delete().eq('film_id', filmId)

  if (niveau) {
    const { data: film } = await supabase.from('films').select('*').eq('id', filmId).single()
    if (!film) return { error: 'Film introuvable' }
    await (supabase as any).from('recommendation_films').insert({
      film_id: filmId,
      niveau,
      titre: film.titre,
      annee: film.annee,
      realisateur: film.realisateur,
      poster: film.poster ?? null,
      tmdb_id: film.tmdb_id ?? null,
      position: 0,
    })
  }

  revalidatePath('/rattrapage')
  return { ok: true }
}

// ── FIGHT CLUB LEADERBOARD ─────────────────────────────────────

export async function saveFightClubScore(pseudo: string, score: number, difficulty: string) {
  const supabase = await createClient()
  await supabase.from('fightclub_scores' as any).insert({
    pseudo: pseudo.slice(0, 12).toUpperCase(),
    score:  Math.max(0, Math.round(score)),
    difficulty,
  })
}

export async function getFightClubLeaderboard(difficulty: string): Promise<{ pseudo: string; score: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('fightclub_scores' as any)
    .select('pseudo, score')
    .eq('difficulty', difficulty)
    .order('score', { ascending: false })
    .limit(100)
  return (data ?? []) as unknown as { pseudo: string; score: number }[]
}

// ── DANCE LEADERBOARD ─────────────────────────────────────────
// Requires: CREATE TABLE dance_scores (
//   user_id uuid references auth.users(id) on delete cascade primary key,
//   pseudo text not null, score int not null, max_combo int not null default 0,
//   updated_at timestamptz not null default now()
// ); ALTER TABLE dance_scores ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "read" ON dance_scores FOR SELECT USING (true);
// CREATE POLICY "own" ON dance_scores FOR ALL USING (auth.uid() = user_id);

export async function saveDanceScore(score: number, maxCombo: number, survivalMs = 0): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: existing } = await (supabase as any).from('dance_scores').select('score, survival_ms').eq('user_id', user.id).single()
    const betterScore = !existing || score > (existing.score ?? 0)
    const betterSurvival = survivalMs > 0 && (!existing || survivalMs > (existing.survival_ms ?? 0))
    if (!betterScore && !betterSurvival) return
    const { data: profile } = await supabase.from('profiles').select('pseudo').eq('id', user.id).single()
    await (supabase as any).from('dance_scores').upsert({
      user_id: user.id,
      pseudo: (profile as any)?.pseudo ?? 'Anonyme',
      score: betterScore ? Math.round(score) : (existing?.score ?? 0),
      max_combo: betterScore ? Math.round(maxCombo) : (existing?.max_combo ?? 0),
      survival_ms: betterSurvival ? survivalMs : (existing?.survival_ms ?? 0),
      updated_at: new Date().toISOString(),
    })
  } catch {}
}

export async function getDanceLeaderboard(): Promise<{ pseudo: string; score: number; max_combo: number }[]> {
  try {
    const supabase = await createClient()
    const { data } = await (supabase as any).from('dance_scores').select('pseudo, score, max_combo').order('score', { ascending: false }).limit(10)
    return (data ?? []) as { pseudo: string; score: number; max_combo: number }[]
  } catch {
    return []
  }
}

export async function getDanceSurvivalLeaderboard(): Promise<{ pseudo: string; survival_ms: number }[]> {
  try {
    const supabase = await createClient()
    const { data } = await (supabase as any).from('dance_scores').select('pseudo, survival_ms').gt('survival_ms', 0).order('survival_ms', { ascending: false }).limit(10)
    return (data ?? []) as { pseudo: string; survival_ms: number }[]
  } catch {
    return []
  }
}

// ── MESSAGES PRIVÉS ───────────────────────────────────────────

export async function sendMessage(recipientId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  if (user.id === recipientId) return { error: 'Tu ne peux pas t\'envoyer un message.' }

  const safe = content.trim().slice(0, 1000)
  if (!safe) return { error: 'Message vide.' }

  // Vérifie si l'expéditeur est bloqué par le destinataire
  const { data: blocked } = await (supabase as any)
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', recipientId)
    .eq('blocked_id', user.id)
    .maybeSingle()
  if (blocked) return { error: 'Impossible d\'envoyer ce message.' }

  const { error } = await (supabase as any)
    .from('private_messages')
    .insert({ sender_id: user.id, recipient_id: recipientId, content: safe })
  if (error) return { error: error.message }

  await deleteCacheKeys([`user:${recipientId}:unread`])
  revalidatePath('/profil')
  revalidatePath('/messages')
  return { success: true }
}

export async function getMyConversations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await (supabase as any).rpc('get_my_conversations')

  return (data ?? []).map((row: any) => ({
    otherId: row.other_id,
    unread: Number(row.unread_count),
    lastMessage: {
      id: row.last_message_id,
      sender_id: row.last_sender_id,
      recipient_id: row.last_recipient_id,
      content: row.last_content,
      read_at: row.last_read_at,
      created_at: row.last_created_at,
    },
    profile: row.pseudo ? { id: row.other_id, pseudo: row.pseudo, avatar_url: row.avatar_url ?? null } : null,
  }))
}

export async function getConversationMessages(withUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: messages } = await (supabase as any)
    .from('private_messages')
    .select('id, sender_id, recipient_id, content, read_at, created_at, deleted_by_sender, deleted_by_recipient')
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${withUserId}),and(sender_id.eq.${withUserId},recipient_id.eq.${user.id})`
    )
    .order('created_at', { ascending: true })
    .limit(100)

  // Filtre les messages supprimés pour l'utilisateur courant
  return (messages ?? []).filter((m: any) => {
    if (m.sender_id === user.id) return !m.deleted_by_sender
    return !m.deleted_by_recipient
  })
}

export async function markMessagesAsRead(fromUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase as any)
    .from('private_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', fromUserId)
    .eq('recipient_id', user.id)
    .is('read_at', null)

  revalidatePath('/profil')
  revalidatePath('/messages')
}

export async function deleteMessage(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: msg } = await (supabase as any)
    .from('private_messages')
    .select('sender_id, recipient_id')
    .eq('id', messageId)
    .single()

  if (!msg) return { error: 'Message introuvable.' }
  if (msg.sender_id !== user.id && msg.recipient_id !== user.id) return { error: 'Non autorisé.' }

  if (msg.sender_id === user.id) {
    await (supabase as any).from('private_messages').update({ deleted_by_sender: true }).eq('id', messageId)
  } else {
    await (supabase as any).from('private_messages').update({ deleted_by_recipient: true }).eq('id', messageId)
  }

  revalidatePath('/profil')
  revalidatePath('/messages')
  return { success: true }
}

export async function blockUser(targetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  await (supabase as any)
    .from('blocked_users')
    .upsert({ blocker_id: user.id, blocked_id: targetId }, { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true })

  revalidatePath('/profil')
  revalidatePath('/messages')
  return { success: true }
}

export async function unblockUser(targetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  await (supabase as any)
    .from('blocked_users')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', targetId)

  revalidatePath('/profil')
  revalidatePath('/messages')
  return { success: true }
}

export async function getUnreadMessageCount(): Promise<number> {
  return getUnreadMessageCountFromMessages()
}

// ── WATCHLIST ─────────────────────────────────────────────────────────────────

export async function getUserWatchlists() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await (supabase as any)
    .from('watchlists')
    .select('*, watchlist_items(film_id, films(id, titre, annee, realisateur, poster, genre))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function getPublicWatchlists() {
  const supabase = createAdminClient()
  const { data: watchlists, error } = await (supabase as any)
    .from('watchlists')
    .select('*, watchlist_items(film_id, films(id, titre, annee, realisateur, poster, genre))')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
  if (error || !watchlists) return []

  const userIds = [...new Set(
    (watchlists as any[]).filter((w: any) => !w.is_anonymous).map((w: any) => w.user_id)
  )]
  let profilesMap: Record<string, { pseudo: string; avatar_url: string | null }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, pseudo, avatar_url')
      .in('id', userIds)
    if (profiles) {
      for (const p of profiles) profilesMap[p.id] = p
    }
  }

  // Réactions
  const ids = (watchlists as any[]).map((w: any) => w.id)
  let reactionsMap: Record<string, { likes: number; dislikes: number }> = {}
  if (ids.length > 0) {
    const { data: reactions } = await (supabase as any)
      .from('watchlist_reactions')
      .select('watchlist_id, type')
      .in('watchlist_id', ids)
    ;(reactions ?? []).forEach((r: any) => {
      if (!reactionsMap[r.watchlist_id]) reactionsMap[r.watchlist_id] = { likes: 0, dislikes: 0 }
      if (r.type === 'like') reactionsMap[r.watchlist_id].likes++
      else reactionsMap[r.watchlist_id].dislikes++
    })
  }

  return (watchlists as any[]).map((w: any) => ({
    ...w,
    profiles: w.is_anonymous ? null : (profilesMap[w.user_id] ?? null),
    likes: reactionsMap[w.id]?.likes ?? 0,
    dislikes: reactionsMap[w.id]?.dislikes ?? 0,
  }))
}

export async function createWatchlist(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'Non connecté' }
  const trimmed = name.trim().slice(0, 60)
  if (!trimmed) return { data: null, error: 'Nom invalide' }
  const { data, error } = await (supabase as any)
    .from('watchlists')
    .insert({ user_id: user.id, name: trimmed })
    .select()
    .single()
  if (error) return { data: null, error: `Erreur création: ${error.message ?? error.code ?? JSON.stringify(error)}` }
  if (!data) {
    const { data: refreshed } = await (supabase as any).from('watchlists').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single()
    if (!refreshed) return { data: null, error: 'Watchlist créée mais introuvable' }
    revalidatePath('/watchlist')
    return { data: refreshed, error: null }
  }
  revalidatePath('/watchlist')
  return { data, error: null }
}

export async function deleteWatchlist(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { error } = await (supabase as any)
    .from('watchlists')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: 'Erreur suppression' }
  revalidatePath('/watchlist')
  return { error: null }
}

export async function renameWatchlist(id: string, name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const trimmed = name.trim().slice(0, 60)
  if (!trimmed) return { error: 'Nom invalide' }
  const { error } = await (supabase as any)
    .from('watchlists')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: 'Erreur renommage' }
  revalidatePath('/watchlist')
  return { error: null }
}

export async function toggleWatchlistVisibility(id: string, isPublic: boolean, isAnonymous: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { error } = await (supabase as any)
    .from('watchlists')
    .update({ is_public: isPublic, is_anonymous: isAnonymous, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: 'Erreur mise à jour' }
  revalidatePath('/watchlist')
  revalidatePath('/watchlist/public')
  return { error: null }
}

export async function addFilmToWatchlist(watchlistId: string, filmId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: wl } = await (supabase as any)
    .from('watchlists').select('id').eq('id', watchlistId).eq('user_id', user.id).single()
  if (!wl) return { error: 'Watchlist introuvable' }
  const { error } = await (supabase as any)
    .from('watchlist_items')
    .insert({ watchlist_id: watchlistId, film_id: filmId })
  if (error && error.code !== '23505') return { error: 'Erreur ajout' }
  revalidatePath('/watchlist')
  revalidatePath('/films')
  return { error: null }
}

export async function removeFilmFromWatchlist(watchlistId: string, filmId: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  const { data: wl } = await (supabase as any)
    .from('watchlists').select('id').eq('id', watchlistId).eq('user_id', user.id).single()
  if (!wl) return { error: 'Watchlist introuvable' }
  await (supabase as any)
    .from('watchlist_items')
    .delete()
    .eq('watchlist_id', watchlistId)
    .eq('film_id', filmId)
  revalidatePath('/watchlist')
  revalidatePath('/films')
  return { error: null }
}

// ── WATCHLIST REACTIONS (like / dislike) ──────────────────────────────────────

export async function toggleWatchlistReaction(watchlistId: string, type: 'like' | 'dislike') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: existing } = await (supabase as any)
    .from('watchlist_reactions')
    .select('id, type')
    .eq('watchlist_id', watchlistId)
    .eq('user_id', user.id)
    .single()

  if (existing) {
    if (existing.type === type) {
      // Même réaction → on retire
      await (supabase as any).from('watchlist_reactions').delete().eq('id', existing.id)
      return { error: null, action: 'removed' }
    } else {
      // Réaction différente → on change
      await (supabase as any).from('watchlist_reactions').update({ type }).eq('id', existing.id)
      return { error: null, action: 'changed' }
    }
  }
  await (supabase as any).from('watchlist_reactions').insert({ watchlist_id: watchlistId, user_id: user.id, type })
  return { error: null, action: 'added' }
}

export async function getWatchlistReactions(watchlistId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await (supabase as any)
    .from('watchlist_reactions')
    .select('type, user_id')
    .eq('watchlist_id', watchlistId)
  const reactions = (data ?? []) as { type: string; user_id: string }[]
  return {
    likes: reactions.filter(r => r.type === 'like').length,
    dislikes: reactions.filter(r => r.type === 'dislike').length,
    userReaction: user ? (reactions.find(r => r.user_id === user.id)?.type ?? null) : null,
  }
}

export async function getUserReactionsForWatchlists(watchlistIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || watchlistIds.length === 0) return {}
  const { data } = await (supabase as any)
    .from('watchlist_reactions')
    .select('watchlist_id, type')
    .eq('user_id', user.id)
    .in('watchlist_id', watchlistIds)
  const map: Record<string, string> = {}
  ;(data ?? []).forEach((r: any) => { map[r.watchlist_id] = r.type })
  return map
}

// ── INSCRIPTIONS EN COURS DE SAISON ───────────────────────────

export async function submitSeasonJoinRequest(message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  if (!isMarathonLive()) return { error: 'Le marathon n\'a pas encore commencé.' }

  const safe = message.trim().slice(0, 500)

  // Vérifie s'il y a déjà une demande active
  const { data: existing } = await (supabase as any)
    .from('season_join_requests')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('saison', CONFIG.SAISON_NUMERO)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing && ['pending', 'approved_current', 'approved_next'].includes(existing.status)) {
    return { error: 'Tu as déjà une demande en cours ou acceptée.' }
  }

  if (existing && existing.status === 'rejected') {
    // Réactivation d'une demande rejetée
    await (supabase as any)
      .from('season_join_requests')
      .update({ message: safe || null, status: 'pending', reviewed_by: null, reviewed_at: null })
      .eq('id', existing.id)
  } else {
    await (supabase as any)
      .from('season_join_requests')
      .insert({ user_id: user.id, message: safe || null, saison: CONFIG.SAISON_NUMERO })
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function getMySeasonJoinStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await (supabase as any)
    .from('season_join_requests')
    .select('id, status, message, created_at')
    .eq('user_id', user.id)
    .eq('saison', CONFIG.SAISON_NUMERO)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ?? null
}

export async function adminGetAllSeasonJoinRequests() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user?.id ?? '').single()
  if (!me?.is_admin) return []

  const { data } = await (supabase as any)
    .from('season_join_requests')
    .select('id, user_id, message, status, saison, created_at, reviewed_at')
    .eq('saison', CONFIG.SAISON_NUMERO)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function adminGetSeasonJoinRequests() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user?.id ?? '').single()
  if (!me?.is_admin) return []

  const { data } = await (supabase as any)
    .from('season_join_requests')
    .select('id, user_id, message, status, saison, created_at, profiles!user_id(pseudo, avatar_url)')
    .eq('status', 'pending')
    .eq('saison', CONFIG.SAISON_NUMERO)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function adminReviewSeasonJoinRequest(
  requestId: string,
  decision: 'approve_current' | 'approve_next' | 'reject'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user?.id ?? '').single()
  if (!me?.is_admin) return { error: 'Non autorisé' }

  const { data: req } = await (supabase as any)
    .from('season_join_requests')
    .select('user_id')
    .eq('id', requestId)
    .single()
  if (!req) return { error: 'Demande introuvable' }

  await (supabase as any)
    .from('season_join_requests')
    .update({
      status: decision,
      reviewed_by: user!.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (decision === 'approve_current') {
    // Accorder une fenêtre de 24h pour cocher les films pré-marathon
    const windowUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const adminDb = createAdminClient()
    await adminDb
      .from('profiles')
      .update({ pre_marathon_window_until: windowUntil, saison: CONFIG.SAISON_NUMERO } as any)
      .eq('id', req.user_id)
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function adminDirectAdmitToMarathon(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('is_admin').eq('id', user?.id ?? '').single()
  if (!me?.is_admin) return { error: 'Non autorisé' }

  const windowUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const adminDb = createAdminClient()

  // Intégrer dans la saison actuelle + ouvrir la fenêtre 24h
  await adminDb
    .from('profiles')
    .update({ saison: CONFIG.SAISON_NUMERO, pre_marathon_window_until: windowUntil } as any)
    .eq('id', userId)

  // Créer ou mettre à jour la demande d'inscription
  const { data: existing } = await (supabase as any)
    .from('season_join_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('saison', CONFIG.SAISON_NUMERO)
    .maybeSingle()

  if (existing) {
    await (supabase as any)
      .from('season_join_requests')
      .update({ status: 'approved_current', reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await (supabase as any)
      .from('season_join_requests')
      .insert({ user_id: userId, saison: CONFIG.SAISON_NUMERO, status: 'approved_current', reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function getReactionCountsForWatchlists(watchlistIds: string[]) {
  if (watchlistIds.length === 0) return {}
  const supabase = createAdminClient()
  const { data } = await (supabase as any)
    .from('watchlist_reactions')
    .select('watchlist_id, type')
    .in('watchlist_id', watchlistIds)
  const map: Record<string, { likes: number; dislikes: number }> = {}
  ;(data ?? []).forEach((r: any) => {
    if (!map[r.watchlist_id]) map[r.watchlist_id] = { likes: 0, dislikes: 0 }
    if (r.type === 'like') map[r.watchlist_id].likes++
    else map[r.watchlist_id].dislikes++
  })
  return map
}

// ── WATCHLIST FAVORIS (coup de coeur = copie dans mes watchlists) ─────────────

export async function favoriteWatchlist(sourceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  // Vérifie si déjà en favori
  const { data: existing } = await (supabase as any)
    .from('watchlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('source_watchlist_id', sourceId)
    .single()
  if (existing) return { error: null, alreadyExists: true, id: existing.id }

  // Récupère la watchlist source
  const { data: source } = await (supabase as any)
    .from('watchlists')
    .select('name, watchlist_items(film_id)')
    .eq('id', sourceId)
    .single()
  if (!source) return { error: 'Watchlist introuvable' }

  // Crée la copie
  const { data: copy, error: copyErr } = await (supabase as any)
    .from('watchlists')
    .insert({ user_id: user.id, name: `💛 ${source.name}`, is_public: false, source_watchlist_id: sourceId })
    .select('id')
    .single()
  if (copyErr || !copy) return { error: 'Erreur création' }

  // Copie les films
  const items = (source.watchlist_items ?? []).map((i: any) => ({ watchlist_id: copy.id, film_id: i.film_id }))
  if (items.length > 0) {
    await (supabase as any).from('watchlist_items').insert(items)
  }

  revalidatePath('/watchlist')
  return { error: null, alreadyExists: false, id: copy.id }
}

export async function unfavoriteWatchlist(sourceId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  await (supabase as any)
    .from('watchlists')
    .delete()
    .eq('user_id', user.id)
    .eq('source_watchlist_id', sourceId)

  revalidatePath('/watchlist')
  return { error: null }
}

export async function getUserFavoriteWatchlistIds() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await (supabase as any)
    .from('watchlists')
    .select('source_watchlist_id')
    .eq('user_id', user.id)
    .not('source_watchlist_id', 'is', null)
  return (data ?? []).map((r: any) => r.source_watchlist_id as string)
}

export async function getUserWatchlistFilmIds() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}
  const { data } = await (supabase as any)
    .from('watchlist_items')
    .select('film_id, watchlist_id, watchlists!inner(user_id)')
    .eq('watchlists.user_id', user.id)
  const map: Record<number, string[]> = {}
  ;(data ?? []).forEach((item: any) => {
    if (!map[item.film_id]) map[item.film_id] = []
    map[item.film_id].push(item.watchlist_id)
  })
  return map
}

// ── ADMIN — Stats pré-marathon ───────────────────────────────────────────────

export type PreMarathonFilmStat = { id: number; titre: string; count: number }

export async function adminGetPreMarathonStats(): Promise<{
  most: PreMarathonFilmStat[]
  least: PreMarathonFilmStat[]
  avg: number
  total: number
  totalWatches: number
} | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!prof?.is_admin) return null

  const adminClient = createAdminClient()
  const { data: watches } = await adminClient
    .from('watched')
    .select('film_id, films!inner(id, titre)')
    .eq('pre', true)

  if (!watches || watches.length === 0) return { most: [], least: [], avg: 0, total: 0, totalWatches: 0 }

  const countMap: Record<number, { titre: string; count: number }> = {}
  for (const w of watches as any[]) {
    const fid = w.film_id
    const titre = w.films?.titre ?? `Film #${fid}`
    if (!countMap[fid]) countMap[fid] = { titre, count: 0 }
    countMap[fid].count++
  }

  const sorted = Object.entries(countMap)
    .map(([id, { titre, count }]) => ({ id: Number(id), titre, count }))
    .sort((a, b) => b.count - a.count)

  const totalWatches = sorted.reduce((s, f) => s + f.count, 0)
  const avg = sorted.length > 0 ? Math.round((totalWatches / sorted.length) * 10) / 10 : 0

  return {
    most: sorted.slice(0, 15),
    least: sorted.filter(f => f.count > 0).slice(-15).reverse(),
    avg,
    total: sorted.length,
    totalWatches,
  }
}
