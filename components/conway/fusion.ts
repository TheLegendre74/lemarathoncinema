// Conway V4 — module de fusion sélective
//
// Une fusion est une rencontre entre deux amas vivants qui réunissent
// simultanément des conditions de compatibilité. Contact ≠ fusion.
//
// Conditions pour une paire (A, B) :
//   1. Les deux sont vivants (energy > ALIVE_THRESHOLD)
//   2. Les deux ont energy >= ENERGY_MIN
//   3. Les deux ont cooldown = 0
//   4. Les deux ont >= NEIGHBOR_MIN voisins vivants (confirmation d'amas)
//   5. |complexity_A − complexity_B| <= MAX_DIFF (compatibilité)
//   6. Tirage aléatoire : prob = PROB_BASE / (1 + max(c_A, c_B))
//      — les formes simples fusionnent parfois, les formes complexes rarement
//
// Effet de la fusion :
//   - nouveau complexité = min(MAX_COMPLEXITY, max(c_A, c_B) + 1)
//   - boost d'énergie +ENERGY_BOOST sur les deux cellules
//   - cooldown = nouveau_complexité × COOLDOWN_BASE (plus complexe = repos plus long)
//
// Hiérarchie résultante :
//   complexity 0 : simple (nombreux, éphémères)
//   complexity 1-2 : formes issues d'une fusion, cooldown 30-60 ticks
//   complexity 3-5 : formes stables, rares, cooldown 90-150 ticks
//   complexity 6-7 : pôles de l'écosystème, quasi-immuables, cooldown 180-210 ticks

import { EcoGrid } from './gameOfLifeEngine'
import { CONWAY_CONFIG } from './config'

export interface FusionStats {
  fusionsThisTick: number
  totalFusions:    number
}

export class FusionSystem {
  private _totalFusions = 0
  private _ticksSinceLast = 0

  update(eco: EcoGrid): EcoGrid {
    this._ticksSinceLast++
    if (this._ticksSinceLast < CONWAY_CONFIG.FUSION.PASS_INTERVAL) return eco
    this._ticksSinceLast = 0
    return this._pass(eco)
  }

  reset(): void {
    this._totalFusions    = 0
    this._ticksSinceLast  = 0
  }

  get totalFusions(): number { return this._totalFusions }

  // ── Passe de fusion ────────────────────────────────────────────────────────

  private _pass(eco: EcoGrid): EcoGrid {
    const cfg = CONWAY_CONFIG.FUSION
    const T   = CONWAY_CONFIG.ECO.ALIVE_THRESHOLD
    const { energy, complexity, cooldown, width, height } = eco

    const newEnergy     = new Float32Array(energy)
    const newComplexity = new Uint8Array(complexity)
    const newCooldown   = new Uint8Array(cooldown)

    // fusing[i] = 1 si la cellule i a déjà fusionné ce tick → pas de cascade
    const fusing = new Uint8Array(width * height)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i  = y * width + x
        const c1 = complexity[i]

        // ── Éligibilité cellule A ──────────────────────────────────────────
        if (energy[i]  <= T)              continue
        if (energy[i]  <  cfg.ENERGY_MIN) continue
        if (cooldown[i] > 0)              continue
        if (fusing[i])                    continue

        // Compter les voisins vivants de A (confirmation d'amas)
        const nA = this._countAliveNeighbors(energy, width, height, x, y, T)
        if (nA < cfg.NEIGHBOR_MIN) continue

        // Probabilité de tentative : décroît avec la complexité
        // Les formes simples fusionnent facilement, les formes complexes rarement
        const prob = cfg.PROB_BASE / (1 + c1)
        if (Math.random() >= prob) continue

        // ── Chercher un voisin B compatible ───────────────────────────────
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue

            const nx = (x + dx + width)  % width
            const ny = (y + dy + height) % height
            const j  = ny * width + nx
            const c2 = complexity[j]

            if (energy[j]   <= T)              continue
            if (energy[j]   <  cfg.ENERGY_MIN) continue
            if (cooldown[j]  > 0)              continue
            if (fusing[j])                     continue

            // Compatibilité de complexité
            if (Math.abs(c1 - c2) > cfg.MAX_DIFF) continue

            // Confirmation que B est aussi dans un amas
            const nB = this._countAliveNeighbors(energy, width, height, nx, ny, T)
            if (nB < cfg.NEIGHBOR_MIN) continue

            // ── FUSION ────────────────────────────────────────────────────
            fusing[i] = 1
            fusing[j] = 1

            const newC = Math.min(cfg.MAX_COMPLEXITY, Math.max(c1, c2) + 1) as number
            const cd   = Math.min(255, newC * cfg.COOLDOWN_BASE)

            newComplexity[i] = newC
            newComplexity[j] = newC
            newCooldown[i]   = cd
            newCooldown[j]   = cd
            newEnergy[i]     = Math.min(1, energy[i] + cfg.ENERGY_BOOST)
            newEnergy[j]     = Math.min(1, energy[j] + cfg.ENERGY_BOOST)

            this._totalFusions++
            break
          }
          if (fusing[i]) break
        }
      }
    }

    return { ...eco, energy: newEnergy, complexity: newComplexity, cooldown: newCooldown }
  }

  private _countAliveNeighbors(
    energy: Float32Array,
    width: number, height: number,
    x: number, y: number,
    T: number,
  ): number {
    let n = 0
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = (x + dx + width)  % width
        const ny = (y + dy + height) % height
        if (energy[ny * width + nx] > T) n++
      }
    return n
  }
}
