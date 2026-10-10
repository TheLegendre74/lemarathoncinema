'use client'

import { useMemo } from 'react'
import { useTheme } from '@/components/theme/ThemeProvider'
import type { ThemeEggId } from './types'
import { getThemeEgg } from './eggs'

interface UseThemeEggResult {
  armed: boolean
}

export function useThemeEgg(
  id: ThemeEggId,
  opts?: {
    eggsEnabled?: boolean
    disabledEggs?: string[]
    desktopOnly?: boolean
  }
): UseThemeEggResult {
  const { key, real } = useTheme()

  return useMemo(() => {
    const egg = getThemeEgg(id)
    if (!egg) return { armed: false }

    const themeMatch = key === egg.theme
    if (!themeMatch) return { armed: false }

    if (opts?.eggsEnabled === false) return { armed: false }
    if (opts?.disabledEggs?.includes(id)) return { armed: false }

    if (opts?.desktopOnly) {
      if (typeof window !== 'undefined') {
        const hover = window.matchMedia('(hover: hover) and (pointer: fine)').matches
        if (!hover) return { armed: false }
      }
    }

    return { armed: true }
  }, [id, key, real, opts?.eggsEnabled, opts?.disabledEggs, opts?.desktopOnly])
}
