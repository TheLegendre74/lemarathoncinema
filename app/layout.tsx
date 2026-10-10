import type { Metadata, Viewport } from 'next'
import {
  Playfair_Display, Syne, Inter, Newsreader, JetBrains_Mono,
  Saira_Condensed, Anton, Oswald, Lora, Courier_Prime, Caveat,
  Rye, Alfa_Slab_One, Bitter,
  Cormorant_Garamond, Spectral, IBM_Plex_Mono, Reenie_Beanie,
} from 'next/font/google'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--ff-playfair',
  display: 'swap',
  preload: false,
})

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
  preload: false,
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--ff-inter',
  display: 'swap',
})

const newsreader = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--ff-newsreader',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--ff-jetbrains',
  display: 'swap',
})

const sairaCondensed = Saira_Condensed({
  subsets: ['latin'],
  weight: ['700', '900'],
  variable: '--ff-saira',
  display: 'swap',
  preload: false,
})

const anton = Anton({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--ff-anton',
  display: 'swap',
  preload: false,
})

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--ff-oswald',
  display: 'swap',
  preload: false,
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--ff-lora',
  display: 'swap',
  preload: false,
})

const courierPrime = Courier_Prime({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--ff-courier',
  display: 'swap',
  preload: false,
})

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--ff-caveat',
  display: 'swap',
  preload: false,
})

const rye = Rye({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--ff-rye',
  display: 'swap',
  preload: false,
})

const alfaSlabOne = Alfa_Slab_One({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--ff-alfa',
  display: 'swap',
  preload: false,
})

const bitter = Bitter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--ff-bitter',
  display: 'swap',
  preload: false,
})

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--ff-cormorant',
  display: 'swap',
  preload: false,
})

const spectral = Spectral({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--ff-spectral',
  display: 'swap',
  preload: false,
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--ff-plex',
  display: 'swap',
  preload: false,
})

const reenieBeanie = Reenie_Beanie({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--ff-reenie',
  display: 'swap',
  preload: false,
})

