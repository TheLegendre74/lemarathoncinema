// Conway V2 — module anti-stagnation
// Surveille l'activité de la simulation et injecte un spark quand le monde se fige.
// Complètement découplé du reste : reçoit des données, rend une décision, ne modifie rien.

import { Grid, MethuselahName, placeMethuselah, sparkAt, countAliveInZone } from './gameOfLifeEngine'
import { CONWAY_CONFIG } from './config'

// ─── Types ───────────────────────────────────────────────────────────────────

export type StagnationReason = 'dying' | 'static'

export interface SparkResult {
  grid: Grid
  reason: StagnationReason
}

// ─── Choix du Méthuselah ─────────────────────────────────────────────────────

const METHUSELAH_POOL: MethuselahName[] = ['rpentomino', 'acorn', 'diehard']

function pickMethuselah(): MethuselahName {
  return METHUSELAH_POOL[Math.floor(Math.random() * METHUSELAH_POOL.length)]
}

// Trouve la zone la plus calme de la grille pour y placer le spark
// Découpe en secteurs 16×16 et retourne le centre du secteur le moins peuplé
function findQuietZone(grid: Grid): { x: number; y: number } {
  const SECTOR = 16
  const { width, height } = grid
  let minCount = Infinity
  let bestX = Math.floor(width / 2)
  let bestY = Math.floor(height / 2)

  for (let sy = 0; sy + SECTOR <= height; sy += SECTOR) {
    for (let sx = 0; sx + SECTOR <= width; sx += SECTOR) {
      const count = countAliveInZone(grid, sx, sy, SECTOR, SECTOR)
      if (count < minCount) {
        minCount = count
        bestX = sx + Math.floor(SECTOR / 2)
        bestY = sy + Math.floor(SECTOR / 2)
      }
    }
  }

  // Légère variation aléatoire pour éviter de toujours sparker au même endroit
  const jitter = 4
  return {
    x: Math.max(8, Math.min(width  - 8, bestX + Math.floor((Math.random() - 0.5) * jitter * 2))),
    y: Math.max(8, Math.min(height - 8, bestY + Math.floor((Math.random() - 0.5) * jitter * 2))),
  }
}

// ─── Classe principale ───────────────────────────────────────────────────────

export class AntiStagnationModule {
  private quietTicks = 0
  private readonly threshold = CONWAY_CONFIG.ANTI_STAGNATION.ACTIVITY_THRESHOLD
  private readonly quietLimit = CONWAY_CONFIG.ANTI_STAGNATION.QUIET_TICKS
  private readonly minAliveRatio = CONWAY_CONFIG.ANTI_STAGNATION.MIN_ALIVE_RATIO

  // Appelé après chaque tick avec la grille courante, la précédente, et le compte de vivants.
  // Retourne null si tout va bien, ou un SparkResult avec la grille augmentée.
  check(currentGrid: Grid, prevGrid: Grid, aliveCount: number): SparkResult | null {
    const totalCells = currentGrid.width * currentGrid.height

    // Urgence : monde presque vide
    if (aliveCount < totalCells * this.minAliveRatio) {
      return this._injectSpark(currentGrid, 'dying')
    }

    // Détection activité faible
    const changeCount = this._countChanges(currentGrid.cells, prevGrid.cells)
    const changeRatio = changeCount / totalCells

    if (changeRatio < this.threshold) {
      this.quietTicks++
      if (this.quietTicks >= this.quietLimit) {
        this.quietTicks = 0
        return this._injectSpark(currentGrid, 'static')
      }
    } else {
      this.quietTicks = 0
    }

    return null
  }

  reset(): void {
    this.quietTicks = 0
  }

  // ── Privé ─────────────────────────────────────────────────────────────────

  private _countChanges(a: Uint8Array, b: Uint8Array): number {
    let n = 0
    for (let i = 0; i < a.length; i++) {
      if ((a[i] > 0) !== (b[i] > 0)) n++
    }
    return n
  }

  private _injectSpark(grid: Grid, reason: StagnationReason): SparkResult {
    const { x, y } = findQuietZone(grid)

    // 60% chance Méthuselah, 40% chance cluster aléatoire
    const newGrid = Math.random() < 0.6
      ? placeMethuselah(grid, pickMethuselah(), x, y)
      : sparkAt(grid, x, y, 5, 0.45)

    return { grid: newGrid, reason }
  }
}
