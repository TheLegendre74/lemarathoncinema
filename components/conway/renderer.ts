// Conway V4 — rendu canvas avec hiérarchie de complexité
//
// Palette énergie (vivant = energy > T) :
//   [T..E_NEW]    → cellNew     (blanc-vert, naissance)
//   [E_NEW..YOUNG]→ cellYoung
//   [YOUNG..ADULT]→ cellAdult
//   [ADULT..OLD]  → cellOld
//   [OLD..1]      → cellAncient
//
// Hiérarchie visuelle par complexité :
//   complexity = 0 : cellule simple — carré avec 1px de marge (grille visible)
//   complexity ≥ 1 : forme complexe — carré plein (amas solide, "lourd")
//   complexity ≥ 5 : pôle ancré — carré plein + nucleus central blanc-vert 2×2

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
    const { energy, complexity, width, height } = state.grid
    const size = width * height
    const T    = ECO.ALIVE_THRESHOLD

    if (this._trail.length !== size) {
      this._trail = new Float32Array(size)
    }

    const trail = this._trail

    // Mise à jour trail
    for (let i = 0; i < size; i++) {
      const e = energy[i]
      if (e > T) {
        trail[i] = 0
      } else if (e > 0.02) {
        trail[i] = e / T
      } else {
        trail[i] = Math.max(0, trail[i] - RENDER.TRAIL_DECAY)
      }
    }

    // 1. Fond
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 2. Trail — empreintes de cellules mourantes
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

    // 3. Cellules vivantes
    for (let y = 0; y < height; y++) {
      const row = y * width
      for (let x = 0; x < width; x++) {
        const i = row + x
        const e = energy[i]
        if (e <= T) continue

        const c = complexity[i]

        // Couleur basée sur l'énergie
        const color = e <= RENDER.E_NEW   ? COLORS.cellNew
                    : e <= RENDER.E_YOUNG ? COLORS.cellYoung
                    : e <= RENDER.E_ADULT ? COLORS.cellAdult
                    : e <= RENDER.E_OLD   ? COLORS.cellOld
                    : COLORS.cellAncient

        ctx.fillStyle = color

        if (c === 0) {
          // Cellule simple : carré avec marge (grille lisible)
          if (e <= RENDER.E_NEW) {
            // Flash naissance : plein et vif
            ctx.fillRect(x * CS, y * CS, CS, CS)
          } else {
            ctx.fillRect(x * CS + 1, y * CS + 1, CS - 2, CS - 2)
          }
        } else {
          // Forme complexe : carré plein, amas solide
          ctx.fillRect(x * CS, y * CS, CS, CS)

          // Pôle ancré (complexity ≥ 5) : nucleus central blanc-vert
          if (c >= 5) {
            ctx.fillStyle = COLORS.cellNew
            const nc = Math.floor(CS / 2) - 1
            ctx.fillRect(x * CS + nc, y * CS + nc, 2, 2)
          }
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
