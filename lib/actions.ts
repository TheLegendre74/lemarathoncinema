'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isMarathonLive, CONFIG } from '@/lib/config'

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

// ── FILMS ────────────────────────────────────────────────────

export async function addFilm(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Non connecté' }

  const titre = (formData.get('titre') as string).trim()
  const annee = parseInt(formData.get('annee') as string)
  const realisateur = (formData.get('realisateur') as string).trim()
  const genre = formData.get('genre') as string
  const poster = (formData.get('poster') as string)?.trim() || null

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

  const saison = isMarathonLive() ? CONFIG.SAISON_NUMERO + 1 : CONFIG.SAISON_NUMERO

  const { error } = await supabase.from('films').insert({
    titre, annee, realisateur, genre, poster, saison, added_by: user.id,
  })

  if (error) return { error: error.message }
  revalidatePath('/films')
  return { success: true, saison }
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
