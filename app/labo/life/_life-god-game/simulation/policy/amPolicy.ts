import type {
  LifeGodAmBehaviorState,
  LifeGodAmEntity,
  LifeGodAmMission,
  LifeGodAmRole,
  LifeGodRelativeCell,
  LifeGodTerrainType,
} from '../../types'
import { AM_POLICY_OUTPUT_ACTIONS } from './amPolicyModelContract'

export type AmPolicyAction =
  | 'moveNorth'
  | 'moveSouth'
  | 'moveEast'
  | 'moveWest'
  | 'moveNorthEast'
  | 'moveNorthWest'
  | 'moveSouthEast'
  | 'moveSouthWest'
  | 'keepTarget'
  | 'selectNewTarget'
  | 'harvest'
  | 'deposit'
  | 'terraform'
  | 'rest'
  | 'escapeStuckArea'

export interface AmPolicyInput {
  mission: LifeGodAmMission
  behaviorState: LifeGodAmBehaviorState
  role: LifeGodAmRole
  energy: number
  stuckTicks: number
  wallDistances: {
    left: number
    right: number
    top: number
    bottom: number
  }
  distanceToTargetCell: number | null
  distanceToBuildSite: number | null
  distanceToNearestAm: number
  densityAroundAm: number
  stableCellDensity: number
  frozenMatterDensity: number
  terrainInfoLocal: Record<LifeGodTerrainType, number>
  recentReward: number
  hasCarriedCell: boolean
  isNearWall: boolean
  isOvercrowded: boolean
}

export interface AmPolicyOutput {
  providerName: string
  actionScores: Record<AmPolicyAction, number>
  confidence: number
  status?: AmPolicyProviderStatus
  error?: string | null
}

export type AmPolicyProviderStatus = 'disabled' | 'idle' | 'loading' | 'ready' | 'failed' | 'fallback'

export interface AmPolicyProvider {
  readonly name: string
  scoreActions(input: AmPolicyInput): AmPolicyOutput
  getStatus?(): AmPolicyProviderStatus
  getLastError?(): string | null
}

export interface AmPolicyWorldState {
  currentMission: LifeGodAmMission
  getWallDistances(am: LifeGodAmEntity): AmPolicyInput['wallDistances']
  getDistanceToTargetCell(am: LifeGodAmEntity): number | null
  getDistanceToBuildSite(am: LifeGodAmEntity): number | null
  getDistanceToNearestAm(am: LifeGodAmEntity): number
  getDensityAroundAm(am: LifeGodAmEntity): number
  getStableCellDensity(am: LifeGodAmEntity): number
  getFrozenMatterDensity(am: LifeGodAmEntity): number
  getTerrainInfoLocal(am: LifeGodAmEntity): Record<LifeGodTerrainType, number>
  isOvercrowded(am: LifeGodAmEntity): boolean
}

export interface AmMovementScoreCandidate {
  step: LifeGodRelativeCell
  score: number
}

export interface AmPolicyDebugSnapshot {
  providerName: string
  learnedStatus: AmPolicyProviderStatus
  topSuggestedAction: AmPolicyAction
  confidence: number
  lastError: string | null
  lastInputSummary: string
}

export function emptyActionScores(): Record<AmPolicyAction, number> {
  return AM_POLICY_OUTPUT_ACTIONS.reduce((scores, action) => {
    scores[action] = 0
    return scores
  }, {} as Record<AmPolicyAction, number>)
}

export function clampPolicyScore(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(-1, Math.min(1, value))
}

function normalizeDistance(distance: number | null, range: number) {
  if (distance === null || !Number.isFinite(distance)) return 0
  return Math.max(0, 1 - Math.min(distance, range) / range)
}

function getTargetDirection(input: AmPolicyInput): { x: number; y: number } {
  if (input.distanceToTargetCell === null && input.distanceToBuildSite === null) return { x: 0, y: 0 }
  if (input.hasCarriedCell || input.behaviorState === 'carryingCellToSite' || input.behaviorState === 'assemblingAm') {
    return { x: 0, y: 0 }
  }
  return { x: 0, y: 0 }
}

