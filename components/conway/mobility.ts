// Conway V4 — spaceship factory sur EcoGrid
// Lance des vaisseaux (gliders / LWSS) à intervalles contrôlés.

import { EcoGrid, ShipDir, spawnShipEco } from './gameOfLifeEngine'
import { CONWAY_CONFIG } from './config'

const DIRS: ShipDir[] = ['E', 'W', 'SE', 'SW', 'NE', 'NW']

export class MobilitySystem {
  private _ticksUntilSpawn: number

  constructor() {
    this._ticksUntilSpawn = this._nextInterval()
  }

  updateEco(grid: EcoGrid): EcoGrid {
    this._ticksUntilSpawn--
    if (this._ticksUntilSpawn > 0) return grid

    this._ticksUntilSpawn = this._nextInterval()
    let g = grid

    for (let i = 0; i < CONWAY_CONFIG.MOBILITY.SHIPS_PER_SPAWN; i++) {
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)]
      const ox  = 5 + Math.floor(Math.random() * (grid.width  - 15))
      const oy  = 5 + Math.floor(Math.random() * (grid.height - 15))
      g = spawnShipEco(g, dir, ox, oy)
    }
    return g
  }

  reset(): void {
    this._ticksUntilSpawn = this._nextInterval()
  }

  private _nextInterval(): number {
    const { SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX } = CONWAY_CONFIG.MOBILITY
    return SPAWN_INTERVAL_MIN + Math.floor(Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN + 1))
  }
}
