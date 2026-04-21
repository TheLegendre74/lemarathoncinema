// Conway's Game of Life — moteur de simulation pur
// Fonctions pures, sans effets de bord, sans état global.
// Toutes les mutations retournent un nouveau Grid (pas de mise à jour destructrice en place).

// ─── Types ──────────────────────────────────────────────────────────────────

// 0 = mort, 1 = vivant (extensible : 2+ = états futurs)
export type CellState = number

export interface Grid {
  readonly cells: Uint8Array
  readonly width: number
  readonly height: number
}

// Règles paramétrables — actuellement les règles classiques de Conway B3/S23
export interface ConwayRules {
  readonly survives: ReadonlySet<number>
  readonly births: ReadonlySet<number>
}

export const CLASSIC_RULES: ConwayRules = {
  survives: new Set([2, 3]),
  births: new Set([3]),
}

// HighLife B36/S23 — naissance aussi avec 6 voisins, beaucoup plus dynamique
export const HIGHLIFE_RULES: ConwayRules = {
  survives: new Set([2, 3]),
  births: new Set([3, 6]),
}

// ─── Patterns classiques ─────────────────────────────────────────────────────

export type PatternName = 'block' | 'blinker' | 'glider'

const PATTERNS: Readonly<Record<PatternName, ReadonlyArray<readonly [number, number]>>> = {
  block:   [[0,0],[1,0],[0,1],[1,1]],
  blinker: [[0,0],[1,0],[2,0]],
  glider:  [[1,0],[2,1],[0,2],[1,2],[2,2]],
}

// ─── Méthuselahs — petits seeds qui génèrent beaucoup de chaos ───────────────
// Utilisés par l'anti-stagnation pour relancer la simulation discrètement.

export type MethuselahName = 'rpentomino' | 'acorn' | 'diehard'

const METHUSELAHS: Readonly<Record<MethuselahName, ReadonlyArray<readonly [number, number]>>> = {
  // r-pentomino : 5 cellules → 1103 générations de chaos
  rpentomino: [[1,0],[2,0],[0,1],[1,1],[1,2]],
  // Acorn : 7 cellules → 5206 générations
  acorn: [[1,0],[3,1],[0,2],[1,2],[4,2],[5,2],[6,2]],
  // Diehard : 8 cellules → 130 générations puis disparaît
  diehard: [[6,0],[0,1],[1,1],[1,2],[5,2],[6,2],[7,2]],
}

// ─── Utilitaires internes ────────────────────────────────────────────────────

function cellIndex(grid: Grid, x: number, y: number): number {
  return y * grid.width + x
}

// Bords toroïdaux
function countNeighbors(cells: Uint8Array, width: number, height: number, x: number, y: number): number {
  let n = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = (x + dx + width) % width
      const ny = (y + dy + height) % height
      if (cells[ny * width + nx] > 0) n++
    }
  }
  return n
}

// ─── API de base ─────────────────────────────────────────────────────────────

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

// Avance d'une génération — retourne un nouveau Grid, l'ancien est intact
export function stepGrid(grid: Grid, rules: ConwayRules = CLASSIC_RULES): Grid {
  const { cells, width, height } = grid
  const next = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const alive = cells[i] > 0
      const n = countNeighbors(cells, width, height, x, y)
      if (alive) next[i] = rules.survives.has(n) ? cells[i] : 0
      else       next[i] = rules.births.has(n) ? 1 : 0
    }
  }
  return { cells: next, width, height }
}

export function countAlive(grid: Grid): number {
  let n = 0
  for (let i = 0; i < grid.cells.length; i++) {
    if (grid.cells[i] > 0) n++
  }
  return n
}

// Remplissage aléatoire
export function seedRandom(grid: Grid, density: number): Grid {
  const cells = new Uint8Array(grid.cells.length)
  for (let i = 0; i < cells.length; i++) {
    cells[i] = Math.random() < density ? 1 : 0
  }
  return { ...grid, cells }
}

// Place un pattern connu à la position (ox, oy)
export function placePattern(grid: Grid, pattern: PatternName, ox: number, oy: number): Grid {
  const cells = new Uint8Array(grid.cells)
  for (const [dx, dy] of PATTERNS[pattern]) {
    const x = ox + dx, y = oy + dy
    if (x >= 0 && x < grid.width && y >= 0 && y < grid.height)
      cells[cellIndex(grid, x, y)] = 1
  }
  return { ...grid, cells }
}