export const viewport: Viewport = {
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
}
import './styles/tokens.css'
import './styles/themes/action.css'
import './styles/themes/action-screens.css'
import './styles/themes/comedie-screens.css'
import './styles/themes/comedie.css'
import './styles/themes/western.css'
import './styles/themes/western-screens.css'
import './styles/themes/horreur.css'
import './styles/themes/horreur-screens.css'
import './styles/legacy.css'
import './globals.css'
import { cookies } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import ClientShell from '@/components/ClientShell'
import { ToastProvider } from '@/components/ToastProvider'
import EasterEggsLoader from '@/components/EasterEggsLoader'
import ThemeProvider from '@/components/theme/ThemeProvider'
import ThemeFrame from '@/components/theme/ThemeFrame'
import ThemeBehaviors from '@/components/theme/ThemeBehaviors'
import ThemePreviewBanner from '@/components/theme/ThemePreviewBanner'
import { getServerConfig } from '@/lib/serverConfig'
import { getUnreadMessageCountForUser } from '@/lib/messages'
import { getUserCached } from '@/lib/auth'
import DiscordFab from '@/components/DiscordFab'
import { ConfigProvider } from '@/components/config/ConfigProvider'
import type { PublicConfig } from '@/components/config/ConfigProvider'
import { withCache } from '@/lib/redis'
import { resolveTheme, nextMondayParis } from '@/lib/themes/resolve'
import { getSeasonWeeks } from '@/lib/themes/seasonWeeks'
import type { ThemeKey } from '@/lib/themes/types'
import { READY_THEMES } from '@/lib/themes/types'
import { getSeasonPlayerCount, getActivePlayerCount } from '@/lib/home'
import { getRecentActivity } from '@/lib/activity'
import { parisParts } from '@/lib/time/paris'

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getServerConfig()
  return {
    title: 'Ciné Marathon',
    description: cfg.ACCUEIL_SOUS_TITRE,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, cfg, supabase, seasonWeeks, cookieStore] = await Promise.all([
    getUserCached(),
    getServerConfig(),
    createClient(),
    getSeasonWeeks(),
    cookies(),
  ])

  let profile = null
  let hasRageuxEgg = false
  let hasTamagotchiEgg = false
  let hasClippyEgg = false
  let unreadMessages = 0
  let watchedCount = 0
  if (user) {
    const [profileData, eggs, unread, watchedResult] = await Promise.all([
      withCache(`user:${user.id}:profile`, 60, async () => {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        return data
      }),
      withCache(`user:${user.id}:eggs`, 300, async () => {
        const { data } = await supabase.from('discovered_eggs').select('egg_id').eq('user_id', user.id).in('egg_id', ['rageux', 'tamagotchi', 'clippy'])
        return data ?? []
      }),
      withCache(`user:${user.id}:unread`, 15, () =>
        getUnreadMessageCountForUser(user.id, supabase)
      ),
      withCache(`user:${user.id}:watched_count`, 120, async () => {
        const { count } = await supabase.from('watched').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
        return count ?? 0
      }),
    ])
    // Si le profil est absent (trigger SQL non exécuté), on le crée à la volée
    if (!profileData) {
      const pseudo = (user.user_metadata?.pseudo as string | undefined) || user.email?.split('@')[0] || 'Utilisateur'
      const adminDb = createAdminClient()
      await adminDb.from('profiles').upsert({ id: user.id, pseudo, saison: cfg.SAISON_NUMERO })
      const { data: newProfile } = await adminDb.from('profiles').select('*').eq('id', user.id).single()
      profile = newProfile
    } else {
      profile = profileData
    }
    hasRageuxEgg = (eggs ?? []).some((e: any) => e.egg_id === 'rageux')
    hasTamagotchiEgg = (eggs ?? []).some((e: any) => e.egg_id === 'tamagotchi')
    hasClippyEgg = (eggs ?? []).some((e: any) => e.egg_id === 'clippy')
    unreadMessages = unread ?? 0
    watchedCount = watchedResult ?? 0
  }

  const eeConfig = {
    matrixLine1:      cfg.MATRIX_LINE1,
    matrixLine2:      cfg.MATRIX_LINE2,
    matrixLine3:      cfg.MATRIX_LINE3,
    jokerPhrase:      cfg.JOKER_PHRASE,
    tarsLine1:        cfg.TARS_LINE1,
    tarsLine2:        cfg.TARS_LINE2,
    marvinLine1:      cfg.MARVIN_LINE1,
    marvinLine2:      cfg.MARVIN_LINE2,
    halLine1:         cfg.HAL_LINE1,
    halLine2:         cfg.HAL_LINE2,
    nolanQuote:       cfg.NOLAN_QUOTE,
    bondLine:         cfg.BOND_LINE,
    noctamLine1:      cfg.NOCTAM_LINE1,
    noctamLine2:      cfg.NOCTAM_LINE2,
    kennyText1:       cfg.KENNY_TEXT1,
    kennyText2:       cfg.KENNY_TEXT2,
    randyQuote:       cfg.RANDY_QUOTE,
    fightClubGameOver: cfg.FIGHTCLUB_GAMEOVER,
    killBillEnd:      cfg.KILLBILL_END,
    clippyReplies:    cfg.CLIPPY_REPLIES,
  }

  const publicConfig: PublicConfig = {
    SAISON_NUMERO: cfg.SAISON_NUMERO,
    SAISON_LABEL: cfg.SAISON_LABEL,
    MARATHON_START: cfg.MARATHON_START.toISOString(),
    SEANCE_JOUR: cfg.SEANCE_JOUR,
    SEANCE_HEURE: cfg.SEANCE_HEURE,
    FDLS_JOUR: cfg.FDLS_JOUR,
    FDLS_HEURE: cfg.FDLS_HEURE,
    EXP_FILM: cfg.EXP_FILM,
    EXP_FDLS: cfg.EXP_FDLS,
    EXP_DUEL_WIN: cfg.EXP_DUEL_WIN,
    EXP_VOTE: cfg.EXP_VOTE,
    EXP_FDLS_BONUS: cfg.EXP_FDLS_BONUS,
    SEUIL_MAJORITY: cfg.SEUIL_MAJORITY,
    limite_jour: cfg.limite_jour,
    limite_jour_max: cfg.limite_jour_max,
    duel_egalite: cfg.duel_egalite,
    eggsDisabled: cfg.eggs_disabled,
    videoclubMode: cfg.videoclub_mode,
  }

  const isAdmin = !!(profile as any)?.is_admin
  const previewRaw = cookieStore.get('cm_theme_apercu')?.value ?? null
  const previewCookie = (previewRaw && READY_THEMES.includes(previewRaw as ThemeKey)) ? previewRaw as ThemeKey : null

  const resolved = resolveTheme({
    now: new Date(),
    cfg: { theme_mode: cfg.theme_mode, theme_force: cfg.theme_force as ThemeKey },
    weeks: seasonWeeks,
    previewCookie,
    isAdmin,
  })

  const nextSwitch = nextMondayParis(new Date()).toISOString()

  let freqData = null
  if (resolved.key === 'action') {
    const [totalPlayers, activePlayers, activity] = await Promise.all([
      getSeasonPlayerCount(cfg.SAISON_NUMERO),
      getActivePlayerCount(cfg.SAISON_NUMERO),
      getRecentActivity(1),
    ])
    const lastAct = activity[0] ?? null
    let lastEvent: string | null = null
    let lastEventTime: string | null = null
    if (lastAct) {
      const d = new Date(lastAct.at)
      const p = parisParts(d)
      lastEventTime = `${String(p.h).padStart(2, '0')}:${String(p.min).padStart(2, '0')}`
      if (lastAct.type === 'watched') {
        lastEvent = `${lastAct.pseudo} A ENCAISSÉ ${lastAct.titre} — +${lastAct.exp}`
      } else if (lastAct.type === 'rated') {
        lastEvent = `${lastAct.pseudo} A NOTÉ ${lastAct.titre} — ${lastAct.note}/10`
      } else if (lastAct.type === 'duel_opened') {
        lastEvent = `FACE-À-FACE : ${lastAct.film1} VS ${lastAct.film2}`
      } else if (lastAct.type === 'duel_closed') {
        lastEvent = `${lastAct.winner} L'EMPORTE`
      }
    }
    freqData = {
      weekNum: resolved.week?.semaine ?? null,
      lastEvent,
      lastEventTime,
      activePlayers,
      totalPlayers,
    }
  }

  const fontVars = [
    playfairDisplay.variable, syne.variable, inter.variable,
    newsreader.variable, jetbrainsMono.variable,
    sairaCondensed.variable, anton.variable, oswald.variable,
    lora.variable, courierPrime.variable, caveat.variable,
    rye.variable, alfaSlabOne.variable, bitter.variable,
    cormorantGaramond.variable, spectral.variable,
    ibmPlexMono.variable, reenieBeanie.variable,
  ].join(' ')

  return (
    <html lang="fr" data-theme={resolved.key} className={fontVars}>
      <body>
        <ConfigProvider config={publicConfig}>
          <ThemeProvider resolved={resolved} nextSwitch={nextSwitch} isAdmin={isAdmin}>
            <ToastProvider>
              <ThemePreviewBanner />
              <ThemeFrame
                playerExp={profile ? (profile as any).exp ?? 0 : null}
                weekNum={resolved.week?.semaine ?? null}
                freqData={freqData}
              />
              <ThemeBehaviors
                playerExp={profile ? (profile as any).exp ?? 0 : null}
                themeEggsEnabled={profile ? (profile as any).theme_eggs !== false : true}
                eggsDisabled={publicConfig.eggsDisabled}
                actionCarSpeed={cfg.action_car_speed}
                isGuest={!user}
              />
              <EasterEggsLoader config={eeConfig} isGuest={!user} watchedCount={watchedCount} hasClippyEgg={hasClippyEgg} isAdmin={isAdmin} userId={user?.id} />
              <ClientShell
                profile={profile}
                hasRageuxEgg={hasRageuxEgg}
                hasTamagotchiEgg={hasTamagotchiEgg}
                unreadMessages={unreadMessages}
                userId={user?.id}
              >
                {children}
              </ClientShell>
              <DiscordFab />
            </ToastProvider>
          </ThemeProvider>
        </ConfigProvider>
      </body>
    </html>
  )
}
