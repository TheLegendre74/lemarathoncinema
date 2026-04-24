import type { LifeGodAmEntity, LifeGodFounderPattern, LifeGodSimulationController, LifeGodSimulationState } from '../types'

export function createLifeGodSimulation(): LifeGodSimulationController {
  const GRID_WIDTH = 160
  const GRID_HEIGHT = 100
  const TICK_MS = 90
  const RANDOM_FILL_CHANCE = 0.18
  const FOUNDER_SCAN_INTERVAL = 8
  const FOUNDER_SIZE = 10

  let current = createGrid()
  let next = createGrid()
  let generation = 0
  let aliveCount = 0
  let founderPattern: LifeGodFounderPattern | null = null
  let amEntity: LifeGodAmEntity | null = null
  let selectedAmId: string | null = null
  let status: LifeGodSimulationState['status'] = 'paused'
  let intervalId: ReturnType<typeof setInterval> | null = null
  const listeners = new Set<(state: LifeGodSimulationState) => void>()

  function createGrid() {
    return new Uint8Array(GRID_WIDTH * GRID_HEIGHT)
  }

  function getState(): LifeGodSimulationState {
    return {
      phase: amEntity ? 'creature' : 'cellule',
      generation,
      aliveCount,
      status,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      cells: current,
      founderPattern,
      amEntity,
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
    for (let i = 0; i < grid.length; i += 1) {
      total += grid[i]
    }
    return total
  }

  function clearGrid(grid: Uint8Array) {
    grid.fill(0)
  }

  function syncAmCells() {
    if (!amEntity) return
    const entity = amEntity
    entity.absoluteCells = entity.shape.map((cell) => ({
      x: entity.position.x + cell.x,
      y: entity.position.y + cell.y,
    }))
    for (const cell of entity.absoluteCells) {
      if (cell.x <= 0 || cell.y <= 0 || cell.x >= GRID_WIDTH - 1 || cell.y >= GRID_HEIGHT - 1) continue
      current[indexAt(cell.x, cell.y)] = 1
    }
  }

  function refreshAliveCount() {
    aliveCount = recountAlive(current)
  }

  function spawnAmFromFounder(pattern: LifeGodFounderPattern) {
    amEntity = {
      id: `am-${pattern.id}`,
      position: {
        x: pattern.boundingBox.minX,
        y: pattern.boundingBox.minY,
      },
      shape: pattern.cells,
      absoluteCells: pattern.absoluteCells,
      age: 0,
      energy: 100,
      state: 'idle',
      bornAtGeneration: generation,
    }
    selectedAmId = amEntity.id
    syncAmCells()
    refreshAliveCount()
  }

  function maybeDetectFounderPattern() {
    if (founderPattern || amEntity || aliveCount < FOUNDER_SIZE || generation % FOUNDER_SCAN_INTERVAL !== 0) return

    const visited = new Uint8Array(current.length)
    const queueX = new Int16Array(current.length)
    const queueY = new Int16Array(current.length)

    for (let y = 1; y < GRID_HEIGHT - 1; y += 1) {
      for (let x = 1; x < GRID_WIDTH - 1; x += 1) {
        const startIndex = indexAt(x, y)
        if (current[startIndex] !== 1 || visited[startIndex] === 1) continue

        let queueStart = 0
        let queueEnd = 0
        const cluster: { x: number; y: number }[] = []
        let minX = x
        let maxX = x
        let minY = y
        let maxY = y
        let sumX = 0
        let sumY = 0

        queueX[queueEnd] = x
        queueY[queueEnd] = y
        queueEnd += 1
        visited[startIndex] = 1

        while (queueStart < queueEnd) {
          const cx = queueX[queueStart]
          const cy = queueY[queueStart]
          queueStart += 1

          cluster.push({ x: cx, y: cy })
          sumX += cx
          sumY += cy
          if (cx < minX) minX = cx
          if (cx > maxX) maxX = cx
          if (cy < minY) minY = cy
          if (cy > maxY) maxY = cy

          for (let oy = -1; oy <= 1; oy += 1) {
            for (let ox = -1; ox <= 1; ox += 1) {
              if (ox === 0 && oy === 0) continue
              const nx = cx + ox
              const ny = cy + oy
              if (nx <= 0 || ny <= 0 || nx >= GRID_WIDTH - 1 || ny >= GRID_HEIGHT - 1) continue
              const neighborIndex = indexAt(nx, ny)
              if (current[neighborIndex] !== 1 || visited[neighborIndex] === 1) continue
              visited[neighborIndex] = 1
              queueX[queueEnd] = nx
              queueY[queueEnd] = ny
              queueEnd += 1
            }
          }
        }

        if (cluster.length !== FOUNDER_SIZE) continue

        const sortedCluster = cluster.sort((a, b) => (a.y - b.y) || (a.x - b.x))
        founderPattern = {
          id: `founder-${generation}-${x}-${y}`,
          size: 10,
          cells: sortedCluster.map((cell) => ({
            x: cell.x - minX,
            y: cell.y - minY,
          })),
          absoluteCells: sortedCluster,
          center: {
            x: sumX / sortedCluster.length,
            y: sumY / sortedCluster.length,
          },
          boundingBox: {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          },
          detectedAtGeneration: generation,
        }
        spawnAmFromFounder(founderPattern)
        return
      }
    }
  }

  function seedRandomGrid() {
    clearGrid(current)
    founderPattern = null
    amEntity = null
    selectedAmId = null
    for (let y = 1; y < GRID_HEIGHT - 1; y += 1) {
      for (let x = 1; x < GRID_WIDTH - 1; x += 1) {
        const alive = Math.random() < RANDOM_FILL_CHANCE ? 1 : 0
        current[indexAt(x, y)] = alive
      }
    }
    generation = 0
    aliveCount = recountAlive(current)
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

    const previous = current
    current = next
    next = previous
    generation += 1
    aliveCount = nextAlive
    if (amEntity) {
      amEntity.age = generation - amEntity.bornAtGeneration
      syncAmCells()
      refreshAliveCount()
    }
    maybeDetectFounderPattern()
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
      clearGrid(next)
      generation = 0
      aliveCount = 0
      founderPattern = null
      amEntity = null
      selectedAmId = null
      emit()
    },
    randomize() {
      stopLoop()
      status = 'paused'
      clearGrid(next)
      seedRandomGrid()
    },
    paintCell(x, y, mode) {
      if (x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) return
      if (x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1) return
      if (amEntity?.absoluteCells.some((cell) => cell.x === x && cell.y === y)) return

      const index = indexAt(x, y)
      const nextValue = mode === 'draw' ? 1 : 0
      const currentValue = current[index]
      if (currentValue === nextValue) return

      current[index] = nextValue
      aliveCount += nextValue === 1 ? 1 : -1
      maybeDetectFounderPattern()
      emit()
    },
    selectAm(amId) {
      selectedAmId = amEntity && amEntity.id === amId ? amId : null
      emit()
    },
    destroy() {
      stopLoop()
      listeners.clear()
    },
  }
}
