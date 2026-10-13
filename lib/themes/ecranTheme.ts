import type { ComponentType } from 'react'
import type { ThemeKey } from './types'

type Loader = () => Promise<{ default: ComponentType<any> }>
type EcranMap = Partial<Record<ThemeKey, Loader>>

const ECRANS: Record<string, EcranMap> = {
  'accueil-hero': {
    action: () => import('@/components/theme/action/ActionHomeHero'),
    comedie: () => import('@/components/theme/comedie/ComedieHomeHero'),
    western: () => import('@/components/theme/western/WesternHomeHero'),
    horreur: () => import('@/components/theme/horreur/HorreurHomeHero'),
  },
  'chargement': {
    comedie: () => import('@/components/theme/comedie/ComedieTroisCoups'),
    western: () => import('@/components/theme/western/WesternBarillet'),
    horreur: () => import('@/components/theme/horreur/HorreurVHS'),
  },
  'vide': {
    western: () => import('@/components/theme/western/WesternVautour'),
    horreur: () => import('@/components/theme/horreur/HorreurCassette'),
  },
  '404': {
    comedie: () => import('@/components/theme/comedie/ComedieSouffleur'),
  },
  'classement-affiche': {
    comedie: () => import('@/components/theme/comedie/ComedieAffiche'),
  },
  'duel-cadran': {
    comedie: () => import('@/components/theme/comedie/ComedieCadran'),
  },
}

export async function getThemeEcran<P = any>(
  ecran: string,
  theme: ThemeKey,
): Promise<ComponentType<P> | null> {
  const map = ECRANS[ecran]
  if (!map) return null
  const loader = map[theme]
  if (!loader) return null
  try {
    const mod = await loader()
    return mod.default as ComponentType<P>
  } catch {
    return null
  }
}

export function hasThemeEcran(ecran: string, theme: ThemeKey): boolean {
  return !!ECRANS[ecran]?.[theme]
}
