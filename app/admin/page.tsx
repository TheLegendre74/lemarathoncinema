import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUserCached } from '@/lib/auth'
import { getServerConfig } from '@/lib/serverConfig'
import { getSeasonWeeks } from '@/lib/themes/seasonWeeks'
import { resolveTheme } from '@/lib/themes/resolve'
import { cookies } from 'next/headers'
import { READY_THEMES, type ThemeKey } from '@/lib/themes/types'
import Link from 'next/link'
import styles from './admin.module.css'

export const revalidate = 0

const THEME_LABELS: Record<string, string> = {
  neutre: 'Neutre', action: 'Action', comedie: 'Comedie',
  western: 'Western', horreur: 'Horreur',
}

const SOURCE_LABELS: Record<string, string> = {
  apercu: 'apercu admin', force: 'impose depuis l\'admin',
  planning: 'planning', defaut: 'defaut',
}

export default async function AdminDashboard() {
  const user = await getUserCached()
  const supabase = await createClient()
  const admin = createAdminClient()
  const cfg = await getServerConfig()

  const [seasonWeeks, cookieStore] = await Promise.all([
    getSeasonWeeks(),
    cookies(),
  ])

  const settled = await Promise.allSettled([
    admin.from('season_join_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('films').select('id', { count: 'exact', head: true }).eq('pending_admin_approval', true),
    admin.from('films').select('id', { count: 'exact', head: true }).eq('flagged_18_pending', true),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('resolved', false),
    supabase.from('duels').select('id', { count: 'exact', head: true }).eq('pending', true),
    admin.from('week_films').select('films(titre)').eq('active', true).limit(1).single(),
    supabase.from('duels').select('id, closes_at, film1:films!duels_film1_id_fkey(titre), film2:films!duels_film2_id_fkey(titre)').eq('closed', false).eq('pending', false).order('created_at', { ascending: false }).limit(1).single(),
    admin.from('admin_log').select('action, detail, created_at').order('created_at', { ascending: false }).limit(10),
  ])

  const cnt = (i: number) => settled[i].status === 'fulfilled' ? (settled[i].value?.count ?? 0) : 0
  const dat = (i: number) => settled[i].status === 'fulfilled' ? settled[i].value?.data : null

  const pendingJoin = cnt(0)
  const pendingFilms = cnt(1)
  const flagged18 = cnt(2)
  const reports = cnt(3)
  const pendingDuels = cnt(4)
  const weekFilm = dat(5)
  const activeDuel = dat(6)
  const recentLog = dat(7)

  const previewRaw = cookieStore.get('cm_theme_apercu')?.value ?? null
  const previewCookie = (previewRaw && READY_THEMES.includes(previewRaw as ThemeKey)) ? previewRaw as ThemeKey : null
  const resolved = resolveTheme({
    now: new Date(),
    cfg: { theme_mode: cfg.theme_mode, theme_force: cfg.theme_force as ThemeKey },
    weeks: seasonWeeks,
    previewCookie,
    isAdmin: true,
  })

  const todoItems: Array<{ label: string; count: number; href: string }> = []
  if ((pendingJoin ?? 0) > 0) todoItems.push({ label: 'Demandes d\'inscription', count: pendingJoin ?? 0, href: '/admin/joueurs' })
  if ((pendingFilms ?? 0) > 0) todoItems.push({ label: 'Films a approuver', count: pendingFilms ?? 0, href: '/admin/films' })
  if ((flagged18 ?? 0) > 0) todoItems.push({ label: 'Films 18+ a confirmer', count: flagged18 ?? 0, href: '/admin/films' })
  if ((reports ?? 0) > 0) todoItems.push({ label: 'Signalements', count: reports ?? 0, href: '/admin/films' })
  if ((pendingDuels ?? 0) > 0) todoItems.push({ label: 'Duels a approuver', count: pendingDuels ?? 0, href: '/admin/seances' })

  const weekInfo = resolved.week
    ? `semaine ${resolved.week.semaine} / ${resolved.week.total}`
    : null

  const themeLine = `En ce moment : ${THEME_LABELS[resolved.key] ?? resolved.key} — ${SOURCE_LABELS[resolved.source]}${weekInfo ? `, ${weekInfo}` : ''}.`

  return (
    <>
      <h1 className={styles.pageTitle}>Tableau de bord</h1>

      {todoItems.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>A traiter</h2>
          {todoItems.map(item => (
            <Link key={item.href + item.label} href={item.href} className={styles.card} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
              <span>{item.label}</span>
              <span className={styles.badge}>{item.count}</span>
            </Link>
          ))}
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Le site maintenant</h2>
        <div className={styles.card}>
          <div className={styles.row}>
            <span>{themeLine}</span>
            <Link href="/admin/theme" className={styles.btn}>Changer de theme</Link>
          </div>
          <div className={styles.row}>
            <span>Saison {cfg.SAISON_NUMERO} — {cfg.SAISON_LABEL}</span>
          </div>
          <div className={styles.row}>
            <span>Film de la semaine : {(weekFilm as any)?.films?.titre ?? 'aucun'}</span>
            <Link href="/admin/seances" className={styles.btn}>Gerer</Link>
          </div>
          {activeDuel && (
            <div className={styles.row}>
              <span>Duel : {(activeDuel as any)?.film1?.titre} vs {(activeDuel as any)?.film2?.titre}{(activeDuel as any)?.closes_at ? ` — cloture le ${new Date((activeDuel as any).closes_at).toLocaleDateString('fr-FR')}` : ''}</span>
              <Link href="/admin/seances" className={styles.btn}>Voir</Link>
            </div>
          )}
          <div className={styles.row}>
            <span>Videoclub : {cfg.videoclub_mode === 'bientot' ? 'Bientot' : cfg.videoclub_mode === 'cache' ? 'Cache' : cfg.videoclub_mode}</span>
          </div>
        </div>
      </div>

      {recentLog && (recentLog as any[]).length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Dernieres modifications</h2>
          <div className={styles.card}>
            {(recentLog as any[]).map((entry: any, i: number) => (
              <div key={i} className={styles.row}>
                <span style={{ fontSize: 'var(--fs-1)' }}>
                  {entry.action}
                  {entry.detail ? ` — ${typeof entry.detail === 'string' ? entry.detail : JSON.stringify(entry.detail).slice(0, 60)}` : ''}
                </span>
                <span style={{ fontSize: 'var(--fs-0)', color: 'var(--ink3)', flexShrink: 0 }}>
                  {new Date(entry.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
