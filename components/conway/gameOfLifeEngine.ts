// Conway V4 — moteur de simulation
// Fonctions pures. Deux modèles coexistent :
//   - Grid (Uint8Array, binaire) : conservé pour compatibilité
//   - EcoGrid (énergie + complexité + cooldown) : moteur principal

// ─── Grid binaire (conservé) ─────────────────────────────────────────────────

export type CellState = number

export interface Grid {
  readonly cells: Uint8Array
  readonly width: number
  readonly height: number
}

export interface ConwayRules {
  readonly survives: ReadonlySet<number>
  readonly births:   ReadonlySet<number>
}

export const CLASSIC_RULES: ConwayRules = {
  survives: new Set([2, 3]),
  births:   new Set([3]),
}

export const HIGHLIFE_RULES: ConwayRules = {
  survives: new Set([2, 3]),
  births:   new Set([3, 6]),
}

export type PatternName = 'block' | 'blinker' | 'glider'

const PATTERNS: Readonly<Record<PatternName, ReadonlyArray<readonly [number, number]>>> = {
  block:   [[0,0],[1,0],[0,1],[1,1]],
  blinker: [[0,0],[1,0],[2,0]],
  glider:  [[1,0],[2,1],[0,2],[1,2],[2,2]],
}

export type MethuselahName = 'rpentomino' | 'acorn' | 'diehard'

const METHUSELAHS: Readonly<Record<MethuselahName, ReadonlyArray<readonly [number, number]>>> = {
  rpentomino: [[1,0],[2,0],[0,1],[1,1],[1,2]],
  acorn:      [[1,0],[3,1],[0,2],[1,2],[4,2],[5,2],[6,2]],
  diehard:    [[6,0],[0,1],[1,1],[1,2],[5,2],[6,2],[7,2]],
}

function cellIndex(grid: Grid, x: number, y: number): number {
  return y * grid.width + x
}

function countNeighbors(cells: Uint8Array, width: number, height: number, x: number, y: number): number {
  let n = 0
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = (x + dx + width) % width
      const ny = (y + dy + height) % height
      if (cells[ny * width + nx] > 0) n++
    }
  return n
}

export function createGrid(width: number, height: number): Grid {
  return { cells: new Uint8Array(width * height), width, height }
}

export function getCellAt(grid: Grid, x: number, y: number): CellState {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return 0
  return grid.cells[cellIndex(grid, x, y)]
}

export function setCellAt(grid: Grid, x: number, y: number, state: CellState): Grid {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return grid
  const cells = new Uint8Array(grid.cells)
  cells[cellIndex(grid, x, y)] = state
  return { ...grid, cells }
}

export function stepGrid(grid: Grid, rules: ConwayRules = CLASSIC_RULES): Grid {
  const { cells, width, height } = grid
  const next = new Uint8Array(width * height)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const n = countNeighbors(cells, width, height, x, y)
      if (cells[i] > 0) next[i] = rules.survives.has(n) ? cells[i] : 0
      else              next[i] = rules.births.has(n) ? 1 : 0
    }
  return { cells: next, width, height }
}

export function countAlive(grid: Grid): number {
  let n = 0
  for (let i = 0; i < grid.cells.length; i++) if (grid.cells[i] > 0) n++
  return n
}

export function seedRandom(grid: Grid, density: number): Grid {
  const cells = new Uint8Array(grid.cells.length)
  for (let i = 0; i < cells.length; i++) cells[i] = Math.random() < density ? 1 : 0
  return { ...grid, cells }
}

export function placePattern(grid: Grid, pattern: PatternName, ox: number, oy: number): Grid {
  const cells = new Uint8Array(grid.cells)
  for (const [dx, dy] of PATTERNS[pattern]) {
    const x = ox + dx, y = oy + dy
    if (x >= 0 && x < grid.width && y >= 0 && y < grid.height)
      cells[cellIndex(grid, x, y)] = 1
  }
  return { ...grid, cells }
}

export function applyBrush(grid: Grid, cx: number, cy: number, radius: number, state: CellState): Grid {
  const cells = new Uint8Array(grid.cells)
  const r2 = radius * radius
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > r2) continue
      const x = cx + dx, y = cy + dy
      if (x >= 0 && x < grid.width && y >= 0 && y < grid.height)
        cells[y * grid.width + x] = state
    }
  return { ...grid, cells }
}

