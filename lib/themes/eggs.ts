import type { ThemeKey, ThemeEggId } from './types'

export interface ThemeEggDef {
  id: ThemeEggId
  num: number
  theme: ThemeKey
  name: string
  family: string
  condition: string
  limit: string | null
}

export const THEME_EGGS: ThemeEggDef[] = [
  { id: 'theme-action-voiture', num: 26, theme: 'action', name: 'La voiture', family: 'Thème — Action', condition: 'Curseur-voiture lancé très vite contre un bord ou le titre', limit: 'Sur ordinateur' },
  { id: 'theme-action-nakatomi', num: 27, theme: 'action', name: 'Nakatomi Plaza', family: 'Thème — Action', condition: 'Taper « nakatomi » ou 5 touchers sur les étages', limit: null },
  { id: 'theme-comedie-vert', num: 28, theme: 'comedie', name: 'Le vert interdit', family: 'Thème — Comédie', condition: 'Cliquer l\'ampoule verte de la rampe', limit: null },
  { id: 'theme-comedie-blanquette', num: 29, theme: 'comedie', name: 'La blanquette', family: 'Thème — Comédie', condition: 'Taper « blanquette » deux fois', limit: null },
  { id: 'theme-comedie-hyene', num: 30, theme: 'comedie', name: 'La hyène', family: 'Thème — Comédie', condition: 'Taper « hyene » (serveur)', limit: null },
  { id: 'theme-western-mouche', num: 31, theme: 'western', name: 'La mouche', family: 'Thème — Western', condition: 'Cliquer la mouche dans le saloon', limit: null },
  { id: 'theme-western-404', num: 32, theme: 'western', name: 'Tumbleweed', family: 'Thème — Western', condition: 'Visiter la 404 en Western', limit: null },
  { id: 'theme-western-duel', num: 33, theme: 'western', name: 'Le duel', family: 'Thème — Western', condition: 'Être présent quand un duel se ferme', limit: null },
  { id: 'theme-horreur-ballon', num: 34, theme: 'horreur', name: 'Le ballon rouge', family: 'Thème — Horreur', condition: 'Le ballon apparaît aléatoirement', limit: null },
  { id: 'theme-horreur-possession', num: 35, theme: 'horreur', name: 'La possession', family: 'Thème — Horreur', condition: 'Page restée ouverte 3 minutes sans interaction', limit: null },
  { id: 'theme-horreur-cercle', num: 36, theme: 'horreur', name: 'Le cercle', family: 'Thème — Horreur', condition: 'Visiter 7 pages distinctes sans revenir en arrière', limit: null },
  { id: 'theme-horreur-apparition', num: 37, theme: 'horreur', name: 'L\'apparition', family: 'Thème — Horreur', condition: 'Voir la silhouette dans le coin et cliquer avant qu\'elle disparaisse', limit: null },
]

export function getThemeEgg(id: ThemeEggId): ThemeEggDef | undefined {
  return THEME_EGGS.find(e => e.id === id)
}

export function getThemeEggsForTheme(theme: ThemeKey): ThemeEggDef[] {
  return THEME_EGGS.filter(e => e.theme === theme)
}
