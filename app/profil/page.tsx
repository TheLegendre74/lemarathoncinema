import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getBadge, getActiveBadge, getAllBadges, levelFromExp, SPECIAL_BADGES, getSpecialBadge } from '@/lib/config'
import { getServerConfig } from '@/lib/serverConfig'
import ExpBar from '@/components/ExpBar'
import Image from 'next/image'
import AvatarUpload from './AvatarUpload'
import BadgeSelector from './BadgeSelector'
import BioEditor from '@/components/BioEditor'
import PseudoEditor from '@/components/PseudoEditor'
import MessagesSection from '@/components/MessagesSection'
import { getMyConversations, getConversationMessages } from '@/lib/actions'
import { getUserCached } from '@/lib/auth'
import { resolveTheme } from '@/lib/themes/resolve'
import { getSeasonWeeks } from '@/lib/themes/seasonWeeks'
import { READY_THEMES, type ThemeKey } from '@/lib/themes/types'
import { cookies } from 'next/headers'
import HorreurProfil from '@/components/theme/horreur/HorreurProfil'

export const revalidate = 30

export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const user = await getUserCached()
  if (!user) redirect('/auth')

  const supabase = await createClient()
  const cfg = await getServerConfig()
  const { with: withUserId } = await searchParams

  const [{ data: profile }, { data: watched }, { data: votes }, { data: eggs }, { data: tama }, conversations, threadMessages, { data: blockedData }] = await Promise.all([
    (supabase as any).from('profiles').select('id, pseudo, exp, avatar_url, active_badge, bio, is_admin, saison, pre_marathon_window_until, created_at').eq('id', user.id).single(),
    supabase.from('watched').select('*, films(id, titre, annee, genre, realisateur, poster)').eq('user_id', user.id).order('watched_at', { ascending: false }),
    supabase.from('votes').select('duel_id, voted_at').eq('user_id', user.id),
    supabase.from('discovered_eggs').select('egg_id').eq('user_id', user.id),
    (supabase as any).from('tamagotchi').select('xp').eq('user_id', user.id).single(),
    getMyConversations(),
    withUserId ? getConversationMessages(withUserId) : Promise.resolve([]),
    (supabase as any).from('blocked_users').select('blocked_id').eq('blocker_id', user.id),
  ])

  if (!profile) redirect('/auth')
  const blockedIds: string[] = (blockedData ?? []).map((b: any) => b.blocked_id)

  // Rank + interlocuteur en parallèle
  let initialOtherProfile: { id: string; pseudo: string; avatar_url: string | null } | null = null
  const otherProfilePromise = withUserId
    ? (() => {
        const conv = (conversations as any[]).find((c: any) => c.otherId === withUserId)
        if (conv?.profile) return Promise.resolve(conv.profile)
        return supabase.from('profiles').select('id, pseudo, avatar_url').eq('id', withUserId).single().then(r => r.data ?? null)
      })()
    : Promise.resolve(null)

  const [rankResult, otherProfile] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('exp', profile.exp),
    otherProfilePromise,
  ])
  initialOtherProfile = otherProfile
  const rank = (rankResult as any).count ?? 1
  const level = levelFromExp(profile.exp)
  const badges = getAllBadges(profile.exp)
  const badge = getActiveBadge(profile.exp, (profile as any).active_badge)
  const rawEggIds = (eggs ?? []).map((e: any) => e.egg_id as string)
  const discoveredEggIds = rawEggIds.includes('rythme-dans-la-peau')
    ? [...rawEggIds, 'fever-night']
    : rawEggIds

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

  // Résolution du thème pour le profil structurel
  const [seasonWeeks, cookieStore] = await Promise.all([getSeasonWeeks(), cookies()])
  const previewRaw = cookieStore.get('cm_theme_apercu')?.value ?? null
  const previewCookie = (previewRaw && READY_THEMES.includes(previewRaw as ThemeKey)) ? previewRaw as ThemeKey : null
  const resolved = resolveTheme({
    now: new Date(),
    cfg: { theme_mode: cfg.theme_mode, theme_force: cfg.theme_force as ThemeKey },
    weeks: seasonWeeks,
    previewCookie,
    isAdmin: !!profile.is_admin,
  })
  const themeKey = resolved.key

  if (themeKey === 'horreur') {
    const marathonWatched = (watched ?? []).filter((w: any) => !w.pre)
    const { data: ratings } = await supabase.from('ratings').select('film_id, score, films(titre)').eq('user_id', user.id).order('score', { ascending: false })
    const ratingsCount = ratings?.length ?? 0
    const bestRating = ratings?.[0] ? { titre: (ratings[0] as any).films?.titre ?? '?', note: ratings[0].score } : null

    const watchedHours = { matin: 0, aprem: 0, soir: 0, nuit: 0 }
    for (const w of marathonWatched) {
      const h = new Date(w.watched_at).getHours()
      if (h >= 6 && h < 12) watchedHours.matin++
      else if (h >= 12 && h < 18) watchedHours.aprem++
      else if (h >= 18 && h < 22) watchedHours.soir++
      else watchedHours.nuit++
    }

    const lastW = marathonWatched[0]
    const allBadgesForHorreur = getAllBadges(profile.exp).map(b => ({
      id: b.id, label: b.label, icon: b.icon, unlocked: b.unlocked,
    }))

    return (
      <>
        <HorreurProfil
          pseudo={profile.pseudo}
          avatarUrl={profile.avatar_url ?? null}
          userId={profile.id}
          exp={profile.exp}
          watchedCount={marathonWatched.length}
          ratingsCount={ratingsCount}
          votesCount={votes?.length ?? 0}
          bio={(profile as any).bio ?? null}
          badges={allBadgesForHorreur}
          createdAt={(profile as any).created_at ?? null}
          lastWatchedTitle={(lastW as any)?.films?.titre ?? null}
          lastWatchedDate={(lastW as any)?.watched_at ?? null}
          watchedHours={watchedHours}
          bestRating={bestRating}
        />
        <AvatarUpload currentAvatar={profile.avatar_url ?? null} pseudo={profile.pseudo} />
        <PseudoEditor initial={profile.pseudo} />
        <BioEditor initial={(profile as any).bio ?? null} />
        <BadgeSelector
          expBadges={badges}
          specialBadges={unlockedSpecials as any}
          activeBadge={(profile as any).active_badge ?? null}
        />
        <MessagesSection
          myId={user.id}
          conversations={conversations as any}
          initialWithId={withUserId ?? null}
          initialMessages={threadMessages as any}
          initialOtherProfile={initialOtherProfile as any}
          blockedIds={blockedIds}
        />
      </>
    )
  }

  return (
    <div data-ecran="profil">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div className="page-title-chrome" style={{ fontFamily: 'var(--f-display)', fontSize: '2rem', lineHeight: 1 }}>Mon Profil</div>
      </div>

      {/* Hero card */}
      <div className="profile-card" style={{ background: 'linear-gradient(135deg, var(--s1), var(--s2))', border: '1px solid var(--line2)', borderRadius: 'var(--radius)', padding: '2rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <AvatarUpload
            currentAvatar={profile.avatar_url ?? null}
            pseudo={profile.pseudo}
          />
          <div>
            <div className="profile-name" style={{ fontFamily: 'var(--f-display)', fontSize: '1.7rem', lineHeight: 1 }}>{profile.pseudo}</div>
            <div style={{ fontSize: '.75rem', color: 'var(--ink3)', marginTop: '.3rem' }}>{user.email}</div>
            <div style={{ marginTop: '.6rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <span className="chip">Niveau {level}</span>
              <span className="chip">#{rank} au classement</span>
              <span className="chip">{cfg.SAISON_LABEL}</span>
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
            <div key={s.l} style={{ textAlign: 'center', background: 'var(--s2)', borderRadius: 'var(--radius)', padding: '.8rem' }}>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: '1.6rem', lineHeight: 1, color: s.cls ? `var(--${s.cls})` : 'var(--ink)' }}>{s.v}</div>
              <div style={{ fontSize: '.63rem', color: 'var(--ink3)', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '.2rem' }}>{s.l}</div>
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
      <a href="/watchlist" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--s1)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '.9rem 1.1rem', marginBottom: '1.5rem', textDecoration: 'none', color: 'var(--ink)', transition: 'border-color .2s' }}>
        <span style={{ fontSize: '1.5rem' }}>📋</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '.9rem', fontWeight: 500 }}>Gérer mes watchlists</div>
          <div style={{ fontSize: '.75rem', color: 'var(--ink3)', marginTop: '.15rem' }}>Crée et partage tes listes de films à voir</div>
        </div>
        <span style={{ fontSize: '.8rem', color: 'var(--ink3)' }}>→</span>
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
              <div style={{ color: 'var(--ink3)', fontSize: '.83rem', marginBottom: '1.5rem' }}>Aucun film vu avant le marathon.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '1.5rem' }}>
                {preList.map((w: any) => {
                  const film = w.films
                  if (!film) return null
                  return (
                    <div key={`pre-${w.film_id}`} style={{ display: 'flex', alignItems: 'center', gap: '.9rem', background: 'var(--s1)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '.65rem .9rem' }}>
                      <div style={{ width: 30, height: 45, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--s2)' }}>
                        {film.poster
                          ? <Image src={film.poster} alt={film.titre} width={30} height={45} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>🎬</div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.87rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--ink3)' }}>{film.annee} · {film.genre}</div>
                      </div>
                      <div style={{ fontSize: '.68rem', color: 'var(--ink3)', flexShrink: 0 }}>{new Date(w.watched_at).toLocaleDateString('fr-FR')}</div>
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
              <div style={{ color: 'var(--ink3)', fontSize: '.83rem' }}>Aucun film vu pendant le marathon.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                {marathonList.map((w: any) => {
                  const film = w.films
                  if (!film) return null
                  return (
                    <div key={`marathon-${w.film_id}`} style={{ display: 'flex', alignItems: 'center', gap: '.9rem', background: 'var(--s1)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '.65rem .9rem' }}>
                      <div style={{ width: 30, height: 45, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: 'var(--s2)' }}>
                        {film.poster
                          ? <Image src={film.poster} alt={film.titre} width={30} height={45} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem' }}>🎬</div>
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '.87rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{film.titre}</div>
                        <div style={{ fontSize: '.7rem', color: 'var(--ink3)' }}>{film.annee} · {film.genre}</div>
                      </div>
                      <div style={{ fontSize: '.68rem', color: 'var(--ink3)', flexShrink: 0 }}>{new Date(w.watched_at).toLocaleDateString('fr-FR')}</div>
                      <span style={{ fontSize: '.7rem', color: 'var(--accent-fg)', fontWeight: 500, flexShrink: 0 }}>+{cfg.EXP_FILM} EXP</span>
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
