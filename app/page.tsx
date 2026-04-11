import { createClient } from '@/lib/supabase/server'
import Countdown from '@/components/Countdown'
import ExpBar from '@/components/ExpBar'
import Poster from '@/components/Poster'
import MarathonNotifyToggle from '@/components/MarathonNotifyToggle'
import WelcomeBanner from '@/components/WelcomeBanner'
import { getBadge, levelFromExp, CONFIG } from '@/lib/config'
import { getServerConfig } from '@/lib/serverConfig'
import type { ServerConfig } from '@/lib/serverConfig'
import Link from 'next/link'

export const revalidate = 60

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cfg = await getServerConfig()
  const live = new Date() >= cfg.MARATHON_START

  // News (public)
  const { data: newsList } = await (supabase as any)
    .from('news')
    .select('*, profiles(pseudo)')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  // Guest homepage
  if (!user) {
    const { data: totalFilms } = await supabase.from('films').select('id', { count: 'exact' }).eq('saison', 1)
    const { data: playerCount } = await supabase.from('profiles').select('id', { count: 'exact' })
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>Ciné Marathon</div>
          <div style={{ color: 'var(--text2)', fontSize: '.83rem', marginTop: '.35rem' }}>{cfg.ACCUEIL_SOUS_TITRE}</div>
        </div>

        <Countdown marathonStart={cfg.MARATHON_START.toISOString()} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.8rem', marginBottom: '1.5rem' }}>
          <div className="stat"><div className="stat-l">Films S1</div><div className="stat-v gold">{totalFilms?.length ?? 0}</div></div>
          <div className="stat"><div className="stat-l">Joueurs</div><div className="stat-v blue">{playerCount?.length ?? 0}</div></div>
        </div>

        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.8rem' }}>👋</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: '.5rem' }}>Mode Invité</div>
          <div style={{ fontSize: '.83rem', color: 'var(--text2)', marginBottom: '1.2rem', lineHeight: 1.6 }}>
            Tu peux naviguer librement et découvrir les films du marathon.<br />
            Connecte-toi pour participer, voter et accumuler de l'EXP !
          </div>
          <Link href="/auth" className="btn btn-gold" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Se connecter / S'inscrire
          </Link>
        </div>

        <NewsSection newsList={newsList ?? []} />
        <RulesSection cfg={cfg} />
      </div>
    )
  }

  const [{ data: profile }, { data: watched }, { data: votes }, { data: weekFilm }, { data: activeDuel }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('watched').select('film_id').eq('user_id', user.id),
    supabase.from('votes').select('duel_id').eq('user_id', user.id),
    supabase.from('week_films').select('*, films(*)').eq('active', true).single(),
    supabase.from('duels').select('*, film1:films!duels_film1_id_fkey(*), film2:films!duels_film2_id_fkey(*)').eq('closed', false).order('created_at', { ascending: false }).limit(1).single(),
  ])

  if (!profile) {
    return (
      <div>
        <Countdown marathonStart={cfg.MARATHON_START.toISOString()} />
        <NewsSection newsList={newsList ?? []} />
        <RulesSection cfg={cfg} />
      </div>
    )
  }

  const { data: totalFilms } = await supabase.from('films').select('id', { count: 'exact' }).eq('saison', 1)
  const totalS1 = totalFilms?.length ?? 0
  const watchedCount = watched?.length ?? 0
  const pct = totalS1 ? Math.round((watchedCount / totalS1) * 100) : 0
  const level = levelFromExp(profile.exp)
  const badge = getBadge(profile.exp)

  const { data: rankData } = await supabase.from('profiles').select('id').gte('exp', profile.exp)
  const rank = rankData?.length ?? 1

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

      {/* Notification marathon (visible uniquement avant le lancement) */}
      {!live && <MarathonNotifyToggle initial={(profile as any).notify_marathon ?? false} />}

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
      <div className="home-quick-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
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

      {/* News */}
      <NewsSection newsList={newsList ?? []} />

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

      {/* Rules */}
      <WelcomeBanner />
      <div id="regles">
        <RulesSection cfg={cfg} />
      </div>
    </div>
  )
}