// ─── Outils V2 ───────────────────────────────────────────────────────────────

// Applique un pinceau circulaire (peindre ou effacer) centré en (cx, cy)
export function applyBrush(grid: Grid, cx: number, cy: number, radius: number, state: CellState): Grid {
  const cells = new Uint8Array(grid.cells)
  const r2 = radius * radius
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > r2) continue
      const x = cx + dx, y = cy + dy
      if (x >= 0 && x < grid.width && y >= 0 && y < grid.height)
        cells[y * grid.width + x] = state
    }
  }
  return { ...grid, cells }
}

// Injecte de la vie aléatoire dans un carré — pour sparks manuels et anti-stagnation
export function sparkAt(grid: Grid, cx: number, cy: number, radius: number, density: number): Grid {
  const cells = new Uint8Array(grid.cells)
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const x = cx + dx, y = cy + dy
      if (x >= 0 && x < grid.width && y >= 0 && y < grid.height) {
        if (Math.random() < density) cells[y * grid.width + x] = 1
      }
    }
  }
  return { ...grid, cells }
}

// Place un Méthuselah — seed minuscule qui génère beaucoup de chaos
export function placeMethuselah(grid: Grid, name: MethuselahName, ox: number, oy: number): Grid {
  const cells = new Uint8Array(grid.cells)
  for (const [dx, dy] of METHUSELAHS[name]) {
    const x = ox + dx, y = oy + dy
    if (x >= 0 && x < grid.width && y >= 0 && y < grid.height)
      cells[y * grid.width + x] = 1
  }
  return { ...grid, cells }
}

// ─── V3 — Bruit thermique, vaisseaux, pont ──────────────────────────────────

// Flip aléatoire de numFlips cellules — empêche la stabilisation totale
export function noisePass(grid: Grid, numFlips: number): Grid {
  const cells = new Uint8Array(grid.cells)
  const total = cells.length
  for (let i = 0; i < numFlips; i++) {
    const idx = Math.floor(Math.random() * total)
    cells[idx] = cells[idx] > 0 ? 0 : 1
  }
  return { ...grid, cells }
}

// Seed le point médian entre deux cellules vivantes distantes — crée des ponts de fusion
export function bridgePass(grid: Grid, minDist: number, maxDist: number): Grid {
  const { cells, width, height } = grid
  const total = cells.length
  const tries = 25

  for (let t = 0; t < tries; t++) {
    const idx1 = Math.floor(Math.random() * total)
    if (cells[idx1] === 0) continue
    const x1 = idx1 % width
    const y1 = Math.floor(idx1 / width)

    const angle = Math.random() * Math.PI * 2
    const dist = minDist + Math.random() * (maxDist - minDist)
    const x2 = Math.round(x1 + Math.cos(angle) * dist)
    const y2 = Math.round(y1 + Math.sin(angle) * dist)

    if (x2 < 0 || x2 >= width || y2 < 0 || y2 >= height) continue
    if (cells[y2 * width + x2] === 0) continue

    const mx = Math.round((x1 + x2) / 2)
    const my = Math.round((y1 + y2) / 2)
    const newCells = new Uint8Array(cells)
    newCells[my * width + mx] = 1
    return { ...grid, cells: newCells }
  }

  return grid
}

export type ShipDir = 'E' | 'W' | 'SE' | 'SW' | 'NE' | 'NW'

// Gliders (5 cells, 4 ticks/step) et LWSS (9 cells, 4 ticks/step × 2 cols)
const SHIP_PATTERNS: Record<ShipDir, ReadonlyArray<readonly [number, number]>> = {
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

// Compte les cellules vivantes dans une zone (pour trouver les zones calmes)
export function countAliveInZone(grid: Grid, x0: number, y0: number, w: number, h: number): number {
  let n = 0
  const { cells, width, height } = grid
  for (let y = y0; y < Math.min(y0 + h, height); y++) {
    for (let x = x0; x < Math.min(x0 + w, width); x++) {
      if (cells[y * width + x] > 0) n++
    }
  }
  return n
}
