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

  let counts = { join: 0, films: 0, reports: 0, duels: 0 }
  try {
    const admin = createAdminClient()
    const results = await Promise.allSettled([
      admin.from('season_join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('films').select('id', { count: 'exact', head: true }).eq('pending_admin_approval', true),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('resolved', false),
      supabase.from('duels').select('id', { count: 'exact', head: true }).eq('pending', true),
    ])
    const val = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? (r.value.count ?? 0) : 0
    counts = {
      join: val(results[0]),
      films: val(results[1]),
      reports: val(results[2]),
      duels: val(results[3]),
    }
  } catch {}

  return (
    <div data-theme="neutre" className={styles.wrap}>
      <AdminNav counts={counts} />
      <div className={styles.main}>
        {children}
      </div>
    </div>
  )
}
