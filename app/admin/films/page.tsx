import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getServerConfig } from '@/lib/serverConfig'
import FilmsPage from './FilmsPage'

export const revalidate = 0

export default async function AdminFilmsRoute() {
  const admin = createAdminClient()
  const supabase = await createClient()
  const cfg = await getServerConfig()

  const [
    { data: pendingApproval },
    { data: flagged18 },
    { data: reports },
    { count: totalFilms },
  ] = await Promise.all([
    admin.from('films').select('id, titre, annee, realisateur, genre, poster, saison').eq('pending_admin_approval', true).order('created_at', { ascending: false }),
    admin.from('films').select('id, titre, annee, realisateur, genre, poster, saison, is_18_plus, category_18').eq('flagged_18_pending', true).order('titre'),
    supabase.from('reports').select('id, film_id, user_id, reason, created_at, resolved, films(titre)').eq('resolved', false).order('created_at', { ascending: false }),
    admin.from('films').select('id', { count: 'exact', head: true }),
  ])

  return (
    <FilmsPage
      pendingApproval={pendingApproval ?? []}
      flagged18={flagged18 ?? []}
      reports={reports ?? []}
      totalFilms={totalFilms ?? 0}
      saisonNumero={cfg.SAISON_NUMERO}
    />
  )
}
