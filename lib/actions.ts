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
  ok: boolean; error?: string; tmdbId?: number; flagged18?: boolean; posterUrl?: string
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

    if (movie.adult) {
      return { ok: false, error: 'Ce film contient du contenu adulte explicite et ne peut pas être ajouté.' }
    }

    // Fetch content certifications
    const relRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movie.id}/release_dates?api_key=${key}`,
      { cache: 'no-store' }
    )
    const relData = await relRes.json()

    const frEntry = relData.results?.find((r: any) => r.iso_3166_1 === 'FR')
    const usEntry = relData.results?.find((r: any) => r.iso_3166_1 === 'US')
    const cert = (frEntry || usEntry)?.release_dates?.find((d: any) => d.certification)?.certification ?? ''
    const flagged18 = ['18', 'NC-17', 'R'].includes(cert)

    const posterUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : undefined

    return { ok: true, tmdbId: movie.id as number, flagged18, posterUrl }
  } catch {
    return { ok: true }
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

  const { data: duel } = await supabase.from('duels').select('closed').eq('id', duelId).single()
  if (!duel || duel.closed) return { error: 'Ce duel est clôturé.' }

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

  const adminClient = createAdminClient()
  const entries = Object.entries(configs).map(([key, value]) => ({
    key, value, updated_at: new Date().toISOString()
  }))
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
  const genre = formData.get('genre') as string
  const manualPoster = (formData.get('poster') as string)?.trim() || null

  if (!titre || !annee || !realisateur) return { error: 'Champs requis manquants.' }
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
  })

  if (error) return { error: error.message }
  revalidatePath('/films')
  return { success: true, saison, flagged18: tmdb.flagged18 ?? false }
}

// ── POSTS (forum) ────────────────────────────────────────────

export async function addPost(topic: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }
  if (!content.trim()) return { error: 'Message vide.' }

  await supabase.from('posts').insert({ topic, user_id: user.id, content: content.trim() })
  revalidatePath('/films')
  revalidatePath('/duels')
  revalidatePath('/semaine')
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

export async function adminApproveFlaggedFilm(filmId: number) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return { error: 'Non autorisé.' }

  await adminClient.from('films').update({ flagged_18plus: false }).eq('id', filmId)
  revalidatePath('/admin')
  revalidatePath('/films')
  return { success: true }
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

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
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