export function buildAmPolicyInput(am: LifeGodAmEntity, worldState: AmPolicyWorldState): AmPolicyInput {
  const wallDistances = worldState.getWallDistances(am)
  const distanceToNearestAm = worldState.getDistanceToNearestAm(am)
  return {
    mission: worldState.currentMission,
    behaviorState: am.behaviorState,
    role: am.role,
    energy: am.energy,
    stuckTicks: Math.max(am.memory.stationaryTicks, am.memory.stuckAreaTicks, am.memory.wallStickTicks),
    wallDistances,
    distanceToTargetCell: worldState.getDistanceToTargetCell(am),
    distanceToBuildSite: worldState.getDistanceToBuildSite(am),
    distanceToNearestAm,
    densityAroundAm: worldState.getDensityAroundAm(am),
    stableCellDensity: worldState.getStableCellDensity(am),
    frozenMatterDensity: worldState.getFrozenMatterDensity(am),
    terrainInfoLocal: worldState.getTerrainInfoLocal(am),
    recentReward: am.memory.lastRewardAmount,
    hasCarriedCell: am.carriedCell !== null,
    isNearWall: Math.min(wallDistances.left, wallDistances.right, wallDistances.top, wallDistances.bottom) <= 4,
    isOvercrowded: worldState.isOvercrowded(am),
  }
}

export class RuleBasedPolicyProvider implements AmPolicyProvider {
  readonly name = 'rule-based'

  scoreActions(input: AmPolicyInput): AmPolicyOutput {
    const scores = emptyActionScores()
    const targetPressure = Math.max(
      normalizeDistance(input.distanceToTargetCell, 32),
      normalizeDistance(input.distanceToBuildSite, 32)
    )
    const wallPressure = input.isNearWall ? 0.85 : 0
    const crowdPressure = input.isOvercrowded ? 0.75 : 0
    const stuckPressure = Math.min(1, input.stuckTicks / 12)

    scores.keepTarget = input.distanceToTargetCell !== null || input.distanceToBuildSite !== null ? 0.45 + targetPressure * 0.35 : 0
    scores.selectNewTarget = input.distanceToTargetCell === null && input.distanceToBuildSite === null ? 0.5 : stuckPressure * 0.35
    scores.escapeStuckArea = Math.max(wallPressure, crowdPressure, stuckPressure)
    scores.rest = input.energy < 18 ? 0.7 : 0

    if (input.behaviorState === 'movingToFixedCell' || input.behaviorState === 'seekingFixedCell') {
      scores.harvest = normalizeDistance(input.distanceToTargetCell, 3)
    }
    if (input.hasCarriedCell || input.behaviorState === 'carryingCellToSite') {
      scores.deposit = normalizeDistance(input.distanceToBuildSite, 5)
    }
    if (input.mission === 'terraforming') {
      scores.terraform = normalizeDistance(input.distanceToTargetCell, 4)
    }

    if (input.isNearWall) {
      scores.moveEast += input.wallDistances.left <= 4 ? 0.9 : 0
      scores.moveWest += input.wallDistances.right <= 4 ? 0.9 : 0
      scores.moveSouth += input.wallDistances.top <= 4 ? 0.9 : 0
      scores.moveNorth += input.wallDistances.bottom <= 4 ? 0.9 : 0
    }

    if (input.isOvercrowded) {
      scores.moveNorth += 0.12
      scores.moveSouth += 0.12
      scores.moveEast += 0.12
      scores.moveWest += 0.12
    }

    if (input.role === 'explorer') {
      scores.moveNorthEast += 0.16
      scores.moveSouthWest += 0.16
    } else if (input.role === 'gatherer') {
      scores.moveEast += input.stableCellDensity * 0.22
      scores.moveWest += input.stableCellDensity * 0.18
    } else {
      scores.moveNorth += input.densityAroundAm * 0.04
      scores.moveSouth += input.densityAroundAm * 0.04
    }

    const targetDirection = getTargetDirection(input)
    if (targetDirection.x > 0) scores.moveEast += 0.2
    if (targetDirection.x < 0) scores.moveWest += 0.2
    if (targetDirection.y > 0) scores.moveSouth += 0.2
    if (targetDirection.y < 0) scores.moveNorth += 0.2

    for (const action of AM_POLICY_OUTPUT_ACTIONS) scores[action] = clampPolicyScore(scores[action])

    return {
      providerName: this.name,
      actionScores: scores,
      confidence: Math.max(0.45, Math.min(0.92, 0.62 + Math.max(wallPressure, crowdPressure, stuckPressure) * 0.24)),
      status: 'ready',
    }
  }
}

