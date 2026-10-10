import { createClient } from '@/lib/supabase/server'
import { withCache } from '@/lib/redis'

export type ActivityEvent =
  | { type: 'watched'; pseudo: string; titre: string; exp: number; at: string }
  | { type: 'rated'; pseudo: string; titre: string; note: number; at: string }
  | { type: 'duel_opened'; film1: string; film2: string; at: string }
  | { type: 'duel_closed'; winner: string; at: string }

export async function getRecentActivity(limit = 10): Promise<ActivityEvent[]> {
  return withCache('activity:recent', 60, async () => {
    const supabase = await createClient()

    const [watchedRes, ratingsRes, duelsOpenedRes, duelsClosedRes] = await Promise.all([
      supabase
        .from('watched')
        .select('watched_at, exp_awarded, pre, films(titre), profiles(pseudo)')
        .eq('pre', false)
        .order('watched_at', { ascending: false })
        .limit(limit),
      supabase
        .from('ratings')
        .select('created_at, rating, films(titre), profiles(pseudo)')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('duels')
        .select('created_at, film1:films!duels_film1_id_fkey(titre), film2:films!duels_film2_id_fkey(titre)')
        .eq('pending', false)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('duels')
        .select('closed_at, winner:films!duels_winner_id_fkey(titre)')
        .eq('closed', true)
        .not('winner_id', 'is', null)
        .order('closed_at', { ascending: false })
        .limit(5),
    ])

    const events: ActivityEvent[] = []

    for (const w of watchedRes.data ?? []) {
      const film = w.films as any
      const profile = w.profiles as any
      if (film?.titre && profile?.pseudo) {
        events.push({
          type: 'watched',
          pseudo: profile.pseudo,
          titre: film.titre,
          exp: (w as any).exp_awarded ?? 0,
          at: w.watched_at,
        })
      }
    }

    for (const r of ratingsRes.data ?? []) {
      const film = (r as any).films as any
      const profile = (r as any).profiles as any
      if (film?.titre && profile?.pseudo) {
        events.push({
          type: 'rated',
          pseudo: profile.pseudo,
          titre: film.titre,
          note: (r as any).rating,
          at: (r as any).created_at,
        })
      }
    }

    for (const d of duelsOpenedRes.data ?? []) {
      const f1 = (d as any).film1 as any
      const f2 = (d as any).film2 as any
      if (f1?.titre && f2?.titre) {
        events.push({
          type: 'duel_opened',
          film1: f1.titre,
          film2: f2.titre,
          at: (d as any).created_at,
        })
      }
    }

    for (const d of duelsClosedRes.data ?? []) {
      const w = (d as any).winner as any
      if (w?.titre) {
        events.push({
          type: 'duel_closed',
          winner: w.titre,
          at: (d as any).closed_at,
        })
      }
    }

    events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    return events.slice(0, limit)
  }) ?? []
}
