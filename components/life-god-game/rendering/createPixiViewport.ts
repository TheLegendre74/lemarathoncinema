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
  const constructionGhosts = new PIXI.Graphics()
  const constructionBuilt = new PIXI.Graphics()
  const protoAuras = new PIXI.Graphics()
  const protoCells = new PIXI.Graphics()
  const protoOutlines = new PIXI.Graphics()
  const amAuras = new PIXI.Graphics()
  const amCells = new PIXI.Graphics()
  const amOutlines = new PIXI.Graphics()
  app.stage.addChild(
    backdrop,
    frame,
    gridLines,
    liveCells,
    constructionGhosts,
    constructionBuilt,
    protoAuras,
    protoCells,
    protoOutlines,
    amAuras,
    amCells,
    amOutlines
  )

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
    const usableWidth = Math.max(width - padding * 2, latestState.gridWidth)
    const usableHeight = Math.max(height - padding * 2, latestState.gridHeight)
    const cellSize = Math.max(
      3,
      Math.floor(Math.min(usableWidth / latestState.gridWidth, usableHeight / latestState.gridHeight))
    )
    const gridWidthPx = cellSize * latestState.gridWidth
    const gridHeightPx = cellSize * latestState.gridHeight

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
    for (let x = 0; x <= latestState.gridWidth; x += lineStep) {
      const px = metrics.x + x * metrics.cellSize
      gridLines.moveTo(px, metrics.y)
      gridLines.lineTo(px, metrics.y + metrics.height)
    }
    for (let y = 0; y <= latestState.gridHeight; y += lineStep) {
      const py = metrics.y + y * metrics.cellSize
      gridLines.moveTo(metrics.x, py)
      gridLines.lineTo(metrics.x + metrics.width, py)
    }
    gridLines.stroke({ color: 0x7f8ba5, alpha: 0.12, width: 1 })
  }

  function draw(state: LifeGodSimulationState) {
    latestState = state
    computeMetrics()
    drawGridFrame()

    liveCells.clear()
    constructionGhosts.clear()
    constructionBuilt.clear()
    protoAuras.clear()
    protoCells.clear()
    protoOutlines.clear()
    amAuras.clear()
    amCells.clear()
    amOutlines.clear()

    const reservedCells = new Set([
      ...state.protoEntities.flatMap((proto) => proto.cells.map((cell) => `${cell.x}:${cell.y}`)),
      ...state.amEntities.flatMap((am) => am.absoluteCells.map((cell) => `${cell.x}:${cell.y}`)),
    ])

    for (let y = 0; y < state.gridHeight; y += 1) {
        const rowOffset = y * state.gridWidth
      for (let x = 0; x < state.gridWidth; x += 1) {
        if (state.cells[rowOffset + x] !== 1) continue
        if (reservedCells.has(`${x}:${y}`)) continue

        const px = metrics.x + x * metrics.cellSize
        const py = metrics.y + y * metrics.cellSize
        liveCells.rect(px + 1, py + 1, Math.max(metrics.cellSize - 1, 1), Math.max(metrics.cellSize - 1, 1))
      }
    }
    liveCells.fill({ color: 0xb8d7ff, alpha: 0.92 })

    const protoPulse = 0.78 + Math.sin(performance.now() / 210) * 0.06
    for (const proto of state.protoEntities) {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const cell of proto.cells) {
        const px = metrics.x + cell.x * metrics.cellSize
        const py = metrics.y + cell.y * metrics.cellSize
        protoCells.rect(px + 1, py + 1, Math.max(metrics.cellSize - 1, 1), Math.max(metrics.cellSize - 1, 1))
        if (cell.x < minX) minX = cell.x
        if (cell.x > maxX) maxX = cell.x
        if (cell.y < minY) minY = cell.y
        if (cell.y > maxY) maxY = cell.y
      }

      const boxX = metrics.x + minX * metrics.cellSize
      const boxY = metrics.y + minY * metrics.cellSize
      const boxWidth = (maxX - minX + 1) * metrics.cellSize
      const boxHeight = (maxY - minY + 1) * metrics.cellSize

      protoAuras.roundRect(boxX - 4, boxY - 4, boxWidth + 8, boxHeight + 8, 10)
      protoAuras.fill({ color: 0xe8f0ff, alpha: 0.08 })

      protoOutlines.roundRect(boxX - 1, boxY - 1, boxWidth + 2, boxHeight + 2, 8)
      protoOutlines.stroke({
        color: proto.state === 'metamorphosing' ? 0xffffff : 0xd9e6ff,
        alpha: proto.state === 'metamorphosing' ? 0.78 : 0.46,
        width: proto.state === 'metamorphosing' ? 1.8 : 1.2,
      })
    }
    protoCells.fill({ color: 0xe4ecff, alpha: protoPulse })

    for (const site of state.constructionSites) {
      const lineage = state.amLineages.find((item) => item.id === site.lineageId)
      const colorValue = Number.parseInt((lineage?.color ?? '#69f0c1').replace('#', ''), 16)

      for (const cell of site.absoluteCells) {
        const px = metrics.x + cell.x * metrics.cellSize
        const py = metrics.y + cell.y * metrics.cellSize
        constructionGhosts.rect(px + 1, py + 1, Math.max(metrics.cellSize - 1, 1), Math.max(metrics.cellSize - 1, 1))
        if (state.cells[state.gridWidth * cell.y + cell.x] === 1) {
          constructionBuilt.rect(px + 1, py + 1, Math.max(metrics.cellSize - 1, 1), Math.max(metrics.cellSize - 1, 1))
        }
      }

      constructionGhosts.fill({ color: colorValue, alpha: 0.12 })
      constructionBuilt.fill({ color: colorValue, alpha: 0.42 })
    }

    const pulse = 0.76 + Math.sin(performance.now() / 260) * 0.08
    for (const am of state.amEntities) {
      const lineage = state.amLineages.find((item) => item.id === am.lineageId)
      const selected = state.selectedAmId === am.id
      const fillColor = lineage?.color ?? '#69f0c1'
      const colorValue = Number.parseInt(fillColor.replace('#', ''), 16)

      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const cell of am.absoluteCells) {
        const px = metrics.x + cell.x * metrics.cellSize
        const py = metrics.y + cell.y * metrics.cellSize
        amCells.rect(px + 1, py + 1, Math.max(metrics.cellSize - 1, 1), Math.max(metrics.cellSize - 1, 1))
        if (cell.x < minX) minX = cell.x
        if (cell.x > maxX) maxX = cell.x
        if (cell.y < minY) minY = cell.y
        if (cell.y > maxY) maxY = cell.y
      }

      const boxX = metrics.x + minX * metrics.cellSize
      const boxY = metrics.y + minY * metrics.cellSize
      const boxWidth = (maxX - minX + 1) * metrics.cellSize
      const boxHeight = (maxY - minY + 1) * metrics.cellSize

      amAuras.roundRect(boxX - 3, boxY - 3, boxWidth + 6, boxHeight + 6, 10)
      amAuras.fill({ color: colorValue, alpha: selected ? 0.16 : 0.09 })

      amOutlines.roundRect(boxX - 1, boxY - 1, boxWidth + 2, boxHeight + 2, 8)
      amOutlines.stroke({
        color: colorValue,
        alpha: selected ? 0.9 : 0.5,
        width: selected ? 2 : 1.4,
      })
    }

    for (const am of state.amEntities) {
      const lineage = state.amLineages.find((item) => item.id === am.lineageId)
      const colorValue = Number.parseInt((lineage?.color ?? '#69f0c1').replace('#', ''), 16)
      const selected = state.selectedAmId === am.id

      for (const cell of am.absoluteCells) {
        const px = metrics.x + cell.x * metrics.cellSize
        const py = metrics.y + cell.y * metrics.cellSize
        amCells.rect(px + 1, py + 1, Math.max(metrics.cellSize - 1, 1), Math.max(metrics.cellSize - 1, 1))
      }

      amCells.fill({ color: colorValue, alpha: selected ? pulse + 0.08 : pulse })
    }
  }

  draw(initialState)

  const resize = () => draw(latestState)
  app.renderer.on('resize', resize)

  function getCellAtClientPoint(clientX: number, clientY: number) {
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
  }

  return {
    render(state) {
      draw(state)
    },
    getCellAtClientPoint,
    getAmAtClientPoint(clientX, clientY, state) {
      const cell = getCellAtClientPoint(clientX, clientY)
      if (!cell) return null
      for (const am of state.amEntities) {
        if (am.absoluteCells.some((amCell) => amCell.x === cell.x && amCell.y === cell.y)) {
          return am.id
        }
      }
      return null
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
