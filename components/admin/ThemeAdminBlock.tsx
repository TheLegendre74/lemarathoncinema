'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ToastProvider'
import {
  adminSetThemeMode,
  adminSetThemeForce,
  setThemePreview,
} from '@/lib/themes/actions'
import { READY_THEMES, type ThemeKey } from '@/lib/themes/types'

const THEME_LABELS: Record<ThemeKey, string> = {
  neutre: 'Neutre',
  action: 'Action',
  comedie: 'Comedie',
  western: 'Western',
  horreur: 'Horreur',
}

export default function ThemeAdminBlock() {
  const router = useRouter()
  const { addToast } = useToast()
  const [busy, setBusy] = useState(false)

  async function handleForce(theme: ThemeKey) {
    if (busy) return
    setBusy(true)
    try {
      await adminSetThemeForce(theme)
      addToast(`Site passe en ${THEME_LABELS[theme]}`)
      router.refresh()
    } catch (e: any) {
      addToast(e.message ?? 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  async function handleAuto() {
    if (busy) return
    setBusy(true)
    try {
      await adminSetThemeMode('auto')
      addToast('Mode automatique (planning)')
      router.refresh()
    } catch (e: any) {
      addToast(e.message ?? 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  async function handlePreview(key: ThemeKey | null) {
    if (busy) return
    setBusy(true)
    try {
      await setThemePreview(key)
      if (key) {
        addToast(`Apercu : ${THEME_LABELS[key]}`)
      } else {
        addToast('Apercu desactive')
      }
      router.refresh()
    } catch (e: any) {
      addToast(e.message ?? 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ background: 'var(--s1)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '1.2rem', marginBottom: '1.5rem' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Theme</h3>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '.82rem', color: 'var(--ink2)', marginBottom: '.5rem' }}>
          Imposer un theme sur tout le site :
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {READY_THEMES.map(key => (
            <button
              key={key}
              disabled={busy}
              onClick={() => handleForce(key)}
              style={{
                padding: '.5rem 1rem',
                background: 'var(--s2)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                cursor: busy ? 'wait' : 'pointer',
                fontSize: '.8rem',
                color: 'var(--ink)',
              }}
            >
              {THEME_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <button
          disabled={busy}
          onClick={handleAuto}
          style={{
            padding: '.5rem 1rem',
            background: 'var(--s2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            cursor: busy ? 'wait' : 'pointer',
            fontSize: '.8rem',
            color: 'var(--ink)',
          }}
        >
          Revenir au planning
        </button>
      </div>

      <div>
        <div style={{ fontSize: '.82rem', color: 'var(--ink2)', marginBottom: '.5rem' }}>
          Apercu (visible par toi seul) :
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {READY_THEMES.filter(k => k !== 'neutre').map(key => (
            <button
              key={key}
              disabled={busy}
              onClick={() => handlePreview(key)}
              style={{
                padding: '.4rem .8rem',
                background: 'var(--s2)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                cursor: busy ? 'wait' : 'pointer',
                fontSize: '.75rem',
                color: 'var(--ink2)',
              }}
            >
              {THEME_LABELS[key]}
            </button>
          ))}
          <button
            disabled={busy}
            onClick={() => handlePreview(null)}
            style={{
              padding: '.4rem .8rem',
              background: 'var(--s2)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              cursor: busy ? 'wait' : 'pointer',
              fontSize: '.75rem',
              color: 'var(--ink2)',
            }}
          >
            Quitter l'apercu
          </button>
        </div>
      </div>
    </div>
  )
}
