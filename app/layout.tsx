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
import EasterEggs from '@/components/EasterEggs'
import { getServerConfig } from '@/lib/serverConfig'
import { getUnreadMessageCount } from '@/lib/actions'

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getServerConfig()
  return {
    title: 'Ciné Marathon',
    description: cfg.ACCUEIL_SOUS_TITRE,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const cfg = await getServerConfig()

  let profile = null
  let hasRageuxEgg = false
  let hasTamagotchiEgg = false
  let hasClippyEgg = false
  let hasConwayEgg = false
  let unreadMessages = 0
  let watchedCount = 0
  if (user) {
    const [{ data: profileData }, { data: eggs }, unread, { count }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('discovered_eggs').select('egg_id').eq('user_id', user.id),
      getUnreadMessageCount(),
      supabase.from('watched').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    ])
    profile = profileData
    hasRageuxEgg = (eggs ?? []).some((e: any) => e.egg_id === 'rageux')
    hasTamagotchiEgg = (eggs ?? []).some((e: any) => e.egg_id === 'tamagotchi')
    hasClippyEgg = (eggs ?? []).some((e: any) => e.egg_id === 'clippy')
    hasConwayEgg = (eggs ?? []).some((e: any) => e.egg_id === 'conway')
    unreadMessages = unread
    watchedCount = count ?? 0
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
          <EasterEggs config={eeConfig} isGuest={!user} watchedCount={watchedCount} hasClippyEgg={hasClippyEgg} />
          <ClientShell profile={profile} hasRageuxEgg={hasRageuxEgg} hasTamagotchiEgg={hasTamagotchiEgg} hasConwayEgg={hasConwayEgg} unreadMessages={unreadMessages}>
            {children}
          </ClientShell>
          <a
            href="https://discord.gg/nrGkqKgrtj"
            target="_blank"
            rel="noopener noreferrer"
            title="Rejoindre le Discord"
            className="discord-fab"
          >
            <Image src="/discord.png" alt="Discord" width={26} height={26} style={{ objectFit: 'contain' }} priority />
          </a>
        </ToastProvider>
      </body>
    </html>
  )
}
