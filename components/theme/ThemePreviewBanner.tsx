'use client'

import { useTheme } from './ThemeProvider'
import { useRouter } from 'next/navigation'
import { setThemePreview } from '@/lib/themes/actions'
import { getThemeDef } from '@/lib/themes/registry'

export default function ThemePreviewBanner() {
  const { key, source, isAdmin } = useTheme()
  const router = useRouter()

  if (source !== 'apercu' || !isAdmin) return null

  const label = getThemeDef(key).label

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9998,
      background: 'rgba(232,196,106,.15)',
      borderBottom: '1px solid rgba(232,196,106,.3)',
      padding: '4px 16px',
      fontSize: '.72rem',
      color: 'var(--accent-fg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      backdropFilter: 'blur(8px)',
    }}>
      <span>Aperçu : {label} — visible par toi seul</span>
      <span style={{ color: 'var(--ink3)' }}>·</span>
      <button
        onClick={async () => {
          await setThemePreview(null)
          router.refresh()
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--accent-fg)',
          cursor: 'pointer',
          textDecoration: 'underline',
          fontSize: 'inherit',
          padding: 0,
        }}
      >
        Quitter l&apos;aperçu
      </button>
    </div>
  )
}
