// Conway V2 — contrôleur de simulation
// Gère le cycle de vie : tick loop, play/pause, vitesse, anti-stagnation, interaction souris.

import {
  Grid, ConwayRules, CLASSIC_RULES, HIGHLIFE_RULES,
  createGrid, stepGrid, countAlive, seedRandom,
  placePattern, PatternName,
  applyBrush, sparkAt,
  noisePass, bridgePass,
  CellState,
} from './gameOfLifeEngine'
import { CONWAY_CONFIG, SpeedKey, DrawTool } from './config'
import { AntiStagnationModule } from './antistagnation'
import { MobilitySystem } from './mobility'

// ─── Types publics ───────────────────────────────────────────────────────────

export type SimStatus = 'playing' | 'paused'

export interface SimState {
  readonly grid: Grid
  readonly generation: number
  readonly status: SimStatus
  readonly speed: SpeedKey
  readonly aliveCount: number
}

// ─── Contrôleur ─────────────────────────────────────────────────────────────

export class SimulationController {
  private _state: SimState
  private _prevGrid: Grid
  private _intervalId: ReturnType<typeof setInterval> | null = null
  private _rules: ConwayRules = CLASSIC_RULES
  private _antiStag = new AntiStagnationModule()
  private _mobility = new MobilitySystem()
  private _ruleTick = 0

  // Callback déclenché après chaque tick
  onTick: ((state: SimState) => void) | null = null

  constructor(width: number, height: number) {
    const grid = seedRandom(createGrid(width, height), CONWAY_CONFIG.RANDOM_DENSITY)
    this._prevGrid = grid
    this._state = {
      grid,
      generation: 0,
      status: 'paused',
      speed: CONWAY_CONFIG.DEFAULT_SPEED,
      aliveCount: countAlive(grid),
    }
  }

  get state(): SimState { return this._state }

  // ── Contrôles de simulation ───────────────────────────────────────────────

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
    const grid = createGrid(width, height)
    this._prevGrid = grid
    this._antiStag.reset()
    this._mobility.reset()
    this._ruleTick = 0
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
    const grid = seedRandom(createGrid(width, height), CONWAY_CONFIG.RANDOM_DENSITY)
    this._prevGrid = grid
    this._antiStag.reset()
    this._mobility.reset()
    this._ruleTick = 0
    this._state = {
      ...this._state, grid, generation: 0,
      status: 'paused', aliveCount: countAlive(grid),
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

  setRules(rules: ConwayRules): void {
    this._rules = rules
  }

  placeTestPattern(pattern: PatternName, ox?: number, oy?: number): void {
    const { width, height } = this._state.grid
    const grid = placePattern(this._state.grid, pattern, ox ?? Math.floor(width / 2), oy ?? Math.floor(height / 2))
    this._state = { ...this._state, grid, aliveCount: countAlive(grid) }
    this.onTick?.(this._state)
  }

  // ── Interaction souris / touch ────────────────────────────────────────────

  // Applique un pinceau à la position grille (cx, cy) selon l'outil actif
  applyTool(cx: number, cy: number, tool: DrawTool): void {
    let grid: Grid
    if (tool === 'draw') {
      grid = applyBrush(this._state.grid, cx, cy, CONWAY_CONFIG.BRUSH.DRAW_RADIUS, 1)
    } else if (tool === 'erase') {
      grid = applyBrush(this._state.grid, cx, cy, CONWAY_CONFIG.BRUSH.ERASE_RADIUS, 0)
    } else {
      // spark : cluster aléatoire dense
      grid = sparkAt(this._state.grid, cx, cy, CONWAY_CONFIG.BRUSH.SPARK_RADIUS, CONWAY_CONFIG.BRUSH.SPARK_DENSITY)
    }
    this._state = { ...this._state, grid, aliveCount: countAlive(grid) }
    this.onTick?.(this._state)
  }

  // Redimensionne la grille en préservant les cellules existantes (coin supérieur gauche)
  resizeGrid(newCols: number, newRows: number): void {
    const { cells, width, height } = this._state.grid
    const newCells = new Uint8Array(newCols * newRows)
    const copyW = Math.min(width, newCols)
    const copyH = Math.min(height, newRows)
    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        newCells[y * newCols + x] = cells[y * width + x]
      }
    }
    const newGrid = { cells: newCells, width: newCols, height: newRows }
    this._prevGrid = newGrid
    this._state = { ...this._state, grid: newGrid, aliveCount: countAlive(newGrid) }
  }

  // Nettoyage complet
  destroy(): void {
    this._stopLoop()
    this.onTick = null
  }

  // ── Boucle interne ────────────────────────────────────────────────────────

  private _getRules(): ConwayRules {
    const { CONWAY_TICKS, HIGHLIFE_TICKS } = CONWAY_CONFIG.RULE_CYCLE
    const cycle = CONWAY_TICKS + HIGHLIFE_TICKS
    return (this._ruleTick % cycle) < CONWAY_TICKS ? CLASSIC_RULES : HIGHLIFE_RULES
  }

  private _tick(): void {
    const prevGrid = this._state.grid
    let grid = stepGrid(prevGrid, this._getRules())

    // Bruit thermique — empêche stabilisation totale
    grid = noisePass(grid, CONWAY_CONFIG.NOISE.FLIPS_PER_TICK)

    // Ponts de fusion entre groupes distants
    const gen = this._state.generation + 1
    if (gen % CONWAY_CONFIG.BRIDGE.INTERVAL === 0) {
      grid = bridgePass(grid, CONWAY_CONFIG.BRIDGE.MIN_DIST, CONWAY_CONFIG.BRIDGE.MAX_DIST)
    }

    // Spaceship factory — mouvement littéral
    grid = this._mobility.update(grid)

    let aliveCount = countAlive(grid)

    // Anti-stagnation : injecte des sparks si le monde se fige
    const spark = this._antiStag.check(grid, prevGrid, aliveCount)
    if (spark) {
      grid = spark.grid
      aliveCount = countAlive(grid)
    }

    this._ruleTick++
    this._prevGrid = prevGrid
    this._state = {
      ...this._state,
      grid,
      generation: gen,
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
