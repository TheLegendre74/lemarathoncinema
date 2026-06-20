export type ItemTarget = 'active' | 'ko'

export interface ItemDef {
  id: string
  nom: string
  description: string
  quantiteInitiale: number
  target: ItemTarget
  effet: 'heal' | 'superHeal' | 'fullRestore' | 'revive' | 'atkBoost' | 'defBoost'
  value: number
}

export const ITEMS: ItemDef[] = [
  { id: 'potion', nom: 'Potion', description: 'Soigne 30% des PV max.',
    quantiteInitiale: 3, target: 'active', effet: 'heal', value: 0.30 },
  { id: 'super_potion', nom: 'Super Potion', description: 'Soigne 60% des PV max.',
    quantiteInitiale: 2, target: 'active', effet: 'superHeal', value: 0.60 },
  { id: 'restauration', nom: 'Restauration', description: 'PV max + soigne le statut.',
    quantiteInitiale: 1, target: 'active', effet: 'fullRestore', value: 1.0 },
  { id: 'rappel', nom: 'Rappel', description: 'Ranime un film K.O. à 50% PV.',
    quantiteInitiale: 2, target: 'ko', effet: 'revive', value: 0.50 },
  { id: 'attaque_plus', nom: 'Attaque +', description: 'Attaque +1 cran.',
    quantiteInitiale: 2, target: 'active', effet: 'atkBoost', value: 1 },
  { id: 'defense_plus', nom: 'Défense +', description: 'Défense +1 cran.',
    quantiteInitiale: 2, target: 'active', effet: 'defBoost', value: 1 },
]
