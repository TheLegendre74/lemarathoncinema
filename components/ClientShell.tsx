'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import type { Profile } from '@/lib/supabase/types'

interface Props {
  profile: Profile | null
  children: React.ReactNode
}

export default function ClientShell({ profile, children }: Props) {
  const pathname = usePathname()
  const isAuthPage = pathname?.startsWith('/auth')

  if (isAuthPage) return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar profile={profile} />
      <main className="main">
        {children}
      </main>
    </div>
  )
}
