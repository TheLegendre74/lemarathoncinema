import type { LifeGodTrainingWeights } from '../types'

/**
 * Poids optimises par algorithme evolutif.
 * Genere le 2026-05-25
 * Fitness: 36.3
 * Config: pop=3 gen=1 ticks=200 runs=1
 */
export const TRAINED_AM_WEIGHTS: LifeGodTrainingWeights = {
  builder: {
    explore: 0.4646,
    seekCells: 1.7363,
    gatherCells: 1.9373,
    carryToSite: 1.8790,
    buildAm: 1.6535,
    avoidWall: 2.6361,
    avoidCrowd: 2.9397,
    seekFrozenMatter: 1.7375,
    terraform: 2.3058,
    rest: 2.4813,
  },
  gatherer: {
    explore: 2.1462,
    seekCells: 1.8914,
    gatherCells: 1.4297,
    carryToSite: 2.5752,
    buildAm: 1.9243,
    avoidWall: 1.9454,
    avoidCrowd: 1.2959,
    seekFrozenMatter: 0.3153,
    terraform: 0.3814,
    rest: 0.9834,
  },
  explorer: {
    explore: 1.8012,
    seekCells: 1.0745,
    gatherCells: 0.4180,
    carryToSite: 0.6213,
    buildAm: 1.5629,
    avoidWall: 2.6754,
    avoidCrowd: 2.4696,
    seekFrozenMatter: 2.8054,
    terraform: 0.9773,
    rest: 0.5881,
  },
}
