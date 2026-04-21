// Conway's Game of Life — contrôleur de simulation
// Gère le cycle de vie de la simulation : tick loop, play/pause, vitesse, reset.
// Séparé du rendu et de l'UI pour permettre des tests unitaires et des extensions futures.

import {
  Grid,
  ConwayRules,
  CLASSIC_RULES,
  createGrid,
  stepGrid,
  countAlive,
  seedRandom,
  placePattern,
  PatternName,
} from './gameOfLifeEngine'
import { CONWAY_CONFIG, SpeedKey } from './config'

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
  private _intervalId: ReturnType<typeof setInterval> | null = null
  private _rules: ConwayRules = CLASSIC_RULES

  // Callback déclenché après chaque tick (simulation + rendu)
  onTick: ((state: SimState) => void) | null = null

  // ── Points d'extension v2+ (non implémentés, déclarés pour la roadmap) ────
  // onClusterDetected?: (clusters: import('./extensibility/hooks').ClusterInfo[]) => void
  // onCellInteraction?: (event: import('./extensibility/hooks').CellInteractionEvent) => void
  // ─────────────────────────────────────────────────────────────────────────

  constructor(width: number, height: number) {
    const grid = seedRandom(createGrid(width, height), CONWAY_CONFIG.RANDOM_DENSITY)
    this._state = {
      grid,
      generation: 0,
      status: 'paused',
      speed: CONWAY_CONFIG.DEFAULT_SPEED,
      aliveCount: countAlive(grid),
    }
  }

  get state(): SimState {
    return this._state
  }

  // ── Contrôles ──────────────────────────────────────────────────────────────

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
    this._state = {
      grid,
      generation: 0,
      status: 'paused',
      speed: this._state.speed,
      aliveCount: 0,
    }
    this.onTick?.(this._state)
    if (wasPlaying) this.play()
  }

  randomize(): void {
    const wasPlaying = this._state.status === 'playing'
    this._stopLoop()
    const { width, height } = this._state.grid
    const grid = seedRandom(createGrid(width, height), CONWAY_CONFIG.RANDOM_DENSITY)
    this._state = {
      ...this._state,
      grid,
      generation: 0,
      status: 'paused',
      aliveCount: countAlive(grid),
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

  // Place un pattern de test dans la grille (centré par défaut)
  placeTestPattern(pattern: PatternName, ox?: number, oy?: number): void {
    const { width, height } = this._state.grid
    const x = ox ?? Math.floor(width / 2)
    const y = oy ?? Math.floor(height / 2)
    const grid = placePattern(this._state.grid, pattern, x, y)
    this._state = { ...this._state, grid, aliveCount: countAlive(grid) }
    this.onTick?.(this._state)
  }

  // Extension : remplace les règles Conway sans redémarrer la simulation
  setRules(rules: ConwayRules): void {
    this._rules = rules
  }

  // Nettoyage complet (appelé à la fermeture de l'overlay)
  destroy(): void {
    this._stopLoop()
    this.onTick = null
  }

  // ── Boucle interne ─────────────────────────────────────────────────────────

  private _tick(): void {
    const grid = stepGrid(this._state.grid, this._rules)
    this._state = {
      ...this._state,
      grid,
      generation: this._state.generation + 1,
      aliveCount: countAlive(grid),
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
