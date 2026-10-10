'use client'

import { createContext, useContext, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { ThemeKey, ResolvedTheme, WeekInfo, ThemeDef, VocabKey, NavKey, NavCourtKey, ThemeConfig } from '@/lib/themes/types'
import { getThemeDef } from '@/lib/themes/registry'
import { neutreTheme } from '@/lib/themes/neutre'

interface ThemeCtx {
  key: ThemeKey
  real: ThemeKey
  source: ResolvedTheme['source']
  week: (WeekInfo & { theme: string }) | null
  def: ThemeDef
  isAdmin: boolean
}

const ThemeContext = createContext<ThemeCtx>({
  key: 'neutre',
  real: 'neutre',
  source: 'defaut',
  week: null,
  def: neutreTheme,
  isAdmin: false,
})

export function useTheme() {
  return useContext(ThemeContext)
}

function replaceVars(text: string, vars?: Record<string, string>): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in vars) return vars[key]
    return match
  })
}

export function useT() {
  const { def } = useContext(ThemeContext)

  return function t(key: VocabKey, vars?: Record<string, string>): string {
    const val = def.vocab[key]
    const raw = val ?? neutreTheme.vocab![key] ?? key
    return replaceVars(raw, vars)
  }
}

export function useNavLabel() {
  const { def } = useContext(ThemeContext)

  return function navLabel(key: NavKey): string {
    return def.nav[key] ?? neutreTheme.nav[key] ?? key
  }
}

export function useNavCourtLabel() {
  const { def } = useContext(ThemeContext)

  return function navCourtLabel(key: NavCourtKey): string {
    return def.navCourt[key] ?? neutreTheme.navCourt[key] ?? key
  }
}

interface ThemeProviderProps {
  resolved: ResolvedTheme
  nextSwitch: string | null
  isAdmin: boolean
  children: React.ReactNode
}

export default function ThemeProvider({ resolved, nextSwitch, isAdmin, children }: ThemeProviderProps) {
  const router = useRouter()
  const switchRef = useRef(nextSwitch)
  switchRef.current = nextSwitch

  useEffect(() => {
    if (!switchRef.current) return
    const target = new Date(switchRef.current).getTime()
    const remaining = target - Date.now()
    if (remaining <= 0) return

    const timer = setTimeout(() => {
      router.refresh()
    }, Math.min(remaining, 2147483647))

    return () => clearTimeout(timer)
  }, [nextSwitch, router])

  const def = getThemeDef(resolved.key)

  const ctx: ThemeCtx = {
    key: resolved.key,
    real: resolved.real,
    source: resolved.source,
    week: resolved.week,
    def,
    isAdmin,
  }

  return (
    <ThemeContext.Provider value={ctx}>
      {children}
    </ThemeContext.Provider>
  )
}
