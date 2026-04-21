// Conway's Game of Life — rendu canvas
// Responsable uniquement de l'affichage. Aucune logique de simulation ici.
// Extension future : renderWithEffects, renderClusters, renderAgents, etc.

import { CONWAY_CONFIG } from './config'
import type { SimState } from './simulationState'

export class ConwayRenderer {
  private ctx: CanvasRenderingContext2D

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('[Conway] Impossible d\u2019obtenir le contexte 2D canvas')
    this.ctx = ctx
  }

  render(state: SimState): void {
    const { ctx, canvas } = this
    const { grid } = state
    const cs = CONWAY_CONFIG.CELL_SIZE
    const { background, cell } = CONWAY_CONFIG.COLORS

    // Fond
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Cellules vivantes — 1px de marge sur chaque bord pour l'effet grille naturel
    ctx.fillStyle = cell
    const { cells, width, height } = grid
    for (let y = 0; y < height; y++) {
      const rowOffset = y * width
      for (let x = 0; x < width; x++) {
        if (cells[rowOffset + x] > 0) {
          ctx.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2)
        }
      }
    }

    // ── Extension v2+ ────────────────────────────────────────────────────────
    // Ici on pourra appeler : this.renderClusters(state), this.renderAgents(state), etc.
    // ─────────────────────────────────────────────────────────────────────────
  }

  // Adapte la résolution du canvas à ses dimensions CSS
  resize(width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
  }

  destroy(): void {
    // Pas de ressources à libérer en V1
  }
}
