import type { Move, FilmCombatant, CombatantStats, StatId, FilmRow } from './types'
import { EMPTY_STAGES } from './types'
import { getEffectiveness } from './config/types.config'
import { BALANCE } from './config/balance.config'
import { mapFilmTypes } from './config/genreMapping.config'
import { MOVES_BY_TYPE } from './config/moves.config'
import { findSignature } from './config/signatures.config'

function hashFilmId(id: number): number {
  let h = Math.abs(id) * 2654435761
  h = ((h >>> 0) ^ (h >>> 16)) >>> 0
  return h
}

function seededMod(seed: number, shift: number, range: number): number {
  return ((seed >>> (shift * 5)) & 0xFF) % range
}

export function generateStats(filmId: number, annee: number, rating?: number): CombatantStats {
  const s = BALANCE.STAT_SCALING
  const seed = hashFilmId(filmId)
  const yearBonus = Math.max(0, Math.floor((BALANCE.YEAR_REF - annee) * BALANCE.YEAR_DEF_FACTOR))
  const ratingBonus = rating ? rating * BALANCE.RATING_ATK_BONUS : 0

  return {
    pvMax: s.pvBase + seededMod(seed, 0, s.pvRange),
    atk:   s.atkBase + seededMod(seed, 1, s.atkRange) + Math.floor(ratingBonus),
    def:   s.defBase + seededMod(seed, 2, s.defRange) + Math.min(yearBonus, 30),
    spe:   s.speBase + seededMod(seed, 3, s.speRange),
    vit:   s.vitBase + seededMod(seed, 4, s.vitRange),
  }
}

export function assignMoves(titre: string, type1: string, type2: string | undefined, allTypes: typeof MOVES_BY_TYPE): Move[] {
  const pool = [...(allTypes[type1 as keyof typeof allTypes] ?? allTypes.drame)]
  if (type2 && type2 !== type1 && allTypes[type2 as keyof typeof allTypes]) {
    pool.push(...allTypes[type2 as keyof typeof allTypes])
  }

  const signature = findSignature(titre)
  const numFromPool = signature ? 3 : 4

  const shuffled = pool.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(numFromPool, shuffled.length))

  while (selected.length < numFromPool && pool.length > 0) {
    selected.push(pool[selected.length % pool.length])
  }

  if (signature) selected.push(signature)
  return selected
}

export function buildFilmCombatant(film: FilmRow, rating?: number): FilmCombatant {
  const { type1, type2 } = mapFilmTypes(film.genre, film.sousgenre)
  const stats = generateStats(film.id, film.annee, rating)
  const moves = assignMoves(film.titre, type1, type2, MOVES_BY_TYPE)

  return {
    filmId: film.id,
    titre: film.titre,
    poster: film.poster,
    type1,
    type2,
    moves,
    stats,
    pv: stats.pvMax,
    currentPP: moves.map(m => m.pp),
    status: null,
    statusTurns: 0,
    statStages: { ...EMPTY_STAGES },
    isKO: false,
  }
}

export function getStatMultiplier(stage: number): number {
  if (stage >= 0) return (2 + stage) / 2
  return 2 / (2 - stage)
}

export function getEffectiveStat(base: number, stage: number): number {
  return Math.floor(base * getStatMultiplier(stage))
}

export interface DamageResult {
  damage: number
  effectiveness: number
  isCrit: boolean
  hits: number
}

export function calculateDamage(
  move: Move,
  attackerStats: CombatantStats,
  attackerStages: Record<StatId, number>,
  defenderStats: CombatantStats,
  defenderStages: Record<StatId, number>,
  defenderType1: string,
  defenderType2?: string,
): DamageResult {
  if (move.puissance === 0) return { damage: 0, effectiveness: 1, isCrit: false, hits: 1 }

  const level = BALANCE.LEVEL
  const isPhysical = move.categorie === 'physique'
  const atkStat = isPhysical
    ? getEffectiveStat(attackerStats.atk, attackerStages.atk)
    : getEffectiveStat(attackerStats.spe, attackerStages.spe)
  const defStat = isPhysical
    ? getEffectiveStat(defenderStats.def, defenderStages.def)
    : getEffectiveStat(defenderStats.spe, defenderStages.spe)

  const effectiveness = getEffectiveness(
    move.type,
    defenderType1 as any,
    defenderType2 as any,
  )

  const critChance = (BALANCE.CRIT_BASE * (move.critBonus ?? 1)) / 100
  const isCrit = Math.random() < critChance
  const critMult = isCrit ? BALANCE.CRIT_MULT : 1

  const [rMin, rMax] = BALANCE.RANDOM_RANGE
  const random = rMin + Math.random() * (rMax - rMin)

  const hits = move.effet?.multiHits
    ? move.effet.multiHits[0] + Math.floor(Math.random() * (move.effet.multiHits[1] - move.effet.multiHits[0] + 1))
    : 1

  const baseDamage = ((2 * level / 5 + 2) * move.puissance * atkStat / defStat) / 50 + 2
  const singleHit = Math.max(1, Math.floor(baseDamage * effectiveness * random * critMult))
  const totalDamage = singleHit * hits

  return { damage: totalDamage, effectiveness, isCrit, hits }
}

export function checkAccuracy(
  move: Move,
  attackerStages: Record<StatId, number>,
  defenderStages: Record<StatId, number>,
): boolean {
  if (move.precision === 0) return true
  const accStages = attackerStages.precision - defenderStages.esquive
  const mult = getStatMultiplier(accStages)
  const hitChance = (move.precision / 100) * mult
  return Math.random() < hitChance
}

export function buildDemoTeam(): FilmCombatant[] {
  const demoFilms: FilmRow[] = [
    { id: -1, titre: 'Alien', annee: 1979, genre: 'Horreur', sousgenre: 'Science-fiction', poster: null, realisateur: 'Ridley Scott' },
    { id: -2, titre: 'Die Hard', annee: 1988, genre: 'Action', sousgenre: null, poster: null, realisateur: 'John McTiernan' },
    { id: -3, titre: 'The Grand Budapest Hotel', annee: 2014, genre: 'Comédie', sousgenre: 'Drame', poster: null, realisateur: 'Wes Anderson' },
    { id: -4, titre: 'Blade Runner', annee: 1982, genre: 'Science-fiction', sousgenre: 'Thriller', poster: null, realisateur: 'Ridley Scott' },
    { id: -5, titre: 'Indiana Jones', annee: 1981, genre: 'Aventure', sousgenre: 'Action', poster: null, realisateur: 'Steven Spielberg' },
    { id: -6, titre: 'Le Seigneur des Anneaux', annee: 2001, genre: 'Fantastique', sousgenre: 'Aventure', poster: null, realisateur: 'Peter Jackson' },
  ]
  return demoFilms.map(f => buildFilmCombatant(f))
}
