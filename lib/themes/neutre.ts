import type { ThemeDef, ThemeConfig, NavKey, NavCourtKey, VocabKey } from './types'

export const neutreTheme: ThemeDef = {
  id: 'neutre',

  nav: {
    home: 'Accueil',
    videoclub: 'Vidéoclub',
    catEvenement: 'Évènement collectif',
    semaine: 'Films de la semaine',
    duels: 'Duels',
    catFilms: 'Films',
    films: 'Liste de films',
    notes: 'Classements films',
    pires: 'Pires films',
    rattrapage: 'Rattrapages cinéma',
    watchlist: 'Mes watchlists',
    watchlistPublic: 'Watchlists publiques',
    catSocial: 'Social',
    forum: 'Forum',
    marathoniens: 'Marathoniens',
    classement: 'Classement joueurs',
    messages: 'Messages',
    catSecret: 'Secret',
    tamagotchi: 'Mon Alien',
    clippyRevanche: 'La revanche de Clippy',
    easterEggs: 'Easter eggs',
    profil: 'Mon profil',
    admin: 'Administration',
    logout: 'Déconnexion',
    login: 'Se connecter',
  },

  navCourt: {
    home: 'Accueil',
    films: 'Films',
    notes: 'Notes',
    forum: 'Forum',
    marathoniens: 'Joueurs',
  },

  vocab: {
    markSeen: 'Marquer comme vu',
    markSeenDone: 'Vu',
    unmarkSeen: 'Retirer des vus',
    notSeen: 'Jamais vu',
    addToList: 'Ajouter à une watchlist',
    level: 'Niveau',
    badge: 'Badge',
    badges: 'Badges',
    rating: 'Note',
    vote: 'Voter',
    weekFilm: 'Film de la semaine',
    duelScreening: 'Séance du duel',
    bonus48: 'Bonus 48 h',
    players: 'Les marathoniens',
    playerCount: 'marathoniens',
    playerCountUn: 'marathonien',
    player: 'Marathonien',
    week: 'Semaine',
    duel: 'Duel',
    forumTopic: 'Sujet',
    notesBest: 'Meilleurs films',
    rattrapage1: 'Débutant',
    rattrapage2: 'Intermédiaire',
    rattrapage3: 'Confirmé',
    eggFound: 'Découvert',
    eggsIntro: 'Des secrets sont cachés dans le site. Trouve-les tous pour les débloquer. Certains nécessitent du courage.',
    authTitle: 'Connexion',
    resetTitle: 'Nouveau mot de passe',
    empty: 'Aucun résultat.',
    loading: 'Chargement…',
    errorGeneric: 'Une erreur est survenue.',
    notFoundTitle: 'Page introuvable',
    notFoundText: 'Cette page n’existe pas.',
    searchFilms: 'Rechercher un titre, un réalisateur…',
    saved: 'Enregistré.',
    profileEmpty: 'Aucun film vu pour l’instant.',
    goodbye: 'À bientôt.',
    welcomeTitle: 'Bienvenue dans le Marathon',
    joinTitle: 'Rejoindre le Marathon en cours',
    joinPendingTitle: 'Demande en attente de validation',
    joinAcceptedTitle: 'Inscription acceptée — Saison {n}',
    toastSeenTitle: 'Vu — {titre}',
  },

  repliques: {},

  citations: [],

  expUnit: 'EXP',

  levels: [
    '', '', '', '', '', '', '', '', '', '', '', '',
  ],
}

let currentTheme: ThemeDef = neutreTheme

export function setTheme(theme: ThemeDef) {
  currentTheme = theme
}

export function getTheme(): ThemeDef {
  return currentTheme
}

function replaceVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in vars) return vars[key]
    return match
  })
}

function commonVars(cfg?: ThemeConfig): Record<string, string> {
  if (!cfg) return {}
  return {
    fdlsJour: cfg.fdlsJour.toLowerCase(),
    fdlsHeure: cfg.fdlsHeure,
    seanceJour: cfg.seanceJour.toLowerCase(),
    seanceHeure: cfg.seanceHeure,
  }
}

export function t(key: VocabKey, vars?: Record<string, string>, cfg?: ThemeConfig): string {
  const raw = currentTheme.vocab[key]
  if (!raw) return neutreTheme.vocab[key] ?? key
  const merged = { ...commonVars(cfg), ...vars }
  return Object.keys(merged).length > 0 ? replaceVars(raw, merged) : raw
}

export function navLabel(key: NavKey): string {
  return currentTheme.nav[key] ?? neutreTheme.nav[key] ?? key
}

export function navCourtLabel(key: NavCourtKey): string {
  return currentTheme.navCourt[key] ?? neutreTheme.navCourt[key] ?? key
}

export function levelLabel(level: number): string {
  const name = currentTheme.levels[level - 1] ?? ''
  const label = currentTheme.vocab.level ?? neutreTheme.vocab.level
  if (name) return `${label} ${level} · ${name}`
  return `${label} ${level}`
}

export function formatExp(amount: number): string {
  const unit = currentTheme.expUnit ?? 'EXP'
  return `${amount >= 0 ? '+' : ''}${amount} ${unit}`
}

export function accorde(n: number, singulier: string, pluriel: string): string {
  return n <= 1 ? singulier : pluriel
}
