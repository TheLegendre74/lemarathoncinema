import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getBadge, getAllBadges, levelFromExp, SPECIAL_BADGES, getSpecialBadge, CONFIG } from '@/lib/config'
import ExpBar from '@/components/ExpBar'
import Image from 'next/image'
import AvatarUpload from './AvatarUpload'
import BadgeSelector from './BadgeSelector'
import BioEditor from '@/components/BioEditor'
import PseudoEditor from '@/components/PseudoEditor'
import MessagesSection from '@/components/MessagesSection'
import { getMyConversations, getConversationMessages } from '@/lib/actions'

export const revalidate = 30

export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')
  const { with: withUserId } = await searchParams

  const [{ data: profile }, { data: watched }, { data: votes }, { data: eggs }, { data: tama }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('watched').select('*, films(id, titre, annee, genre, realisateur, poster)').eq('user_id', user.id).order('watched_at', { ascending: false }),
    supabase.from('votes').select('duel_id, voted_at').eq('user_id', user.id),
    supabase.from('discovered_eggs').select('egg_id').eq('user_id', user.id),
    (supabase as any).from('tamagotchi').select('xp').eq('user_id', user.id).single(),
  ])

  if (!profile) redirect('/auth')

  // Messages
  const [conversations, threadMessages] = await Promise.all([
    getMyConversations(),
    withUserId ? getConversationMessages(withUserId) : Promise.resolve([]),
  ])

  // Interlocuteur initial
  let initialOtherProfile: { id: string; pseudo: string; avatar_url: string | null } | null = null
  if (withUserId) {
    const conv = conversations.find((c: any) => c.otherId === withUserId)
    if (conv?.profile) {
      initialOtherProfile = conv.profile
    } else {
      const { data: op } = await supabase.from('profiles').select('id, pseudo, avatar_url').eq('id', withUserId).single()
      initialOtherProfile = op ?? null
    }
  }

  // Utilisateurs bloqués par moi
  const { data: blockedData } = await (supabase as any)
    .from('blocked_users')
    .select('blocked_id')
    .eq('blocker_id', user.id)
  const blockedIds: string[] = (blockedData ?? []).map((b: any) => b.blocked_id)

  const { data: rankData } = await supabase.from('profiles').select('id').gte('exp', profile.exp)
  const rank = rankData?.length ?? 1
  const level = levelFromExp(profile.exp)
  const badges = getAllBadges(profile.exp)
  const badge = getBadge(profile.exp)
  const discoveredEggIds = (eggs ?? []).map((e: any) => e.egg_id as string)

  // Titres Tamagotchi débloqués selon le niveau
  const tamaXp = tama?.xp ?? 0
  const tamaLevel = 1 + Math.floor(tamaXp / 30)
  const unlockedTamaTitles: string[] = []
  if (tamaLevel >= 2)  unlockedTamaTitles.push('tama_explorateur')
  if (tamaLevel >= 5)  unlockedTamaTitles.push('tama_chasseur')
  if (tamaLevel >= 8)  unlockedTamaTitles.push('tama_legende')
  if (tamaLevel >= 10) unlockedTamaTitles.push('tama_maitre')

  const unlockedSpecials = SPECIAL_BADGES.filter(b =>
    discoveredEggIds.includes(b.id) || unlockedTamaTitles.includes(b.id)
  )

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

      {/* Pseudo */}
      <PseudoEditor initial={profile.pseudo} />

      {/* Bio */}
      <BioEditor initial={(profile as any).bio ?? null} />

      {/* Badge selector */}
      <BadgeSelector
        expBadges={badges}
        specialBadges={unlockedSpecials as any}
        activeBadge={(profile as any).active_badge ?? null}
      />

      {/* Tous les badges EXP (locked inclus) */}
      <div className="section-title">Tous les badges</div>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {badges.map(b => (
          <div key={b.id} className={`badge-pill ${b.unlocked ? b.cls : 'badge-locked'}`} title={b.desc}>
            <span style={{ fontSize: 13 }}>{b.icon}</span>
            {b.label}
            {!b.unlocked && <span style={{ fontSize: '.63rem', opacity: .7 }}>({b.req} EXP)</span>}
          </div>
        ))}
      </div>

      {/* Watchlist */}
      <div className="section-title" style={{ marginTop: '1rem' }}>Mes Watchlists</div>
      <a href="/watchlist" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.9rem 1.1rem', marginBottom: '1.5rem', textDecoration: 'none', color: 'var(--text)', transition: 'border-color .2s' }}>
        <span style={{ fontSize: '1.5rem' }}>📋</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '.9rem', fontWeight: 500 }}>Gérer mes watchlists</div>
          <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginTop: '.15rem' }}>Crée et partage tes listes de films à voir</div>
        </div>
        <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>→</span>
      </a>

      {/* Messages privés */}
      <MessagesSection
        myId={user.id}
        conversations={conversations as any}
        initialWithId={withUserId ?? null}
        initialMessages={threadMessages as any}
        initialOtherProfile={initialOtherProfile as any}
        blockedIds={blockedIds}
      />

      {/* Films vus — Pré-marathon */}
      {(() => {
        const preList = (watched ?? []).filter((w: any) => w.pre)
        return (
          <>
            <div className="section-title" style={{ marginTop: '1rem' }}>
              Films vus avant le marathon ({preList.length})
            </div>
            {!preList.length ? (
              <div style={{ color: 'var(--text3)', fontSize: '.83rem', marginBottom: '1.5rem' }}>Aucun film vu avant le marathon.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '1.5rem' }}>
                {preList.map((w: any) => {
                  const film = w.films
                  if (!film) return null
                  return (
                    <div key={`pre-${w.film_id}`} style={{ display: 'flex', alignItems: 'center', gap: '.9rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.65rem .9rem' }}>
                      <div style={{ width: 30, height: 45, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                        {film.poster
                          ? <Image src={film.poster} alt={film.titre} width={30} height={45} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>🎬</div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.87rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>{film.annee} · {film.genre}</div>
                      </div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text3)', flexShrink: 0 }}>{new Date(w.watched_at).toLocaleDateString('fr-FR')}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )
      })()}

      {/* Films vus — Pendant le marathon */}
      {(() => {
        const marathonList = (watched ?? []).filter((w: any) => !w.pre)
        return (
          <>
            <div className="section-title">
              Films vus pendant le marathon ({marathonList.length})
            </div>
            {!marathonList.length ? (
              <div style={{ color: 'var(--text3)', fontSize: '.83rem' }}>Aucun film vu pendant le marathon.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                {marathonList.map((w: any) => {
                  const film = w.films
                  if (!film) return null
                  return (
                    <div key={`marathon-${w.film_id}`} style={{ display: 'flex', alignItems: 'center', gap: '.9rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '.65rem .9rem' }}>
                      <div style={{ width: 30, height: 45, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)' }}>
                        {film.poster
                          ? <Image src={film.poster} alt={film.titre} width={30} height={45} style={{ objectFit: 'cover', width: '100%', height: '100%' }} unoptimized />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>🎬</div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.87rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--text3)' }}>{film.annee} · {film.genre}</div>
                      </div>
                      <div style={{ fontSize: '.68rem', color: 'var(--text3)', flexShrink: 0 }}>{new Date(w.watched_at).toLocaleDateString('fr-FR')}</div>
                      <span style={{ fontSize: '.7rem', color: 'var(--gold)', fontWeight: 500, flexShrink: 0 }}>+{CONFIG.EXP_FILM} EXP</span>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )
      })()}
    </div>
  )
}
