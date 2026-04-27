import type { LifeGodAmPattern, LifeGodBodyParts, LifeGodRelativeCell } from '../types'

function cellsFromAscii(rows: string[]) {
  const cells: LifeGodRelativeCell[] = []
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      if (rows[y][x] !== '.') {
        cells.push({ x, y })
      }
    }
  }
  return cells
}

function part(rows: string[], marker: string) {
  const cells: LifeGodRelativeCell[] = []
  for (let y = 0; y < rows.length; y += 1) {
    for (let x = 0; x < rows[y].length; x += 1) {
      if (rows[y][x] === marker) {
        cells.push({ x, y })
      }
    }
  }
  return cells
}

function patternFromParts(
  id: string,
  name: string,
  rows: string[],
  suggestedRole: LifeGodAmPattern['suggestedRole']
): LifeGodAmPattern {
  const bodyParts: LifeGodBodyParts = {
    head: part(rows, 'T'),
    body: part(rows, 'C'),
    leftArm: part(rows, 'L'),
    rightArm: part(rows, 'R'),
    leftLeg: part(rows, 'X'),
    rightLeg: part(rows, 'Y'),
  }

  return {
    id,
    name,
    width: rows[0].length,
    height: rows.length,
    cells: cellsFromAscii(rows),
    bodyParts,
    suggestedRole,
  }
}

export const LIFE_GOD_AM_PATTERNS: LifeGodAmPattern[] = [
  patternFromParts(
    'biped_simple',
    'Biped Simple',
    [
      '..T..',
      '.LCR.',
      '.LCR.',
      '..C..',
      '.X.Y.',
    ],
    'explorer'
  ),
  patternFromParts(
    'totem_thin',
    'Totem Thin',
    [
      '..T..',
      '..C..',
      '.LCR.',
      '..C..',
      '.X.Y.',
    ],
    'builder'
  ),
  patternFromParts(
    'shaman_arms_up',
    'Shaman Arms Up',
    [
      '.LTR.',
      '..C..',
      '.LCR.',
      '..C..',
      '.X.Y.',
    ],
    'builder'
  ),
  patternFromParts(
    'insectoid_light',
    'Insectoid Light',
    [
      '..T..',
      '.LCR.',
      '..C..',
      '.L.R.',
      'X...Y',
    ],
    'explorer'
  ),
  patternFromParts(
    'alien_triangle',
    'Alien Triangle',
    [
      '..T..',
      '.LCR.',
      '.CCC.',
      '..C..',
      '.X.Y.',
    ],
    'gatherer'
  ),
  patternFromParts(
    'lab_idol',
    'Lab Idol',
    [
      '..T..',
      '.LCR.',
      '.CCC.',
      '.LCR.',
      '.X.Y.',
    ],
    'gatherer'
  ),
]