// ─── NEWS SECTION ─────────────────────────────────────────────────────────────
function NewsSection({ newsList }: { newsList: any[] }) {
  if (!newsList.length) return null
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div className="section-title">📢 News</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
        {newsList.map((n: any) => (
          <div key={n.id} style={{
            background: n.pinned ? 'rgba(232,196,106,.05)' : 'var(--bg2)',
            border: `1px solid ${n.pinned ? 'rgba(232,196,106,.3)' : 'var(--border)'}`,
            borderRadius: 'var(--r)', padding: '1rem 1.2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.4rem' }}>
              {n.pinned && <span style={{ fontSize: '.65rem', background: 'rgba(232,196,106,.15)', color: 'var(--gold)', border: '1px solid rgba(232,196,106,.3)', borderRadius: 99, padding: '1px 7px' }}>📌 ÉPINGLÉ</span>}
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{n.title}</span>
            </div>
            <div style={{ fontSize: '.83rem', color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.content}</div>
            <div style={{ fontSize: '.68rem', color: 'var(--text3)', marginTop: '.5rem' }}>
              {n.profiles?.pseudo ?? 'Admin'} · {new Date(n.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── RULES TYPES ─────────────────────────────────────────────────────────────
export type RuleCard = {
  emoji: string
  title: string
  text?: string
  intro?: string
  list?: string[]
  after?: string
  table?: [string, string][]
}

export const DEFAULT_RULES: RuleCard[] = [
  { emoji: '🎬', title: 'Bienvenue sur le Ciné Marathon !', text: "Un marathon de films collectif où tu regardes des films, votes pour les séances, discutes avec les autres joueurs et grimpes dans le classement en gagnant de l'expérience (EXP)." },
  { emoji: '🚀', title: 'Pour commencer', text: "Crée ton compte avant le 10 Avril 2026. Après cette date, le marathon est lancé et tu devras attendre la Saison 2." },
  { emoji: '🎥', title: 'Les films', intro: "Une liste de films t'attend. Pour chaque film tu peux :", list: ['Le cocher comme vu', 'Le noter de 1 à 10', 'Discuter dans le forum du film', 'Voir où le regarder légalement (Netflix, Canal+, Prime…)', 'Tirer un film au hasard si tu ne sais pas quoi regarder'], after: "Tu peux aussi proposer un nouveau film à ajouter à la liste." },
  { emoji: '⭐', title: "Gagner de l'EXP", table: [['Regarder un film', '+{EXP_FILM} EXP'], ['Regarder le film de la semaine', '+{EXP_FDLS} EXP'], ['Regarder le film vainqueur du duel', '+{EXP_DUEL_WIN} EXP'], ['Voter dans un duel', '+{EXP_VOTE} EXP']] },
  { emoji: '⚔️', title: 'Les duels', text: "Chaque semaine, deux films s'affrontent. Tu votes pour celui que tu veux voir en séance collective. Le vainqueur est regardé ensemble le {SEANCE_JOUR} à {SEANCE_HEURE} et rapporte +{EXP_DUEL_WIN} EXP." },
  { emoji: '📽️', title: 'Le film de la semaine', text: "Chaque {FDLS_JOUR} à {FDLS_HEURE}, un film est annoncé pour une séance collective. Le regarder rapporte +{EXP_FDLS} EXP." },
  { emoji: '💬', title: 'Forum & Le Salon', text: "Chaque film a son propre espace de discussion. Le Salon est un espace libre pour parler cinéma avec tous les membres. Tu peux aussi créer tes propres sujets." },
  { emoji: '🎓', title: 'Rattrapage cinéma', text: "Tu débutes ou tu veux aller plus loin ? La section Rattrapage propose des listes de films classés par niveau : Débutant, Intermédiaire et Confirmé." },
  { emoji: '🥚', title: 'Easter Eggs', text: "Des surprises sont cachées partout sur le site. Explore, tape des mots-clés au clavier, clique sur des éléments inattendus… Trouve-les tous pour débloquer des succès secrets !" },
  { emoji: '🏅', title: 'Les badges', text: "Plus tu accumules d'EXP, plus tu débloques des badges :", table: [['🎞️ Padawan', '5 EXP'], ["🎬 L'Apprenti", '50 EXP'], ['📝 Le Critique', '100 EXP'], ['🎭 Cinéphile', '150 EXP'], ["🏆 L'Auteur", '200 EXP'], ['👑 Légende Vivante', '300 EXP']] },
  { emoji: '🏆', title: 'Le classement', text: "Tous les joueurs sont classés par EXP. Le classement Marathon met en avant les films vus et notés pendant le marathon. Les archives conservent les résultats de chaque saison. Qui sera la Légende Vivante de la Saison 1 ?" },
]

function interpolate(text: string, cfg: ServerConfig): string {
  return text
    .replace(/\{EXP_FILM\}/g,     String(cfg.EXP_FILM))
    .replace(/\{EXP_FDLS\}/g,     String(cfg.EXP_FDLS))
    .replace(/\{EXP_DUEL_WIN\}/g, String(cfg.EXP_DUEL_WIN))
    .replace(/\{EXP_VOTE\}/g,     String(cfg.EXP_VOTE))
    .replace(/\{SEANCE_JOUR\}/g,  cfg.SEANCE_JOUR)
    .replace(/\{SEANCE_HEURE\}/g, cfg.SEANCE_HEURE)
    .replace(/\{FDLS_JOUR\}/g,    cfg.FDLS_JOUR)
    .replace(/\{FDLS_HEURE\}/g,   cfg.FDLS_HEURE)
}

// ─── RULES SECTION ────────────────────────────────────────────────────────────
function RulesSection({ cfg }: { cfg?: ServerConfig }) {
  // Parse DB rules or fall back to hardcoded defaults
  let cards: RuleCard[] = DEFAULT_RULES
  if (cfg?.MARATHON_RULES) {
    try {
      const parsed = JSON.parse(cfg.MARATHON_RULES)
      if (Array.isArray(parsed) && parsed.length > 0) cards = parsed
    } catch { /* keep defaults */ }
  }

  const resolvedCfg = cfg ?? ({ ...CONFIG, ACCUEIL_SOUS_TITRE: '', MARATHON_RULES: null } as any)

  const card = (children: React.ReactNode) => (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1.1rem 1.3rem', marginBottom: '.7rem' }}>
      {children}
    </div>
  )
  const h = (emoji: string, title: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginBottom: '.6rem' }}>
      <span style={{ fontSize: '1.3rem' }}>{emoji}</span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{title}</span>
    </div>
  )
  const p = (text: string) => <p style={{ fontSize: '.83rem', color: 'var(--text2)', lineHeight: 1.7, margin: '0 0 .4rem' }}>{interpolate(text, resolvedCfg)}</p>
  const renderTable = (rows: [string, string][]) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem', marginTop: '.4rem' }}>
      <tbody>
        {rows.map(([action, val], i) => (
          <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '.35rem .5rem', color: 'var(--text2)' }}>{interpolate(action, resolvedCfg)}</td>
            <td style={{ padding: '.35rem .5rem', color: 'var(--gold)', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' }}>{interpolate(val, resolvedCfg)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', marginBottom: '1.2rem' }}>Les règles du jeu</div>
      {cards.map((c, i) => card(
        <div key={i}>
          {h(c.emoji, c.title)}
          {c.text  && p(c.text)}
          {c.intro && p(c.intro)}
          {c.list  && c.list.length > 0 && (
            <ul style={{ fontSize: '.83rem', color: 'var(--text2)', lineHeight: 1.8, paddingLeft: '1.2rem', margin: '0 0 .4rem' }}>
              {c.list.map((item, j) => <li key={j}>{interpolate(item, resolvedCfg)}</li>)}
            </ul>
          )}
          {c.after && p(c.after)}
          {c.table && c.table.length > 0 && renderTable(c.table)}
        </div>
      ))}
    </div>
  )
}
