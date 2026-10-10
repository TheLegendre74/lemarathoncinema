export type ThemeKey = 'neutre' | 'action' | 'comedie' | 'western' | 'horreur'

export const READY_THEMES: ThemeKey[] = ['neutre', 'action', 'comedie', 'western', 'horreur']

export type ThemeEggId =
  | 'theme-action-voiture'
  | 'theme-action-nakatomi'
  | 'theme-comedie-vert'
  | 'theme-comedie-blanquette'
  | 'theme-comedie-hyene'
  | 'theme-western-mouche'
  | 'theme-western-404'
  | 'theme-western-duel'
  | 'theme-horreur-ballon'
  | 'theme-horreur-possession'
  | 'theme-horreur-cercle'
  | 'theme-horreur-apparition'

export type NavKey =
  | 'home' | 'videoclub'
  | 'catEvenement' | 'semaine' | 'duels'
  | 'catFilms' | 'films' | 'notes' | 'pires' | 'rattrapage' | 'watchlist' | 'watchlistPublic'
  | 'catSocial' | 'forum' | 'marathoniens' | 'classement' | 'messages'
  | 'catSecret' | 'tamagotchi' | 'clippyRevanche' | 'easterEggs'
  | 'profil' | 'admin' | 'logout' | 'login'

export type NavCourtKey = 'home' | 'films' | 'notes' | 'forum' | 'marathoniens'

export type VocabKey =
  | 'markSeen' | 'markSeenDone' | 'unmarkSeen' | 'notSeen' | 'addToList'
  | 'level' | 'badge' | 'badges' | 'rating' | 'vote'
  | 'weekFilm' | 'duelScreening' | 'bonus48'
  | 'players' | 'playerCount' | 'playerCountUn' | 'player'
  | 'week' | 'duel' | 'forumTopic'
  | 'notesBest'
  | 'rattrapage1' | 'rattrapage2' | 'rattrapage3'
  | 'eggFound' | 'eggsIntro'
  | 'authTitle' | 'resetTitle'
  | 'empty' | 'loading' | 'errorGeneric'
  | 'notFoundTitle' | 'notFoundText'
  | 'searchFilms' | 'saved' | 'profileEmpty' | 'goodbye'
  | 'welcomeTitle' | 'joinTitle' | 'joinPendingTitle' | 'joinAcceptedTitle'
  | 'toastSeenTitle'

export type RepliqueKey = string

export interface WeekInfo {
  saison: number
  semaine: number
  total: number
}

export interface ThemeDef {
  key: ThemeKey
  label: string
  nav: Partial<Record<NavKey, string>>
  navCourt: Partial<Record<NavCourtKey, string>>
  vocab: Partial<Record<VocabKey, string>>
  levels: string[] | null
  levelLabel: (level: number) => string
  expUnit: string
  weekLabel: (w: WeekInfo) => string
  weekCourt: (w: WeekInfo) => string
  repliques: Partial<Record<string, string>>
  citations: string[]
  eggs: ThemeEggId[]
  radioTracks: string[]
}

export interface ThemeConfig {
  fdlsJour: string
  fdlsHeure: string
  seanceJour: string
  seanceHeure: string
}

export interface ResolvedTheme {
  key: ThemeKey
  real: ThemeKey
  source: 'apercu' | 'force' | 'planning' | 'defaut'
  week: (WeekInfo & { theme: string }) | null
}

export interface SeasonWeek {
  saison: number
  semaine: number
  theme: string
  date_debut: string
}
