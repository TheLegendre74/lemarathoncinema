import type { ThemeDef, WeekInfo } from './types'

const pad2 = (n: number) => String(n).padStart(2, '0')

export const actionTheme: ThemeDef = {
  key: 'action',
  label: 'Action',

  nav: {
    home: 'Accueil',
    catEvenement: 'Opérations',
    semaine: 'L’opération',
    duels: 'Face-à-face',
    catFilms: 'Armurerie',
    films: 'L’arsenal',
    notes: 'Les relevés',
    pires: 'La casse',
    rattrapage: 'L’entraînement',
    watchlist: 'Repérages',
    watchlistPublic: 'Repérages de l’unité',
    catSocial: 'Unité',
    forum: 'Fréquences',
    marathoniens: 'L’équipe',
    classement: 'Tableau de chasse',
    messages: 'Transmissions',
    catSecret: 'Classifié',
    easterEggs: 'Dossiers classifiés',
    profil: 'Fiche d’opérateur',
    admin: 'PC sécurité',
    logout: 'Quitter le toit',
  },

  navCourt: {
    films: 'Arsenal',
    notes: 'Relevés',
    forum: 'Canaux',
    marathoniens: 'Équipe',
  },

  vocab: {
    markSeen: 'Encaisser',
    markSeenDone: 'Encaissé',
    notSeen: 'Jamais vu',
    addToList: 'Ajouter à une watchlist',
    level: 'Étage',
    badge: 'Plaque',
    badges: 'Plaques',
    rating: 'Relevé',
    vote: 'Voter',
    weekFilm: 'Heure H',
    duelScreening: 'Séance du face-à-face',
    bonus48: 'Bonus 48 h',
    players: 'L’équipe',
    playerCount: 'opérateurs',
    playerCountUn: 'opérateur',
    player: 'Opérateur',
    week: 'Opération',
    duel: 'Face-à-face',
    forumTopic: 'Canal',
    notesBest: 'Meilleurs relevés',
    rattrapage1: 'Recrue',
    rattrapage2: 'Opérateur',
    rattrapage3: 'Vétéran',
    eggFound: 'Déclassifié',
    authTitle: 'Prendre le poste',
    resetTitle: 'Code d’accès perdu',
    empty: 'Rien sur le radar.',
    loading: 'Acquisition du signal…',
    notFoundTitle: 'Étage 13',
    welcomeTitle: 'Bienvenue dans l’unité',
    joinTitle: 'Rejoindre l’opération en cours',
    joinPendingTitle: 'En attente du feu vert',
    joinAcceptedTitle: 'Accrédité — Saison {n}',
    toastSeenTitle: 'Encaissé — {titre}',
  },

  repliques: {},
  citations: [],
  expUnit: 'EXP',
  levels: null,

  levelLabel: (level: number) => `Étage ${pad2(level)}`,

  weekLabel: (w: WeekInfo) =>
    `SEMAINE ${pad2(w.semaine)} / ${pad2(w.total)} — ACTION`,

  weekCourt: (w: WeekInfo) => `${pad2(w.semaine)} / ${pad2(w.total)}`,

  eggs: ['theme-action-voiture', 'theme-action-nakatomi'],
  radioTrack: null,
}
