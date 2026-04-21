// Conway V4 — anti-stagnation pour EcoGrid
// Détecte la stagnation par variation d'énergie moyenne (pas de flip binaire).
// Injecte des patterns connus propres plutôt que du bruit aléatoire.

import { EcoGrid, placePatternEco, energyInZone } from './gameOfLifeEngine'
import { CONWAY_CONFIG } from './config'

export type StagnationReason = 'dying' | 'static'

export interface SparkResult {
  grid:   EcoGrid
  reason: StagnationReason
}

// Patterns d'injection calibrés — comportements Conway prévisibles
const GLIDER:     ReadonlyArray<readonly [number,number]> = [[1,0],[2,1],[0,2],[1,2],[2,2]]
const BLINKER:    ReadonlyArray<readonly [number,number]> = [[0,1],[1,1],[2,1]]
const RPENTOMINO: ReadonlyArray<readonly [number,number]> = [[1,0],[2,0],[0,1],[1,1],[1,2]]
const BEACON:     ReadonlyArray<readonly [number,number]> = [[0,0],[1,0],[0,1],[3,2],[2,3],[3,3]]

const INJECTION_PATTERNS = [GLIDER, BLINKER, RPENTOMINO, BEACON]

// Trouve la zone avec le moins d'énergie — cible pour l'injection
function findQuietZone(eco: EcoGrid): { x: number; y: number } {
  const SECTOR = 16
  const { width, height } = eco
  let minEnergy = Infinity
  let bestX = Math.floor(width  / 2)
  let bestY = Math.floor(height / 2)

  for (let sy = 0; sy + SECTOR <= height; sy += SECTOR) {
    for (let sx = 0; sx + SECTOR <= width; sx += SECTOR) {
      const e = energyInZone(eco, sx, sy, SECTOR, SECTOR)
      if (e < minEnergy) {
        minEnergy = e
        bestX = sx + Math.floor(SECTOR / 2)
        bestY = sy + Math.floor(SECTOR / 2)
      }
    }
  }

  const jitter = 5
  return {
    x: Math.max(6, Math.min(width  - 6, bestX + Math.round((Math.random() - 0.5) * jitter * 2))),
    y: Math.max(6, Math.min(height - 6, bestY + Math.round((Math.random() - 0.5) * jitter * 2))),
  }
}

export class AntiStagnationModule {
  private quietTicks         = 0
  private readonly threshold     = CONWAY_CONFIG.ANTI_STAGNATION.ACTIVITY_THRESHOLD
  private readonly quietLimit    = CONWAY_CONFIG.ANTI_STAGNATION.QUIET_TICKS
  private readonly minAliveRatio = CONWAY_CONFIG.ANTI_STAGNATION.MIN_ALIVE_RATIO

  check(eco: EcoGrid, prevEco: EcoGrid, aliveCount: number): SparkResult | null {
    const totalCells = eco.width * eco.height

    // Urgence : quasi-extinction
    if (aliveCount < totalCells * this.minAliveRatio) {
      return this._inject(eco, 'dying')
    }

    // Activité = variation d'énergie moyenne par cellule
    const activity = this._activity(eco.energy, prevEco.energy)

    if (activity < this.threshold) {
      this.quietTicks++
      if (this.quietTicks >= this.quietLimit) {
        this.quietTicks = 0
        return this._inject(eco, 'static')
      }
    } else {
      this.quietTicks = 0
    }

    return null
  }

  reset(): void { this.quietTicks = 0 }

  private _activity(a: Float32Array, b: Float32Array): number {
    let diff = 0
    for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i])
    return diff / a.length
  }

  private _inject(eco: EcoGrid, reason: StagnationReason): SparkResult {
    const { x, y } = findQuietZone(eco)
    const pattern  = INJECTION_PATTERNS[Math.floor(Math.random() * INJECTION_PATTERNS.length)]
    const grid     = placePatternEco(eco, pattern, x, y, 0.65)
    return { grid, reason }
  }
}
