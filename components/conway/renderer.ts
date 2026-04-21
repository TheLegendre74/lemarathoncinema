// Conway V2 — rendu canvas enrichi
// Trail (cellules mourantes) + coloration par âge cellulaire.
// Aucune logique de simulation ici : le renderer gère uniquement son propre état visuel.

import { CONWAY_CONFIG } from './config'
import type { SimState } from './simulationState'

const { RENDER, COLORS, CELL_SIZE: CS } = CONWAY_CONFIG

export class ConwayRenderer {
  private ctx: CanvasRenderingContext2D
  private _trail: Float32Array = new Float32Array(0) // opacité des cellules mourantes [0,1]
  private _age: Uint16Array   = new Uint16Array(0)   // âge en ticks de chaque cellule vivante
  private _prevCells: Uint8Array = new Uint8Array(0) // état du tick précédent (pour trail)

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('[Conway] 2D context unavailable')
    this.ctx = ctx
  }

  render(state: SimState): void {
    const { ctx, canvas } = this
    const { cells, width, height } = state.grid
    const size = width * height

    // ── Initialisation lazy des buffers visuels ───────────────────────────
    if (this._trail.length !== size) {
      this._trail    = new Float32Array(size)
      this._age      = new Uint16Array(size)
      this._prevCells = new Uint8Array(size)
    }

    const trail = this._trail
    const age   = this._age
    const prev  = this._prevCells

    // ── Mise à jour trail + âge ───────────────────────────────────────────
    for (let i = 0; i < size; i++) {
      const alive = cells[i] > 0
      if (alive) {
        age[i] = Math.min(age[i] + 1, 500)
        trail[i] = 0 // vivant = pas de trail
      } else {
        age[i] = 0
        if (prev[i] > 0) {
          // Vient de mourir ce tick → démarrer le trail
          trail[i] = RENDER.TRAIL_INITIAL
        } else {
          // Mort depuis un moment → décrémenter
          trail[i] = Math.max(0, trail[i] - RENDER.TRAIL_DECAY)
        }
      }
    }

    // ── Dessin ────────────────────────────────────────────────────────────

    // 1. Fond
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 2. Trail (cellules mourantes) — dessiné avant les vivantes
    ctx.fillStyle = COLORS.cellTrail
    for (let y = 0; y < height; y++) {
      const row = y * width
      for (let x = 0; x < width; x++) {
        const t = trail[row + x]
        if (t > 0.04) {
          ctx.globalAlpha = t * 0.55 // max ~42% d'opacité pour le trail
          ctx.fillRect(x * CS + 1, y * CS + 1, CS - 2, CS - 2)
        }
      }
    }
    ctx.globalAlpha = 1

    // 3. Cellules vivantes avec coloration par âge
    for (let y = 0; y < height; y++) {
      const row = y * width
      for (let x = 0; x < width; x++) {
        const i = row + x
        if (cells[i] === 0) continue
        const a = age[i]
        ctx.fillStyle = a <= RENDER.AGE_YOUNG  ? COLORS.cellNew
                      : a <= RENDER.AGE_ADULT  ? COLORS.cellYoung
                      : a <= RENDER.AGE_OLD    ? COLORS.cellAdult
                      : COLORS.cellOld
        ctx.fillRect(x * CS + 1, y * CS + 1, CS - 2, CS - 2)
      }
    }

    // ── Mémoriser l'état pour le prochain tick ────────────────────────────
    this._prevCells = new Uint8Array(cells) // copie légère
  }

  resize(width: number, height: number): void {
    this.canvas.width  = width
    this.canvas.height = height
    // Réinitialiser les buffers après resize
    this._trail    = new Float32Array(0)
    this._age      = new Uint16Array(0)
    this._prevCells = new Uint8Array(0)
  }

  destroy(): void {
    // Float32Array / Uint16Array seront GC'd automatiquement
  }
}
