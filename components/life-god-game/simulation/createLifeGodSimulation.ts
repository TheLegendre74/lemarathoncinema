import type { LifeGodSimulationController, LifeGodSimulationState } from '../types'

export function createLifeGodSimulation(): LifeGodSimulationController {
  const GRID_WIDTH = 160
  const GRID_HEIGHT = 100
  const TICK_MS = 90
  const RANDOM_FILL_CHANCE = 0.18

  let current = createGrid()
  let next = createGrid()
  let generation = 0
  let aliveCount = 0
  let status: LifeGodSimulationState['status'] = 'paused'
  let intervalId: ReturnType<typeof setInterval> | null = null
  const listeners = new Set<(state: LifeGodSimulationState) => void>()

  function createGrid() {
    return new Uint8Array(GRID_WIDTH * GRID_HEIGHT)
  }

  function getState(): LifeGodSimulationState {
    return {
      phase: 'cellule',
      generation,
      aliveCount,
      status,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      cells: current,
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

  function seedRandomGrid() {
    clearGrid(current)
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

      const index = indexAt(x, y)
      const nextValue = mode === 'draw' ? 1 : 0
      const currentValue = current[index]
      if (currentValue === nextValue) return

      current[index] = nextValue
      aliveCount += nextValue === 1 ? 1 : -1
      emit()
    },
    destroy() {
      stopLoop()
      listeners.clear()
    },
  }
}
