import type { Metadata, Viewport } from 'next'
import Image from 'next/image'
import { Playfair_Display, Syne } from 'next/font/google'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

export const viewport: Viewport = {
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import ClientShell from '@/components/ClientShell'
import { ToastProvider } from '@/components/ToastProvider'
import EasterEggsLoader from '@/components/EasterEggsLoader'
import { getServerConfig } from '@/lib/serverConfig'
import { getUnreadMessageCountForUser } from '@/lib/messages'
import { getUserCached } from '@/lib/auth'
import { withCache } from '@/lib/redis'

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getServerConfig()
  return {
    title: 'Ciné Marathon',
    description: cfg.ACCUEIL_SOUS_TITRE,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, cfg, supabase] = await Promise.all([
    getUserCached(),
    getServerConfig(),
    createClient(),
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
        const { data } = await supabase.from('profiles').select('id, pseudo, avatar_url, exp, active_badge, is_admin, saison, created_at, updated_at, marathon_blocked_until, pre_marathon_window_until, tutorial_seen').eq('id', user.id).single()
        return data
      }),
      withCache(`user:${user.id}:eggs`, 60, async () => {
        const { data } = await supabase.from('discovered_eggs').select('egg_id').eq('user_id', user.id).in('egg_id', ['rageux', 'tamagotchi', 'clippy'])
        return data ?? []
      }),
      withCache(`user:${user.id}:unread`, 15, () =>
        getUnreadMessageCountForUser(user.id, supabase)
      ),
      withCache(`user:${user.id}:watched_count`, 60, async () => {
        const { count } = await supabase.from('watched').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
        return count ?? 0
      }),
    ])
    profile = profileData
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

  return (
    <html lang="fr" className={`${playfairDisplay.variable} ${syne.variable}`}>
      <body>
        <ToastProvider>
          <EasterEggsLoader config={eeConfig} isGuest={!user} watchedCount={watchedCount} hasClippyEgg={hasClippyEgg} isAdmin={!!(profile as any)?.is_admin} userId={user?.id} />
          <ClientShell
            profile={profile}
            hasRageuxEgg={hasRageuxEgg}
            hasTamagotchiEgg={hasTamagotchiEgg}
            unreadMessages={unreadMessages}
            userId={user?.id}
          >
            {children}
          </ClientShell>
          <a
            href="https://discord.gg/nrGkqKgrtj"
            target="_blank"
            rel="noopener noreferrer"
            title="Rejoindre le Discord"
            className="discord-fab"
          >
            <Image src="/discord.png" alt="Discord" width={26} height={26} style={{ objectFit: 'contain' }} />
          </a>
        </ToastProvider>
      </body>
    </html>
  )
}
