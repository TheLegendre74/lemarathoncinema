// ── Boss Clippy — 5 équipes archétypes, 3 difficultés, rotation ──
import type { FilmCombatant, ClimaxData, StatId } from './types'
import { buildCombatant, getCardsSync } from './cardsData'
import { BALANCE } from './config/balance.config'

export type Difficulty = 'facile' | 'moyen' | 'difficile'

interface ClippyTeamDef {
  key: string
  meta: string
  veut: string
  films: {
    num: number
    name: string
    types: string[]
    rarity: string
    climax?: {
      affinite: string
      stats: string[]
      fort: number
      defaut: number
    }
  }[]
}

let _teams: Record<string, ClippyTeamDef> | null = null

export async function loadClippyTeams(): Promise<Record<string, ClippyTeamDef>> {
  if (_teams) return _teams
  const resp = await fetch('/data/battle/clippy_teams.json')
  const raw = await resp.json()
  _teams = raw
  return raw
}

function getAvailableArchetypes(teams: Record<string, ClippyTeamDef>): string[] {
  return Object.keys(teams)
}

export function getClippyTeam(
  teams: Record<string, ClippyTeamDef>,
  difficulty: Difficulty,
  rotationIndex?: number,
): { team: FilmCombatant[]; archetype: string; meta: string } {
  const available = getAvailableArchetypes(teams)
  const idx = rotationIndex !== undefined
    ? rotationIndex % available.length
    : Math.floor(Math.random() * available.length)
  const key = available[idx]
  const def = teams[key]

  const cards = getCardsSync()

  let filmNums: number[]
  if (difficulty === 'facile') {
    // Facile: only non-legendary, no Climax
    filmNums = def.films
      .filter(f => f.rarity !== 'LÉGENDAIRE')
      .map(f => f.num)
    if (filmNums.length < 4) filmNums = def.films.slice(0, 4).map(f => f.num)
  } else {
    filmNums = def.films.map(f => f.num)
  }

  const team = filmNums
    .filter(num => cards[num])
    .map(num => {
      const combatant = buildCombatant(cards[num])
      const filmDef = def.films.find(f => f.num === num)

      // Apply Climax data if Moyen/Difficile
      if (filmDef?.climax && difficulty !== 'facile') {
        const cl = filmDef.climax
        combatant.mega = {
          affinity: cl.affinite,
          boostedStats: cl.stats as StatId[],
          strongMult: BALANCE.CLIMAX_STRONG,
          defaultMult: BALANCE.CLIMAX_DEFAULT,
        }

        // Apply base malus for Climax carrier
        if (cl.affinite !== null) {
          const malus = 1 - BALANCE.CLIMAX_MALUS
          for (const k of Object.keys(combatant.base) as StatId[]) {
            combatant.base[k] = Math.floor(combatant.base[k] * malus)
          }
          combatant.maxHp = Math.floor(combatant.maxHp * malus)
          combatant.hp = combatant.maxHp
        }

        // Auto-awaken Climax at turn 1 (Moyen/Difficile)
        combatant.megaActive = true
        combatant.megaMult = 1 + BALANCE.CLIMAX_STRONG
      }

      // Difficile: slight stat boost to make Clippy tougher
      if (difficulty === 'difficile') {
        const boost = 1.05
        for (const k of Object.keys(combatant.base) as StatId[]) {
          combatant.base[k] = Math.floor(combatant.base[k] * boost)
        }
        combatant.maxHp = Math.floor(combatant.maxHp * boost)
        combatant.hp = combatant.maxHp
      }

      return combatant
    })

  return { team, archetype: key, meta: def.meta }
}

export function getArchetypeList(teams: Record<string, ClippyTeamDef>): { key: string; meta: string }[] {
  return getAvailableArchetypes(teams).map(k => ({ key: k, meta: teams[k].meta }))
}
