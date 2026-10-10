'use client'

import { Suspense, useCallback, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import TopBar from './TopBar'
import type { Profile } from '@/lib/supabase/types'
import { levelFromExp } from '@/lib/config'
import type { NavConditions } from '@/lib/nav'
import { useConfig } from '@/components/config/ConfigProvider'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { initDestructionListener } from '@/lib/destruction'

const TamagotchiWidget = dynamic(() => import('./TamagotchiWidget'), { ssr: false })
const PreMarathonApprovedPopup = dynamic(() => import('./PreMarathonApprovedPopup'), { ssr: false })
const ComedieRamp = dynamic(() => import('./theme/comedie/ComedieRamp'), { ssr: false })

interface Props {
  profile: Profile | null
  hasRageuxEgg: boolean
  hasTamagotchiEgg: boolean
  unreadMessages?: number
  userId?: string
  children: React.ReactNode
}

export default function ClientShell({ profile, hasRageuxEgg, hasTamagotchiEgg, unreadMessages = 0, userId, children }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const config = useConfig()
  const isAuthPage = pathname?.startsWith('/auth')
  const isGamePage = pathname?.startsWith('/labo/') || pathname === '/clippy-revanche' || pathname === '/tamagotchi'

  const preWindow = (profile as any)?.pre_marathon_window_until as string | null | undefined
  const showJoinPopup = userId && preWindow && new Date(preWindow) > new Date()

  useEffect(() => { initDestructionListener() }, [])

  const hasClippyRevanche = typeof window !== 'undefined' && parseInt(localStorage.getItem('clippy_defeats') ?? '0', 10) >= 1

  const cond: NavConditions = {
    isAuth: !!userId,
    isAdmin: !!(profile as any)?.is_admin,
    hasRageuxEgg,
    hasTamagotchiEgg,
    hasClippyRevanche,
    unreadMessages,
    videoclubMode: config.videoclubMode,
  }

  const handleLogout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth')
    router.refresh()
  }, [router])

  if (isAuthPage) {
    return (
      <div id="site" className="site-base">
        <main id="contenu">{children}</main>
      </div>
    )
  }

  return (
    <div id="site" className="site-base">
      <TopBar cond={cond} pseudo={(profile as any)?.pseudo} playerLevel={profile ? levelFromExp((profile as any)?.exp ?? 0) : null} onLogout={handleLogout} />
      <main id="contenu" className="site-main" data-theme={isGamePage ? 'neutre' : undefined}>
        {children}
        <ComedieRamp />
        <footer className="site-footer">
          <span>© 2026 The Legendre</span>
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/confidentialite">Politique de confidentialité</a>
          <a href="mailto:LeMarathonCinema@gmail.com">Contact</a>
        </footer>
      </main>
      {hasTamagotchiEgg && <Suspense fallback={null}><TamagotchiWidget /></Suspense>}
      {showJoinPopup && (
        <Suspense fallback={null}>
          <PreMarathonApprovedPopup userId={userId} preMarathonWindowUntil={preWindow} />
        </Suspense>
      )}
    </div>
  )
}