export function sparkAt(grid: Grid, cx: number, cy: number, radius: number, density: number): Grid {
  const cells = new Uint8Array(grid.cells)
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx, y = cy + dy
      if (x >= 0 && x < grid.width && y >= 0 && y < grid.height)
        if (Math.random() < density) cells[y * grid.width + x] = 1
    }
  return { ...grid, cells }
}

export function placeMethuselah(grid: Grid, name: MethuselahName, ox: number, oy: number): Grid {
  const cells = new Uint8Array(grid.cells)
  for (const [dx, dy] of METHUSELAHS[name]) {
    const x = ox + dx, y = oy + dy
    if (x >= 0 && x < grid.width && y >= 0 && y < grid.height)
      cells[y * grid.width + x] = 1
  }
  return { ...grid, cells }
}

export function countAliveInZone(grid: Grid, x0: number, y0: number, w: number, h: number): number {
  let n = 0
  const { cells, width, height } = grid
  for (let y = y0; y < Math.min(y0 + h, height); y++)
    for (let x = x0; x < Math.min(x0 + w, width); x++)
      if (cells[y * width + x] > 0) n++
  return n
}

export type ShipDir = 'E' | 'W' | 'SE' | 'SW' | 'NE' | 'NW'

export const SHIP_PATTERNS: Record<ShipDir, ReadonlyArray<readonly [number, number]>> = {
  SE: [[1,0],[2,1],[0,2],[1,2],[2,2]],
  SW: [[1,0],[0,1],[2,2],[0,2],[1,2]],
  NE: [[2,0],[0,0],[1,0],[2,1],[1,2]],
  NW: [[0,0],[1,0],[2,0],[0,1],[1,2]],
  E:  [[1,0],[4,0],[0,1],[0,2],[4,2],[0,3],[1,3],[2,3],[3,3]],
  W:  [[0,0],[3,0],[4,1],[4,2],[0,2],[1,3],[2,3],[3,3],[4,3]],
}

export function spawnShip(grid: Grid, dir: ShipDir, ox: number, oy: number): Grid {
  const cells = new Uint8Array(grid.cells)
  const { width, height } = grid
  for (const [dx, dy] of SHIP_PATTERNS[dir]) {
    const x = ox + dx, y = oy + dy
    if (x >= 0 && x < width && y >= 0 && y < height)
      cells[y * width + x] = 1
  }
  return { ...grid, cells }
}

// ─── EcoGrid — moteur énergétique + complexité ────────────────────────────────
//
//  energy     : Float32[0..1]  — vivant si > ALIVE_THRESHOLD
//  complexity : Uint8[0..7]    — niveau de complexité issu de fusions
//  cooldown   : Uint8[0..255]  — ticks restants avant prochaine fusion éligible
//
//  Hiérarchie naturelle :
//    complexity 0 = cellule simple    → résilience nominale
//    complexity 1-3 = forme fusionnée → résilience 2-3× supérieure
//    complexity 4-7 = forme ancrée    → résilience 4-5× supérieure, quasi-permanente
//
//  La complexité est réinitialisée quand la cellule meurt (energy ≤ T).

export interface EcoGrid {
  readonly energy:     Float32Array
  readonly complexity: Uint8Array   // 0 = simple, 1-7 = complexe
  readonly cooldown:   Uint8Array   // 0 = éligible à la fusion
  readonly width:      number
  readonly height:     number
}

export interface EcoConfig {
  readonly ALIVE_THRESHOLD:      number
  readonly BIRTH_GAIN:           number
  readonly SURVIVE_GAIN:         number
  readonly ISOLATION_COST:       number
  readonly OVERPOP_COST:         number
  readonly METABOLISM:           number
  readonly ENERGY_DECAY:         number
  readonly RESILIENCE_PER_LEVEL: number  // bonus de résilience par niveau de complexité
}

