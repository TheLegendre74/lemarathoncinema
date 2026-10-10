'use client'

import { useTheme } from './ThemeProvider'
import { levelFromExp } from '@/lib/config'
import dynamic from 'next/dynamic'

const ActionFrame = dynamic(() => import('./action/ActionFrame'), { ssr: false })
const ComedieFrame = dynamic(() => import('./comedie/ComedieFrame'), { ssr: false })
const WesternFrame = dynamic(() => import('./western/WesternFrame'), { ssr: false })
const HorreurFrame = dynamic(() => import('./horreur/HorreurFrame'), { ssr: false })

interface FreqData {
  weekNum: number | null
  lastEvent: string | null
  lastEventTime: string | null
  activePlayers: number
  totalPlayers: number
}

interface ThemeFrameProps {
  playerExp: number | null
  weekNum: number | null
  freqData?: FreqData | null
}

export default function ThemeFrame({ playerExp, weekNum, freqData }: ThemeFrameProps) {
  const { key } = useTheme()

  if (key === 'neutre') return null

  if (key === 'action') {
    const level = playerExp !== null ? levelFromExp(playerExp) : null
    return <ActionFrame playerLevel={level} weekNum={weekNum} freqData={freqData} />
  }

  if (key === 'comedie') {
    const level = playerExp !== null ? levelFromExp(playerExp) : null
    return <ComedieFrame playerLevel={level} />
  }

  if (key === 'western') {
    return <WesternFrame />
  }

  if (key === 'horreur') {
    return <HorreurFrame />
  }

  return null
}
