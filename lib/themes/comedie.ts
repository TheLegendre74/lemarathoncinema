import type { ThemeDef, WeekInfo } from './types'

const ROMAINS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

const EMPLOIS = [
  'Ouvreuse',
  'Machiniste',
  'Figurant',
  'Doublure',
  'Utilité',
  'Petit rôle',
  'Second rôle',
  'Premier rôle',
  "En haut de l’affiche",
  "Tête d’affiche",
  'Directeur de troupe',
  'Monstre sacré',
]

function romain(n: number): string {
  return ROMAINS[n - 1] ?? String(n)
}

export const comedieTheme: ThemeDef = {
  key: 'comedie',
  label: 'Comédie',

  nav: {
    home: "À l’affiche",
    catEvenement: 'La scène',
    semaine: "L’acte",
    duels: "L’applaudimètre",
    catFilms: 'La bibliothèque',
    films: 'Le répertoire',
    notes: 'La revue de presse',
    pires: 'Les bides',
    rattrapage: 'Le conservatoire',
    watchlist: 'Mes réservations',
    watchlistPublic: 'Les réservations du foyer',
    catSocial: 'Le foyer',
    forum: 'Les coulisses',
    marathoniens: 'La troupe',
    classement: "L’affiche",
    messages: 'Les petits mots',
    catSecret: 'Les cintres',
    easterEggs: "Le magasin d’accessoires",
    profil: 'Ta loge',
    admin: 'La régie',
    logout: 'La sortie des artistes',
  },

  navCourt: {
    home: 'Affiche',
    films: 'Pièces',
    notes: 'Revue',
    forum: 'Coulisses',
    marathoniens: 'Troupe',
  },

  vocab: {
    markSeen: 'Applaudir',
    markSeenDone: 'Applaudi',
    unmarkSeen: 'Remettre au répertoire',
    notSeen: 'Jamais joué',
    level: 'Emploi',
    badge: 'Étoile',
    badges: 'Étoiles',
    rating: 'Critique',
    vote: 'Donner sa voix',
    weekFilm: "À l’affiche",
    duelScreening: "La pièce de l’applaudimètre",
    bonus48: 'Le bonus de 48 h',
    players: 'La troupe',
    playerCount: 'comédiens',
    playerCountUn: 'comédien',
    player: 'Comédien',
    week: 'Acte',
    duel: 'Applaudimètre',
    forumTopic: 'Loge',
    notesBest: 'La revue de presse',
    rattrapage1: 'Première année',
    rattrapage2: 'Deuxième année',
    rattrapage3: 'Sociétaire',
    authTitle: "L’entrée des artistes",
    resetTitle: "J’ai oublié mon texte",
    empty: "Personne ce soir. Il s’agirait de grandir, hein.",
    loading: "Trois coups… Ah ! C’était donc ça tout ce tintouin.",
    errorGeneric: "Trou de mémoire. Le souffleur n’a rien entendu.",
    notFoundTitle: 'Le souffleur a un trou',
    notFoundText: 'Revenez en coulisses.',
    searchFilms: 'Consulter le répertoire… ou demander comment est la blanquette',
    saved: 'Bravo. On me dit le plus grand bien de ce film.',
    goodbye: 'Le rideau tombe. Ne claquez pas la porte de la loge.',
    welcomeTitle: 'Bienvenue au théâtre',
    joinTitle: "Rejoindre la troupe en cours d’acte",
    joinPendingTitle: 'La régie examine ta demande',
    joinAcceptedTitle: 'Engagé — Saison {n}',
    toastSeenTitle: 'Bravo — {titre}',
  },

  repliques: {
    duelEcrase: "C’est la piquette, Jack. Tu sais pas jouer, Jack.",
    blanquetteQuestion: 'Comment est votre blanquette ?',
    blanquetteReponse: 'Elle est bonne.',
    hyene: "J’aime les hyènes. On n’en parle jamais pourtant.",
    souffleur: "… j’ai un trou.",
    anciennete: 'Au club depuis {n} semaines, bientôt {m}',
  },

  citations: [
    "Il s’agirait de grandir, hein.",
    'Comment est votre blanquette ?',
    "Ah ! C’était donc ça tout ce tintouin.",
    'On me dit le plus grand bien de ce film.',
    "C’est la piquette, Jack.",
  ],

  expUnit: 'rappels',
  levels: EMPLOIS,

  levelLabel: (level: number) => {
    const name = EMPLOIS[level - 1] ?? EMPLOIS[EMPLOIS.length - 1]
    return `Emploi ${String(level).padStart(2, '0')} · ${name}`
  },

  weekLabel: (w: WeekInfo) =>
    `ACTE ${romain(w.semaine)} / ${romain(w.total)} — COMÉDIE`,

  weekCourt: (w: WeekInfo) => `${romain(w.semaine)} / ${romain(w.total)}`,

  eggs: ['theme-comedie-vert', 'theme-comedie-blanquette', 'theme-comedie-hyene'],
  radioTracks: ['/audio/radio/comedie-1.mp3', '/audio/radio/comedie-2.mp3'],
}
