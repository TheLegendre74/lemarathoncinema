// ── Chargement et accès aux 490 films depuis cards.json ──
import type { CardData, CardsDB, MoveEngine, MoveDisplay, FilmCombatant, GenreType, ClimaxData, StatId } from './types'
import { emptyStages } from './types'
import { BALANCE } from './config/balance.config'

let _cards: CardsDB | null = null

export async function loadCards(): Promise<CardsDB> {
  if (_cards) return _cards
  const resp = await fetch('/data/cards.json')
  const raw: Record<string, any> = await resp.json()
  const db: CardsDB = {}
  for (const [k, v] of Object.entries(raw)) {
    db[Number(k)] = v as CardData
  }
  _cards = db
  return db
}

// ── Saison 1 Climax data ──

export interface Saison1Entry {
  num: number
  name: string
  affinite: string
  climax: string // e.g. "Tec+Prof"
}

let _saison1: Map<number, Saison1Entry> | null = null

export async function loadSaison1(): Promise<Map<number, Saison1Entry>> {
  if (_saison1) return _saison1
  const resp = await fetch('/data/battle/saison1.json')
  const raw: Saison1Entry[] = await resp.json()
  _saison1 = new Map(raw.map(e => [e.num, e]))
  return _saison1
}

export function getClimaxData(entry: Saison1Entry): ClimaxData {
  const affinite = entry.affinite === 'neutre' ? null : entry.affinite
  const stats = entry.climax.split('+') as StatId[]
  return {
    affinity: affinite,
    boostedStats: stats,
    strongMult: affinite ? BALANCE.CLIMAX_STRONG : BALANCE.CLIMAX_NEUTRAL,
    defaultMult: affinite ? BALANCE.CLIMAX_DEFAULT : BALANCE.CLIMAX_NEUTRAL,
  }
}

export function applyClimaxToTeam(team: FilmCombatant[], saison1: Map<number, Saison1Entry>): void {
  for (const mon of team) {
    const entry = saison1.get(mon.num)
    if (!entry) continue
    mon.mega = getClimaxData(entry)
    if (mon.mega.affinity !== null) {
      const malus = 1 - BALANCE.CLIMAX_MALUS
      for (const k of Object.keys(mon.base) as StatId[]) {
        mon.base[k] = Math.floor(mon.base[k] * malus)
      }
      mon.maxHp = Math.floor(mon.maxHp * malus)
      mon.hp = mon.maxHp
    }
  }
}

export function getCardsSync(): CardsDB {
  if (!_cards) throw new Error('Cards not loaded — call loadCards() first')
  return _cards
}

export function getAllCards(): CardData[] {
  return Object.values(getCardsSync())
}

export function getCard(num: number): CardData {
  const c = getCardsSync()[num]
  if (!c) throw new Error(`Card #${num} not found`)
  return c
}

export function getEquippedMoves(card: CardData, customEquipped?: string[]): {
  moves: MoveEngine[]
  movesDisplay: MoveDisplay[]
} {
  const names = customEquipped ?? card.equipped
  const moves: MoveEngine[] = []
  const movesDisplay: MoveDisplay[] = []

  for (const name of names) {
    const engineMove = card.moves_engine.find(m => m.name === name)
    const displayMove = card.moves.find(m => m.name === name)
    if (engineMove) {
      moves.push(engineMove)
      movesDisplay.push(displayMove ?? {
        name: engineMove.name, type: engineMove.type, cat: engineMove.cat,
        pow: engineMove.pow ?? null, acc: engineMove.acc ?? 100,
        effet: '', full: '',
      })
    }
  }

  // fallback: si on a moins de 4, compléter depuis le pool
  if (moves.length < 4) {
    for (const m of card.moves_engine) {
      if (moves.length >= 4) break
      if (!moves.some(em => em.name === m.name)) {
        moves.push(m)
        const dm = card.moves.find(dm => dm.name === m.name)
        movesDisplay.push(dm ?? { name: m.name, type: m.type, cat: m.cat, pow: m.pow ?? null, acc: m.acc ?? 100, effet: '', full: '' })
      }
    }
  }

  return { moves: moves.slice(0, 4), movesDisplay: movesDisplay.slice(0, 4) }
}

export function buildCombatant(card: CardData, customEquipped?: string[]): FilmCombatant {
  const { moves, movesDisplay } = getEquippedMoves(card, customEquipped)
  const maxHp = Math.floor(card.stats.Post * BALANCE.HP_MULT)

  return {
    num: card.num,
    name: card.name,
    types: card.types,
    rarity: card.rarity,
    bst: card.bst,
    baseStats: card.stats,
    passive: card.passive,
    passiveEngine: card.passive_engine,

    maxHp,
    hp: maxHp,
    base: {
      Spec: card.stats.Spec,
      Tec: card.stats.Tec,
      Sce: card.stats.Sce,
      Prof: card.stats.Prof,
      Ryt: card.stats.Ryt,
    },
    stages: emptyStages(),

    moves,
    movesDisplay,
    ppLeft: moves.map(m => normalizepp(m)),

    status: null,
    toxCounter: 0,
    sleepTurns: 0,
    confTurns: 0,
    tauntTurns: 0,
    isProtected: false,
    protectStreak: 0,

    disguise: card.passive_engine.cat === 'disguise',
    firstTurn: true,
    pivotPending: false,
    recoverCount: 0,
    idleTurns: 0,
    dealtDamage: false,

    dodgeUsed: false,
    endureUsed: false,
    lowhpDone: false,
    entryDone: false,

    mega: null,
    megaActive: false,
    megaMult: 1.0,

    isOutsider: card.rarity === 'RARE',
    outsiderCombo: 0,

    isAlive: true,
  }
}

function normalizepp(m: MoveEngine): number {
  if (m.pp >= 5 && m.pp <= 40) return m.pp
  if (m.cat === 'status') return 20
  const pow = m.pow ?? 0
  if (pow >= 100) return 8
  if (pow >= 80) return 16
  return 24
}
