import type { ThemeDef, WeekInfo } from './types'

const pad2 = (n: number) => String(n).padStart(2, '0')

const ROLES = [
  'La première victime',
  'Celui qui dit « je reviens tout de suite »',
  'Celui qui descend à la cave',
  'Celui qui se sépare du groupe',
  'Le sceptique',
  'Celui qui a entendu un bruit',
  'Le témoin',
  'Celui qui a lu le livre',
  'Le prêtre',
  'Celui qui est revenu de la forêt',
  'Le dernier survivant',
  'La dernière fille',
]

export const horreurTheme: ThemeDef = {
  key: 'horreur',
  label: 'Horreur',

  nav: {
    home: 'La porte',
    catEvenement: 'La nuit',
    semaine: 'Les sept nuits',
    duels: 'Les deux portes',
    catFilms: 'La cave',
    films: 'Les cassettes',
    notes: 'Le registre',
    pires: 'La fosse',
    rattrapage: 'Les cercles',
    watchlist: 'La liste noire',
    watchlistPublic: 'Les listes noires du village',
    catSocial: 'Le village',
    forum: 'La veillée',
    marathoniens: 'Ceux qui restent',
    classement: 'Les survivants',
    messages: 'Les appels',
    catSecret: 'La forêt',
    easterEggs: 'Les bandes retrouvées',
    profil: 'Ton dossier',
    admin: 'La chaufferie',
    logout: 'Éteindre la lumière',
  },

  navCourt: {
    films: 'Rayon',
    notes: 'Griffes',
    forum: 'Veillée',
  },

  vocab: {
    markSeen: 'Rayer',
    markSeenDone: 'Rayé',
    notSeen: 'Toujours en vie',
    addToList: 'Ajouter à la liste noire',
    level: 'Niveau',
    badge: 'Pièce à conviction',
    badges: 'Pièces à conviction',
    vote: 'Ouvrir une porte',
    weekFilm: 'La nuit de {fdlsJour}',
    duelScreening: 'La porte restée éclairée',
    bonus48: 'Le bonus de 48 h',
    players: 'Ceux qui restent',
    playerCount: 'inscrits',
    playerCountUn: 'inscrit',
    week: 'Semaine',
    duel: 'Les deux portes',
    forumTopic: 'Histoire',
    notesBest: 'Le registre',
    rattrapage1: 'Le premier cercle',
    rattrapage2: 'Le deuxième cercle',
    rattrapage3: 'Le troisième cercle',
    eggFound: 'Retrouvée',
    eggsIntro: 'Des bandes ont été cachées dans le site. Retrouve-les toutes. Certaines nécessitent du courage.',
    authTitle: 'Frapper à la porte',
    resetTitle: 'Tu as perdu la clé',
    empty: 'Personne. Pour l’instant.',
    loading: 'Rembobinage…',
    errorGeneric: 'Quelque chose a coupé le courant.',
    notFoundTitle: 'Il n’y a rien derrière cette porte',
    profileEmpty: 'Aucune victime. Tout le monde est encore en vie.',
    welcomeTitle: 'Entre. Lis les règles d’abord.',
    joinTitle: 'Rejoindre ceux qui restent',
    joinPendingTitle: 'Quelqu’un lit ta demande',
    joinAcceptedTitle: 'Tu es des nôtres — Saison {n}',
    toastSeenTitle: 'Rayé — {titre}',
  },

  repliques: {
    porteSousTitre: 'Ta prochaine victime. Et quelqu’un te suit.',
    duelRegle: 'Deux portes. Une seule restera éclairée.',
    classementVide: 'Personne. Pour l’instant.',
    polaroid: '{pseudo} — dernière trace : devant sa télé',
    veilleePied: 'Une bougie s’éteint quand personne n’a parlé depuis trois jours.',
    restentPied: 'On a compté {n}. Sur la photo, il y a {m} places.',
    appelsManques0: 'Aucun appel manqué · seuls vous deux entendez',
    appelsManques1: '1 appel manqué · seuls vous deux entendez',
    appelsManques: '{n} appels manqués · seuls vous deux entendez',
    prevenuTitre: 'Cette semaine, quelque chose peut apparaître.',
    prevenuTexte: 'Si tu ne le vois pas à temps, tu sursauteras. Le son se coupe par la case « Son », en bas à gauche ; les sursauts, dans la radio.',
    ballon: 'Tu le reverras.',
    apparitionVue: 'Tu l’as vu avant qu’il te voie.',
    cercle: 'On est déjà passés par ici.',
    oeufEnterre: 'Disparue',
  },

  citations: [],
  expUnit: 'EXP',
  levels: ROLES,

  levelLabel: (level: number) => {
    const name = ROLES[level - 1] ?? ROLES[ROLES.length - 1]
    return `${pad2(level)} · ${name}`
  },

  weekLabel: (w: WeekInfo) =>
    `SEMAINE ${pad2(w.semaine)} / ${pad2(w.total)} — HORREUR`,

  weekCourt: (w: WeekInfo) => `${pad2(w.semaine)} / ${pad2(w.total)}`,

  eggs: ['theme-horreur-ballon', 'theme-horreur-possession', 'theme-horreur-cercle', 'theme-horreur-apparition'],
  radioTracks: ['/audio/radio/horreur-1.mp3', '/audio/radio/horreur-2.mp3'],
}
