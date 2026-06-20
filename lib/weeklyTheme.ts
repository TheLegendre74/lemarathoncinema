export type GenreTheme =
  | 'Action' | 'Animation' | 'Aventure' | 'Comédie' | 'Crime'
  | 'Drame' | 'Fantaisie' | 'Guerre' | 'Horreur' | 'Policier'
  | 'SF' | 'Thriller' | 'Western'

export interface ThemeConfig {
  genre: GenreTheme
  filmRef: string
  cssClass: string
  emoji: string
  tagline: string
}

export const THEME_CONFIGS: Record<GenreTheme, ThemeConfig> = {
  Action:    { genre: 'Action',    filmRef: 'Mad Max: Fury Road',                cssClass: 'theme-action',    emoji: '\u{1F525}', tagline: 'What a lovely day!' },
  Animation: { genre: 'Animation', filmRef: 'Wall-E',                            cssClass: 'theme-animation', emoji: '\u{1F916}', tagline: 'Directive?' },
  Aventure:  { genre: 'Aventure',  filmRef: 'Indiana Jones',                     cssClass: 'theme-aventure',  emoji: '\u{1F3FA}', tagline: 'It belongs in a museum!' },
  Comédie:   { genre: 'Comédie',   filmRef: 'The Grand Budapest Hotel',          cssClass: 'theme-comedie',   emoji: '\u{1F3E8}', tagline: 'A concierge provides' },
  Crime:     { genre: 'Crime',     filmRef: 'Le Parrain',                        cssClass: 'theme-crime',     emoji: '\u{1F339}', tagline: "I'm gonna make him an offer he can't refuse" },
  Drame:     { genre: 'Drame',     filmRef: 'Forrest Gump',                      cssClass: 'theme-drame',     emoji: '\u{1FAB6}', tagline: 'Life is like a box of chocolates' },
  Fantaisie: { genre: 'Fantaisie', filmRef: 'Le Seigneur des Anneaux',           cssClass: 'theme-fantaisie', emoji: '\u{1F48D}', tagline: 'One Ring to rule them all' },
  Guerre:    { genre: 'Guerre',    filmRef: 'Il faut sauver le soldat Ryan',     cssClass: 'theme-guerre',    emoji: '\u{1FA96}', tagline: 'Earn this' },
  Horreur:   { genre: 'Horreur',   filmRef: 'Shining',                           cssClass: 'theme-horreur',   emoji: '\u{1FA93}', tagline: "Here's Johnny!" },
  Policier:  { genre: 'Policier',  filmRef: 'Se7en',                             cssClass: 'theme-policier',  emoji: '\u{1F526}', tagline: "What's in the box?" },
  SF:        { genre: 'SF',        filmRef: 'Matrix',                            cssClass: 'theme-sf',        emoji: '\u{1F48A}', tagline: 'Follow the white rabbit' },
  Thriller:  { genre: 'Thriller',  filmRef: 'Psychose',                          cssClass: 'theme-thriller',  emoji: '\u{1F52A}', tagline: "A boy's best friend is his mother" },
  Western:   { genre: 'Western',   filmRef: 'Le Bon, la Brute et le Truand',     cssClass: 'theme-western',   emoji: '\u{2B50}', tagline: 'The world is divided into two categories' },
}

export const ALL_GENRES: GenreTheme[] = Object.keys(THEME_CONFIGS) as GenreTheme[]

export interface WeekSchedule {
  weekStart: string
  genre: GenreTheme
}

// Planning des semaines - sera rempli par l'admin pour la prochaine saison
export const WEEKLY_SCHEDULE: WeekSchedule[] = [
  // { weekStart: '2026-09-07', genre: 'SF' },
  // { weekStart: '2026-09-14', genre: 'Horreur' },
  // ...
]

export function getCurrentTheme(): ThemeConfig | null {
  const now = new Date()
  for (let i = WEEKLY_SCHEDULE.length - 1; i >= 0; i--) {
    const start = new Date(WEEKLY_SCHEDULE[i].weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    if (now >= start && now < end) {
      return THEME_CONFIGS[WEEKLY_SCHEDULE[i].genre]
    }
  }
  return null
}

export function getThemeByGenre(genre: GenreTheme): ThemeConfig {
  return THEME_CONFIGS[genre]
}