// Formes utilisées pour le seed structuré
const SEED_FORMS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[1,0],[2,1],[0,2],[1,2],[2,2]],          // glider
  [[0,1],[1,1],[2,1]],                       // blinker H
  [[1,0],[1,1],[1,2]],                       // blinker V
  [[0,0],[1,0],[0,1],[1,1]],                 // block
  [[0,0],[1,0],[0,1],[3,2],[2,3],[3,3]],     // beacon
  [[1,0],[2,0],[0,1],[1,1],[1,2]],           // r-pentomino
  [[0,0],[1,0],[2,0],[0,1]],                 // L
  [[0,0],[1,0],[1,1],[2,1]],                 // S
]

export function createEcoGrid(width: number, height: number): EcoGrid {
  return {
    energy:     new Float32Array(width * height),
    complexity: new Uint8Array(width * height),
    cooldown:   new Uint8Array(width * height),
    width, height,
  }
}

// Seed structuré : fond sparse + îlots de formes reconnaissables
export function seedIslands(
  width: number, height: number,
  factor: number, minDist: number, baseDensity: number,
): EcoGrid {
  const total      = width * height
  const energy     = new Float32Array(total)
  const complexity = new Uint8Array(total)
  const cooldown   = new Uint8Array(total)

  // Fond sparse
  for (let i = 0; i < total; i++)
    if (Math.random() < baseDensity)
      energy[i] = 0.50 + Math.random() * 0.18

  // Îlots structurés
  const nIslands = Math.max(4, Math.round((total / 250) * factor))
  const placed: Array<{x: number, y: number}> = []

  for (let att = 0; att < nIslands * 20 && placed.length < nIslands; att++) {
    const cx = 5 + Math.floor(Math.random() * (width  - 12))
    const cy = 5 + Math.floor(Math.random() * (height - 12))
    if (placed.some(p => Math.hypot(p.x - cx, p.y - cy) < minDist)) continue
    placed.push({ x: cx, y: cy })
    const form = SEED_FORMS[Math.floor(Math.random() * SEED_FORMS.length)]
    for (const [dx, dy] of form) {
      const x = cx + dx, y = cy + dy
      if (x >= 0 && x < width && y >= 0 && y < height)
        energy[y * width + x] = 0.58 + Math.random() * 0.17
    }
  }

  return { energy, complexity, cooldown, width, height }
}

// Un tick du moteur énergétique avec résilience par complexité
export function stepEco(eco: EcoGrid, cfg: EcoConfig): EcoGrid {
  const { energy, complexity, cooldown, width, height } = eco
  const nextEnergy     = new Float32Array(energy.length)
  const nextComplexity = new Uint8Array(complexity)  // copie — modifiée si mort
  const nextCooldown   = new Uint8Array(cooldown)    // copie — décrémentée chaque tick
  const T = cfg.ALIVE_THRESHOLD
  const RPL = cfg.RESILIENCE_PER_LEVEL

  // Décrémenter les cooldowns de fusion
  for (let i = 0; i < nextCooldown.length; i++)
    if (nextCooldown[i] > 0) nextCooldown[i]--

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const e = energy[i]
      const c = complexity[i]
      const alive = e > T

      // Facteur de résilience : [0..1] selon complexité
      const r = Math.min(1.0, c * RPL)

      // Compter voisins vivants (toroïdal)
      let n = 0
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = (x + dx + width) % width
          const ny = (y + dy + height) % height
          if (energy[ny * width + nx] > T) n++
        }

      if (alive) {
        // Résilience : gains amplifiés, coûts réduits
        const sg = cfg.SURVIVE_GAIN    * (1 + r)
        const ic = cfg.ISOLATION_COST  * (1 - r * 0.80)
        const oc = cfg.OVERPOP_COST    * (1 - r * 0.55)
        const mt = cfg.METABOLISM      * (1 - r * 0.70)

        if (n === 2 || n === 3) {
          nextEnergy[i] = Math.min(1, e + sg - mt)
        } else if (n <= 1) {
          nextEnergy[i] = Math.max(0, e - ic - mt)
        } else {
          nextEnergy[i] = Math.max(0, e - oc - mt)
        }
      } else {
        if (n === 3) {
          // Naissance — énergie fixée juste au-dessus du seuil, complexité 0
          nextEnergy[i]     = T + cfg.BIRTH_GAIN
          nextComplexity[i] = 0
        } else {
          // Décroissance post-mort — trail naturel
          nextEnergy[i] = Math.max(0, e - cfg.ENERGY_DECAY)
        }
      }

      // Cellule qui vient de mourir : réinitialiser complexité
      if (nextEnergy[i] <= T && c > 0) {
        nextComplexity[i] = 0
        nextCooldown[i]   = 0
      }
    }
  }

  return { energy: nextEnergy, complexity: nextComplexity, cooldown: nextCooldown, width, height }
}