export class HybridPolicyProvider implements AmPolicyProvider {
  readonly name = 'hybrid'

  constructor(
    private readonly ruleProvider: AmPolicyProvider,
    private readonly learnedProvider: AmPolicyProvider,
    private readonly learnedWeight = 0.35
  ) {}

  scoreActions(input: AmPolicyInput): AmPolicyOutput {
    const ruleOutput = this.ruleProvider.scoreActions(input)
    const learnedOutput = this.learnedProvider.scoreActions(input)
    const actionScores = emptyActionScores()
    const learnedRatio = Math.max(0, Math.min(1, this.learnedWeight * learnedOutput.confidence))
    const ruleRatio = 1 - learnedRatio

    for (const action of AM_POLICY_OUTPUT_ACTIONS) {
      actionScores[action] = clampPolicyScore(
        ruleOutput.actionScores[action] * ruleRatio + learnedOutput.actionScores[action] * learnedRatio
      )
    }

    return {
      providerName: learnedOutput.status === 'ready' ? this.name : 'fallback',
      actionScores,
      confidence: Math.max(ruleOutput.confidence, learnedOutput.confidence * learnedRatio),
      status: learnedOutput.status === 'ready' ? 'ready' : 'fallback',
      error: learnedOutput.error ?? null,
    }
  }

  getStatus(): AmPolicyProviderStatus {
    return this.learnedProvider.getStatus?.() ?? 'fallback'
  }

  getLastError() {
    return this.learnedProvider.getLastError?.() ?? null
  }
}

export function actionForMovementStep(step: LifeGodRelativeCell): AmPolicyAction | null {
  if (step.x === 0 && step.y < 0) return 'moveNorth'
  if (step.x === 0 && step.y > 0) return 'moveSouth'
  if (step.x > 0 && step.y === 0) return 'moveEast'
  if (step.x < 0 && step.y === 0) return 'moveWest'
  if (step.x > 0 && step.y < 0) return 'moveNorthEast'
  if (step.x < 0 && step.y < 0) return 'moveNorthWest'
  if (step.x > 0 && step.y > 0) return 'moveSouthEast'
  if (step.x < 0 && step.y > 0) return 'moveSouthWest'
  return null
}

export function applyPolicyToMovementScoring<T extends AmMovementScoreCandidate>(
  _am: LifeGodAmEntity,
  policyOutput: AmPolicyOutput,
  baseScores: T[],
  weight = 6
): T[] {
  return baseScores.map((candidate) => {
    const action = actionForMovementStep(candidate.step)
    if (!action) return candidate
    return {
      ...candidate,
      score: candidate.score + policyOutput.actionScores[action] * policyOutput.confidence * weight,
    }
  })
}

export function createAmPolicyDebugSnapshot(
  input: AmPolicyInput,
  output: AmPolicyOutput
): AmPolicyDebugSnapshot {
  const topSuggestedAction = AM_POLICY_OUTPUT_ACTIONS.reduce((best, action) =>
    output.actionScores[action] > output.actionScores[best] ? action : best
  , AM_POLICY_OUTPUT_ACTIONS[0])

  return {
    providerName: output.providerName,
    learnedStatus: output.status ?? 'disabled',
    topSuggestedAction,
    confidence: output.confidence,
    lastError: output.error ?? null,
    lastInputSummary: [
      `mission=${input.mission}`,
      `state=${input.behaviorState}`,
      `role=${input.role}`,
      `energy=${Math.round(input.energy)}`,
      `stuck=${input.stuckTicks}`,
      `wall=${input.isNearWall ? 'yes' : 'no'}`,
      `crowd=${input.isOvercrowded ? 'yes' : 'no'}`,
      `target=${input.distanceToTargetCell ?? 'none'}`,
      `build=${input.distanceToBuildSite ?? 'none'}`,
    ].join(' | '),
  }
}
