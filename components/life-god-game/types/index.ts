export type LifeGodBootstrapStatus = 'loading' | 'ready' | 'error'
export type LifeGodSimStatus = 'playing' | 'paused'
export type LifeGodPaintMode = 'draw' | 'erase'

export interface LifeGodRelativeCell {
  x: number
  y: number
}

export interface LifeGodFounderPattern {
  id: string
  size: 10
  cells: LifeGodRelativeCell[]
  absoluteCells: LifeGodRelativeCell[]
  center: {
    x: number
    y: number
  }
  boundingBox: {
    minX: number
    minY: number
    maxX: number
    maxY: number
    width: number
    height: number
  }
  detectedAtGeneration: number
}

export interface LifeGodAmEntity {
  id: string
  position: {
    x: number
    y: number
  }
  shape: LifeGodRelativeCell[]
  absoluteCells: LifeGodRelativeCell[]
  age: number
  energy: number
  state: 'idle'
  bornAtGeneration: number
}

export interface LifeGodViewportMetrics {
  x: number
  y: number
  width: number
  height: number
  cellSize: number
}

export interface LifeGodSimulationState {
  phase: 'cellule' | 'creature'
  generation: number
  aliveCount: number
  status: LifeGodSimStatus
  gridWidth: number
  gridHeight: number
  cells: Uint8Array
  founderPattern: LifeGodFounderPattern | null
  amEntity: LifeGodAmEntity | null
  selectedAmId: string | null
}

export interface LifeGodSimulationController {
  getState(): LifeGodSimulationState
  subscribe(listener: (state: LifeGodSimulationState) => void): () => void
  play(): void
  pause(): void
  toggle(): void
  reset(): void
  randomize(): void
  paintCell(x: number, y: number, mode: LifeGodPaintMode): void
  selectAm(amId: string | null): void
  destroy(): void
}

export interface LifeGodRenderer {
  render(state: LifeGodSimulationState): void
  getCellAtClientPoint(clientX: number, clientY: number): { x: number; y: number } | null
  getAmAtClientPoint(clientX: number, clientY: number, state: LifeGodSimulationState): string | null
  getViewportMetrics(): LifeGodViewportMetrics
  destroy(): void
}

export interface LifeGodInputController {
  destroy(): void
}

export interface LifeGodRuntime {
  simulation: LifeGodSimulationController
  renderer: LifeGodRenderer
  input: LifeGodInputController
}
