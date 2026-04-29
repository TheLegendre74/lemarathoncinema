import { createClient } from '@/lib/supabase/server'
import { getBadge } from '@/lib/config'
import { getServerConfig } from '@/lib/serverConfig'
import { getUserCached } from '@/lib/auth'
import { withCache } from '@/lib/redis'
import Countdown from '@/components/Countdown'
import ClassementClient from './ClassementClient'

export const revalidate = 60

export default async function ClassementPage() {
  const [user, cfg, supabase] = await Promise.all([
    getUserCached(),
    getServerConfig(),
    createClient(),
  ])

  const marathonLive = new Date() >= cfg.MARATHON_START

  if (!marathonLive) {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Classement</div>
          <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>Le classement s&apos;ouvre au lancement du marathon</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏆</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', marginBottom: '.5rem' }}>Pas encore…</div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: '2rem' }}>
            Le classement des joueurs sera disponible dès le coup d&apos;envoi du marathon.
          </div>
          <Countdown marathonStart={cfg.MARATHON_START.toISOString()} />
        </div>
      </div>
    )
  }

  // Données publiques cachées — même pour tous les utilisateurs
  const [ranked, marathonRanked, archives, activeBadges] = await Promise.all([
    withCache('leaderboard:global', 60, async () => {
      const { data } = await (supabase as any).rpc('leaderboard', { limit_n: 100 })
      return data ?? []
    }),
    withCache('leaderboard:marathon', 60, async () => {
      const { data } = await (supabase as any).rpc('marathon_leaderboard', { limit_n: 100 })
      return data ?? []
    }),
    withCache('archives:all', 600, async () => {
      const { data } = await (supabase as any).from('season_archives').select('*').order('saison', { ascending: false }).order('rank_global')
      return data ?? []
    }),
    withCache('profiles:badges', 60, async () => {
      const { data } = await supabase.from('profiles').select('id, active_badge')
      return data ?? []
    }),
  ])

  const activeBadgeMap: Record<string, string | null> = {}
  ;(activeBadges as any[] ?? []).forEach((p: any) => { activeBadgeMap[p.id] = p.active_badge })
  const rankedWithBadge = (ranked as any[] ?? []).map((u: any) => ({ ...u, active_badge: activeBadgeMap[u.id] ?? null }))
  const marathonWithBadge = (marathonRanked as any[] ?? []).map((u: any) => ({ ...u, active_badge: activeBadgeMap[u.id] ?? null }))

  // Regrouper les archives par saison
  const archivesBySaison: Record<number, any[]> = {}
  ;(archives as any[] ?? []).forEach((row: any) => {
    if (!archivesBySaison[row.saison]) archivesBySaison[row.saison] = []
    archivesBySaison[row.saison].push(row)
  })

  return (
    <ClassementClient
      userId={user?.id ?? null}
      ranked={rankedWithBadge}
      marathonRanked={marathonWithBadge}
      archivesBySaison={archivesBySaison}
    />
  )
}
