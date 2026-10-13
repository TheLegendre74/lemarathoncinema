'use client'

import { useTheme } from '@/components/theme/ThemeProvider'
import dynamic from 'next/dynamic'

const ComedieTroisCoups = dynamic(() => import('@/components/theme/comedie/ComedieTroisCoups'), { ssr: false })
const WesternBarillet = dynamic(() => import('@/components/theme/western/WesternBarillet'), { ssr: false })
const HorreurVHS = dynamic(() => import('@/components/theme/horreur/HorreurVHS'), { ssr: false })

export default function PageLoading() {
  const { key } = useTheme()

  if (key === 'comedie') return <ComedieTroisCoups />
  if (key === 'western') return <WesternBarillet />
  if (key === 'horreur') return <HorreurVHS />

  return <DefaultSkeleton />
}

function DefaultSkeleton() {
  return (
    <div aria-label="Chargement…" style={{ display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
      <style>{`
        @keyframes pg-pulse {
          0%,100% { opacity:.35; }
          50%      { opacity:.65; }
        }
        .pg-sk {
          background: var(--s1);
          border-radius: 8px;
          animation: pg-pulse 1.4s ease-in-out infinite;
        }
      `}</style>
      <div className="pg-sk" style={{ height: '1.8rem', width: '42%' }} />
      <div className="pg-sk" style={{ height: '.85rem', width: '68%', animationDelay: '.08s' }} />
      <div className="pg-sk" style={{ height: '110px', marginTop: '.4rem', animationDelay: '.12s' }} />
      <div className="pg-sk" style={{ height: '80px', animationDelay: '.18s' }} />
      <div className="pg-sk" style={{ height: '80px', animationDelay: '.24s' }} />
      <div className="pg-sk" style={{ height: '80px', animationDelay: '.30s' }} />
    </div>
  )
}
