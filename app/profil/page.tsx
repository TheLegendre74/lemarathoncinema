import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getBadge, getAllBadges, levelFromExp, CONFIG } from '@/lib/config'
import ExpBar from '@/components/ExpBar'
import Image from 'next/image'
import AvatarUpload from './AvatarUpload'

export const revalidate = 30

export default async function ProfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const [{ data: profile }, { data: watched }, { data: votes }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('watched').select('*, films(id, titre, annee, genre, realisateur, poster)').eq('user_id', user.id).order('watched_at', { ascending: false }),
    supabase.from('votes').select('duel_id, voted_at').eq('user_id', user.id),
  ])

  if (!profile) redirect('/auth')

  const { data: rankData } = await supabase.from('profiles').select('id').gte('exp', profile.exp)
  const rank = rankData?.length ?? 1
  const level = levelFromExp(profile.exp)
  const badges = getAllBadges(profile.exp)
  const badge = getBadge(profile.exp)

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Mon Profil</div>
      </div>

      {/* Hero card */}
      <div style={{ background: 'linear-gradient(135deg, var(--bg2), var(--bg3))', border: '1px solid var(--border2)', borderRadius: 'var(--rxl)', padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <AvatarUpload
            currentAvatar={profile.avatar_url ?? null}
            pseudo={profile.pseudo}
          />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', lineHeight: 1 }}>{profile.pseudo}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginTop: '.3rem' }}>{user.email}</div>
            <div style={{ marginTop: '.6rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <span className="chip">Niveau {level}</span>
              <span className="chip">#{rank} au classement</span>
              <span className="chip">{CONFIG.SAISON_LABEL}</span>
              {badge && <span className={`badge-pill ${badge.cls}`}>{badge.icon} {badge.label}</span>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.8rem', marginBottom: '1.2rem' }}>
          {[
            { v: profile.exp, l: 'EXP', cls: 'gold' },
            { v: watched?.length ?? 0, l: 'Films vus', cls: 'green' },
            { v: votes?.length ?? 0, l: 'Votes', cls: 'blue' },
            { v: level, l: 'Niveau', cls: '' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center', background: 'var(--bg3)', borderRadius: 'var(--r)', padding: '.8rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1, color: s.cls ? `var(--${s.cls})` : 'var(--text)' }}>{s.v}</div>
              <div style={{ fontSize: '.63rem', color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '.2rem' }}>{s.l}</div>
            </div>
          ))}
        </div>

        <ExpBar exp={profile.exp} />
      </div>

      {/* Badges */}
      <div className="section-title">Badges</div>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {badges.map(b => (
          <div key={b.id} className={`badge-pill ${b.unlocked ? b.cls : 'badge-locked'}`} title={b.desc}>
            <span style={{ fontSize: 13 }}>{b.icon}</span>
            {b.label}
            {!b.unlocked && <span style={{ fontSize: '.63rem', opacity: .7 }}>({b.req} EXP)</span>}
          </div>
        ))}
      </div>

      {/* Films vus */}
      <div className="section-title">Films vus ({watched?.length ?? 0})</div>
      {!watched?.length ? (
        <div style={{ color: 'var(--text3)', fontSize: '.83rem' }}>Aucun film vu. Lance-toi dans le marathon !</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
          {watched.map((w: any) => {
            const film = (w as any).films
            if (!film) return null
            return (
              <div key={`${w.film_id}-${w.watched_at}`} style={{ display: 'flex', alignItems: 'center', gap: '.9rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.65rem .9rem' }}>
                <div style={{ width: 30, height: 45, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                  {film.poster
                    ? <Image src={film.poster} alt={film.titre} width={30} height={45} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>🎬</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '.87rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>{film.annee} · {film.genre}</div>
                </div>
                {w.pre && <span style={{ fontSize: '.67rem', color: 'var(--text3)', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 99, padding: '2px 7px', whiteSpace: 'nowrap' }}>Pré-marathon</span>}
                <div style={{ fontSize: '.68rem', color: 'var(--text3)', flexShrink: 0 }}>{new Date(w.watched_at).toLocaleDateString('fr-FR')}</div>
                {!w.pre && <span style={{ fontSize: '.7rem', color: 'var(--gold)', fontWeight: 500, flexShrink: 0 }}>+{CONFIG.EXP_FILM} EXP</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
