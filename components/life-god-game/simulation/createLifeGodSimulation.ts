import { LIFE_GOD_AM_PATTERNS } from './amPatterns'
import type {
  LifeGodAmEntity,
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
const MAX_COMPLETE_AM_BEFORE_SCAN_STOPS = 10
const PROTO_CONSCIOUSNESS_MIN = 10
const PROTO_METAMORPHOSIS_MIN = 15
const CONSTRUCTION_STEP_INTERVAL = 3
const PROTO_GATHER_INTERVAL = 2
const SEARCH_RADIUS = 12
const MIN_FORMATION_CYCLES = Math.round((3 * 60 * 1000) / TICK_MS)
const MAX_FORMATION_CYCLES = Math.round((10 * 60 * 1000) / TICK_MS)
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
    reproductionCooldown: 96,
    searchRadius: 10,
    reproductionDistanceMin: 4,
    movementInterval: 42,
    movementReach: 1,
  },
  gatherer: {
    energyGain: 0.28,
    reproductionEnergyMin: 40,
    reproductionEnergyCost: 16,
    reproductionCooldown: 64,
    searchRadius: 14,
    reproductionDistanceMin: 4,
    movementInterval: 26,
    movementReach: 1,
  },
  explorer: {
    energyGain: 0.2,
    reproductionEnergyMin: 38,
    reproductionEnergyCost: 18,
    reproductionCooldown: 56,
    searchRadius: 18,
    reproductionDistanceMin: 8,
    movementInterval: 14,
    movementReach: 2,
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
  const listeners = new Set<(state: LifeGodSimulationState) => void>()

  function createGrid() {
    return new Uint8Array(GRID_WIDTH * GRID_HEIGHT)
  }

  function getState(): LifeGodSimulationState {
    const completeAmCount = amEntities.filter((am) => am.state === 'alive').length
    const adaptingAmCount = amEntities.filter((am) => am.state === 'adapting').length
    const formingAmCount = amEntities.filter((am) => am.state === 'forming').length
    const frozenMatterCount = current.reduce((total, cell) => total + cell, 0) - amEntities.reduce((total, am) => total + am.absoluteCells.length, 0)
    return {
      phase,
      generation,
      aliveCount,
      status,
      timeScale,
      conwayActive,
      matterFrozen,
      scanningActive: completeAmCount < MAX_COMPLETE_AM_BEFORE_SCAN_STOPS,
      maxCompleteAmBeforeScanStops: MAX_COMPLETE_AM_BEFORE_SCAN_STOPS,
      completeAmCount,
      formingAmCount,
      adaptingAmCount,
      visibleAmCount: amEntities.length,
      activePatternIds,
      maxActivePatternsPerSeed: MAX_ACTIVE_PATTERNS_PER_SEED,
      frozenMatterCount: Math.max(0, frozenMatterCount),
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
    return getCompleteAmCount() < MAX_COMPLETE_AM_BEFORE_SCAN_STOPS && amEntities.length < MAX_TOTAL_AMS
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
      cells: pattern.cells,
      absoluteCells: computeAbsoluteCells(pattern.cells, origin),
      role: lineage.role,
      reproductionCooldown: roleConfig.reproductionCooldown,
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
    firstAmCandidate = null
    updatePhase()
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
        ? { ...am }
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
    const candidates = [{ x: am.position.x, y: am.position.y }]

    for (let oy = -roleConfig.movementReach; oy <= roleConfig.movementReach; oy += 1) {
      for (let ox = -roleConfig.movementReach; ox <= roleConfig.movementReach; ox += 1) {
        if (ox === 0 && oy === 0) continue
        const position = {
          x: am.position.x + ox,
          y: am.position.y + oy,
        }
        candidates.push(position)
      }
    }

    return candidates
  }

  function scoreMovement(am: LifeGodAmEntity, position: { x: number; y: number }) {
    const density = getLivingDensityAt(position, am)
    const otherDistance = getMinDistanceToOtherAms(position, am)
    const lineageAnchor = getLineageAnchor(am.lineageId, am.id)
    const center = averagePosition(computeAbsoluteCells(am.cells, position))
    const lineageDistance = Math.abs(center.x - lineageAnchor.x) + Math.abs(center.y - lineageAnchor.y)
    const influenceScore = getInfluenceScore(position, am)

    if (am.role === 'explorer') {
      return lineageDistance * 4 + otherDistance * 3 - density * 1.5 + influenceScore
    }
    if (am.role === 'gatherer') {
      return density * 7 + otherDistance * 1.2 - lineageDistance * 1.6 + influenceScore
    }
    return density * 2.5 + otherDistance * 0.8 - lineageDistance * 4 + influenceScore
  }

  function tickRoleBehavior() {
    amEntities = amEntities.map((am) => {
      if (am.state !== 'alive') return am
      const roleConfig = ROLE_CONFIG[am.role]
      if (constructionSites.some((site) => site.builderAmId === am.id)) return am
      if (generation % roleConfig.movementInterval !== 0) return am
      const candidates = getMovementCandidates(am)
        .filter((position) => canMoveAmTo(am, position))
        .map((position) => ({
          position,
          score: scoreMovement(am, position),
        }))
        .sort((a, b) => b.score - a.score)

      const best = candidates[0]
      if (!best) return am
      if (best.position.x === am.position.x && best.position.y === am.position.y) return am

      return {
        ...am,
        position: best.position,
        absoluteCells: computeAbsoluteCells(am.cells, best.position),
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
    amLineages = []
    activePatternIds = []
    protoEntities = []
    amEntities = []
    constructionSites = []
    firstAmCandidate = null
    selectedAmId = null

    for (let y = 1; y < GRID_HEIGHT - 1; y += 1) {
      for (let x = 1; x < GRID_WIDTH - 1; x += 1) {
        current[indexAt(x, y)] = Math.random() < RANDOM_FILL_CHANCE ? 1 : 0
      }
    }

    generation = 0
    refreshAliveCount()
    initializeFirstAmCandidate()
    emit()
  }

  function stepSimulationCycle() {
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

    tickAmState()
    tickRoleBehavior()
    syncAmCells()
    tickConstructionSites()
    syncConstructionCells()
    refreshAliveCount()
    tryStartReproduction()
    if (getCompleteAmCount() >= MAX_COMPLETE_AM_BEFORE_SCAN_STOPS) {
      conwayActive = false
      matterFrozen = true
      phase = 'frozenMatter'
      constructionSites = []
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
      generation = 0
      aliveCount = 0
      amLineages = []
      activePatternIds = []
      protoEntities = []
      amEntities = []
      constructionSites = []
      firstAmCandidate = null
      selectedAmId = null
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
