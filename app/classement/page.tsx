import { createClient } from '@/lib/supabase/server'
import { getBadge } from '@/lib/config'
import { getServerConfig } from '@/lib/serverConfig'
import Countdown from '@/components/Countdown'
import ClassementClient from './ClassementClient'

export const revalidate = 60

export default async function ClassementPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cfg = await getServerConfig()

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

  const [{ data: ranked }, { data: marathonRanked }, { data: archives }] = await Promise.all([
    (supabase as any).rpc('leaderboard', { limit_n: 100 }),
    (supabase as any).rpc('marathon_leaderboard', { limit_n: 100 }),
    (supabase as any).from('season_archives').select('*').order('saison', { ascending: false }).order('rank_global'),
  ])

  // Regrouper les archives par saison
  const archivesBySaison: Record<number, any[]> = {}
  ;(archives ?? []).forEach((row: any) => {
    if (!archivesBySaison[row.saison]) archivesBySaison[row.saison] = []
    archivesBySaison[row.saison].push(row)
  })

  return (
    <ClassementClient
      userId={user?.id ?? null}
      ranked={ranked ?? []}
      marathonRanked={marathonRanked ?? []}
      archivesBySaison={archivesBySaison}
    />
  )
}
