import type { LifeGodRenderer, LifeGodSimulationState, LifeGodViewportMetrics } from '../types'

interface CreatePixiViewportParams {
  host: HTMLDivElement
  initialState: LifeGodSimulationState
}

export async function createPixiViewport({
  host,
  initialState,
}: CreatePixiViewportParams): Promise<LifeGodRenderer> {
  const PIXI = await import('pixi.js')

  const app = new PIXI.Application()
  await app.init({
    resizeTo: host,
    antialias: true,
    autoDensity: true,
    background: '#05070d',
  })

  host.replaceChildren(app.canvas)
  app.canvas.style.display = 'block'
  app.canvas.style.width = '100%'
  app.canvas.style.height = '100%'
  app.canvas.style.touchAction = 'none'

  const backdrop = new PIXI.Graphics()
  const frame = new PIXI.Graphics()
  const gridLines = new PIXI.Graphics()
  const liveCells = new PIXI.Graphics()
  app.stage.addChild(backdrop, frame, gridLines, liveCells)

  let latestState = initialState
  let metrics: LifeGodViewportMetrics = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    cellSize: 1,
  }

  function computeMetrics() {
    const width = app.renderer.width
    const height = app.renderer.height
    const padding = 24
    const usableWidth = Math.max(width - padding * 2, initialState.gridWidth)
    const usableHeight = Math.max(height - padding * 2, initialState.gridHeight)
    const cellSize = Math.max(
      3,
      Math.floor(Math.min(usableWidth / initialState.gridWidth, usableHeight / initialState.gridHeight))
    )
    const gridWidthPx = cellSize * initialState.gridWidth
    const gridHeightPx = cellSize * initialState.gridHeight

    metrics = {
      x: Math.floor((width - gridWidthPx) / 2),
      y: Math.floor((height - gridHeightPx) / 2),
      width: gridWidthPx,
      height: gridHeightPx,
      cellSize,
    }
  }

  function drawGridFrame() {
    const width = app.renderer.width
    const height = app.renderer.height

    backdrop.clear()
    backdrop.rect(0, 0, width, height)
    backdrop.fill({ color: 0x05070d })
    backdrop.rect(0, 0, width, height * 0.42)
    backdrop.fill({ color: 0x102037, alpha: 0.18 })

    frame.clear()
    frame.roundRect(metrics.x - 1, metrics.y - 1, metrics.width + 2, metrics.height + 2, 12)
    frame.stroke({ color: 0x364155, alpha: 0.8, width: 1 })

    gridLines.clear()
    if (metrics.cellSize < 4) return

    const lineStep = metrics.cellSize >= 7 ? 1 : 2
    for (let x = 0; x <= initialState.gridWidth; x += lineStep) {
      const px = metrics.x + x * metrics.cellSize
      gridLines.moveTo(px, metrics.y)
      gridLines.lineTo(px, metrics.y + metrics.height)
    }
    for (let y = 0; y <= initialState.gridHeight; y += lineStep) {
      const py = metrics.y + y * metrics.cellSize
      gridLines.moveTo(metrics.x, py)
      gridLines.lineTo(metrics.x + metrics.width, py)
    }
    gridLines.stroke({ color: 0x7f8ba5, alpha: 0.12, width: 1 })
  }

  const draw = (state: LifeGodSimulationState) => {
    latestState = state
    computeMetrics()
    drawGridFrame()

    liveCells.clear()
    for (let y = 0; y < state.gridHeight; y += 1) {
      const rowOffset = y * state.gridWidth
      for (let x = 0; x < state.gridWidth; x += 1) {
        if (state.cells[rowOffset + x] !== 1) continue
        const px = metrics.x + x * metrics.cellSize
        const py = metrics.y + y * metrics.cellSize

        liveCells.rect(px + 1, py + 1, Math.max(metrics.cellSize - 1, 1), Math.max(metrics.cellSize - 1, 1))
      }
    }
    liveCells.fill({ color: 0xb8d7ff, alpha: 0.92 })
  }

  draw(initialState)

  const resize = () => draw(latestState)
  app.renderer.on('resize', resize)

  return {
    render(state) {
      draw(state)
    },
    getCellAtClientPoint(clientX, clientY) {
      const rect = app.canvas.getBoundingClientRect()
      const canvasX = ((clientX - rect.left) / rect.width) * app.renderer.width
      const canvasY = ((clientY - rect.top) / rect.height) * app.renderer.height
      if (
        canvasX < metrics.x ||
        canvasY < metrics.y ||
        canvasX >= metrics.x + metrics.width ||
        canvasY >= metrics.y + metrics.height
      ) {
        return null
      }

      return {
        x: Math.floor((canvasX - metrics.x) / metrics.cellSize),
        y: Math.floor((canvasY - metrics.y) / metrics.cellSize),
      }
    },
    getViewportMetrics() {
      return metrics
    },
    destroy() {
      app.renderer.off('resize', resize)
      app.destroy(true, {
        children: true,
      })
    },
  }
}
