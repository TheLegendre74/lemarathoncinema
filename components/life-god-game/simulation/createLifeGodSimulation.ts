import { LIFE_GOD_AM_PATTERNS } from './amPatterns'
import type {
  LifeGodAmEntity,
  LifeGodAmBehaviorState,
  LifeGodAmLineage,
  LifeGodAmPattern,
  LifeGodInfluenceMode,
  LifeGodAmRole,
  LifeGodConstructionSite,
  LifeGodProtoEntity,
  LifeGodRelativeCell,
  LifeGodSimulationController,
  LifeGodSimulationState,
  LifeGodTimeScale,
} from '../types'

const GRID_WIDTH = 160
const GRID_HEIGHT = 100
const TICK_MS = 90
const RANDOM_FILL_CHANCE = 0.18
const PROTO_SCAN_INTERVAL = 6
const MAX_LINEAGES = 3
const MAX_TOTAL_AMS = 10
const MAX_AMS_PER_LINEAGE = 4
const MAX_COMPLETE_AM_BEFORE_SCAN_STOPS = 10  // gel Conway à 10 AM vivantes
const PROTO_CONSCIOUSNESS_MIN = 10
const PROTO_METAMORPHOSIS_MIN = 15
const CONSTRUCTION_STEP_INTERVAL = 3
const PROTO_GATHER_INTERVAL = 2
const SEARCH_RADIUS = 12
const MIN_FORMATION_CYCLES = Math.round((10 * 1000) / TICK_MS)  // ~10 secondes
const MAX_FORMATION_CYCLES = Math.round((20 * 1000) / TICK_MS)  // ~20 secondes
const CELLS_NEEDED_FOR_AM = 10  // cellules à récolter avant de créer une AM
const GATHERING_RADIUS = 15     // rayon de récolte autour de l'AM
const CELL_ATTRACTION_RADIUS = 40  // portée de l'attraction vers les cellules libres
const STABILITY_THRESHOLD = 8   // ticks consécutifs pour qu'une cellule soit considérée fixe (~0.7s)
const MAX_ACTIVE_PATTERNS_PER_SEED = 3
const TIME_SCALES: LifeGodTimeScale[] = [0.25, 0.5, 1, 2, 4, 8]
const LINEAGE_COLORS = ['#69f0c1', '#ff8ad8', '#7ab6ff']
const ROLE_CONFIG: Record<
  LifeGodAmRole,
  {
    energyGain: number
    reproductionEnergyMin: number
    reproductionEnergyCost: number
    reproductionCooldown: number
    searchRadius: number
    reproductionDistanceMin: number
    movementInterval: number
    movementReach: number
  }
> = {
  builder: {
    energyGain: 0.16,
    reproductionEnergyMin: 52,
    reproductionEnergyCost: 22,
    reproductionCooldown: 60,
    searchRadius: 12,
    reproductionDistanceMin: 4,
    movementInterval: 1,
    movementReach: 1,
  },
  gatherer: {
    energyGain: 0.28,
    reproductionEnergyMin: 40,
    reproductionEnergyCost: 16,
    reproductionCooldown: 40,
    searchRadius: 16,
    reproductionDistanceMin: 4,
    movementInterval: 1,
    movementReach: 1,
  },
  explorer: {
    energyGain: 0.2,
    reproductionEnergyMin: 38,
    reproductionEnergyCost: 18,
    reproductionCooldown: 35,
    searchRadius: 20,
    reproductionDistanceMin: 6,
    movementInterval: 1,
    movementReach: 1,
  },
}

interface FirstAmCandidate {
  cells: LifeGodRelativeCell[]
  revealAtCycle: number
}

