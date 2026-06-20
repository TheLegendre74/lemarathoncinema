'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCurrentTheme, getThemeByGenre, ALL_GENRES, type GenreTheme, type ThemeConfig } from '@/lib/weeklyTheme'
import ThemeOverlay from './ThemeOverlay'

export default function WeeklyThemeProvider() {
  return (
    <Suspense fallback={null}>
      <WeeklyThemeInner />
    </Suspense>
  )
}

function WeeklyThemeInner() {
  const searchParams = useSearchParams()
  const [theme, setTheme] = useState<ThemeConfig | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const resolveTheme = useCallback(() => {
    const override = searchParams.get('theme')
    if (override && ALL_GENRES.includes(override as GenreTheme)) {
      return getThemeByGenre(override as GenreTheme)
    }
    return getCurrentTheme()
  }, [searchParams])

  useEffect(() => {
    setTheme(resolveTheme())
  }, [resolveTheme])

  useEffect(() => {
    function onAdminTheme(e: Event) {
      const genre = (e as CustomEvent).detail as string | null
      if (!genre) {
        setTheme(null)
        setDismissed(false)
      } else if (ALL_GENRES.includes(genre as GenreTheme)) {
        setTheme(getThemeByGenre(genre as GenreTheme))
        setDismissed(false)
      }
    }
    window.addEventListener('weekly-theme:set', onAdminTheme)
    return () => window.removeEventListener('weekly-theme:set', onAdminTheme)
  }, [])

  useEffect(() => {
    document.body.classList.forEach(c => {
      if (c.startsWith('theme-')) document.body.classList.remove(c)
    })
    if (theme) {
      document.body.classList.add(theme.cssClass)
    }
    return () => {
      if (theme) document.body.classList.remove(theme.cssClass)
    }
  }, [theme])

  if (!theme) return null

  return (
    <>
      <ThemeOverlay genre={theme.genre} />
      {!dismissed && (
        <div className="theme-banner" onClick={() => setDismissed(true)} style={{ cursor: 'pointer' }}>
          <span>{theme.emoji}</span>
          <span>Semaine {theme.genre}</span>
          <span className="theme-banner-film">— {theme.filmRef}</span>
        </div>
      )}
    </>
  )
}
