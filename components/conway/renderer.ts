// Conway V4 — rendu basé sur énergie EcoGrid
// La couleur d'une cellule encode directement son énergie.
// Pas d'état d'âge séparé : énergie ↑ = vie longue = vert sombre, énergie ↓ = mort imminente = trail.

import { CONWAY_CONFIG } from './config'
import type { SimState } from './simulationState'

const { RENDER, COLORS, CELL_SIZE: CS, ECO } = CONWAY_CONFIG

export class ConwayRenderer {
  private ctx: CanvasRenderingContext2D
  private _trail: Float32Array = new Float32Array(0)

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('[Conway] 2D context unavailable')
    this.ctx = ctx
  }

  render(state: SimState): void {
    const { ctx, canvas } = this
    const { energy, width, height } = state.grid
    const size = width * height
    const T    = ECO.ALIVE_THRESHOLD

    if (this._trail.length !== size) {
      this._trail = new Float32Array(size)
    }

    const trail = this._trail

    // Mise à jour trail
    // Une cellule morte qui a encore de l'énergie résiduaire → trail proportionnel
    for (let i = 0; i < size; i++) {
      const e = energy[i]
      if (e > T) {
        trail[i] = 0
      } else if (e > 0.02) {
        trail[i] = e / T  // normalisé [0..1]
      } else {
        trail[i] = Math.max(0, trail[i] - RENDER.TRAIL_DECAY)
      }
    }

    // 1. Fond
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 2. Trail — cellules mourantes
    ctx.fillStyle = COLORS.cellTrail
    for (let y = 0; y < height; y++) {
      const row = y * width
      for (let x = 0; x < width; x++) {
        const t = trail[row + x]
        if (t > 0.04) {
          ctx.globalAlpha = t * 0.48
          ctx.fillRect(x * CS + 1, y * CS + 1, CS - 2, CS - 2)
        }
      }
    }
    ctx.globalAlpha = 1

    // 3. Cellules vivantes — couleur = fonction de l'énergie
    for (let y = 0; y < height; y++) {
      const row = y * width
      for (let x = 0; x < width; x++) {
        const i = row + x
        const e = energy[i]
        if (e <= T) continue

        if (e <= RENDER.E_NEW) {
          // Naissance récente — flash blanc-vert, carré plein (légèrement plus grand)
          ctx.fillStyle = COLORS.cellNew
          ctx.fillRect(x * CS, y * CS, CS, CS)
        } else {
          ctx.fillStyle = e <= RENDER.E_YOUNG ? COLORS.cellYoung
                        : e <= RENDER.E_ADULT ? COLORS.cellAdult
                        : e <= RENDER.E_OLD   ? COLORS.cellOld
                        : COLORS.cellAncient
          ctx.fillRect(x * CS + 1, y * CS + 1, CS - 2, CS - 2)
        }
      }
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width  = width
    this.canvas.height = height
    this._trail = new Float32Array(0)
  }

  destroy(): void {}
}
