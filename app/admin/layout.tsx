import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserCached } from '@/lib/auth'
import AdminNav from './AdminNav'
import styles from './admin.module.css'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserCached()
  if (!user) redirect('/auth')

  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  const admin = createAdminClient()
  const [
    { count: pendingJoin },
    { count: pendingFilms },
    { count: reports },
    { count: pendingDuels },
  ] = await Promise.all([
    admin.from('season_join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('films').select('id', { count: 'exact', head: true }).eq('pending_admin_approval', true),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('resolved', false),
    supabase.from('duels').select('id', { count: 'exact', head: true }).eq('pending', true),
  ])

  const counts = {
    join: pendingJoin ?? 0,
    films: pendingFilms ?? 0,
    reports: reports ?? 0,
    duels: pendingDuels ?? 0,
  }

  return (
    <div data-theme="neutre" className={styles.wrap}>
      <AdminNav counts={counts} />
      <div className={styles.main}>
        {children}
      </div>
    </div>
  )
}
