export const ACCESSORIES = [
  { id: 'hat',        emoji: '🎩', name: 'Chapeau de magicien' },
  { id: 'crown',      emoji: '👑', name: 'Couronne royale' },
  { id: 'bone',       emoji: '🦴', name: 'Os à ronger' },
  { id: 'controller', emoji: '🎮', name: 'Petite manette' },
  { id: 'sofa',       emoji: '🛋️', name: 'Canapé douillet' },
  { id: 'human',      emoji: '👤', name: 'Humain de compagnie' },
  { id: 'flower',     emoji: '🌹', name: 'Fleur décorative' },
  { id: 'guitar',     emoji: '🎸', name: 'Guitare miniature' },
  { id: 'crystal',    emoji: '🔮', name: 'Boule de cristal' },
  { id: 'sword',      emoji: '⚔️', name: 'Épée miniature' },
  { id: 'helmet',     emoji: '🪖', name: 'Casque militaire' },
  { id: 'doll',       emoji: '🪆', name: 'Poupée alien' },
  { id: 'plush',      emoji: '🧸', name: 'Peluche humaine' },
  { id: 'trophy',     emoji: '🏆', name: "Trophée d'honneur" },
] as const

export type Accessory = { id: string; emoji: string; name: string }

const KEY = 'tama_accessories'

export function getOwnedIds(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function getOwnedAccessories(): Accessory[] {
  const ids = getOwnedIds()
  return ACCESSORIES.filter(a => ids.includes(a.id))
}

export function unlockRandomAccessory(): { accessory: Accessory; isNew: boolean } {
  const owned = getOwnedIds()
  const available = ACCESSORIES.filter(a => !owned.includes(a.id))
  const pool = available.length > 0 ? available : [...ACCESSORIES]
  const item = pool[Math.floor(Math.random() * pool.length)]
  const isNew = !owned.includes(item.id)
  if (isNew) {
    try { localStorage.setItem(KEY, JSON.stringify([...owned, item.id])) } catch { /* ignore */ }
  }
  return { accessory: item, isNew }
}
