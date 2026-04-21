// Conway V3 — système de mobilité (Spaceship Factory)
// Lance des vaisseaux dans des directions aléatoires à intervalles réguliers.

import { Grid, ShipDir, spawnShip } from './gameOfLifeEngine'
import { CONWAY_CONFIG } from './config'

const DIRS: ShipDir[] = ['E', 'W', 'SE', 'SW', 'NE', 'NW']

export class MobilitySystem {
  private _ticksUntilSpawn: number

  constructor() {
    this._ticksUntilSpawn = this._nextInterval()
  }

  update(grid: Grid): Grid {
    this._ticksUntilSpawn--
    if (this._ticksUntilSpawn > 0) return grid

    this._ticksUntilSpawn = this._nextInterval()
    let g = grid
    const { SHIPS_PER_SPAWN } = CONWAY_CONFIG.MOBILITY

    for (let i = 0; i < SHIPS_PER_SPAWN; i++) {
      const dir = DIRS[Math.floor(Math.random() * DIRS.length)]
      const ox = 5 + Math.floor(Math.random() * (grid.width  - 15))
      const oy = 5 + Math.floor(Math.random() * (grid.height - 15))
      g = spawnShip(g, dir, ox, oy)
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
