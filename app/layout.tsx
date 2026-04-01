import type { Metadata } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import ClientShell from '@/components/ClientShell'
import { ToastProvider } from '@/components/ToastProvider'
import EasterEggs from '@/components/EasterEggs'
import { getServerConfig } from '@/lib/serverConfig'

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
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
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
  }

  return (
    <html lang="fr">
      <body>
        <ToastProvider>
          <EasterEggs config={eeConfig} />
          <ClientShell profile={profile}>
            {children}
          </ClientShell>
        </ToastProvider>
      </body>
    </html>
  )
}
