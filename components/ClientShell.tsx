'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import dynamic from 'next/dynamic'
import type { Profile } from '@/lib/supabase/types'

const TamagotchiWidget = dynamic(() => import('./TamagotchiWidget'), { ssr: false })

interface Props {
  profile: Profile | null
  hasRageuxEgg: boolean
  hasTamagotchiEgg: boolean
  unreadMessages?: number
  children: React.ReactNode
}

export default function ClientShell({ profile, hasRageuxEgg, hasTamagotchiEgg, unreadMessages = 0, children }: Props) {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/auth')

  if (isAuthPage) return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar profile={profile} hasRageuxEgg={hasRageuxEgg} hasTamagotchiEgg={hasTamagotchiEgg} unreadMessages={unreadMessages} />
      <main className="main">
        {children}
        <footer style={{ marginTop: '4rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '1.2rem', flexWrap: 'wrap', fontSize: '.72rem', color: 'var(--text3)' }}>
          <span>© 2026 The Legendre</span>
          <a href="/mentions-legales" style={{ color: 'var(--text3)', textDecoration: 'none' }}>Mentions légales</a>
          <a href="/confidentialite" style={{ color: 'var(--text3)', textDecoration: 'none' }}>Politique de confidentialité</a>
          <a href="mailto:LeMarathonCinema@gmail.com" style={{ color: 'var(--text3)', textDecoration: 'none' }}>Contact</a>
        </footer>
      </main>
      {hasTamagotchiEgg && <Suspense fallback={null}><TamagotchiWidget /></Suspense>}
    </div>
  )
}
