import type { LifeGodTrainingWeights } from '../types'

/**
 * Poids par defaut — neutres (1.0) pour compatibilite avec le scoring original.
 * Les poids d'entrainement (pop=3, gen=1) etaient trop peu evolues et cassaient
 * le comportement des AMs. A remplacer quand un vrai entrainement sera fait.
 */
export const TRAINED_AM_WEIGHTS: LifeGodTrainingWeights = {
  builder: {
    explore: 1.0,
    seekCells: 1.0,
    gatherCells: 1.0,
    carryToSite: 1.0,
    buildAm: 1.0,
    avoidWall: 1.0,
    avoidCrowd: 1.0,
    seekFrozenMatter: 1.0,
    terraform: 1.0,
    rest: 1.0,
  },
  gatherer: {
    explore: 1.0,
    seekCells: 1.0,
    gatherCells: 1.0,
    carryToSite: 1.0,
    buildAm: 1.0,
    avoidWall: 1.0,
    avoidCrowd: 1.0,
    seekFrozenMatter: 1.0,
    terraform: 1.0,
    rest: 1.0,
  },
  explorer: {
    explore: 1.0,
    seekCells: 1.0,
    gatherCells: 1.0,
    carryToSite: 1.0,
    buildAm: 1.0,
    avoidWall: 1.0,
    avoidCrowd: 1.0,
    seekFrozenMatter: 1.0,
    terraform: 1.0,
    rest: 1.0,
  },
}
