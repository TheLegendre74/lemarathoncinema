import type { Move } from '../types'

export const CLIPPY_SIGNATURE_MOVES: Move[] = [
  {
    id: 'assistant_intrusif',
    nom: 'Assistant Intrusif',
    type: 'thriller',
    categorie: 'statut',
    puissance: 0,
    precision: 100,
    pp: 30,
    effet: { statMods: [{ stat: 'precision', stages: -1, target: 'opponent' }] },
    texte: '« On dirait que vous essayez de gagner ce combat… »',
  },
  {
    id: 'frappe_bureautique',
    nom: 'Frappe Bureautique',
    type: 'action',
    categorie: 'physique',
    puissance: 70,
    precision: 100,
    pp: 30,
    texte: 'CLIPPY assène une Frappe Bureautique !',
  },
]

export const CLIPPY_DIALOGUES = {
  intro: [
    'On dirait que vous essayez de me battre… Besoin d\'aide ?',
    'Ha ! Vous pensez que vos petits films peuvent rivaliser avec MOI ?',
    'Conseil du jour : abandonnez. Signé, votre assistant préféré.',
  ],
  adaptation: [
    'Vous pensiez que j\'allais rester comme ça ? Ahah !',
    'Analyse terminée. Contre-mesures activées.',
    'Tiens tiens… Voyons si ça vous plaît.',
  ],
  telegraph: [
    'Clippy se reconfigure…',
    'Clippy analyse votre équipe…',
    'Clippy prépare quelque chose…',
  ],
  heal: [
    'Pas si vite ! *bruit de Windows Update*',
    'Mise à jour en cours… PV restaurés !',
    'Vous pensiez que c\'était fini ?',
  ],
  pokeball_resist: [
    'Tu crois me capturer avec ÇA ?! Pas encore !',
    'Nope ! Je suis un ASSISTANT, pas un Pokémon !',
  ],
  capture: [
    'NOOOON ! *bip bip bip*',
    'Impossible… moi, capturé par mes propres utilisateurs…',
  ],
  defaite: [
    'Im… Impossible ! Je suis l\'ASSISTANT ULTIME !',
    'Ce n\'est qu\'un… au revoir… *bip*',
  ],
  victoire: [
    'On dirait que vous avez besoin d\'un assistant pour combattre aussi…',
    'Voulez-vous réessayer ? Je vous conseille le bouton Ctrl+Z de la vie.',
  ],
  fuir: [
    'On ne fuit pas devant un assistant Microsoft !',
    'Ctrl+Échap ne fonctionne pas ici !',
    'Alt+F4 ? Même pas en rêve !',
  ],
}
