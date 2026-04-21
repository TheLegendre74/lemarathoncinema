// Conway V4 — contrôleur de simulation sur EcoGrid

import {
  EcoGrid, EcoConfig,
  createEcoGrid, stepEco, countAliveEco, seedIslands, resizeEcoGrid,
  applyBrushEco, sparkAtEco,
} from './gameOfLifeEngine'
import { CONWAY_CONFIG, SpeedKey, DrawTool } from './config'
import { AntiStagnationModule } from './antistagnation'
import { MobilitySystem } from './mobility'
import { FusionSystem } from './fusion'

export type SimStatus = 'playing' | 'paused'

export interface SimState {
  readonly grid:       EcoGrid
  readonly generation: number
  readonly status:     SimStatus
  readonly speed:      SpeedKey
  readonly aliveCount: number
}

const ECO_CFG: EcoConfig = CONWAY_CONFIG.ECO

export class SimulationController {
  private _state:      SimState
  private _prevGrid:   EcoGrid
  private _intervalId: ReturnType<typeof setInterval> | null = null
  private _antiStag  = new AntiStagnationModule()
  private _mobility  = new MobilitySystem()
  private _fusion    = new FusionSystem()

  onTick: ((state: SimState) => void) | null = null

  constructor(width: number, height: number) {
    const grid = seedIslands(
      width, height,
      CONWAY_CONFIG.SEED.ISLAND_FACTOR,
      CONWAY_CONFIG.SEED.MIN_DIST,
      CONWAY_CONFIG.SEED.BASE_DENSITY,
    )
    this._prevGrid = grid
    this._state = {
      grid,
      generation: 0,
      status:     'paused',
      speed:      CONWAY_CONFIG.DEFAULT_SPEED,
      aliveCount: countAliveEco(grid, ECO_CFG.ALIVE_THRESHOLD),
    }
  }

  get state(): SimState { return this._state }

  play(): void {
    if (this._state.status === 'playing') return
    this._state = { ...this._state, status: 'playing' }
    this._startLoop()
    this.onTick?.(this._state)
  }

  pause(): void {
    if (this._state.status === 'paused') return
    this._stopLoop()
    this._state = { ...this._state, status: 'paused' }
    this.onTick?.(this._state)
  }

  toggle(): void {
    if (this._state.status === 'playing') this.pause()
    else this.play()
  }

  reset(): void {
    const wasPlaying = this._state.status === 'playing'
    this._stopLoop()
    const { width, height } = this._state.grid
    const grid = createEcoGrid(width, height)
    this._prevGrid = grid
    this._antiStag.reset()
    this._mobility.reset()
    this._fusion.reset()
    this._state = {
      grid, generation: 0, status: 'paused',
      speed: this._state.speed, aliveCount: 0,
    }
    this.onTick?.(this._state)
    if (wasPlaying) this.play()
  }

  randomize(): void {
    const wasPlaying = this._state.status === 'playing'
    this._stopLoop()
    const { width, height } = this._state.grid
    const grid = seedIslands(
      width, height,
      CONWAY_CONFIG.SEED.ISLAND_FACTOR,
      CONWAY_CONFIG.SEED.MIN_DIST,
      CONWAY_CONFIG.SEED.BASE_DENSITY,
    )
    this._prevGrid = grid
    this._antiStag.reset()
    this._mobility.reset()
    this._fusion.reset()
    this._state = {
      ...this._state, grid, generation: 0,
      status: 'paused', aliveCount: countAliveEco(grid, ECO_CFG.ALIVE_THRESHOLD),
    }
    this.onTick?.(this._state)
    if (wasPlaying) this.play()
  }

  setSpeed(speed: SpeedKey): void {
    const wasPlaying = this._state.status === 'playing'
    this._stopLoop()
    this._state = { ...this._state, speed }
    if (wasPlaying) this._startLoop()
  }

  applyTool(cx: number, cy: number, tool: DrawTool): void {
    let grid: EcoGrid
    if (tool === 'draw') {
      grid = applyBrushEco(this._state.grid, cx, cy, CONWAY_CONFIG.BRUSH.DRAW_RADIUS, true)
    } else if (tool === 'erase') {
      grid = applyBrushEco(this._state.grid, cx, cy, CONWAY_CONFIG.BRUSH.ERASE_RADIUS, false)
    } else {
      grid = sparkAtEco(this._state.grid, cx, cy, CONWAY_CONFIG.BRUSH.SPARK_RADIUS, CONWAY_CONFIG.BRUSH.SPARK_DENSITY)
    }
    this._state = { ...this._state, grid, aliveCount: countAliveEco(grid, ECO_CFG.ALIVE_THRESHOLD) }
    this.onTick?.(this._state)
  }

  resizeGrid(newCols: number, newRows: number): void {
    const grid = resizeEcoGrid(this._state.grid, newCols, newRows)
    this._prevGrid = grid
    this._state = { ...this._state, grid, aliveCount: countAliveEco(grid, ECO_CFG.ALIVE_THRESHOLD) }
  }

  destroy(): void {
    this._stopLoop()
    this.onTick = null
  }

  private _tick(): void {
    const prevGrid = this._state.grid
    let grid       = stepEco(prevGrid, ECO_CFG)

    // Fusion sélective — formes complexes émergent du contact entre amas
    grid = this._fusion.update(grid)

    // Spaceship factory — gliders injectés à intervalle contrôlé
    grid = this._mobility.updateEco(grid)

    let aliveCount = countAliveEco(grid, ECO_CFG.ALIVE_THRESHOLD)

    // Anti-stagnation — pattern propre si le monde cristallise
    const spark = this._antiStag.check(grid, prevGrid, aliveCount)
    if (spark) {
      grid       = spark.grid
      aliveCount = countAliveEco(grid, ECO_CFG.ALIVE_THRESHOLD)
    }

    this._prevGrid = prevGrid
    this._state = {
      ...this._state,
      grid,
      generation: this._state.generation + 1,
      aliveCount,
    }
    this.onTick?.(this._state)
  }

  private _startLoop(): void {
    this._intervalId = setInterval(() => this._tick(), CONWAY_CONFIG.SPEEDS[this._state.speed])
  }

  private _stopLoop(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId)
      this._intervalId = null
    }
  }
}
