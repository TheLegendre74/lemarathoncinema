import { getUserCached } from '@/lib/auth'
import { getServerConfig } from '@/lib/serverConfig'
import { closeDueDuels } from '@/lib/duels'
import { getMySeasonJoinStatus } from '@/lib/actions'
import {
  getWallPosters,
  getTopRatedFilms,
  getTopPlayers,
  getSeasonPlayerCount,
  getFilmCount,
  getNews,
  getWeekFilmArchives,
} from '@/lib/home'
import { getRecentActivity, type ActivityEvent } from '@/lib/activity'
import { createClient } from '@/lib/supabase/server'
import { withCache } from '@/lib/redis'
import { getBadge, levelFromExp } from '@/lib/config'
import { resolveTheme } from '@/lib/themes/resolve'
import { getSeasonWeeks } from '@/lib/themes/seasonWeeks'
import { READY_THEMES, type ThemeKey } from '@/lib/themes/types'
import { cookies } from 'next/headers'
import WelcomeBanner from '@/components/WelcomeBanner'
import JoinMarathonBanner from '@/components/JoinMarathonBanner'
import MarathonNotifyToggle from '@/components/MarathonNotifyToggle'
import Poster from '@/components/Poster'
import ActionHomeHero from '@/components/theme/action/ActionHomeHero'
import ComedieHomeHero from '@/components/theme/comedie/ComedieHomeHero'
import Link from 'next/link'
import s from './page.module.css'

export const revalidate = 60

