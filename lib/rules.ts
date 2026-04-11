export type RuleCard = {
  emoji: string
  title: string
  text?: string
  intro?: string
  list?: string[]
  after?: string
  table?: [string, string][]
}

export const DEFAULT_RULES: RuleCard[] = [
  { emoji: '🎬', title: 'Bienvenue sur le Ciné Marathon !', text: "Un marathon de films collectif où tu regardes des films, votes pour les séances, discutes avec les autres joueurs et grimpes dans le classement en gagnant de l'expérience (EXP)." },
  { emoji: '🚀', title: 'Pour commencer', text: "Crée ton compte avant le 10 Avril 2026. Après cette date, le marathon est lancé et tu devras attendre la Saison 2." },
  { emoji: '🎥', title: 'Les films', intro: "Une liste de films t'attend. Pour chaque film tu peux :", list: ['Le cocher comme vu', 'Le noter de 1 à 10', 'Discuter dans le forum du film', 'Voir où le regarder légalement (Netflix, Canal+, Prime…)', 'Tirer un film au hasard si tu ne sais pas quoi regarder'], after: "Tu peux aussi proposer un nouveau film à ajouter à la liste." },
  { emoji: '⭐', title: "Gagner de l'EXP", table: [['Regarder un film', '+{EXP_FILM} EXP'], ['Regarder le film de la semaine', '+{EXP_FDLS} EXP'], ['Regarder le film vainqueur du duel', '+{EXP_DUEL_WIN} EXP'], ['Voter dans un duel', '+{EXP_VOTE} EXP']] },
  { emoji: '⚔️', title: 'Les duels', text: "Chaque semaine, deux films s'affrontent. Tu votes pour celui que tu veux voir en séance collective. Le vainqueur est regardé ensemble le {SEANCE_JOUR} à {SEANCE_HEURE} et rapporte +{EXP_DUEL_WIN} EXP." },
  { emoji: '📽️', title: 'Le film de la semaine', text: "Chaque {FDLS_JOUR} à {FDLS_HEURE}, un film est annoncé pour une séance collective. Le regarder rapporte +{EXP_FDLS} EXP." },
  { emoji: '💬', title: 'Forum & Le Salon', text: "Chaque film a son propre espace de discussion. Le Salon est un espace libre pour parler cinéma avec tous les membres. Tu peux aussi créer tes propres sujets." },
  { emoji: '🎓', title: 'Rattrapage cinéma', text: "Tu débutes ou tu veux aller plus loin ? La section Rattrapage propose des listes de films classés par niveau : Débutant, Intermédiaire et Confirmé." },
  { emoji: '🥚', title: 'Easter Eggs', text: "Des surprises sont cachées partout sur le site. Explore, tape des mots-clés au clavier, clique sur des éléments inattendus… Trouve-les tous pour débloquer des succès secrets !" },
  { emoji: '🏅', title: 'Les badges', text: "Plus tu accumules d'EXP, plus tu débloques des badges :", table: [['🎞️ Padawan', '5 EXP'], ["🎬 L'Apprenti", '50 EXP'], ['📝 Le Critique', '100 EXP'], ['🎭 Cinéphile', '150 EXP'], ["🏆 L'Auteur", '200 EXP'], ['👑 Légende Vivante', '300 EXP']] },
  { emoji: '🏆', title: 'Le classement', text: "Tous les joueurs sont classés par EXP. Le classement Marathon met en avant les films vus et notés pendant le marathon. Les archives conservent les résultats de chaque saison. Qui sera la Légende Vivante de la Saison 1 ?" },
]
