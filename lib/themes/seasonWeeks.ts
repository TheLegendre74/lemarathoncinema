import { unstable_cache } from 'next/cache'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SeasonWeek } from './types'

export const getSeasonWeeks = unstable_cache(
  async (): Promise<SeasonWeek[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) return []

    const supabase = createSupabaseClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await supabase
      .from('season_weeks')
      .select('saison, semaine, theme, date_debut')
      .order('date_debut')

    if (error) return []
    return (data ?? []) as SeasonWeek[]
  },
  ['season-weeks'],
  { revalidate: 3600, tags: ['season-weeks'] }
)
