import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Countdown from '@/components/Countdown'
import ExpBar from '@/components/ExpBar'
import Poster from '@/components/Poster'
import { getBadge, levelFromExp, CONFIG } from '@/lib/config'
import { getServerConfig } from '@/lib/serverConfig'
import Link from 'next/link'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const cfg = await getServerConfig()

  const [{ data: profile }, { data: watched }, { data: votes }, { data: weekFilm }, { data: activeDuel }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('watched').select('film_id').eq('user_id', user.id),
    supabase.from('votes').select('duel_id').eq('user_id', user.id),
    supabase.from('week_films').select('*, films(*)').eq('active', true).single(),
    supabase.from('duels').select('*, film1:films!duels_film1_id_fkey(*), film2:films!duels_film2_id_fkey(*)').eq('closed', false).order('created_at', { ascending: false }).limit(1).single(),
  ])

  if (!profile) redirect('/auth')

  const { data: totalFilms } = await supabase.from('films').select('id', { count: 'exact' }).eq('saison', 1)
  const totalS1 = totalFilms?.length ?? 0
  const watchedCount = watched?.length ?? 0
  const pct = totalS1 ? Math.round((watchedCount / totalS1) * 100) : 0
  const level = levelFromExp(profile.exp)
  const badge = getBadge(profile.exp)
  const live = new Date() >= cfg.MARATHON_START

  // Rank
  const { data: rankData } = await supabase
    .from('profiles')
    .select('id')
    .gte('exp', profile.exp)
  const rank = rankData?.length ?? 1

  // Recent activity
  const { data: recentWatched } = await supabase
    .from('watched')
    .select('film_id, watched_at, pre, films(titre)')
    .eq('user_id', user.id)
    .order('watched_at', { ascending: false })
    .limit(5)

  const wf = weekFilm?.films as any
  const d1 = (activeDuel as any)?.film1
  const d2 = (activeDuel as any)?.film2

  return (
    <div>
      {/* S2 banner */}
      {profile.saison > CONFIG.SAISON_NUMERO && live && (
        <div style={{ background: 'rgba(240,160,96,.07)', border: '1px solid rgba(240,160,96,.25)', borderRadius: 'var(--rl)', padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontSize: '1.5rem' }}>🔴</span>
          <div>
            <div style={{ fontSize: '.85rem', fontWeight: 500, color: 'var(--orange)' }}>Tu t'es inscrit après le début du marathon</div>
            <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginTop: '.2rem', lineHeight: 1.6 }}>
              Tes points seront comptabilisés à partir de la <strong>Saison {CONFIG.SAISON_NUMERO + 1}</strong>. Rendez-vous le mois prochain !
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>
          Bonjour, {profile.pseudo} 👋
        </div>
        <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem', display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
          Niveau {level} · {profile.exp} EXP · #{rank} au classement
          {badge && (
            <span className={`badge-pill ${badge.cls}`} style={{ fontSize: '.7rem' }}>
              {badge.icon} {badge.label}
            </span>
          )}
        </div>
      </div>

      <Countdown marathonStart={cfg.MARATHON_START.toISOString()} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '.8rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'EXP Totale', value: profile.exp, cls: 'gold' },
          { label: 'Films vus', value: watchedCount, cls: 'green' },
          { label: 'Votes duels', value: votes?.length ?? 0, cls: 'blue' },
          { label: 'Progression', value: `${pct}%`, cls: 'gold' },
          { label: 'Classement', value: `#${rank}`, cls: '' },
        ].map(s => (
          <div key={s.label} className="stat">
            <div className="stat-l">{s.label}</div>
            <div className={`stat-v ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div className="progress-label">
          <span>Marathon {CONFIG.SAISON_LABEL}</span>
          <span>{watchedCount}/{totalS1}</span>
        </div>
        <div className="expbar" style={{ height: 10 }}>
          <div className="expbar-fill" style={{ width: `${pct}%`, height: 10 }} />
        </div>
      </div>

      {/* Week film + active duel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {wf && (
          <Link href="/semaine" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
              <div style={{ fontSize: '.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '.5rem' }}>🎬 Film de la semaine</div>
              <div style={{ display: 'flex', gap: '.8rem', alignItems: 'center' }}>
                <div style={{ width: 50, height: 75, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                  <Poster film={wf} width={50} height={75} style={{ objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text)', lineHeight: 1.2 }}>{wf.titre}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text3)', marginTop: '.2rem' }}>{wf.annee}</div>
                  <div style={{ marginTop: '.5rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: 'rgba(232,196,106,.1)', border: '1px solid rgba(232,196,106,.28)', color: 'var(--gold)', fontSize: '.68rem', padding: '.2rem .6rem', borderRadius: 99 }}>
                    +{CONFIG.EXP_FDLS} EXP vendredi
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )}

        {d1 && d2 && (
          <Link href="/duels" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', height: '100%' }}>
              <div style={{ fontSize: '.6rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '.5rem' }}>⚔️ Duel en cours · Semaine {(activeDuel as any)?.week_num}</div>
              <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', justifyContent: 'center' }}>
                {[d1, d2].map((f: any, i: number) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    {i === 1 && <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text3)', flexShrink: 0 }}>VS</div>}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ width: 48, height: 72, borderRadius: 5, overflow: 'hidden', margin: '0 auto .3rem', background: 'var(--bg3)' }}>
                        <Poster film={f} width={48} height={72} style={{ objectFit: 'cover' }} />
                      </div>
                      <div style={{ fontSize: '.72rem', fontWeight: 500, maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.titre}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* EXP to next level */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '.68rem', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: '.8rem' }}>Progression EXP</div>
        <ExpBar exp={profile.exp} />
      </div>

      {/* Recent activity */}
      <div className="section-title">Activité récente</div>
      {!recentWatched?.length ? (
        <div style={{ color: 'var(--text3)', fontSize: '.83rem' }}>
          Aucune activité. <Link href="/films" style={{ color: 'var(--gold)' }}>Commence par marquer des films !</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
          {recentWatched.map((w: any) => {
            const film = w.films as any
            return (
              <div key={`${w.film_id}-${w.watched_at}`} style={{ display: 'flex', alignItems: 'center', gap: '.9rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.65rem .9rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🎬</span>
                <span style={{ flex: 1, fontSize: '.85rem' }}>{film?.titre}{w.pre ? ' (pré-marathon)' : ''}</span>
                <span style={{ fontSize: '.68rem', color: 'var(--text3)' }}>{new Date(w.watched_at).toLocaleDateString('fr-FR')}</span>
                {!w.pre && <span style={{ fontSize: '.72rem', color: 'var(--gold)', fontWeight: 500 }}>+{CONFIG.EXP_FILM} EXP</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