export function createLifeGodSimulation(): LifeGodSimulationController {
  let current = createGrid()
  let next = createGrid()
  let generation = 0
  let aliveCount = 0
  let timeScale: LifeGodTimeScale = 1
  let phase: LifeGodSimulationState['phase'] = 'conwayEmergence'
  let conwayActive = true
  let matterFrozen = false
  let firstAmRevealed = false
  let amLineages: LifeGodAmLineage[] = []
  let activePatternIds: string[] = []
  let protoEntities: LifeGodProtoEntity[] = []
  let amEntities: LifeGodAmEntity[] = []
  let constructionSites: LifeGodConstructionSite[] = []
  let firstAmCandidate: FirstAmCandidate | null = null
  let selectedAmId: string | null = null
  let influencePoint: { x: number; y: number; mode: LifeGodInfluenceMode } | null = null
  let status: LifeGodSimulationState['status'] = 'paused'
  let intervalId: ReturnType<typeof setInterval> | null = null
  let stepAccumulator = 0
  let frozenMatterGrid: Uint8Array | null = null
  let stabilityGrid = createGrid()  // nombre de ticks consécutifs où chaque cellule est restée vivante
  let prevGrid = createGrid()       // snapshot de la grille au tick précédent (pour calculer la stabilité)
  const listeners = new Set<(state: LifeGodSimulationState) => void>()

  function createGrid() {
    return new Uint8Array(GRID_WIDTH * GRID_HEIGHT)
  }

  function getState(): LifeGodSimulationState {
    const completeAmCount = amEntities.filter((am) => am.state === 'alive').length
    const adaptingAmCount = amEntities.filter((am) => am.state === 'adapting').length
    const formingAmCount = amEntities.filter((am) => am.state === 'forming' || am.state === 'hiddenForming').length
    const movingAmCount = amEntities.filter((am) => am.state === 'alive' && am.behaviorState === 'wandering').length
    const assemblingAmCount = amEntities.filter((am) => am.behaviorState === 'assemblingAm').length
    const gatheredCellsTotal = amEntities.reduce((sum, am) => sum + am.gatheredCells.length, 0)
    const frozenMatterCount = matterFrozen && frozenMatterGrid
      ? frozenMatterGrid.reduce((total, cell) => total + cell, 0)
      : 0
    const createdAmCount = Math.max(0, completeAmCount - (firstAmRevealed ? 1 : 0))
    const amPopulationStable =
      completeAmCount === MAX_TOTAL_AMS &&
      constructionSites.length === 0 &&
      firstAmCandidate === null &&
      !conwayActive &&
      matterFrozen &&
      activePatternIds.length >= 1 &&
      activePatternIds.length <= MAX_ACTIVE_PATTERNS_PER_SEED
    return {
      phase,
      generation,
      aliveCount,
      status,
      timeScale,
      conwayActive,
      matterFrozen,
      firstAmCandidateExists: firstAmCandidate !== null,
      firstAmRevealed,
      firstAmRevealRemainingCycles: firstAmCandidate ? Math.max(0, firstAmCandidate.revealAtCycle - generation) : 0,
      amPopulationStable,
      scanningActive: !amPopulationStable && completeAmCount < MAX_COMPLETE_AM_BEFORE_SCAN_STOPS,
      maxCompleteAmBeforeScanStops: MAX_COMPLETE_AM_BEFORE_SCAN_STOPS,
      completeAmCount,
      formingAmCount,
      adaptingAmCount,
      visibleAmCount: completeAmCount,
      movingAmCount,
      assemblingAmCount,
      gatheredCellsTotal,
      activePatternIds,
      maxActivePatternsPerSeed: MAX_ACTIVE_PATTERNS_PER_SEED,
      frozenMatterCount: Math.max(0, frozenMatterCount),
      createdAmCount,
      targetAmCount: MAX_COMPLETE_AM_BEFORE_SCAN_STOPS - 1,
      aliveAmTarget: MAX_COMPLETE_AM_BEFORE_SCAN_STOPS,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      cells: current,
      amLineages,
      protoEntities,
      amEntities,
      constructionSites,
      selectedAmId,
    }
  }

  function emit() {
    const state = getState()
    listeners.forEach((listener) => listener(state))
  }

  function indexAt(x: number, y: number) {
    return y * GRID_WIDTH + x
  }

  function recountAlive(grid: Uint8Array) {
    let total = 0
    for (let i = 0; i < grid.length; i += 1) total += grid[i]
    return total
  }

  function clearGrid(grid: Uint8Array) {
    grid.fill(0)
  }

  function shouldFreezeCell(x: number, y: number) {
    return !amEntities.some((am) => am.absoluteCells.some((cell) => cell.x === x && cell.y === y))
  }

  function freezeMatterFromCurrent() {
    // Snapshot des cellules normales uniquement — les AM sont exclues
    // Ce snapshot est la source de vérité immuable pour la matière figée
    frozenMatterGrid = new Uint8Array(GRID_WIDTH * GRID_HEIGHT)
    for (let i = 0; i < current.length; i += 1) {
      frozenMatterGrid[i] = current[i]
    }
    // Retirer les cellules AM du snapshot : les AM ne sont pas de la matière figée
    for (const am of amEntities) {
      for (const cell of am.absoluteCells) {
        if (cell.x < 0 || cell.y < 0 || cell.x >= GRID_WIDTH || cell.y >= GRID_HEIGHT) continue
        frozenMatterGrid[indexAt(cell.x, cell.y)] = 0
      }
    }
  }

  function computeAbsoluteCells(cells: LifeGodRelativeCell[], origin: { x: number; y: number }) {
    return cells.map((cell) => ({
      x: origin.x + cell.x,
      y: origin.y + cell.y,
    }))
  }

  function hasLivingCell(x: number, y: number) {
    return current[indexAt(x, y)] === 1
  }

  function refreshAliveCount() {
    aliveCount = recountAlive(current)
  }

  function getCompleteAmCount() {
    return amEntities.filter((am) => am.state === 'alive').length
  }

  function isScanningActive() {
    return getCompleteAmCount() < MAX_COMPLETE_AM_BEFORE_SCAN_STOPS
  }

  function canCreateMoreVisibleAms() {
    const stable =
      getCompleteAmCount() === MAX_TOTAL_AMS &&
      constructionSites.length === 0 &&
      firstAmCandidate === null &&
      firstAmRevealed &&
      !conwayActive &&
      matterFrozen &&
      activePatternIds.length >= 1 &&
      activePatternIds.length <= MAX_ACTIVE_PATTERNS_PER_SEED
    return !stable && getCompleteAmCount() < MAX_COMPLETE_AM_BEFORE_SCAN_STOPS
  }

  // Seules les cellules NORMALES se figent — jamais les entités vivantes
  function shouldFreezeNormalCells() {
    return (
      firstAmRevealed &&
      conwayActive &&
      !matterFrozen &&
      getCompleteAmCount() >= MAX_COMPLETE_AM_BEFORE_SCAN_STOPS
    )
  }

  function updatePhase() {
    if (matterFrozen) {
      phase = 'frozenMatter'
      return
    }
    if (firstAmCandidate) {
      phase = 'firstAmHiddenForming'
      return
    }
    phase = amEntities.length > 0 ? 'amExpansion' : 'conwayEmergence'
  }

  function populationForLineage(lineageId: string) {
    return amEntities.filter((am) => am.lineageId === lineageId).length
  }

  function sortCells(cells: LifeGodRelativeCell[]) {
    return [...cells].sort((a, b) => (a.y - b.y) || (a.x - b.x))
  }

  function cellKey(x: number, y: number) {
    return `${x}:${y}`
  }

  function protoBounds(cells: LifeGodRelativeCell[]) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const cell of cells) {
      if (cell.x < minX) minX = cell.x
      if (cell.x > maxX) maxX = cell.x
      if (cell.y < minY) minY = cell.y
      if (cell.y > maxY) maxY = cell.y
    }
    return { minX, minY, maxX, maxY }
  }

  function isReservedByEntity(x: number, y: number) {
    return amEntities.some((am) => am.absoluteCells.some((cell) => cell.x === x && cell.y === y))
  }

  function isReservedByProto(x: number, y: number) {
    return protoEntities.some((proto) => proto.cells.some((cell) => cell.x === x && cell.y === y))
  }

  function isReservedByConstruction(x: number, y: number) {
    return constructionSites.some((site) => site.absoluteCells.some((cell) => cell.x === x && cell.y === y))
  }

  function syncAmCells() {
    // SYSTÈME VIVANT — toujours actif, même si Conway est arrêté
    // Quand la matière est figée : restaurer le snapshot figé avant d'écrire les AM
    // Cela empêche les AM de laisser des "fantômes" de matière figée en se déplaçant
    if (matterFrozen && frozenMatterGrid) {
      current.set(frozenMatterGrid)
    }
    // Écrire les positions actuelles des AM par-dessus
    for (const am of amEntities) {
      am.absoluteCells = computeAbsoluteCells(am.cells, am.position)
      for (const cell of am.absoluteCells) {
        if (cell.x <= 0 || cell.y <= 0 || cell.x >= GRID_WIDTH - 1 || cell.y >= GRID_HEIGHT - 1) continue
        current[indexAt(cell.x, cell.y)] = 1
      }
    }
  }

  function syncConstructionCells() {
    for (const site of constructionSites) {
      site.absoluteCells = computeAbsoluteCells(site.cells, site.origin)
    }
  }

  function updateLineagePopulation(lineageId: string) {
    amLineages = amLineages.map((lineage) =>
      lineage.id === lineageId
        ? {
            ...lineage,
            population: populationForLineage(lineage.id),
          }
        : lineage
    )
  }

  function createLineage(pattern: LifeGodAmPattern) {
    const lineage: LifeGodAmLineage = {
      id: `lineage-${pattern.id}-${generation}`,
      patternId: pattern.id,
      name: pattern.name,
      color: LINEAGE_COLORS[amLineages.length % LINEAGE_COLORS.length],
      role: pattern.suggestedRole,
      population: 0,
      createdAtCycle: generation,
    }
    amLineages = [...amLineages, lineage]
    if (!activePatternIds.includes(pattern.id)) {
      activePatternIds = [...activePatternIds, pattern.id]
    }
    return lineage
  }

  function rollFormationDurations() {
    const total = Math.round(MIN_FORMATION_CYCLES + Math.random() * (MAX_FORMATION_CYCLES - MIN_FORMATION_CYCLES))
    const forming = Math.max(1, Math.round(total * 0.62))
    return {
      formationDurationCycles: forming,
      adaptationDurationCycles: Math.max(1, total - forming),
    }
  }

  function randomItem<T>(items: T[]) {
    return items[Math.floor(Math.random() * items.length)]
  }

  function choosePatternForBirth() {
    const availablePatternIds =
      activePatternIds.length < MAX_ACTIVE_PATTERNS_PER_SEED
        ? LIFE_GOD_AM_PATTERNS.map((pattern) => pattern.id)
        : activePatternIds

    const patternId = randomItem(availablePatternIds)
    return LIFE_GOD_AM_PATTERNS.find((pattern) => pattern.id === patternId) ?? LIFE_GOD_AM_PATTERNS[0]
  }

  function ensureHiddenCandidateSeed() {
    const groups = scanConnectedGroups().filter((group) => group.length >= PROTO_CONSCIOUSNESS_MIN)
    if (groups.length > 0) {
      const group = sortCells(randomItem(groups)).slice(0, PROTO_CONSCIOUSNESS_MIN)
      return group
    }

    const startX = 6 + Math.floor(Math.random() * (GRID_WIDTH - 12))
    const startY = 6 + Math.floor(Math.random() * (GRID_HEIGHT - 12))
    const offsets = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: -1 },
      { x: 2, y: 0 },
    ]

    const cells = offsets.map((offset) => ({
      x: startX + offset.x,
      y: startY + offset.y,
    }))
    for (const cell of cells) {
      current[indexAt(cell.x, cell.y)] = 1
    }
    return sortCells(cells)
  }

  function initializeFirstAmCandidate() {
    const cells = ensureHiddenCandidateSeed()
    const totalFormationCycles = Math.round(
      MIN_FORMATION_CYCLES + Math.random() * (MAX_FORMATION_CYCLES - MIN_FORMATION_CYCLES)
    )
    firstAmCandidate = {
      cells,
      revealAtCycle: generation + totalFormationCycles,
    }
    updatePhase()
  }

  function spawnAm(lineage: LifeGodAmLineage, pattern: LifeGodAmPattern, origin: { x: number; y: number }) {
    const roleConfig = ROLE_CONFIG[lineage.role]
    const { formationDurationCycles, adaptationDurationCycles } = rollFormationDurations()
    const am: LifeGodAmEntity = {
      id: `am-${lineage.id}-${populationForLineage(lineage.id) + 1}`,
      lineageId: lineage.id,
      patternId: pattern.id,
      position: origin,
      bodyParts: pattern.bodyParts,
      age: 0,
      energy: 82,
      state: 'forming',
      behaviorState: 'idle',
      cells: pattern.cells,
      absoluteCells: computeAbsoluteCells(pattern.cells, origin),
      role: lineage.role,
      color: lineage.color,
      targetPosition: null,
      buildTarget: null,
      gatheredCells: [],
      reproductionCooldown: roleConfig.reproductionCooldown,
      behaviorCooldown: roleConfig.movementInterval,
      formationDurationCycles,
      adaptationDurationCycles,
    }

    amEntities = [...amEntities, am]
    selectedAmId = am.id
    syncAmCells()
    updateLineagePopulation(lineage.id)
    refreshAliveCount()
  }

  function forceAmAlive(amId: string) {
    amEntities = amEntities.map((am) =>
      am.id === amId
        ? {
            ...am,
            age: am.formationDurationCycles + am.adaptationDurationCycles,
            state: 'alive',
            behaviorState: 'wandering',
            reproductionCooldown: ROLE_CONFIG[am.role].reproductionCooldown,
          }
        : am
    )
  }

  function revealFirstAmCandidate() {
    if (!firstAmCandidate || !canCreateMoreVisibleAms()) return

    const pattern = choosePatternForBirth()
    let lineage = amLineages.find((item) => item.patternId === pattern.id) ?? null
    if (!lineage) {
      lineage = createLineage(pattern)
    }

    const bounds = protoBounds(firstAmCandidate.cells)
    const origin = {
      x: Math.max(1, Math.min(GRID_WIDTH - pattern.width - 2, Math.round((bounds.minX + bounds.maxX) / 2) - Math.floor(pattern.width / 2))),
      y: Math.max(1, Math.min(GRID_HEIGHT - pattern.height - 2, Math.round((bounds.minY + bounds.maxY) / 2) - Math.floor(pattern.height / 2))),
    }

    for (const cell of firstAmCandidate.cells) {
      current[indexAt(cell.x, cell.y)] = 0
    }

    spawnAm(lineage, pattern, origin)
    forceAmAlive(selectedAmId ?? '')
    firstAmRevealed = true
    firstAmCandidate = null
    phase = 'amExpansion'
  }

  function scanConnectedGroups() {
    const visited = new Set<string>()
    const blocked = new Set<string>()

    for (const am of amEntities) {
      for (const cell of am.absoluteCells) blocked.add(cellKey(cell.x, cell.y))
    }
    for (const proto of protoEntities) {
      for (const cell of proto.cells) blocked.add(cellKey(cell.x, cell.y))
    }
    for (const site of constructionSites) {
      for (const cell of site.absoluteCells) blocked.add(cellKey(cell.x, cell.y))
    }

    const groups: LifeGodRelativeCell[][] = []
    for (let y = 1; y < GRID_HEIGHT - 1; y += 1) {
      for (let x = 1; x < GRID_WIDTH - 1; x += 1) {
        if (!hasLivingCell(x, y)) continue
        const startKey = cellKey(x, y)
        if (visited.has(startKey) || blocked.has(startKey)) continue

        const stack = [{ x, y }]
        const group: LifeGodRelativeCell[] = []
        visited.add(startKey)

        while (stack.length > 0) {
          const currentCell = stack.pop()
          if (!currentCell) continue
          group.push(currentCell)

          for (let oy = -1; oy <= 1; oy += 1) {
            for (let ox = -1; ox <= 1; ox += 1) {
              if (ox === 0 && oy === 0) continue
              const nx = currentCell.x + ox
              const ny = currentCell.y + oy
              if (nx <= 0 || ny <= 0 || nx >= GRID_WIDTH - 1 || ny >= GRID_HEIGHT - 1) continue
              if (!hasLivingCell(nx, ny)) continue
              const nextKey = cellKey(nx, ny)
              if (visited.has(nextKey) || blocked.has(nextKey)) continue
              visited.add(nextKey)
              stack.push({ x: nx, y: ny })
            }
          }
        }

        groups.push(sortCells(group))
      }
    }

    return groups
  }

  function tryCreateProtoEntities() {
    if (!isScanningActive()) return
    if (generation % PROTO_SCAN_INTERVAL !== 0) return

    const existingSignatures = new Set(
      protoEntities.map((proto) => proto.cells.map((cell) => cellKey(cell.x, cell.y)).sort().join('|'))
    )

    for (const group of scanConnectedGroups()) {
      if (group.length < PROTO_CONSCIOUSNESS_MIN) continue
      const signature = group.map((cell) => cellKey(cell.x, cell.y)).sort().join('|')
      if (existingSignatures.has(signature)) continue

      const proto: LifeGodProtoEntity = {
        id: `proto-${generation}-${existingSignatures.size + 1}`,
        cells: group,
        targetCellCount: PROTO_METAMORPHOSIS_MIN,
        createdAtCycle: generation,
        state: group.length >= PROTO_METAMORPHOSIS_MIN ? 'metamorphosing' : 'awakening',
      }
      protoEntities = [...protoEntities, proto]
      existingSignatures.add(signature)
    }
  }

  function canUsePatternOrigin(pattern: LifeGodAmPattern, origin: { x: number; y: number }, protoId: string) {
    for (const cell of pattern.cells) {
      const x = origin.x + cell.x
      const y = origin.y + cell.y
      if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) return false
      if (isReservedByEntity(x, y) || isReservedByConstruction(x, y)) return false
      if (protoEntities.some((proto) => proto.id !== protoId && proto.cells.some((item) => item.x === x && item.y === y))) {
        return false
      }
    }
    return true
  }

  function findPatternOriginNearProto(pattern: LifeGodAmPattern, proto: LifeGodProtoEntity) {
    const bounds = protoBounds(proto.cells)
    const centerX = Math.round((bounds.minX + bounds.maxX) / 2)
    const centerY = Math.round((bounds.minY + bounds.maxY) / 2)
    const baseOrigin = {
      x: centerX - Math.floor(pattern.width / 2),
      y: centerY - Math.floor(pattern.height / 2),
    }

    if (canUsePatternOrigin(pattern, baseOrigin, proto.id)) return baseOrigin

    for (let distance = 1; distance <= 8; distance += 1) {
      for (let oy = -distance; oy <= distance; oy += 1) {
        for (let ox = -distance; ox <= distance; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== distance) continue
          const candidate = { x: baseOrigin.x + ox, y: baseOrigin.y + oy }
          if (canUsePatternOrigin(pattern, candidate, proto.id)) return candidate
        }
      }
    }

    return null
  }

  function choosePatternForProto(proto: LifeGodProtoEntity) {
    const cells = sortCells(proto.cells)
    let checksum = 0
    for (const cell of cells) checksum += cell.x * 31 + cell.y * 17

    const unusedPatterns = LIFE_GOD_AM_PATTERNS.filter(
      (pattern) => !amLineages.some((lineage) => lineage.patternId === pattern.id)
    )
    if (unusedPatterns.length > 0 && amLineages.length < MAX_LINEAGES) {
      return unusedPatterns[checksum % unusedPatterns.length]
    }
    if (amLineages.length > 0) {
      const lineage = [...amLineages].sort((a, b) => a.population - b.population || a.createdAtCycle - b.createdAtCycle)[0]
      return LIFE_GOD_AM_PATTERNS.find((pattern) => pattern.id === lineage.patternId) ?? LIFE_GOD_AM_PATTERNS[0]
    }
    return LIFE_GOD_AM_PATTERNS[checksum % LIFE_GOD_AM_PATTERNS.length]
  }

  function syncProtoCells() {
    for (const proto of protoEntities) {
      for (const cell of proto.cells) {
        if (cell.x <= 0 || cell.y <= 0 || cell.x >= GRID_WIDTH - 1 || cell.y >= GRID_HEIGHT - 1) continue
        current[indexAt(cell.x, cell.y)] = 1
      }
    }
  }

  function findGrowthPlacement(proto: LifeGodProtoEntity) {
    const occupied = new Set(proto.cells.map((cell) => cellKey(cell.x, cell.y)))
    const frontier: LifeGodRelativeCell[] = []

    for (const cell of proto.cells) {
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          if (ox === 0 && oy === 0) continue
          const x = cell.x + ox
          const y = cell.y + oy
          const key = cellKey(x, y)
          if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) continue
          if (occupied.has(key)) continue
          if (isReservedByEntity(x, y) || isReservedByConstruction(x, y)) continue
          if (isReservedByProto(x, y)) continue
          frontier.push({ x, y })
        }
      }
    }

    const bounds = protoBounds(proto.cells)
    frontier.sort((a, b) => {
      const da = Math.abs(a.x - Math.round((bounds.minX + bounds.maxX) / 2)) + Math.abs(a.y - Math.round((bounds.minY + bounds.maxY) / 2))
      const db = Math.abs(b.x - Math.round((bounds.minX + bounds.maxX) / 2)) + Math.abs(b.y - Math.round((bounds.minY + bounds.maxY) / 2))
      return da - db
    })

    return frontier[0] ?? null
  }

  function findNearbyLooseCell(proto: LifeGodProtoEntity) {
    const occupied = new Set(proto.cells.map((cell) => cellKey(cell.x, cell.y)))
    const bounds = protoBounds(proto.cells)
    const centerX = Math.round((bounds.minX + bounds.maxX) / 2)
    const centerY = Math.round((bounds.minY + bounds.maxY) / 2)
    const candidates: LifeGodRelativeCell[] = []

    for (let y = Math.max(1, centerY - SEARCH_RADIUS); y <= Math.min(GRID_HEIGHT - 2, centerY + SEARCH_RADIUS); y += 1) {
      for (let x = Math.max(1, centerX - SEARCH_RADIUS); x <= Math.min(GRID_WIDTH - 2, centerX + SEARCH_RADIUS); x += 1) {
        const key = cellKey(x, y)
        if (!hasLivingCell(x, y) || occupied.has(key)) continue
        if (isReservedByEntity(x, y) || isReservedByConstruction(x, y) || isReservedByProto(x, y)) continue
        candidates.push({ x, y })
      }
    }

    candidates.sort((a, b) => {
      const da = Math.abs(a.x - centerX) + Math.abs(a.y - centerY)
      const db = Math.abs(b.x - centerX) + Math.abs(b.y - centerY)
      return da - db
    })

    return candidates[0] ?? null
  }

  function morphProtoIntoAm(proto: LifeGodProtoEntity) {
    if (amEntities.length >= MAX_TOTAL_AMS) return

    const pattern = choosePatternForProto(proto)
    let lineage = amLineages.find((item) => item.patternId === pattern.id) ?? null
    if (!lineage) {
      if (!isScanningActive()) return
      if (amLineages.length >= MAX_LINEAGES) return
      lineage = createLineage(pattern)
    }
    if (populationForLineage(lineage.id) >= MAX_AMS_PER_LINEAGE) return

    const origin = findPatternOriginNearProto(pattern, proto)
    if (!origin) return

    for (const cell of proto.cells) {
      current[indexAt(cell.x, cell.y)] = 0
    }
    protoEntities = protoEntities.filter((item) => item.id !== proto.id)
    spawnAm(lineage, pattern, origin)
  }

  function tickProtoEntities() {
    if (protoEntities.length === 0) return

    protoEntities = protoEntities
      .map((proto) => {
        const livingCells = sortCells(proto.cells.filter((cell) => hasLivingCell(cell.x, cell.y)))
        if (livingCells.length < PROTO_CONSCIOUSNESS_MIN) {
          return null
        }

        let nextCells = livingCells
        if (livingCells.length < proto.targetCellCount && generation % PROTO_GATHER_INTERVAL === 0) {
          const sourceCell = findNearbyLooseCell({ ...proto, cells: livingCells })
          const placement = findGrowthPlacement({ ...proto, cells: livingCells })
          if (sourceCell && placement) {
            current[indexAt(sourceCell.x, sourceCell.y)] = 0
            current[indexAt(placement.x, placement.y)] = 1
            nextCells = sortCells([...livingCells, placement])
          }
        }

        return {
          ...proto,
          cells: nextCells,
          state:
            nextCells.length >= proto.targetCellCount
              ? 'metamorphosing'
              : nextCells.length >= PROTO_CONSCIOUSNESS_MIN + 2
                ? 'gathering'
                : 'awakening',
        }
      })
      .filter((proto): proto is LifeGodProtoEntity => proto !== null)

    for (const proto of [...protoEntities]) {
      if (proto.cells.length >= proto.targetCellCount) {
        morphProtoIntoAm(proto)
      }
    }
  }

  function canPlaceConstruction(pattern: LifeGodAmPattern, origin: { x: number; y: number }) {
    for (const cell of pattern.cells) {
      const x = origin.x + cell.x
      const y = origin.y + cell.y
      if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) return false
      if (isReservedByEntity(x, y) || isReservedByConstruction(x, y) || isReservedByProto(x, y)) return false
      if (hasLivingCell(x, y)) return false
    }
    return true
  }

  // Récolte uniquement des cellules FIXES (stabilityGrid >= STABILITY_THRESHOLD).
  // Les cellules en mouvement Conway sont ignorées — seules les zones stables sont utilisées.
  function gatherNearbyCell(am: LifeGodAmEntity): LifeGodAmEntity {
    const center = averagePosition(am.absoluteCells)
    const gathered = [...am.gatheredCells]
    const gatheredKeys = new Set(gathered.map((c) => cellKey(c.x, c.y)))
    const reservedByOthers = new Set(
      amEntities
        .filter((other) => other.id !== am.id)
        .flatMap((other) => other.gatheredCells)
        .map((c) => cellKey(c.x, c.y))
    )

    for (let r = 1; r <= GATHERING_RADIUS; r += 1) {
      for (let oy = -r; oy <= r; oy += 1) {
        for (let ox = -r; ox <= r; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue
          const x = Math.round(center.x) + ox
          const y = Math.round(center.y) + oy
          if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) continue
          const key = cellKey(x, y)
          if (gatheredKeys.has(key) || reservedByOthers.has(key)) continue
          if (!hasLivingCell(x, y)) continue
          if (isReservedByEntity(x, y) || isReservedByConstruction(x, y) || isReservedByProto(x, y)) continue
          if (stabilityGrid[indexAt(x, y)] < STABILITY_THRESHOLD) continue   // cellule mobile → ignorer

          const idx = indexAt(x, y)
          current[idx] = 0
          if (matterFrozen && frozenMatterGrid) frozenMatterGrid[idx] = 0
          gathered.push({ x, y })
          return { ...am, gatheredCells: gathered }
        }
      }
    }
    return am
  }

  // Restitue les cellules récoltées par une AM au monde (et au snapshot figé si actif).
  function releaseGatheredCells(am: LifeGodAmEntity) {
    for (const cell of am.gatheredCells) {
      if (cell.x <= 0 || cell.y <= 0 || cell.x >= GRID_WIDTH - 1 || cell.y >= GRID_HEIGHT - 1) continue
      const idx = indexAt(cell.x, cell.y)
      current[idx] = 1
      if (matterFrozen && frozenMatterGrid) frozenMatterGrid[idx] = 1
    }
  }

  // Trouve la cellule fixe la plus proche (puis repli sur n'importe quelle cellule libre).
  // Passe 0 : uniquement cellules stables (stabilityGrid >= threshold).
  // Passe 1 : repli sur toute cellule disponible si aucune fixe trouvée.
  function findNearestStableCell(cx: number, cy: number): { x: number; y: number } | null {
    for (let pass = 0; pass < 2; pass += 1) {
      const requireStable = pass === 0
      for (let r = 1; r <= CELL_ATTRACTION_RADIUS; r += 1) {
        for (let oy = -r; oy <= r; oy += 1) {
          for (let ox = -r; ox <= r; ox += 1) {
            if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue
            const x = cx + ox
            const y = cy + oy
            if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) continue
            if (!hasLivingCell(x, y)) continue
            if (isReservedByEntity(x, y) || isReservedByConstruction(x, y) || isReservedByProto(x, y)) continue
            if (requireStable && stabilityGrid[indexAt(x, y)] < STABILITY_THRESHOLD) continue
            return { x, y }
          }
        }
      }
    }
    return null
  }

  // Compte les voisins stables (fixes) autour des cellules d'une AM à une position candidate.
  function getStableDensityAt(position: { x: number; y: number }, am: LifeGodAmEntity) {
    let count = 0
    for (const cell of am.cells) {
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          if (ox === 0 && oy === 0) continue
          const nx = position.x + cell.x + ox
          const ny = position.y + cell.y + oy
          if (nx <= 0 || ny <= 0 || nx >= GRID_WIDTH - 1 || ny >= GRID_HEIGHT - 1) continue
          const idx = indexAt(nx, ny)
          if (current[idx] === 1 && stabilityGrid[idx] >= STABILITY_THRESHOLD) count += 1
        }
      }
    }
    return count
  }

  // Met à jour stabilityGrid en comparant l'état courant au tick précédent.
  // Cellule vivante dans les deux ticks → stabilité++. Sinon → reset à 0.
  function updateStabilityGrid() {
    for (let i = 0; i < current.length; i += 1) {
      if (current[i] === 1 && prevGrid[i] === 1) {
        if (stabilityGrid[i] < 255) stabilityGrid[i] += 1
      } else {
        stabilityGrid[i] = 0
      }
    }
    prevGrid.set(current)
  }

  function countLivingNeighbors(x: number, y: number) {
    let count = 0
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        if (ox === 0 && oy === 0) continue
        const nx = x + ox
        const ny = y + oy
        if (nx <= 0 || ny <= 0 || nx >= GRID_WIDTH - 1 || ny >= GRID_HEIGHT - 1) continue
        count += current[indexAt(nx, ny)]
      }
    }
    return count
  }

  function averagePosition(cells: LifeGodRelativeCell[]) {
    let totalX = 0
    let totalY = 0
    for (const cell of cells) {
      totalX += cell.x
      totalY += cell.y
    }
    return {
      x: totalX / Math.max(cells.length, 1),
      y: totalY / Math.max(cells.length, 1),
    }
  }

  function getLineageAnchor(lineageId: string, excludeAmId: string) {
    const cells = amEntities
      .filter((am) => am.id !== excludeAmId && am.lineageId === lineageId)
      .flatMap((am) => am.absoluteCells)

    if (cells.length === 0) return { x: GRID_WIDTH / 2, y: GRID_HEIGHT / 2 }
    return averagePosition(cells)
  }

  function getLivingDensityAt(position: { x: number; y: number }, am: LifeGodAmEntity) {
    let density = 0
    for (const cell of am.cells) {
      density += countLivingNeighbors(position.x + cell.x, position.y + cell.y)
    }
    return density
  }

  function getMinDistanceToOtherAms(position: { x: number; y: number }, am: LifeGodAmEntity) {
    let minDistance = Infinity
    const candidateCenter = averagePosition(computeAbsoluteCells(am.cells, position))

    for (const other of amEntities) {
      if (other.id === am.id) continue
      const otherCenter = averagePosition(other.absoluteCells)
      const distance = Math.abs(candidateCenter.x - otherCenter.x) + Math.abs(candidateCenter.y - otherCenter.y)
      if (distance < minDistance) minDistance = distance
    }

    return Number.isFinite(minDistance) ? minDistance : 999
  }

  function getInfluenceScore(position: { x: number; y: number }, am: LifeGodAmEntity) {
    if (!influencePoint) return 0
    const center = averagePosition(computeAbsoluteCells(am.cells, position))
    const distance = Math.abs(center.x - influencePoint.x) + Math.abs(center.y - influencePoint.y)
    const clamped = Math.max(0, 18 - distance)
    if (clamped === 0) return 0
    return influencePoint.mode === 'attract' ? clamped * 7 : -clamped * 7
  }

  function findBehaviorTarget(am: LifeGodAmEntity) {
    const candidates = getMovementCandidates(am).filter((position) => canMoveAmTo(am, position))
    if (candidates.length === 0) return null

    // Pré-calcul de la cellule fixe la plus proche (une seule fois par AM, pas par candidat)
    let nearestCell: { x: number; y: number } | null = null
    if (am.behaviorState === 'seekingFixedCells' || am.behaviorState === 'harvestingCells') {
      const c = averagePosition(am.absoluteCells)
      nearestCell = findNearestStableCell(Math.round(c.x), Math.round(c.y))
    }

    const scored = candidates
      .map((position) => ({
        position,
        score: scoreMovement(am, position, nearestCell),
      }))
      .sort((a, b) => b.score - a.score)

    return scored[0]?.position ?? null
  }

  function findNearbyConstructionOrigin(parent: LifeGodAmEntity, pattern: LifeGodAmPattern) {
    const roleConfig = ROLE_CONFIG[parent.role]
    const candidates: { x: number; y: number; score: number }[] = []

    for (let distance = roleConfig.reproductionDistanceMin; distance <= roleConfig.searchRadius; distance += 2) {
      for (let oy = -distance; oy <= distance; oy += 1) {
        for (let ox = -distance; ox <= distance; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== distance) continue
          const origin = {
            x: parent.position.x + ox,
            y: parent.position.y + oy,
          }
          if (!canPlaceConstruction(pattern, origin)) continue

          let localDensity = 0
          for (const cell of pattern.cells) {
            localDensity += countLivingNeighbors(origin.x + cell.x, origin.y + cell.y)
          }

          const score =
            parent.role === 'gatherer'
              ? localDensity * 8 - distance
              : parent.role === 'explorer'
                ? distance * 6 - localDensity
                : localDensity * 3 - distance * 2

          candidates.push({ ...origin, score })
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score)
    if (candidates.length === 0) return null
    return { x: candidates[0].x, y: candidates[0].y }
  }

  function tryStartReproduction() {
    if (!canCreateMoreVisibleAms()) return

    for (const am of amEntities) {
      const roleConfig = ROLE_CONFIG[am.role]
      if (am.state !== 'alive') continue
      if (constructionSites.some((site) => site.builderAmId === am.id)) continue
      // Ignorer les AM déjà engagées dans le flux de récolte/assemblage
      if (
        am.behaviorState === 'seekingFixedCells' ||
        am.behaviorState === 'harvestingCells' ||
        am.behaviorState === 'carryingCells' ||
        am.behaviorState === 'assemblingAm'
      ) continue
      if (am.reproductionCooldown > 0 || am.energy < roleConfig.reproductionEnergyMin) continue

      const pattern = choosePatternForBirth()
      let lineage = amLineages.find((item) => item.patternId === pattern.id) ?? null
      if (!lineage) {
        if (activePatternIds.length >= MAX_ACTIVE_PATTERNS_PER_SEED) continue
        lineage = createLineage(pattern)
      }
      if (populationForLineage(lineage.id) >= MAX_AMS_PER_LINEAGE) continue

      const origin = findNearbyConstructionOrigin(am, pattern)
      if (!origin) continue

      const site: LifeGodConstructionSite = {
        id: `site-${am.id}-${generation}`,
        lineageId: lineage.id,
        patternId: pattern.id,
        origin,
        cells: pattern.cells,
        absoluteCells: computeAbsoluteCells(pattern.cells, origin),
        createdAtCycle: generation,
        builderAmId: am.id,
      }

      constructionSites = [...constructionSites, site]
      amEntities = amEntities.map((entity) =>
        entity.id === am.id
          ? {
              ...entity,
              energy: Math.max(0, entity.energy - roleConfig.reproductionEnergyCost),
              behaviorState: 'assemblingAm',
              buildTarget: origin,
              reproductionCooldown: roleConfig.reproductionCooldown,
            }
          : entity
      )
      return
    }
  }

  function tickConstructionSites() {
    if (constructionSites.length === 0) return

    const completed: { siteId: string; lineageId: string; patternId: string; origin: { x: number; y: number } }[] = []

    constructionSites = constructionSites.filter((site) => {
      const targetCells = computeAbsoluteCells(site.cells, site.origin)
      site.absoluteCells = targetCells

      const missingCells = targetCells.filter((cell) => !hasLivingCell(cell.x, cell.y))
      if (missingCells.length === 0) {
        completed.push({
          siteId: site.id,
          lineageId: site.lineageId,
          patternId: site.patternId,
          origin: site.origin,
        })
        return false
      }

      if ((generation - site.createdAtCycle) % CONSTRUCTION_STEP_INTERVAL === 0) {
        const nextCell = missingCells[0]
        current[indexAt(nextCell.x, nextCell.y)] = 1
      }

      return true
    })

    for (const item of completed) {
      const lineage = amLineages.find((entry) => entry.id === item.lineageId)
      const pattern = LIFE_GOD_AM_PATTERNS.find((entry) => entry.id === item.patternId)
      if (!lineage || !pattern) continue
      if (!canCreateMoreVisibleAms()) continue
      if (populationForLineage(lineage.id) >= MAX_AMS_PER_LINEAGE) continue
      spawnAm(lineage, pattern, item.origin)
    }

    amEntities = amEntities.map((am) =>
      constructionSites.some((site) => site.builderAmId === am.id)
        ? am
        : am.behaviorState === 'assemblingAm'
          ? { ...am, behaviorState: 'wandering', buildTarget: null }
        : am
    )
  }

  function canMoveAmTo(am: LifeGodAmEntity, position: { x: number; y: number }) {
    for (const cell of am.cells) {
      const x = position.x + cell.x
      const y = position.y + cell.y
      if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) return false
      if (constructionSites.some((site) => site.absoluteCells.some((item) => item.x === x && item.y === y))) return false
      if (protoEntities.some((proto) => proto.cells.some((item) => item.x === x && item.y === y))) return false
      if (
        amEntities.some(
          (other) => other.id !== am.id && other.absoluteCells.some((item) => item.x === x && item.y === y)
        )
      ) {
        return false
      }
    }
    return true
  }

  function getMovementCandidates(am: LifeGodAmEntity) {
    const roleConfig = ROLE_CONFIG[am.role]
    const candidates: { x: number; y: number }[] = []

    for (let oy = -roleConfig.movementReach; oy <= roleConfig.movementReach; oy += 1) {
      for (let ox = -roleConfig.movementReach; ox <= roleConfig.movementReach; ox += 1) {
        candidates.push({ x: am.position.x + ox, y: am.position.y + oy })
      }
    }

    return candidates
  }

  function scoreMovement(am: LifeGodAmEntity, position: { x: number; y: number }, nearestCell?: { x: number; y: number } | null) {
    const density = getLivingDensityAt(position, am)
    const otherDistance = getMinDistanceToOtherAms(position, am)
    const lineageAnchor = getLineageAnchor(am.lineageId, am.id)
    const center = averagePosition(computeAbsoluteCells(am.cells, position))
    const lineageDistance = Math.abs(center.x - lineageAnchor.x) + Math.abs(center.y - lineageAnchor.y)
    const influenceScore = getInfluenceScore(position, am)

    // Cherche les cellules FIXES : direction vers la cellule stable domine toujours
    if (am.behaviorState === 'seekingFixedCells' || am.behaviorState === 'harvestingCells') {
      const stableDensity = getStableDensityAt(position, am)
      if (nearestCell) {
        const distToNearest = Math.abs(center.x - nearestCell.x) + Math.abs(center.y - nearestCell.y)
        // -dist*25 domine : le tiebreaker stableDensity*3 ne peut jamais bloquer le déplacement
        return -distToNearest * 25 + stableDensity * 3 + otherDistance * 0.2 + influenceScore
      }
      // Pas de cellule fixe en vue : se déplacer vers les zones denses (scouting)
      // density + bruit aléatoire brisent les égalités → l'AM ne reste plus figée
      return stableDensity * 8 + density * 5 + Math.random() * 4 + influenceScore
    }

    // Supervise le chantier en mouvement : orbite autour du site de construction
    if (am.behaviorState === 'assemblingAm') {
      if (am.buildTarget) {
        const distToSite = Math.abs(center.x - am.buildTarget.x) + Math.abs(center.y - am.buildTarget.y)
        return -distToSite * 5 + Math.random() * 4 + influenceScore
      }
      return density * 2 + Math.random() * 4 + influenceScore
    }

    // Porte des cellules vers zone d'assemblage : se rapprocher du buildTarget ou chercher zone libre
    if (am.behaviorState === 'carryingCells') {
      if (am.buildTarget) {
        const distToTarget = Math.abs(center.x - am.buildTarget.x) + Math.abs(center.y - am.buildTarget.y)
        return -distToTarget * 12 + density * 0.5 + Math.random() * 2 + influenceScore
      }
      // Pas de cible : chercher zone peu dense, jitter pour briser les égalités
      return -density * 4 + Math.random() * 4 + influenceScore
    }

    // Comportement normal selon le rôle
    if (am.role === 'explorer') {
      return lineageDistance * 4 + otherDistance * 3 - density * 1.5 + influenceScore
    }
    if (am.role === 'gatherer') {
      return density * 7 + otherDistance * 1.2 - lineageDistance * 1.6 + influenceScore
    }
    return density * 2.5 + otherDistance * 0.8 - lineageDistance * 4 + influenceScore
  }

  // Tente de créer un chantier à partir des cellules récoltées par une AM.
  // Crée le chantier et renvoie l'AM mise à jour (assemblingAm), ou null si impossible.
  // La lignée n'est créée QUE si un emplacement valide est trouvé.
  function tryCreateSiteFromGathered(am: LifeGodAmEntity): LifeGodAmEntity | null {
    if (!canCreateMoreVisibleAms()) return null
    if (am.reproductionCooldown > 0) return null  // récolte en attente, assemblage bloqué
    if (constructionSites.some((site) => site.builderAmId === am.id)) return null
    const roleConfig = ROLE_CONFIG[am.role]

    const pattern = choosePatternForBirth()
    const existingLineage = amLineages.find((item) => item.patternId === pattern.id) ?? null
    if (!existingLineage && activePatternIds.length >= MAX_ACTIVE_PATTERNS_PER_SEED) return null
    if (existingLineage && populationForLineage(existingLineage.id) >= MAX_AMS_PER_LINEAGE) return null

    // Chercher l'emplacement AVANT de créer la lignée (évite les lignées orphelines)
    const origin = findNearbyConstructionOrigin(am, pattern)
    if (!origin) return null

    const lineage = existingLineage ?? createLineage(pattern)
    if (populationForLineage(lineage.id) >= MAX_AMS_PER_LINEAGE) return null

    const site: LifeGodConstructionSite = {
      id: `site-${am.id}-${generation}`,
      lineageId: lineage.id,
      patternId: pattern.id,
      origin,
      cells: pattern.cells,
      absoluteCells: computeAbsoluteCells(pattern.cells, origin),
      createdAtCycle: generation,
      builderAmId: am.id,
    }
    constructionSites = [...constructionSites, site]

    return {
      ...am,
      energy: Math.max(0, am.energy - roleConfig.reproductionEnergyCost),
      behaviorState: 'assemblingAm' as const,
      buildTarget: origin,
      reproductionCooldown: roleConfig.reproductionCooldown,
      gatheredCells: [],
    }
  }

  function tickRoleBehavior() {
    amEntities = amEntities.map((am) => {
      if (am.state !== 'alive') return am
      const roleConfig = ROLE_CONFIG[am.role]

      // ── assemblingAm : chantier actif — l'AM reste en mouvement pendant la construction ──
      const activeConstruction = constructionSites.some((site) => site.builderAmId === am.id)
      if (activeConstruction) {
        const buildTarget = constructionSites.find((site) => site.builderAmId === am.id)?.origin ?? am.buildTarget
        const base = { ...am, behaviorState: 'assemblingAm' as const, buildTarget, gatheredCells: [] }
        const nextCooldown = Math.max(0, am.behaviorCooldown - 1)
        if (nextCooldown > 0) {
          return { ...base, behaviorCooldown: nextCooldown }
        }
        const target = findBehaviorTarget(base)
        if (!target) {
          return { ...base, behaviorCooldown: 1 }
        }
        return {
          ...base,
          position: target,
          absoluteCells: computeAbsoluteCells(am.cells, target),
          targetPosition: target,
          behaviorCooldown: roleConfig.movementInterval,
        }
      }

      // wantsToGather : l'AM cherche et récolte dès qu'il manque des AM (indépendant du cooldown)
      // wantsToReproduce : l'AM peut CRÉER une nouvelle AM (cooldown expiré)
      const wantsToGather = canCreateMoreVisibleAms()
      const wantsToReproduce = wantsToGather && am.reproductionCooldown <= 0

      // ── seekingFixedCells / harvestingCells : chercher et récolter ───────────
      // Chaque tick : récolte 1 cellule Conway libre dans le rayon
      if (am.behaviorState === 'seekingFixedCells' || am.behaviorState === 'harvestingCells') {
        if (!wantsToGather) {
          releaseGatheredCells(am)
          return { ...am, behaviorState: 'wandering' as const, gatheredCells: [] }
        }

        // Récolter 1 cellule ce tick
        const amGathered = gatherNearbyCell(am)

        if (amGathered.gatheredCells.length >= CELLS_NEEDED_FOR_AM) {
          // Assez récoltées → chercher zone d'assemblage et passer en carryingCells
          const pattern = choosePatternForBirth()
          const buildOrigin = findNearbyConstructionOrigin(amGathered, pattern)
          return {
            ...amGathered,
            behaviorState: 'carryingCells' as const,
            buildTarget: buildOrigin,   // null si aucune zone trouvée maintenant
            behaviorCooldown: roleConfig.movementInterval,
          }
        }

        // Pas encore assez : se déplacer vers les cellules
        const nextCooldown = Math.max(0, amGathered.behaviorCooldown - 1)
        if (nextCooldown > 0) {
          return {
            ...amGathered,
            behaviorCooldown: nextCooldown,
            behaviorState: amGathered.gatheredCells.length > 0
              ? 'harvestingCells' as const
              : 'seekingFixedCells' as const,
          }
        }

        const target = findBehaviorTarget(amGathered)
        if (!target) {
          return {
            ...amGathered,
            behaviorCooldown: 1,
            behaviorState: amGathered.gatheredCells.length > 0
              ? 'harvestingCells' as const
              : 'seekingFixedCells' as const,
          }
        }

        return {
          ...amGathered,
          position: target,
          absoluteCells: computeAbsoluteCells(amGathered.cells, target),
          behaviorState: amGathered.gatheredCells.length > 0
            ? 'harvestingCells' as const
            : 'seekingFixedCells' as const,
          targetPosition: target,
          behaviorCooldown: roleConfig.movementInterval,
        }
      }

      // ── carryingCells : se déplacer et tenter de créer un chantier ──────────
      if (am.behaviorState === 'carryingCells') {
        if (!canCreateMoreVisibleAms() || am.gatheredCells.length < CELLS_NEEDED_FOR_AM) {
          releaseGatheredCells(am)
          return { ...am, behaviorState: 'wandering' as const, gatheredCells: [] }
        }
        const nextCooldown = Math.max(0, am.behaviorCooldown - 1)
        if (nextCooldown > 0) {
          return { ...am, behaviorCooldown: nextCooldown }
        }
        // Tenter de créer le chantier à chaque déplacement
        const assembled = tryCreateSiteFromGathered(am)
        if (assembled) return assembled
        // Pas encore de zone libre trouvée : continuer à se déplacer
        const target = findBehaviorTarget(am)
        if (!target) {
          return { ...am, behaviorCooldown: roleConfig.movementInterval }
        }
        return {
          ...am,
          position: target,
          absoluteCells: computeAbsoluteCells(am.cells, target),
          behaviorState: 'carryingCells' as const,
          targetPosition: target,
          behaviorCooldown: roleConfig.movementInterval,
        }
      }

      // ── wandering / idle / resting : comportement standard ───────────────────
      const nextBehaviorCooldown = Math.max(0, am.behaviorCooldown - 1)
      if (nextBehaviorCooldown > 0) {
        return {
          ...am,
          behaviorCooldown: nextBehaviorCooldown,
          behaviorState: wantsToGather ? 'seekingFixedCells' as const : am.behaviorState,
        }
      }

      if (wantsToGather) {
        return {
          ...am,
          behaviorState: 'seekingFixedCells' as const,
          behaviorCooldown: roleConfig.movementInterval,
        }
      }

      const target = findBehaviorTarget(am)
      if (!target) {
        return {
          ...am,
          behaviorCooldown: roleConfig.movementInterval,
          behaviorState: 'idle' as const,
          targetPosition: null,
        }
      }
      if (target.x === am.position.x && target.y === am.position.y) {
        return {
          ...am,
          behaviorCooldown: roleConfig.movementInterval,
          behaviorState: 'resting' as const,
          targetPosition: target,
        }
      }
      return {
        ...am,
        position: target,
        absoluteCells: computeAbsoluteCells(am.cells, target),
        behaviorState: 'wandering' as const,
        targetPosition: target,
        behaviorCooldown: roleConfig.movementInterval,
      }
    })
  }

  function tickAmState() {
    amEntities = amEntities.map((am) => {
      const roleConfig = ROLE_CONFIG[am.role]
      const nextAge = am.age + 1
      const nextState =
        nextAge < am.formationDurationCycles
          ? 'forming'
          : nextAge < am.formationDurationCycles + am.adaptationDurationCycles
            ? 'adapting'
            : 'alive'
      const cooldown = nextState === 'alive' ? Math.max(0, am.reproductionCooldown - 1) : am.reproductionCooldown
      const energyGain = nextState === 'alive' ? roleConfig.energyGain : roleConfig.energyGain * 0.35
      const energy = Math.min(100, am.energy + energyGain)
      return {
        ...am,
        age: nextAge,
        energy,
        reproductionCooldown: cooldown,
        state: nextState,
        behaviorState: nextState === 'alive' ? am.behaviorState : 'idle',
        absoluteCells: computeAbsoluteCells(am.cells, am.position),
      }
    })
  }

  function seedRandomGrid() {
    clearGrid(current)
    stepAccumulator = 0
    phase = 'conwayEmergence'
    conwayActive = true
    matterFrozen = false
    frozenMatterGrid = null
    firstAmRevealed = false
    amLineages = []
    activePatternIds = []
    protoEntities = []
    amEntities = []
    constructionSites = []
    firstAmCandidate = null
    selectedAmId = null
    stabilityGrid = createGrid()
    prevGrid = createGrid()

    for (let y = 1; y < GRID_HEIGHT - 1; y += 1) {
      for (let x = 1; x < GRID_WIDTH - 1; x += 1) {
        current[indexAt(x, y)] = Math.random() < RANDOM_FILL_CHANCE ? 1 : 0
      }
    }

    prevGrid.set(current)
    generation = 0
    refreshAliveCount()
    initializeFirstAmCandidate()
    emit()
  }

  function stepSimulationCycle() {
    // ── SYSTÈME 1 : Conway — actif uniquement si conwayActive ─────────────────
    if (conwayActive) {
      let nextAlive = 0

      for (let y = 0; y < GRID_HEIGHT; y += 1) {
        const rowOffset = y * GRID_WIDTH
        for (let x = 0; x < GRID_WIDTH; x += 1) {
          const index = rowOffset + x
          if (x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1) {
            next[index] = 0
            continue
          }

          const neighbors =
            current[index - GRID_WIDTH - 1] +
            current[index - GRID_WIDTH] +
            current[index - GRID_WIDTH + 1] +
            current[index - 1] +
            current[index + 1] +
            current[index + GRID_WIDTH - 1] +
            current[index + GRID_WIDTH] +
            current[index + GRID_WIDTH + 1]

          const alive = current[index] === 1
          const nextValue = neighbors === 3 || (alive && neighbors === 2) ? 1 : 0
          next[index] = nextValue
          nextAlive += nextValue
        }
      }

      current = next
      next = createGrid()
      aliveCount = nextAlive
    }

    generation += 1

    if (firstAmCandidate && generation >= firstAmCandidate.revealAtCycle) {
      revealFirstAmCandidate()
    }

    // ── SYSTÈME 2 : Entités vivantes — TOUJOURS actif ─────────────────────────
    // Ce système continue même si Conway est arrêté et la matière figée.
    // Les AM ne sont jamais gelées, jamais traitées comme des cellules normales.
    tickAmState()
    tickRoleBehavior()
    syncAmCells()            // restaure snapshot figé si nécessaire, puis écrit les AM
    tickConstructionSites()  // les chantiers continuent après le gel
    syncConstructionCells()
    refreshAliveCount()
    tryStartReproduction()
    updateStabilityGrid()    // calcule la stabilité des cellules pour guider les AM

    // ── Condition de gel : seules les cellules normales se figent ─────────────
    // Condition : firstAmRevealed && 11 AM alive && Conway encore actif
    if (shouldFreezeNormalCells()) {
      conwayActive = false
      matterFrozen = true
      phase = 'frozenMatter'
      // NE PAS vider constructionSites — les AM continuent de se reproduire
      freezeMatterFromCurrent()
    } else {
      updatePhase()
    }
  }

  function step() {
    stepAccumulator += timeScale
    let executed = false

    while (stepAccumulator >= 1) {
      stepSimulationCycle()
      stepAccumulator -= 1
      executed = true
    }

    if (!executed && timeScale >= 1) {
      stepSimulationCycle()
      stepAccumulator = 0
      executed = true
    }

    if (executed) {
      emit()
    }
  }

  function ensureLoop() {
    if (intervalId !== null) return
    intervalId = setInterval(step, TICK_MS)
  }

  function stopLoop() {
    if (intervalId === null) return
    clearInterval(intervalId)
    intervalId = null
  }

  seedRandomGrid()

  return {
    getState() {
      return getState()
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(getState())
      return () => {
        listeners.delete(listener)
      }
    },
    play() {
      if (status === 'playing') return
      status = 'playing'
      ensureLoop()
      emit()
    },
    pause() {
      if (status === 'paused') return
      status = 'paused'
      stopLoop()
      emit()
    },
    toggle() {
      if (status === 'playing') {
        status = 'paused'
        stopLoop()
        emit()
        return
      }
      status = 'playing'
      ensureLoop()
      emit()
    },
    reset() {
      stopLoop()
      status = 'paused'
      clearGrid(current)
      next = createGrid()
      stepAccumulator = 0
      phase = 'conwayEmergence'
      conwayActive = true
      matterFrozen = false
      frozenMatterGrid = null
      firstAmRevealed = false
      generation = 0
      aliveCount = 0
      amLineages = []
      activePatternIds = []
      protoEntities = []
      amEntities = []
      constructionSites = []
      firstAmCandidate = null
      selectedAmId = null
      stabilityGrid = createGrid()
      prevGrid = createGrid()
      emit()
    },
    randomize() {
      stopLoop()
      status = 'paused'
      next = createGrid()
      stepAccumulator = 0
      seedRandomGrid()
    },
    increaseTimeScale() {
      const currentIndex = TIME_SCALES.indexOf(timeScale)
      if (currentIndex < TIME_SCALES.length - 1) {
        timeScale = TIME_SCALES[currentIndex + 1]
        emit()
      }
    },
    decreaseTimeScale() {
      const currentIndex = TIME_SCALES.indexOf(timeScale)
      if (currentIndex > 0) {
        timeScale = TIME_SCALES[currentIndex - 1]
        emit()
      }
    },
    setInfluence(x, y, mode) {
      influencePoint = { x, y, mode }
    },
    clearInfluence() {
      influencePoint = null
    },
    paintCell(x, y, mode) {
      if (x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) return
      if (x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1) return
      if (amEntities.some((am) => am.absoluteCells.some((cell) => cell.x === x && cell.y === y))) return

      const index = indexAt(x, y)
      const nextValue = mode === 'draw' ? 1 : 0
      if (current[index] === nextValue) return

      current[index] = nextValue
      refreshAliveCount()
      emit()
    },
    selectAm(amId) {
      selectedAmId = amEntities.some((am) => am.id === amId) ? amId : null
      emit()
    },
    destroy() {
      stopLoop()
      listeners.clear()
    },
  }
}
