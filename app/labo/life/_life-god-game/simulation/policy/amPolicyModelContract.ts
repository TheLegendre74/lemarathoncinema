import type { AmPolicyAction } from './amPolicy'

export const AM_POLICY_MODEL_PATH = '/models/life-god-game/am-policy.onnx'
export const POLICY_INFERENCE_INTERVAL_TICKS = 6

export const POLICY_MISSION_FEATURES = [
  'mission:expandingPopulation',
  'mission:terraforming',
  'mission:requestingPlayerPatterns',
  'mission:applyingPlayerPatterns',
  'mission:stable',
] as const

export const POLICY_BEHAVIOR_FEATURES = [
  'behavior:idle',
  'behavior:wandering',
  'behavior:selectingBuildSite',
  'behavior:seekingFixedCell',
  'behavior:movingToFixedCell',
  'behavior:harvestingCell',
  'behavior:carryingCellToSite',
  'behavior:depositingCell',
  'behavior:assemblingAm',
  'behavior:seekingFrozenMatter',
  'behavior:shapingSoil',
  'behavior:shapingVegetation',
  'behavior:shapingWater',
  'behavior:shapingRock',
  'behavior:escapingStuckArea',
  'behavior:requestingPattern',
  'behavior:resting',
] as const

export const POLICY_ROLE_FEATURES = [
  'role:builder',
  'role:gatherer',
  'role:explorer',
] as const

export const POLICY_NUMERIC_FEATURES = [
  'energy:normalized_0_100',
  'stuckTicks:normalized_0_30',
  'wallDistance:left_normalized_0_40',
  'wallDistance:right_normalized_0_40',
  'wallDistance:top_normalized_0_40',
  'wallDistance:bottom_normalized_0_40',
  'distanceToTargetCell:normalized_0_80_or_1',
  'distanceToBuildSite:normalized_0_80_or_1',
  'distanceToNearestAm:normalized_0_40',
  'densityAroundAm:normalized_0_80',
  'stableCellDensity:local_ratio',
  'frozenMatterDensity:local_ratio',
  'terrain:none_density',
  'terrain:soil_density',
  'terrain:vegetation_density',
  'terrain:water_density',
  'terrain:rock_density',
  'recentReward:normalized_-10_10',
  'hasCarriedCell:boolean',
  'isNearWall:boolean',
  'isOvercrowded:boolean',
] as const

export const AM_POLICY_INPUT_FEATURES = [
  ...POLICY_MISSION_FEATURES,
  ...POLICY_BEHAVIOR_FEATURES,
  ...POLICY_ROLE_FEATURES,
  ...POLICY_NUMERIC_FEATURES,
] as const

export const AM_POLICY_OUTPUT_ACTIONS: AmPolicyAction[] = [
  'moveNorth',
  'moveSouth',
  'moveEast',
  'moveWest',
  'moveNorthEast',
  'moveNorthWest',
  'moveSouthEast',
  'moveSouthWest',
  'keepTarget',
  'selectNewTarget',
  'harvest',
  'deposit',
  'terraform',
  'rest',
  'escapeStuckArea',
]

export const AM_POLICY_INPUT_SIZE = AM_POLICY_INPUT_FEATURES.length
export const AM_POLICY_OUTPUT_SIZE = AM_POLICY_OUTPUT_ACTIONS.length
