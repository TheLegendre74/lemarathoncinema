import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'
import { getServerConfig } from '@/lib/serverConfig'
import { adminGetMarathonRequests, adminGetSeasonJoinRequests, adminGetAllSeasonJoinRequests } from '@/lib/actions'
import type { Profile } from '@/lib/supabase/types'
import { getUserCached } from '@/lib/auth'

export const revalidate = 0

export default async function AdminPage() {
  const user = await getUserCached()
  if (!user) redirect('/auth')

  const supabase = await createClient()

  const { data: profileData } = await supabase.from('profiles').select('id, pseudo, exp, is_admin, avatar_url, active_badge').eq('id', user.id).single()
  const profile = profileData as Profile | null
  if (!profile?.is_admin) redirect('/')

  const cfg = await getServerConfig()
  // Service role client pour bypass RLS sur les colonnes d'administration
  const adminDb = createAdminClient()

  const [
    { data: films },
    { data: users },
    { data: duels },
    { data: weekFilm },
    { data: allWatched },
    { data: flaggedFilms },
    { data: pendingFilms18 },
    { data: pendingApprovalFilms },
    { data: reports },
    { data: siteConfigs },
    { data: news },
    { data: recommendations },
    { data: forumTopics },
  ] = await Promise.all([
    adminDb.from('films').select('id, titre, annee, realisateur, genre, sousgenre, poster, saison, added_by, tmdb_id, flagged_18plus, flagged_16plus, flagged_18_pending, flagged_18strange, pending_admin_approval, created_at, overview').eq('pending_admin_approval', false).order('titre'),
    supabase.from('profiles').select('*, watched:watched(film_id), votes:votes(duel_id)').order('exp', { ascending: false }),
    supabase.from('duels').select('*, film1:films!duels_film1_id_fkey(titre), film2:films!duels_film2_id_fkey(titre), votes(film_choice)').order('created_at', { ascending: false }).limit(10),
    adminDb.from('week_films').select('*, films(titre)').eq('active', true).order('created_at', { ascending: false }).limit(1).single(),
    // TODO: remplacer par un RPC COUNT GROUP BY cote Postgres
    adminDb.from('watched').select('film_id'),
    adminDb.from('films').select('id, titre, annee, poster, flagged_18_pending, flagged_18plus, created_at').eq('flagged_18_pending', true).order('titre'),
    adminDb.from('films').select('id, titre, annee, poster, flagged_18plus, created_at').eq('flagged_18plus', true).order('created_at', { ascending: false }),
    (adminDb as any).from('films').select('*, profiles!films_added_by_fkey(pseudo)').eq('pending_admin_approval', true).order('created_at', { ascending: false }),
    supabase.from('reports').select('*, film:films(titre), reporter:profiles!reports_user_id_fkey(pseudo)').eq('resolved', false).order('created_at', { ascending: false }),
    supabase.from('site_config').select('key, value'),
    (adminDb as any).from('news').select('*, profiles(pseudo)').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    (adminDb as any).from('recommendation_films').select('id, titre, annee, realisateur, poster, niveau, position, description, film_id').order('niveau').order('position'),
    (adminDb as any).from('forum_topics').select('id, title, pinned, is_social, created_at, author_id').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
  ])

  const [marathonRequests, seasonJoinRequests, allSeasonJoinRequests] = await Promise.all([
    adminGetMarathonRequests(),
    adminGetSeasonJoinRequests(),
    adminGetAllSeasonJoinRequests(),
  ])

  const totalUsers = users?.length ?? 1
  const watchCountMap: Record<number, number> = {}
  allWatched?.forEach((w: { film_id: number }) => { watchCountMap[w.film_id] = (watchCountMap[w.film_id] ?? 0) + 1 })

  const configMap: Record<string, string> = {}
  siteConfigs?.forEach(({ key, value }: { key: string; value: string }) => { configMap[key] = value })

  return (
    <AdminClient
      profile={profile}
      films={films ?? []}
      users={users ?? []}
      duels={duels ?? []}
      weekFilm={weekFilm}
      totalUsers={totalUsers}
      watchCountMap={watchCountMap}
      flaggedFilms={(flaggedFilms ?? []) as any}
      pendingFilms18={(pendingFilms18 ?? []) as any}
      pendingApprovalFilms={pendingApprovalFilms ?? []}
      reports={reports ?? []}
      siteConfig={configMap}
      serverConfig={cfg}
      news={news ?? []}
      recommendations={recommendations ?? []}
      forumTopics={forumTopics ?? []}
      marathonRequests={marathonRequests}
      seasonJoinRequests={seasonJoinRequests}
      allSeasonJoinRequests={allSeasonJoinRequests}
    />
  )
}
