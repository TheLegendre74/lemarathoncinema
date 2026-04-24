import { LIFE_GOD_AM_PATTERNS } from './amPatterns'
import type {
  LifeGodAmEntity,
  LifeGodAmLineage,
  LifeGodAmPattern,
  LifeGodConstructionSite,
  LifeGodRelativeCell,
  LifeGodSimulationController,
  LifeGodSimulationState,
} from '../types'

const GRID_WIDTH = 160
const GRID_HEIGHT = 100
const TICK_MS = 90
const RANDOM_FILL_CHANCE = 0.18
const PATTERN_SCAN_INTERVAL = 8
const MAX_LINEAGES = 3
const MAX_TOTAL_AMS = 12
const MAX_AMS_PER_LINEAGE = 4
const REPRODUCTION_ENERGY_COST = 18
const REPRODUCTION_ENERGY_GAIN = 0.18
const REPRODUCTION_ENERGY_MIN = 42
const REPRODUCTION_COOLDOWN_CYCLES = 70
const CONSTRUCTION_STEP_INTERVAL = 3
const SEARCH_RADIUS = 12
const LINEAGE_COLORS = ['#69f0c1', '#ff8ad8', '#7ab6ff']

export function createLifeGodSimulation(): LifeGodSimulationController {
  let current = createGrid()
  let next = createGrid()
  let generation = 0
  let aliveCount = 0
  let amLineages: LifeGodAmLineage[] = []
  let amEntities: LifeGodAmEntity[] = []
  let constructionSites: LifeGodConstructionSite[] = []
  let selectedAmId: string | null = null
  let status: LifeGodSimulationState['status'] = 'paused'
  let intervalId: ReturnType<typeof setInterval> | null = null
  const listeners = new Set<(state: LifeGodSimulationState) => void>()

  function createGrid() {
    return new Uint8Array(GRID_WIDTH * GRID_HEIGHT)
  }

  function getState(): LifeGodSimulationState {
    return {
      phase: amEntities.length > 0 || constructionSites.length > 0 ? 'creature' : 'cellule',
      generation,
      aliveCount,
      status,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      cells: current,
      amLineages,
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

  function populationForLineage(lineageId: string) {
    return amEntities.filter((am) => am.lineageId === lineageId).length
  }

  function isReservedByEntity(x: number, y: number) {
    return amEntities.some((am) => am.absoluteCells.some((cell) => cell.x === x && cell.y === y))
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
    return lineage
  }

  function spawnAm(lineage: LifeGodAmLineage, pattern: LifeGodAmPattern, origin: { x: number; y: number }) {
    const am: LifeGodAmEntity = {
      id: `am-${lineage.id}-${populationForLineage(lineage.id) + 1}`,
      lineageId: lineage.id,
      patternId: pattern.id,
      position: origin,
      bodyParts: pattern.bodyParts,
      age: 0,
      energy: 82,
      state: 'cooldown',
      cells: pattern.cells,
      absoluteCells: computeAbsoluteCells(pattern.cells, origin),
      role: pattern.suggestedRole,
      reproductionCooldown: REPRODUCTION_COOLDOWN_CYCLES,
    }

    amEntities = [...amEntities, am]
    selectedAmId = am.id
    syncAmCells()
    updateLineagePopulation(lineage.id)
    refreshAliveCount()
  }

  function matchesPatternAt(pattern: LifeGodAmPattern, originX: number, originY: number) {
    const expected = new Set(pattern.cells.map((cell) => `${cell.x}:${cell.y}`))
    for (let py = 0; py < pattern.height; py += 1) {
      for (let px = 0; px < pattern.width; px += 1) {
        const alive = current[indexAt(originX + px, originY + py)] === 1
        const shouldBeAlive = expected.has(`${px}:${py}`)
        if (alive !== shouldBeAlive) return false
      }
    }
    return true
  }

  function tryCreateLineagesFromPatterns() {
    if (generation % PATTERN_SCAN_INTERVAL !== 0) return
    if (amLineages.length >= MAX_LINEAGES) return

    for (const pattern of LIFE_GOD_AM_PATTERNS) {
      if (amLineages.some((lineage) => lineage.patternId === pattern.id)) continue
      if (amLineages.length >= MAX_LINEAGES || amEntities.length >= MAX_TOTAL_AMS) return

      let found = false
      for (let y = 1; y <= GRID_HEIGHT - pattern.height - 1 && !found; y += 1) {
        for (let x = 1; x <= GRID_WIDTH - pattern.width - 1; x += 1) {
          if (!matchesPatternAt(pattern, x, y)) continue
          const lineage = createLineage(pattern)
          spawnAm(lineage, pattern, { x, y })
          found = true
          break
        }
      }
    }
  }

  function canPlaceConstruction(pattern: LifeGodAmPattern, origin: { x: number; y: number }) {
    for (const cell of pattern.cells) {
      const x = origin.x + cell.x
      const y = origin.y + cell.y
      if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) return false
      if (isReservedByEntity(x, y) || isReservedByConstruction(x, y)) return false
      if (hasLivingCell(x, y)) return false
    }
    return true
  }

  function findNearbyConstructionOrigin(parent: LifeGodAmEntity, pattern: LifeGodAmPattern) {
    for (let distance = 4; distance <= SEARCH_RADIUS; distance += 2) {
      for (let oy = -distance; oy <= distance; oy += 1) {
        for (let ox = -distance; ox <= distance; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== distance) continue
          const origin = {
            x: parent.position.x + ox,
            y: parent.position.y + oy,
          }
          if (canPlaceConstruction(pattern, origin)) return origin
        }
      }
    }
    return null
  }

  function tryStartReproduction() {
    if (amEntities.length >= MAX_TOTAL_AMS) return

    for (const am of amEntities) {
      if (constructionSites.some((site) => site.builderAmId === am.id)) continue
      if (am.reproductionCooldown > 0 || am.energy < REPRODUCTION_ENERGY_MIN) continue

      const lineage = amLineages.find((item) => item.id === am.lineageId)
      const pattern = LIFE_GOD_AM_PATTERNS.find((item) => item.id === am.patternId)
      if (!lineage || !pattern) continue
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
              energy: Math.max(0, entity.energy - REPRODUCTION_ENERGY_COST),
              state: 'reproducing',
              reproductionCooldown: REPRODUCTION_COOLDOWN_CYCLES,
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
      if (amEntities.length >= MAX_TOTAL_AMS) continue
      if (populationForLineage(lineage.id) >= MAX_AMS_PER_LINEAGE) continue
      spawnAm(lineage, pattern, item.origin)
    }

    amEntities = amEntities.map((am) =>
      constructionSites.some((site) => site.builderAmId === am.id)
        ? { ...am, state: 'reproducing' }
        : am
    )
  }

  function tickAmState() {
    amEntities = amEntities.map((am) => {
      const activeConstruction = constructionSites.some((site) => site.builderAmId === am.id)
      const cooldown = Math.max(0, am.reproductionCooldown - 1)
      const energy = Math.min(100, am.energy + REPRODUCTION_ENERGY_GAIN)
      return {
        ...am,
        age: am.age + 1,
        energy,
        reproductionCooldown: cooldown,
        state: activeConstruction ? 'reproducing' : cooldown > 0 ? 'cooldown' : 'idle',
        absoluteCells: computeAbsoluteCells(am.cells, am.position),
      }
    })
  }

  function seedRandomGrid() {
    clearGrid(current)
    amLineages = []
    amEntities = []
    constructionSites = []
    selectedAmId = null

    for (let y = 1; y < GRID_HEIGHT - 1; y += 1) {
      for (let x = 1; x < GRID_WIDTH - 1; x += 1) {
        current[indexAt(x, y)] = Math.random() < RANDOM_FILL_CHANCE ? 1 : 0
      }
    }

    generation = 0
    refreshAliveCount()
    tryCreateLineagesFromPatterns()
    emit()
  }

  function step() {
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
    generation += 1
    aliveCount = nextAlive

    tickAmState()
    syncAmCells()
    tickConstructionSites()
    syncConstructionCells()
    refreshAliveCount()
    tryCreateLineagesFromPatterns()
    tryStartReproduction()
    emit()
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
      generation = 0
      aliveCount = 0
      amLineages = []
      amEntities = []
      constructionSites = []
      selectedAmId = null
      emit()
    },
    randomize() {
      stopLoop()
      status = 'paused'
      next = createGrid()
      seedRandomGrid()
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
      tryCreateLineagesFromPatterns()
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
