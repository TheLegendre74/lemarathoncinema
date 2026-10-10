import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getServerConfig } from '@/lib/serverConfig'
import SeancesPage from './SeancesPage'

export const revalidate = 0

export default async function AdminSeancesRoute() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const cfg = await getServerConfig()

  const [
    { data: weekFilm },
    { data: weekFilmArchives },
    { data: duels },
    { data: activeDuel },
    { data: liveRow },
  ] = await Promise.all([
    admin.from('week_films').select('id, film_id, session_time, active, films(id, titre, poster)').eq('active', true).limit(1).single(),
    admin.from('week_films').select('id, film_id, session_time, created_at, films(id, titre)').eq('active', false).order('created_at', { ascending: false }).limit(20),
    supabase.from('duels').select('id, film1_id, film2_id, votes_film1, votes_film2, pending, closed, winner_id, closes_at, created_at, film1:films!duels_film1_id_fkey(id, titre, poster), film2:films!duels_film2_id_fkey(id, titre, poster)').order('created_at', { ascending: false }).limit(20),
    supabase.from('duels').select('id, film1_id, film2_id, votes_film1, votes_film2, closes_at, film1:films!duels_film1_id_fkey(titre), film2:films!duels_film2_id_fkey(titre)').eq('closed', false).eq('pending', false).order('created_at', { ascending: false }).limit(1).single(),
    admin.from('site_prive').select('key, value').in('key', ['live_url', 'live_label']),
  ])

  const liveConfig: Record<string, string> = {}
  if (liveRow) {
    for (const r of liveRow as any[]) {
      liveConfig[r.key] = r.value
    }
  }

  return (
    <SeancesPage
      weekFilm={weekFilm}
      weekFilmArchives={weekFilmArchives ?? []}
      duels={duels ?? []}
      activeDuel={activeDuel}
      fdlsJour={cfg.FDLS_JOUR}
      fdlsHeure={cfg.FDLS_HEURE}
      seanceJour={cfg.SEANCE_JOUR}
      seanceHeure={cfg.SEANCE_HEURE}
      saisonNumero={cfg.SAISON_NUMERO}
      seuilMajority={cfg.SEUIL_MAJORITY}
      liveUrl={liveConfig.live_url ?? ''}
      liveLabel={liveConfig.live_label ?? ''}
    />
  )
}
