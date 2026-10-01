import type { NavKey } from './themes/types'

export type NavCategory = 'catEvenement' | 'catFilms' | 'catSocial' | 'catSecret'

export interface NavEntry {
  key: NavKey
  route: string
  category?: NavCategory
  condition?: 'auth' | 'rageux' | 'tamagotchi' | 'clippyRevanche' | 'admin' | 'unread'
  badge?: 'unread'
}

export const NAV_ENTRIES: NavEntry[] = [
  { key: 'home', route: '/' },
  { key: 'videoclub', route: '/videoclub' },

  { key: 'semaine', route: '/semaine', category: 'catEvenement' },
  { key: 'duels', route: '/duels', category: 'catEvenement' },

  { key: 'films', route: '/films', category: 'catFilms' },
  { key: 'notes', route: '/notes', category: 'catFilms' },
  { key: 'pires', route: '/notes?tab=pires', category: 'catFilms', condition: 'rageux' },
  { key: 'rattrapage', route: '/rattrapage', category: 'catFilms' },
  { key: 'watchlist', route: '/watchlist', category: 'catFilms', condition: 'auth' },
  { key: 'watchlistPublic', route: '/watchlist/public', category: 'catFilms' },

  { key: 'forum', route: '/forum', category: 'catSocial' },
  { key: 'marathoniens', route: '/marathoniens', category: 'catSocial' },
  { key: 'classement', route: '/classement', category: 'catSocial' },
  { key: 'messages', route: '/messages', category: 'catSocial', condition: 'auth', badge: 'unread' },

  { key: 'tamagotchi', route: '/tamagotchi', category: 'catSecret', condition: 'tamagotchi' },
  { key: 'clippyRevanche', route: '/clippy-revanche', category: 'catSecret', condition: 'clippyRevanche' },
  { key: 'easterEggs', route: '/easter-eggs', category: 'catSecret' },
]

export const ACCOUNT_ENTRIES: NavEntry[] = [
  { key: 'profil', route: '/profil', condition: 'auth' },
  { key: 'messages', route: '/messages', condition: 'auth', badge: 'unread' },
  { key: 'admin', route: '/admin', condition: 'admin' },
  { key: 'logout', route: '', condition: 'auth' },
]

export const CATEGORIES: { key: NavCategory; labelKey: NavKey }[] = [
  { key: 'catEvenement', labelKey: 'catEvenement' },
  { key: 'catFilms', labelKey: 'catFilms' },
  { key: 'catSocial', labelKey: 'catSocial' },
  { key: 'catSecret', labelKey: 'catSecret' },
]

export const BOTTOM_NAV_KEYS: NavKey[] = ['home', 'films', 'notes', 'forum', 'marathoniens']

export interface NavConditions {
  isAuth: boolean
  isAdmin: boolean
  hasRageuxEgg: boolean
  hasTamagotchiEgg: boolean
  hasClippyRevanche: boolean
  unreadMessages: number
  videoclubMode: 'cache' | 'bientot'
}

export function isEntryVisible(entry: NavEntry, cond: NavConditions): boolean {
  if (entry.key === 'videoclub' && cond.videoclubMode === 'cache') return false

  switch (entry.condition) {
    case 'auth': return cond.isAuth
    case 'admin': return cond.isAdmin
    case 'rageux': return cond.hasRageuxEgg
    case 'tamagotchi': return cond.hasTamagotchiEgg
    case 'clippyRevanche': return cond.hasClippyRevanche
    case 'unread': return cond.unreadMessages > 0
    default: return true
  }
}

export function getVisibleEntries(entries: NavEntry[], cond: NavConditions): NavEntry[] {
  return entries.filter(e => isEntryVisible(e, cond))
}

export function getCategoryEntries(category: NavCategory, cond: NavConditions): NavEntry[] {
  return NAV_ENTRIES.filter(e => e.category === category && isEntryVisible(e, cond))
}
