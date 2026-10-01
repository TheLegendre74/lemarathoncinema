export type ThemeId = 'neutre' | 'action' | 'comedie' | 'western' | 'horreur'

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

export type NavCourtKey = 'home' | 'films' | 'notes' | 'forum' | 'marathoniens'

export interface ThemeDef {
  id: ThemeId
  nav: Record<NavKey, string>
  navCourt: Record<NavCourtKey, string>
  vocab: Record<VocabKey, string>
  repliques: Record<string, string>
  citations: string[]
  expUnit: string
  levels: string[]
}

export interface ThemeConfig {
  fdlsJour: string
  fdlsHeure: string
  seanceJour: string
  seanceHeure: string
}
