import type { ThemeDef, WeekInfo } from './types'

const pad2 = (n: number) => String(n).padStart(2, '0')

const RANGS = [
  'Chapardeur de poules',
  'Tricheur au poker',
  'Voleur de chevaux',
  'Trouble au saloon',
  'Braqueur de diligence',
  'Déserteur',
  'Pilleur de banque',
  'Chef de bande',
  'Attaque de train',
  'Mort ou vif',
  'Recherché dans quatre territoires',
  'Légende',
]

export const westernTheme: ThemeDef = {
  key: 'western',
  label: 'Western',

  nav: {
    home: 'Le contrat',
    catEvenement: 'La chevauchée',
    semaine: 'Le territoire',
    duels: 'Le duel',
    catFilms: 'Les avis',
    films: 'Les avis de recherche',
    notes: 'Le carnet de tir',
    pires: 'Le cimetière',
    rattrapage: 'L’école de tir',
    watchlist: 'Mes cibles',
    watchlistPublic: 'Les cibles de la ville',
    catSocial: 'La ville',
    forum: 'Le saloon',
    marathoniens: 'La bande',
    classement: 'Le mur des primes',
    messages: 'Le courrier',
    catSecret: 'La planque',
    easterEggs: 'Le butin',
    profil: 'Ton avis de recherche',
    admin: 'Le bureau du shérif',
    logout: 'Quitter la ville',
  },

  navCourt: {
    home: 'Contrat',
    films: 'Avis',
    notes: 'Carnet',
    forum: 'Saloon',
    marathoniens: 'Bande',
  },

  vocab: {
    markSeen: 'Capturer',
    markSeenDone: 'Capturé',
    unmarkSeen: 'Remettre en cavale',
    notSeen: 'En cavale',
    addToList: 'Mettre une prime',
    level: 'Rang',
    badge: 'Entaille',
    badges: 'Entailles',
    rating: 'Relevé',
    vote: 'Tirer',
    weekFilm: 'Le contrat',
    duelScreening: 'La séance du vainqueur',
    bonus48: 'La prime de 48 h',
    players: 'La bande',
    playerCount: 'hors-la-loi',
    playerCountUn: 'hors-la-loi',
    player: 'Hors-la-loi',
    week: 'Territoire',
    duel: 'Duel',
    forumTopic: 'Table',
    notesBest: 'Le carnet de tir',
    rattrapage1: 'Blanc-bec',
    rattrapage2: 'Cow-boy',
    rattrapage3: 'Pistolero',
    eggFound: 'Déterré',
    eggsIntro: 'Des choses sont enterrées dans la ville. Trouve-les toutes pour les déterrer. Certaines nécessitent du courage.',
    authTitle: 'Pousser les portes',
    resetTitle: 'Clé perdue',
    empty: 'Rien à l’horizon.',
    errorGeneric: 'Raté. Le coup n’est pas parti.',
    notFoundTitle: 'Y a plus personne ici.',
    searchFilms: 'Fouiller les avis de recherche…',
    welcomeTitle: 'Lis les règles avant de dégainer.',
    joinTitle: 'Rejoindre la bande en cours de route',
    joinPendingTitle: 'Le shérif examine ta demande',
    joinAcceptedTitle: 'Recruté — Saison {n}',
    toastSeenTitle: 'Capturé — {titre}',
  },

  repliques: {
    contratCitation: 'Au bout du compte, il n’y a que deux sortes de gens : ceux qui ont vu ce film, et les autres.',
    duelPerdant: 'Celui qui tombe repart en cavale.',
    saloonPied: 'Le saloon ne ferme jamais. Le barman, lui, ne répond plus depuis 1968.',
    mouche: 'Elle est toujours là.',
    oeufEnterre: 'Enterré',
  },

  citations: [],
  expUnit: '$',
  levels: RANGS,

  levelLabel: (level: number) => {
    const name = RANGS[level - 1] ?? RANGS[RANGS.length - 1]
    return `Rang ${pad2(level)} · ${name}`
  },

  weekLabel: (w: WeekInfo) =>
    `TERRITOIRE ${pad2(w.semaine)} / ${pad2(w.total)} — WESTERN`,

  weekCourt: (w: WeekInfo) => `${pad2(w.semaine)} / ${pad2(w.total)}`,

  eggs: ['theme-western-mouche', 'theme-western-404', 'theme-western-duel'],
  radioTrack: null,
}
