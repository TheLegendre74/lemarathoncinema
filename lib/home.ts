import { createClient } from '@/lib/supabase/server'
import { withCache } from '@/lib/redis'
import { parisParts, parisMonday } from '@/lib/time/paris'

export async function getWallPosters(count = 80): Promise<{ id: number; poster: string }[]> {
  const today = parisParts().y * 10000 + parisParts().m * 100 + parisParts().d
  return withCache(`wall:posters:${today}`, 86400, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('films')
      .select('id, poster')
      .not('poster', 'is', null)

    if (!data?.length) return []

    const seed = today
    const shuffled = [...data]
      .filter(f => f.poster)
      .sort((a, b) => {
        const ha = ((a.id * 2654435761 + seed) >>> 0) % 1000000
        const hb = ((b.id * 2654435761 + seed) >>> 0) % 1000000
        return ha - hb
      })

    return shuffled.slice(0, count).map(f => ({ id: f.id, poster: f.poster! }))
  }) ?? []
}

export async function getTopRatedFilms(limit = 5) {
  return withCache('home:top-rated', 300, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('films')
      .select('id, titre, poster, annee')
      .not('note_moyenne', 'is', null)
      .order('note_moyenne', { ascending: false })
      .limit(limit)
    return data ?? []
  }) ?? []
}

export async function getTopPlayers(limit = 5) {
  return withCache('home:top-players', 300, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, pseudo, exp, avatar_url')
      .order('exp', { ascending: false })
      .limit(limit)
    return data ?? []
  }) ?? []
}

export async function getActivePlayerCount(saisonNumero: number): Promise<number> {
  return withCache(`home:active-players:${saisonNumero}`, 120, async () => {
    const supabase = await createClient()
    const monday = parisMonday()
    const { count } = await supabase
      .from('watched')
      .select('user_id', { count: 'exact', head: true })
      .gte('watched_at', monday.toISOString())
      .eq('pre', false)
    return count ?? 0
  }) ?? 0
}

export async function getSeasonPlayerCount(saisonNumero: number): Promise<number> {
  return withCache(`home:season-players:${saisonNumero}`, 120, async () => {
    const supabase = await createClient()
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('saison', saisonNumero)
    return count ?? 0
  }) ?? 0
}

export async function getFilmCount(): Promise<number> {
  return withCache('home:film-count', 600, async () => {
    const supabase = await createClient()
    const { count } = await supabase
      .from('films')
      .select('id', { count: 'exact', head: true })
    return count ?? 0
  }) ?? 0
}

export async function getNews(limit = 5) {
  return withCache('news:latest', 300, async () => {
    const supabase = await createClient()
    const { data } = await (supabase as any)
      .from('news')
      .select('id, title, content, pinned, created_at, profiles(pseudo)')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)
    return data ?? []
  }) ?? []
}

export async function getWeekFilmArchives(limit = 10) {
  return withCache('home:wf-archives', 300, async () => {
    const supabase = await createClient()
    const { data } = await supabase
      .from('week_films')
      .select('id, active, created_at, films(id, titre, poster, annee)')
      .eq('active', false)
      .order('created_at', { ascending: false })
      .limit(limit)
    return data ?? []
  }) ?? []
}
