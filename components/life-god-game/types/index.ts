export type LifeGodBootstrapStatus = 'loading' | 'ready' | 'error'
export type LifeGodSimStatus = 'playing' | 'paused'
export type LifeGodPaintMode = 'draw' | 'erase'
export type LifeGodPhase = 'cellule' | 'creature'
export type LifeGodTimeScale = 0.25 | 0.5 | 1 | 2 | 4 | 8
export type LifeGodAmRole = 'builder' | 'gatherer' | 'explorer'
export type LifeGodInfluenceMode = 'attract' | 'repel'

export interface LifeGodRelativeCell {
  x: number
  y: number
}

export interface LifeGodBodyParts {
  head: LifeGodRelativeCell[]
  body: LifeGodRelativeCell[]
  leftArm: LifeGodRelativeCell[]
  rightArm: LifeGodRelativeCell[]
  leftLeg: LifeGodRelativeCell[]
  rightLeg: LifeGodRelativeCell[]
}

export interface LifeGodAmPattern {
  id: string
  name: string
  cells: LifeGodRelativeCell[]
  bodyParts: LifeGodBodyParts
  width: number
  height: number
  suggestedRole: LifeGodAmRole
}

export interface LifeGodAmLineage {
  id: string
  patternId: string
  name: string
  color: string
  role: LifeGodAmRole
  population: number
  createdAtCycle: number
}

export interface LifeGodProtoEntity {
  id: string
  cells: LifeGodRelativeCell[]
  targetCellCount: number
  createdAtCycle: number
  state: 'awakening' | 'gathering' | 'metamorphosing'
}

export interface LifeGodAmEntity {
  id: string
  lineageId: string
  patternId: string
  position: {
    x: number
    y: number
  }
  bodyParts: LifeGodBodyParts
  age: number
  energy: number
  state: 'forming' | 'adapting' | 'alive'
  cells: LifeGodRelativeCell[]
  absoluteCells: LifeGodRelativeCell[]
  role: LifeGodAmRole
  reproductionCooldown: number
  formationDurationCycles: number
  adaptationDurationCycles: number
}

export interface LifeGodConstructionSite {
  id: string
  lineageId: string
  patternId: string
  origin: {
    x: number
    y: number
  }
  cells: LifeGodRelativeCell[]
  absoluteCells: LifeGodRelativeCell[]
  createdAtCycle: number
  builderAmId: string
}

export interface LifeGodViewportMetrics {
  x: number
  y: number
  width: number
  height: number
  cellSize: number
}

export interface LifeGodSimulationState {
  phase: LifeGodPhase
  generation: number
  aliveCount: number
  status: LifeGodSimStatus
  timeScale: LifeGodTimeScale
  scanningActive: boolean
  maxCompleteAmBeforeScanStops: number
  completeAmCount: number
  formingAmCount: number
  gridWidth: number
  gridHeight: number
  cells: Uint8Array
  amLineages: LifeGodAmLineage[]
  protoEntities: LifeGodProtoEntity[]
  amEntities: LifeGodAmEntity[]
  constructionSites: LifeGodConstructionSite[]
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
  increaseTimeScale(): void
  decreaseTimeScale(): void
  setInfluence(x: number, y: number, mode: LifeGodInfluenceMode): void
  clearInfluence(): void
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