export function countAliveEco(eco: EcoGrid, threshold: number): number {
  let n = 0
  for (let i = 0; i < eco.energy.length; i++)
    if (eco.energy[i] > threshold) n++
  return n
}

export function energyInZone(eco: EcoGrid, x0: number, y0: number, w: number, h: number): number {
  let sum = 0
  const { energy, width, height } = eco
  for (let y = y0; y < Math.min(y0 + h, height); y++)
    for (let x = x0; x < Math.min(x0 + w, width); x++)
      sum += energy[y * width + x]
  return sum
}

// Place un pattern sur EcoGrid (n'affecte que l'énergie, complexité conservée)
export function placePatternEco(
  eco: EcoGrid,
  cells: ReadonlyArray<readonly [number, number]>,
  ox: number, oy: number,
  startEnergy = 0.65,
): EcoGrid {
  const energy = new Float32Array(eco.energy)
  const { width, height } = eco
  for (const [dx, dy] of cells) {
    const x = ox + dx, y = oy + dy
    if (x >= 0 && x < width && y >= 0 && y < height)
      energy[y * width + x] = startEnergy
  }
  return { ...eco, energy }
}

// Pinceau : dessiner (énergie haute) ou effacer (énergie 0 + reset complexité)
export function applyBrushEco(eco: EcoGrid, cx: number, cy: number, radius: number, add: boolean): EcoGrid {
  const energy     = new Float32Array(eco.energy)
  const complexity = add ? eco.complexity : new Uint8Array(eco.complexity)
  const cooldown   = add ? eco.cooldown   : new Uint8Array(eco.cooldown)
  const r2 = radius * radius
  const { width, height } = eco
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > r2) continue
      const x = cx + dx, y = cy + dy
      if (x < 0 || x >= width || y < 0 || y >= height) continue
      const i = y * width + x
      if (add) {
        energy[i] = 0.75
      } else {
        energy[i]     = 0
        complexity[i] = 0
        cooldown[i]   = 0
      }
    }
  return { ...eco, energy, complexity, cooldown }
}

export function sparkAtEco(eco: EcoGrid, cx: number, cy: number, radius: number, density: number): EcoGrid {
  const energy = new Float32Array(eco.energy)
  const { width, height } = eco
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx, y = cy + dy
      if (x >= 0 && x < width && y >= 0 && y < height)
        if (Math.random() < density)
          energy[y * width + x] = 0.55 + Math.random() * 0.20
    }
  return { ...eco, energy }
}

export function spawnShipEco(eco: EcoGrid, dir: ShipDir, ox: number, oy: number): EcoGrid {
  return placePatternEco(eco, SHIP_PATTERNS[dir], ox, oy, 0.70)
}

export function resizeEcoGrid(eco: EcoGrid, newCols: number, newRows: number): EcoGrid {
  const newEnergy     = new Float32Array(newCols * newRows)
  const newComplexity = new Uint8Array(newCols * newRows)
  const newCooldown   = new Uint8Array(newCols * newRows)
  const copyW = Math.min(eco.width, newCols)
  const copyH = Math.min(eco.height, newRows)
  for (let y = 0; y < copyH; y++)
    for (let x = 0; x < copyW; x++) {
      const src = y * eco.width + x
      const dst = y * newCols   + x
      newEnergy[dst]     = eco.energy[src]
      newComplexity[dst] = eco.complexity[src]
      newCooldown[dst]   = eco.cooldown[src]
    }
  return { energy: newEnergy, complexity: newComplexity, cooldown: newCooldown, width: newCols, height: newRows }
}
