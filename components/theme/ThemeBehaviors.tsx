'use client'

import { useCallback, useMemo } from 'react'
import { useTheme } from './ThemeProvider'
import { levelFromExp } from '@/lib/config'
import { discoverThemeEgg } from '@/lib/actions'
import dynamic from 'next/dynamic'

const ActionCarEgg = dynamic(() => import('./action/ActionCarEgg'), { ssr: false })
const ActionNakatomiEgg = dynamic(() => import('./action/ActionNakatomiEgg'), { ssr: false })
const ComediePoursuite = dynamic(() => import('./comedie/ComediePoursuite'), { ssr: false })
const ComedieBlanquetteEgg = dynamic(() => import('./comedie/ComedieBlanquetteEgg'), { ssr: false })
const ComedieReverence = dynamic(() => import('./comedie/ComedieReverence'), { ssr: false })
const WesternImpact = dynamic(() => import('./western/WesternImpact'), { ssr: false })
const WesternMouche = dynamic(() => import('./western/WesternMouche'), { ssr: false })
const WesternDuelEgg = dynamic(() => import('./western/WesternDuelEgg'), { ssr: false })
const Western404Egg = dynamic(() => import('./western/Western404Egg'), { ssr: false })
const HorreurBallonEgg = dynamic(() => import('./horreur/HorreurBallonEgg'), { ssr: false })
const HorreurPossessionEgg = dynamic(() => import('./horreur/HorreurPossessionEgg'), { ssr: false })
const HorreurCercleEgg = dynamic(() => import('./horreur/HorreurCercleEgg'), { ssr: false })
const HorreurApparitionEgg = dynamic(() => import('./horreur/HorreurApparitionEgg'), { ssr: false })

interface ThemeBehaviorsProps {
  playerExp: number | null
  themeEggsEnabled: boolean
  eggsDisabled: string[]
  actionCarSpeed: number
  isGuest: boolean
}

export default function ThemeBehaviors({
  playerExp,
  themeEggsEnabled,
  eggsDisabled,
  actionCarSpeed,
  isGuest,
}: ThemeBehaviorsProps) {
  const { key } = useTheme()

  const disabled = useMemo(
    () => eggsDisabled.filter(Boolean),
    [eggsDisabled],
  )

  const carArmed = key === 'action' && themeEggsEnabled && !disabled.includes('theme-action-voiture')
  const nakatomiArmed = key === 'action' && themeEggsEnabled && !disabled.includes('theme-action-nakatomi')

  const handleCarCrash = useCallback(() => {
    if (!isGuest) discoverThemeEgg('theme-action-voiture')
  }, [isGuest])

  const handleNakatomi = useCallback(() => {
    if (!isGuest) discoverThemeEgg('theme-action-nakatomi')
  }, [isGuest])

  if (key === 'comedie') {
    return (
      <>
        <ComediePoursuite />
        <ComedieBlanquetteEgg />
        <ComedieReverence />
      </>
    )
  }

  if (key === 'western') {
    return (
      <>
        <WesternImpact />
        <WesternMouche />
        <WesternDuelEgg />
        <Western404Egg />
      </>
    )
  }

  if (key === 'horreur') {
    return (
      <>
        <HorreurBallonEgg />
        <HorreurPossessionEgg />
        <HorreurCercleEgg />
        <HorreurApparitionEgg />
      </>
    )
  }

  if (key !== 'action') return null

  const level = playerExp !== null ? levelFromExp(playerExp) : null

  return (
    <>
      <ActionCarEgg armed={carArmed} crashSpeed={actionCarSpeed} onFirstCrash={handleCarCrash} />
      <ActionNakatomiEgg armed={nakatomiArmed} playerLevel={level} onFirstTrigger={handleNakatomi} />
    </>
  )
}