export default async function HomePage() {
  await closeDueDuels({ duringRender: true })

  const [user, cfg, seasonWeeks, cookieStore] = await Promise.all([
    getUserCached(),
    getServerConfig(),
    getSeasonWeeks(),
    cookies(),
  ])

  const live = new Date() >= cfg.MARATHON_START
  const saisonNum = cfg.SAISON_NUMERO

  const isAdmin = false
  const previewRaw = cookieStore.get('cm_theme_apercu')?.value ?? null
  const previewCookie = (previewRaw && READY_THEMES.includes(previewRaw as ThemeKey)) ? previewRaw as ThemeKey : null
  const resolved = resolveTheme({
    now: new Date(),
    cfg: { theme_mode: cfg.theme_mode, theme_force: cfg.theme_force as ThemeKey },
    weeks: seasonWeeks,
    previewCookie,
    isAdmin,
  })
  const themeKey = resolved.key

  const [
    wallPosters,
    topRated,
    topPlayers,
    seasonPlayers,
    filmCount,
    newsList,
    activity,
  ] = await Promise.all([
    getWallPosters(80),
    getTopRatedFilms(5),
    getTopPlayers(5),
    getSeasonPlayerCount(saisonNum),
    getFilmCount(),
    getNews(5),
    getRecentActivity(10),
  ])

  const accrocheText = (cfg.ACCUEIL_ACCROCHE ?? 'UN MARATHON.\nUNE LISTE.\nTA CULTURE CINÉ.')
    .replace(/\{FILMS\}/g, String(filmCount))
  const bodyText = (cfg.ACCUEIL_TEXTE ?? '')
    .replace(/\{FILMS\}/g, String(filmCount))

  if (!user) {
    return (
      <div>
        <WallHero posters={wallPosters} saisonNum={saisonNum} accroche={accrocheText} body={bodyText} />
        <StatusBandVisitor live={live} cfg={cfg} seasonPlayers={seasonPlayers} />
        <Columns cfg={cfg} live={live} filmCount={filmCount} />
        <Footer
          newsList={newsList}
          topRated={topRated}
          topPlayers={topPlayers}
        />
      </div>
    )
  }

  const userId = user.id
  const supabase = await createClient()

  const [
    { data: profile },
    { count: watchedCountResult },
    { data: weekFilm },
    { data: activeDuel },
    archives,
  ] = await Promise.all([
    (supabase as any).from('profiles')
      .select('id, pseudo, exp, saison, notify_marathon, active_badge, pre_marathon_window_until')
      .eq('id', userId).single(),
    supabase.from('watched')
      .select('film_id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase.from('week_films')
      .select('id, active, films(id, titre, annee, poster, realisateur, genre)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1).single(),
    supabase.from('duels')
      .select('id, week_num, film1:films!duels_film1_id_fkey(id, titre, poster), film2:films!duels_film2_id_fkey(id, titre, poster)')
      .eq('closed', false).eq('pending', false)
      .order('created_at', { ascending: false })
      .limit(1).single(),
    getWeekFilmArchives(10),
  ])

  if (!profile) {
    return (
      <div>
        <WallHero posters={wallPosters} saisonNum={saisonNum} accroche={accrocheText} body={bodyText} />
        <StatusBandVisitor live={live} cfg={cfg} seasonPlayers={seasonPlayers} />
        <Columns cfg={cfg} live={live} filmCount={filmCount} />
        <Footer newsList={newsList} topRated={topRated} topPlayers={topPlayers} />
      </div>
    )
  }

  const isMidSeasonPlayer = live && (profile as any).saison > saisonNum
  const preMarathonWindowUntil = (profile as any).pre_marathon_window_until as string | null
  const joinStatus = isMidSeasonPlayer ? await getMySeasonJoinStatus() : null

  const watchedCount = watchedCountResult ?? 0
  const level = levelFromExp(profile.exp)
  const wf = weekFilm?.films as any
  const d1 = (activeDuel as any)?.film1 as any
  const d2 = (activeDuel as any)?.film2 as any
  const hasWeekFilm = live && !!wf

  return (
    <div>
      {isMidSeasonPlayer && joinStatus?.status !== 'approved_current' && (
        <JoinMarathonBanner
          initialStatus={joinStatus}
          preMarathonWindowUntil={preMarathonWindowUntil}
        />
      )}

      <WelcomeBanner />

      {hasWeekFilm && themeKey === 'action' ? (
        <ActionHomeHero
          weekFilm={wf ? { titre: wf.titre, annee: wf.annee, realisateur: wf.realisateur, genre: wf.genre, poster: wf.poster, id: wf.id } : null}
          fdlsJour={cfg.FDLS_JOUR}
          fdlsHeure={cfg.FDLS_HEURE}
          seanceJour={cfg.SEANCE_JOUR}
          seanceHeure={cfg.SEANCE_HEURE}
          activePlayers={seasonPlayers}
          seasonPlayers={seasonPlayers}
          level={level}
          exp={profile.exp}
          nextLevelExp={level * 100}
          duel={d1 && d2 ? { film1: d1.titre, film2: d2.titre, pctLead: 0, daysLeft: 0 } : null}
          watchlistCount={0}
          activity={activity.slice(0, 5).map(ev => ({
            time: new Date(ev.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            text: ev.type === 'watched' ? `${ev.pseudo} a encaissé ${ev.titre}` : ev.type === 'rated' ? `${ev.pseudo} : relevé ${ev.titre}` : ev.type === 'duel_opened' ? `Face-à-face : ${ev.film1} vs ${ev.film2}` : `Face-à-face terminé — ${ev.winner}`,
            amount: ev.type === 'watched' && ev.exp > 0 ? `+${ev.exp}` : undefined,
          }))}
        />
      ) : hasWeekFilm && themeKey === 'comedie' ? (
        <ComedieHomeHero
          weekFilm={{ titre: wf.titre, annee: wf.annee, realisateur: wf.realisateur, genre: wf.genre, poster: wf.poster, id: wf.id, synopsis: wf.synopsis }}
          fdlsJour={cfg.FDLS_JOUR}
          fdlsHeure={cfg.FDLS_HEURE}
          seanceJour={cfg.SEANCE_JOUR}
          seanceHeure={cfg.SEANCE_HEURE}
          activePlayers={seasonPlayers}
          seasonPlayers={seasonPlayers}
          level={level}
          exp={profile.exp}
          nextLevelExp={level * 100}
          duel={null}
          watchlistCount={0}
          citation={(await import('@/lib/themes/comedie')).comedieTheme.citations[Math.floor(Date.now() / 86400000) % 5]}
          expFilm={cfg.EXP_FILM}
          activity={activity.slice(0, 5).map(ev => ({
            time: new Date(ev.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            text: ev.type === 'watched' ? `${ev.pseudo} a applaudi ${ev.titre}` : ev.type === 'rated' ? `${ev.pseudo} a critiqué ${ev.titre}` : ev.type === 'duel_opened' ? `Applaudimètre : ${ev.film1} vs ${ev.film2}` : `L'applaudimètre est clos — ${ev.winner}`,
            amount: ev.type === 'watched' && ev.exp > 0 ? `+${ev.exp}` : undefined,
          }))}
        />
      ) : hasWeekFilm ? (
        <WeekFilmHero
          wf={wf}
          cfg={cfg}
          archives={archives}
          activity={activity}
          watchedCount={watchedCount}
          filmCount={filmCount}
          level={level}
          exp={profile.exp}
        />
      ) : (
        <WallHero posters={wallPosters} saisonNum={saisonNum} accroche={accrocheText} body={bodyText} />
      )}

      {!live && (
        <StatusBandBeforeSeason
          cfg={cfg}
          seasonPlayers={seasonPlayers}
          notifyMarathon={(profile as any).notify_marathon ?? false}
        />
      )}
      {live && !hasWeekFilm && (
        <StatusBandSeasonNoFilm cfg={cfg} />
      )}
      {live && hasWeekFilm && (
        <StatusBandSeasonActive cfg={cfg} seasonPlayers={seasonPlayers} />
      )}

      <Columns
        cfg={cfg}
        live={live}
        filmCount={filmCount}
        watchedCount={watchedCount}
        d1={d1}
        d2={d2}
        duelWeek={(activeDuel as any)?.week_num}
      />

      <Footer
        newsList={newsList}
        topRated={topRated}
        topPlayers={topPlayers}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  Sub-components                                            */
/* ═══════════════════════════════════════════════════════════ */

function WallHero({ posters, saisonNum, accroche, body }: {
  posters: { id: number; poster: string }[]
  saisonNum: number
  accroche: string
  body: string
}) {
  return (
    <div className={s.hero}>
      <div className={s.wall}>
        {posters.slice(0, 80).map((p, i) => (
          <img
            key={`${p.id}-${i}`}
            src={p.poster.replace('/w500/', '/w92/').replace('/w342/', '/w92/')}
            srcSet={`${p.poster.replace('/w500/', '/w92/').replace('/w342/', '/w92/')} 1x, ${p.poster.replace('/w500/', '/w154/').replace('/w342/', '/w154/')} 2x`}
            alt=""
            loading="lazy"
            decoding="async"
            width={92}
            height={138}
          />
        ))}
      </div>
      <div className={s.veil} />
      <div className={s.heroContent}>
        <div className={s.heroLabel}>LE MARATHON CINÉMA — SAISON {saisonNum}</div>
        <div className={s.accroche}>{accroche}</div>
        <div className={s.accrocheBody}>{body}</div>
      </div>
    </div>
  )
}

function WeekFilmHero({ wf, cfg, archives, activity, watchedCount, filmCount, level, exp }: {
  wf: any
  cfg: any
  archives: any[]
  activity: ActivityEvent[]
  watchedCount: number
  filmCount: number
  level: number
  exp: number
}) {
  const bgUrl = wf.poster ? wf.poster.replace('/w92/', '/w780/').replace('/w154/', '/w780/').replace('/w342/', '/w780/').replace('/w500/', '/w780/') : ''
  const metaParts = [wf.annee, wf.realisateur, wf.genre].filter(Boolean)

  return (
    <>
      <div className={s.heroWeekFilm}>
        {bgUrl && (
          <div className={s.heroWeekFilmBg} style={{ backgroundImage: `url(${bgUrl})` }} />
        )}
        <div className={s.heroWeekFilmContent}>
          <div className={s.weekFilmInfo}>
            <div className={s.weekFilmLabel}>FILM DE LA SEMAINE</div>
            <div className={s.weekFilmTitle}>{wf.titre}</div>
            <div className={s.weekFilmLabel}>
              SÉANCE COLLECTIVE — {cfg.FDLS_JOUR.toUpperCase()} {cfg.FDLS_HEURE}
            </div>
            {metaParts.length > 0 && (
              <div className={s.weekFilmMeta}>{metaParts.join(' · ')}</div>
            )}
          </div>
          <div className={s.weekFilmSidebar}>
            <div className={s.sidebarSection}>
              <div className={s.sidebarTitle}>CE QUI SE PASSE</div>
              <ActivityFeed events={activity.slice(0, 6)} />
            </div>
            <div className={s.sidebarSection}>
              <div className={s.sidebarTitle}>TA PROGRESSION</div>
              <div className={s.progressLine}>
                {watchedCount} / {filmCount} films · Niveau {level} · {exp} EXP
              </div>
            </div>
          </div>
        </div>
      </div>
      {archives.length > 0 && (
        <div className={s.photograms}>
          {archives.map((a: any) => {
            const film = a.films as any
            if (!film?.poster) return null
            return (
              <div key={a.id} className={s.photogram}>
                <img
                  src={film.poster.replace('/w500/', '/w92/').replace('/w342/', '/w92/')}
                  alt={film.titre ?? ''}
                  loading="lazy"
                  decoding="async"
                  width={60}
                  height={90}
                />
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function StatusBandVisitor({ live, cfg, seasonPlayers }: { live: boolean; cfg: any; seasonPlayers: number }) {
  if (!live) {
    const daysLeft = Math.max(0, Math.ceil((cfg.MARATHON_START.getTime() - Date.now()) / 86400000))
    return (
      <div className={s.statusBand}>
        <span>LA SAISON {cfg.SAISON_NUMERO} OUVRE LE {cfg.MARATHON_START.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
        <span className={s.statusSep} />
        <span>J-{daysLeft}</span>
        <span className={s.statusSep} />
        <span>{seasonPlayers} marathoniens inscrits</span>
        <Link href="/auth">Rejoindre</Link>
      </div>
    )
  }

  return (
    <div className={s.statusBand}>
      <span>SAISON {cfg.SAISON_NUMERO} EN COURS</span>
      <Link href="/auth">Rejoindre la saison {cfg.SAISON_NUMERO}</Link>
    </div>
  )
}

function StatusBandBeforeSeason({ cfg, seasonPlayers, notifyMarathon }: {
  cfg: any; seasonPlayers: number; notifyMarathon: boolean
}) {
  const daysLeft = Math.max(0, Math.ceil((cfg.MARATHON_START.getTime() - Date.now()) / 86400000))
  return (
    <div className={s.statusBand}>
      <span>OUVERTURE LE {cfg.MARATHON_START.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }).toUpperCase()}</span>
      <span className={s.statusSep} />
      <span>J-{daysLeft}</span>
      <span className={s.statusSep} />
      <span>{seasonPlayers} inscrits</span>
      <span className={s.statusSep} />
      <Link href="/films">Cocher mes films déjà vus</Link>
    </div>
  )
}

function StatusBandSeasonNoFilm({ cfg }: { cfg: any }) {
  return (
    <div className={s.statusBand}>
      <span>SAISON {cfg.SAISON_NUMERO} EN COURS</span>
      <span className={s.statusSep} />
      <span>Séance : {cfg.SEANCE_JOUR} à {cfg.SEANCE_HEURE}</span>
      <Link href="/films">Voir la liste</Link>
    </div>
  )
}

function StatusBandSeasonActive({ cfg, seasonPlayers }: { cfg: any; seasonPlayers: number }) {
  return (
    <div className={s.statusBand}>
      <span>PROCHAINE SÉANCE : {cfg.FDLS_JOUR.toUpperCase()} {cfg.FDLS_HEURE}</span>
      <span className={s.statusSep} />
      <span>{seasonPlayers} joueurs cette saison</span>
      <span className={s.statusSep} />
      <span>2E SÉANCE : {cfg.SEANCE_JOUR.toUpperCase()} {cfg.SEANCE_HEURE}</span>
    </div>
  )
}

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (!events.length) return null
  return (
    <div>
      {events.map((ev, i) => (
        <div key={i} className={s.activityItem}>
          <span className={s.activityTime}>
            {new Date(ev.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span>
            {ev.type === 'watched' && <>{ev.pseudo} a vu <em>{ev.titre}</em></>}
            {ev.type === 'rated' && <>{ev.pseudo} a noté <em>{ev.titre}</em> {ev.note}/10</>}
            {ev.type === 'duel_opened' && <>Duel ouvert : {ev.film1} vs {ev.film2}</>}
            {ev.type === 'duel_closed' && <>Duel terminé — {ev.winner} l&apos;emporte</>}
          </span>
          {ev.type === 'watched' && ev.exp > 0 && (
            <span className={s.activityAmount}>+{ev.exp} EXP</span>
          )}
        </div>
      ))}
    </div>
  )
}

function Columns({ cfg, live, filmCount, watchedCount, d1, d2, duelWeek }: {
  cfg: any
  live: boolean
  filmCount: number
  watchedCount?: number
  d1?: any
  d2?: any
  duelWeek?: number
}) {
  const showVideoclub = cfg.videoclub_mode !== 'cache'

  return (
    <div className={s.columns} style={!showVideoclub ? { gridTemplateColumns: '1fr 1fr' } : undefined}>
      <div className={s.column}>
        <div className={s.columnNum}>01 — LA LISTE</div>
        <div className={s.columnTitle}>Coche tes films</div>
        <div className={s.columnText}>
          Tous les films sont dans la liste. Coche ceux que tu as déjà vus : tu sais d&apos;où tu pars.
          Ceux que tu vois pendant le marathon te font monter de niveau.
        </div>
        {watchedCount != null && (
          <div className={s.progressLine}>
            Ta progression : {watchedCount} / {filmCount}
          </div>
        )}
        <Link href="/films" className={s.columnLink}>Voir la liste</Link>
      </div>

      <div className={s.column}>
        <div className={s.columnNum}>02 — LA SEMAINE</div>
        <div className={s.columnTitle}>Un genre à la fois</div>
        <div className={s.columnText}>
          Chaque semaine de la saison a son genre, et le site change d&apos;apparence avec lui.
          Deux séances collectives : le {cfg.SEANCE_JOUR} et le {cfg.FDLS_JOUR} à {cfg.FDLS_HEURE}.
        </div>
        {live && d1 && d2 && (
          <div className={s.duelInline}>
            <div className={s.duelLabel}>DUEL EN COURS{duelWeek ? ` · SEMAINE ${duelWeek}` : ''}</div>
            <div className={s.duelFilms}>{d1.titre} vs {d2.titre}</div>
            <Link href="/duels" className={s.columnLink}>Voter</Link>
          </div>
        )}
      </div>

      {showVideoclub && (
        <div className={s.column}>
          <div className={s.columnNum}>03 — LE VIDÉOCLUB</div>
          <div className={s.columnTitle}>L&apos;étagère commune</div>
          <div className={s.columnText}>
            Chaque film vu sort du rayon et s&apos;use. Ton nom reste sur la boîte que tu as ouverte le premier.
            Bientôt.
          </div>
        </div>
      )}
    </div>
  )
}

function Footer({ newsList, topRated, topPlayers }: {
  newsList: any[]
  topRated: any[]
  topPlayers: any[]
}) {
  return (
    <div className={s.footer}>
      {newsList.length > 0 && (
        <div className={s.newsSection}>
          <div className={s.newsTitle}>Annonces</div>
          {newsList.map((n: any) => (
            <div key={n.id} className={s.newsItem}>
              <div className={s.newsItemTitle}>
                {n.pinned && <span className={s.pinnedTag}>ÉPINGLÉ</span>}
                {n.title}
              </div>
              <div className={s.newsItemContent}>{n.content}</div>
              <div className={s.newsItemMeta}>
                {n.profiles?.pseudo ?? 'Admin'} · {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={s.bottomRow}>
        <div>
          <div className={s.bottomTitle}>Les mieux notés</div>
          {topRated.map((f: any, i: number) => (
            <div key={f.id} className={s.topFilmRow}>
              <div className={s.topFilmPoster}>
                {f.poster && (
                  <img
                    src={f.poster.replace('/w500/', '/w92/').replace('/w342/', '/w92/')}
                    alt={f.titre}
                    loading="lazy"
                    decoding="async"
                    width={40}
                    height={60}
                  />
                )}
              </div>
              <span className={s.topFilmTitle}>{f.titre}</span>
            </div>
          ))}
        </div>
        <div>
          <div className={s.bottomTitle}>Classement</div>
          {topPlayers.map((p: any, i: number) => (
            <div key={p.id} className={s.leaderRow}>
              <span className={s.leaderRank}>{i + 1}</span>
              <span className={s.leaderName}>{p.pseudo}</span>
              <span className={s.leaderExp}>{p.exp} EXP</span>
            </div>
          ))}
        </div>
      </div>

      <div className={s.rulesLine}>
        Première fois ? <Link href="/regles" className={s.rulesLink}>Lire les règles</Link>
      </div>
    </div>
  )
}
