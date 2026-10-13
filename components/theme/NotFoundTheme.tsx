'use client'

import { useTheme } from './ThemeProvider'
import dynamic from 'next/dynamic'

const ComedieSouffleur = dynamic(() => import('./comedie/ComedieSouffleur'), { ssr: false })
const WesternVautour = dynamic(() => import('./western/WesternVautour'), { ssr: false })
const HorreurCassette = dynamic(() => import('./horreur/HorreurCassette'), { ssr: false })

export default function NotFoundTheme() {
  const { key } = useTheme()

  if (key === 'comedie') return <ComedieSouffleur message="Cette scène n'est pas au programme." />
  if (key === 'western') return <WesternVautour message="Rien par ici, l'ami." />
  if (key === 'horreur') return <HorreurCassette message="Bande introuvable." />

  return null
}
