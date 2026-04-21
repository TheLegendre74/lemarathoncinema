// Conway's Game of Life — moteur de simulation pur
// Fonctions pures, sans effets de bord, sans état global.
// Toutes les mutations retournent un nouveau Grid (pas de mise à jour destructrice en place).
//
// Extension future : CellState peut prendre des valeurs > 1 pour des états enrichis
// (ex: âge, type, appartenance à un cluster). Les règles sont paramétrables.

// ─── Types ──────────────────────────────────────────────────────────────────

// 0 = mort, 1 = vivant (extensible : 2+ = états futurs)
export type CellState = number

export interface Grid {
  readonly cells: Uint8Array
  readonly width: number
  readonly height: number
}

// Règles paramétrables — actuellement les règles classiques de Conway B3/S23
// Passer un ConwayRules différent suffit pour expérimenter d'autres automates.
export interface ConwayRules {
  readonly survives: ReadonlySet<number> // nbre voisins pour survivre
  readonly births: ReadonlySet<number>   // nbre voisins pour naître
}

export const CLASSIC_RULES: ConwayRules = {
  survives: new Set([2, 3]),
  births: new Set([3]),
}

// Patterns de test connus
export type PatternName = 'block' | 'blinker' | 'glider'

// ─── Patterns statiques ──────────────────────────────────────────────────────

const PATTERNS: Readonly<Record<PatternName, ReadonlyArray<readonly [number, number]>>> = {
  // Still life — ne change jamais
  block: [[0, 0], [1, 0], [0, 1], [1, 1]],
  // Oscillateur période 2 — alterne horizontal/vertical
  blinker: [[0, 0], [1, 0], [2, 0]],
  // Vaisseau — se déplace en diagonale
  glider: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]],
}

// ─── Fonctions utilitaires internes ─────────────────────────────────────────

function cellIndex(grid: Grid, x: number, y: number): number {
  return y * grid.width + x
}

// Compte les voisins vivants avec bords toroïdaux (la grille se wrappe)
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

// ─── API publique ────────────────────────────────────────────────────────────

export function createGrid(width: number, height: number): Grid {
  return { cells: new Uint8Array(width * height), width, height }
}

export function getCellAt(grid: Grid, x: number, y: number): CellState {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return 0
  return grid.cells[cellIndex(grid, x, y)]
}

// Retourne un nouveau Grid avec la cellule modifiée
export function setCellAt(grid: Grid, x: number, y: number, state: CellState): Grid {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return grid
  const cells = new Uint8Array(grid.cells)
  cells[cellIndex(grid, x, y)] = state
  return { ...grid, cells }
}

// Avance d'une génération selon les règles données
// Retourne un nouveau Grid — l'ancien n'est jamais modifié.
export function stepGrid(grid: Grid, rules: ConwayRules = CLASSIC_RULES): Grid {
  const { cells, width, height } = grid
  const next = new Uint8Array(width * height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const alive = cells[i] > 0
      const neighbors = countNeighbors(cells, width, height, x, y)
      if (alive) {
        next[i] = rules.survives.has(neighbors) ? cells[i] : 0
      } else {
        next[i] = rules.births.has(neighbors) ? 1 : 0
      }
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

// Remplissage aléatoire selon une densité [0, 1]
export function seedRandom(grid: Grid, density: number): Grid {
  const cells = new Uint8Array(grid.cells.length)
  for (let i = 0; i < cells.length; i++) {
    cells[i] = Math.random() < density ? 1 : 0
  }
  return { ...grid, cells }
}

// Place un pattern connu à la position (ox, oy) dans la grille
export function placePattern(grid: Grid, pattern: PatternName, ox: number, oy: number): Grid {
  const cells = new Uint8Array(grid.cells)
  for (const [dx, dy] of PATTERNS[pattern]) {
    const x = ox + dx
    const y = oy + dy
    if (x >= 0 && x < grid.width && y >= 0 && y < grid.height) {
      cells[cellIndex(grid, x, y)] = 1
    }
  }
  return { ...grid, cells }
}
