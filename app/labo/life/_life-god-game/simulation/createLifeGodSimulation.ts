import { LIFE_GOD_AM_PATTERNS } from './amPatterns'
import {
  RuleBasedPolicyProvider,
  HybridPolicyProvider,
  applyPolicyToMovementScoring,
  buildAmPolicyInput,
  createAmPolicyDebugSnapshot,
  type AmPolicyProvider,
  type AmPolicyWorldState,
} from './policy/amPolicy'
import { LearnedPolicyProvider } from './policy/learnedPolicyProvider'
import { AM_POLICY_MODEL_PATH } from './policy/amPolicyModelContract'
import { TRAINED_AM_WEIGHTS } from './trained-weights'
import type {
  LifeGodAmEntity,
  LifeGodAmBehaviorState,
  LifeGodAmMission,
  LifeGodAmMessage,
  LifeGodAmMessageType,
  LifeGodAmLineage,
  LifeGodAmPattern,
  LifeGodCeremonyPhase,
  LifeGodInfluenceMode,
  LifeGodAmRole,
  LifeGodConstructionSite,
  LifeGodPatternRequest,
  LifeGodPlayerPattern,
  LifeGodPlayerPatternType,
  LifeGodProtoEntity,
  LifeGodRelativeCell,
  LifeGodSimulationController,
  LifeGodSimulationState,
  LifeGodSpeechBubble,
  LifeGodTerrainType,
  LifeGodTimeScale,
  LifeGodTrainingConfig,
  LifeGodWorldAsset,
} from '../types'

const GRID_WIDTH = 320
const GRID_HEIGHT = 200
const TICK_MS = 90
const RANDOM_FILL_CHANCE = 0.18
const PROTO_SCAN_INTERVAL = 6
const MAX_LINEAGES = 3
const MIN_COMPLETE_AM_BEFORE_TERRAFORMING = 10
const MAX_TOTAL_AMS = 15
const MAX_AMS_PER_LINEAGE = 5
const MAX_COMPLETE_AM_BEFORE_SCAN_STOPS = 10  // gel Conway à 10 AM vivantes
const PROTO_CONSCIOUSNESS_MIN = 10
const PROTO_METAMORPHOSIS_MIN = 15
const CONSTRUCTION_STEP_INTERVAL = 3
const PROTO_GATHER_INTERVAL = 2
const SEARCH_RADIUS = 12
const MIN_FORMATION_CYCLES = Math.round((10 * 1000) / TICK_MS)  // ~10 secondes
const MAX_FORMATION_CYCLES = Math.round((20 * 1000) / TICK_MS)  // ~20 secondes
const MIN_BUILD_PILE_CELLS = 10
const MAX_BUILD_PILE_CELLS = 15
const CELL_ATTRACTION_RADIUS = 80  // portée de l'attraction vers les cellules libres
const TERRAFORM_SEARCH_RADIUS = 70
const TERRAFORM_COOLDOWN = 4
const TERRAFORM_CELLS_PER_ACTION = 3
const STABILITY_THRESHOLD = 8   // ticks consécutifs pour qu'une cellule soit considérée fixe (~0.7s)
const MAX_ACTIVE_PATTERNS_PER_SEED = 3
const CONSTRUCTION_SITE_SPACING = 34
const STUCK_TICK_LIMIT = 18
const MIN_AM_SEPARATION_CELLS = 10
const WALL_ESCAPE_MARGIN = 12
const BUILD_SITE_WORK_RADIUS_MIN = 8
const BUILD_SITE_WORK_RADIUS_MAX = 14
const WALL_DANGER_MARGIN = 4
const WALL_HUGGING_TICK_LIMIT = 4
const OVERCROWD_RADIUS = 16
const OVERCROWD_CLOSE_RADIUS = MIN_AM_SEPARATION_CELLS
const OVERCROWD_TICK_LIMIT = 3
const COMMUNICATION_RADIUS = 56
const MESSAGE_TTL_TICKS = 90
const MAX_AM_MESSAGES = 90
const MAX_MEMORY_POSITIONS = 18
const MAX_MEMORY_HINTS = 8
const MAX_RECENT_BRAIN_REWARD_EVENTS = 12
const AM_LEARNING_INTERVAL_TICKS = 12
const MIN_BRAIN_WEIGHT = 0.2
const MAX_BRAIN_WEIGHT = 3
const TERRAFORM_STUCK_TICK_LIMIT = 200
const TERRAFORM_CRITICAL_STUCK_TICKS = 34
const TERRAFORM_RESERVATION_RADIUS = 10
const TERRAFORM_RESERVATION_TTL = 80
const TERRAFORM_COMPLETION_THRESHOLD = 0.72
const TERRAFORM_VISIBLE_PROGRESS_STEP = 18
const TERRAFORM_PATCH_RADIUS = 3
const LOCAL_STUCK_SECONDS = 8
const IMMOBILE_ALIVE_TIMEOUT_SECONDS = 6
const LOCAL_STUCK_RADIUS = 8
const REPEATED_PATH_SECONDS = 10
const ESCAPE_MIN_DISTANCE = 14
const ESCAPE_MAX_DISTANCE = 24
const ESCAPE_TICKS = Math.round((5 * 1000) / TICK_MS)
const PLAYER_PATTERN_LIBRARY_LIMITS: Record<LifeGodPlayerPatternType, number> = {
  house: 2,
  tree: 3,
  animal: 3,
  tool: 2,
  rock: 2,
  river: 1,
}
const PLAYER_PATTERN_LABELS: Record<LifeGodPlayerPatternType, string> = {
  house: 'Maison',
  tree: 'Arbre',
  animal: 'Animal',
  tool: 'Outil',
  rock: 'Rocher',
  river: 'Riviere',
}
const PLAYER_PATTERN_COLOR_HINTS: Record<LifeGodPlayerPatternType, string> = {
  house: '#c9a86c',
  tree: '#48b86b',
  animal: '#8a5d3b',
  tool: '#7a8fb0',
  rock: '#9aa1aa',
  river: '#3d8ed8',
}
const CEREMONY_CHATTERING_DURATION = Math.round((12 * 1000) / TICK_MS)
const CEREMONY_CIRCLE_TIMEOUT = Math.round((15 * 1000) / TICK_MS)
const CEREMONY_PRAYER_DURATION = Math.round((6 * 1000) / TICK_MS)
const CEREMONY_CIRCLE_RADIUS = 18
const CEREMONY_CIRCLE_ARRIVAL_TOLERANCE = 3
const CEREMONY_BUBBLE_DURATION = Math.round((2.5 * 1000) / TICK_MS)
const CEREMONY_BUBBLE_INTERVAL = Math.round((1.8 * 1000) / TICK_MS)
const CEREMONY_BUBBLE_MAX_ACTIVE = 3
const CEREMONY_CHATTER_PHRASES = [
  'Hmm...', 'Oui!', 'Encore?', 'Regarde!', 'Ici!', 'Venez!',
  'On a besoin...', 'Il manque...', 'Ensemble!', 'Vite!',
  'Par la!', 'Du nouveau!', 'Construisons!', 'Aide-moi!',
  'Ecoutez!', 'Je sens...', 'Incroyable!', 'Attendez!',
]
const CEREMONY_PRAYER_PHRASES: Record<LifeGodPlayerPatternType, string[]> = {
  house: ['Maison!', 'Un abri!', 'Un foyer!', 'Construisez!'],
  tree: ['Arbre!', 'Verdure!', 'Des branches!', 'Bois!'],
  animal: ['Animal!', 'Creature!', 'Un ami!', 'Vie!'],
  tool: ['Outil!', 'Pour creer!', 'Forgez!', 'Fabriquez!'],
  rock: ['Rocher!', 'Pierre!', 'Solidite!', 'Fondation!'],
  river: ['Riviere!', 'De l\'eau!', 'Courant!', 'Source!'],
}
const TIME_SCALES: LifeGodTimeScale[] = [0.25, 0.5, 1, 2, 4, 8]
const LINEAGE_COLORS = ['#69f0c1', '#ff8ad8', '#7ab6ff']
const useLearnedAmPolicy = false
const learnedPolicyModelPath = AM_POLICY_MODEL_PATH
const AM_POLICY_MOVEMENT_WEIGHT = 6
const BUILD_PILE_OFFSETS: LifeGodRelativeCell[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 2, y: 0 },
  { x: 0, y: 2 },
  { x: 2, y: 1 },
  { x: 1, y: 2 },
  { x: -2, y: 0 },
  { x: 0, y: -2 },
]
const TERRAIN_NEIGHBOR_OFFSETS: LifeGodRelativeCell[] = [
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 1 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
]
const ROLE_CONFIG: Record<
  LifeGodAmRole,
  {
    energyGain: number
    reproductionEnergyMin: number
    reproductionEnergyCost: number
    reproductionCooldown: number
    searchRadius: number
    reproductionDistanceMin: number
    movementInterval: number
    movementReach: number
  }
> = {
  builder: {
    energyGain: 0.16,
    reproductionEnergyMin: 52,
    reproductionEnergyCost: 22,
    reproductionCooldown: 60,
    searchRadius: 38,
    reproductionDistanceMin: 14,
    movementInterval: 1,
    movementReach: 1,
  },
  gatherer: {
    energyGain: 0.28,
    reproductionEnergyMin: 40,
    reproductionEnergyCost: 16,
    reproductionCooldown: 40,
    searchRadius: 46,
    reproductionDistanceMin: 16,
    movementInterval: 1,
    movementReach: 1,
  },
  explorer: {
    energyGain: 0.2,
    reproductionEnergyMin: 38,
    reproductionEnergyCost: 18,
    reproductionCooldown: 35,
    searchRadius: 54,
    reproductionDistanceMin: 18,
    movementInterval: 1,
    movementReach: 1,
  },
}

interface FirstAmCandidate {
  cells: LifeGodRelativeCell[]
  revealAtCycle: number
}

interface TerraformReservation {
  amId: string
  position: LifeGodRelativeCell
  createdAtCycle: number
}

export function createLifeGodSimulation(trainingConfig?: LifeGodTrainingConfig): LifeGodSimulationController {
  const isHeadless = trainingConfig?.headless === true
  let current = createGrid()
  let next = createGrid()
  let generation = 0
  let aliveCount = 0
  let timeScale: LifeGodTimeScale = 1
  let phase: LifeGodSimulationState['phase'] = 'conwayEmergence'
  let conwayActive = true
  let matterFrozen = false
  let firstAmRevealed = false
  let amLineages: LifeGodAmLineage[] = []
  let activePatternIds: string[] = []
  let protoEntities: LifeGodProtoEntity[] = []
  let amEntities: LifeGodAmEntity[] = []
  let constructionSites: LifeGodConstructionSite[] = []
  let amMessages: LifeGodAmMessage[] = []
  let terraformReservations: TerraformReservation[] = []
  let currentMission: LifeGodAmMission = 'expandingPopulation'
  let patternRequestQueue: LifeGodPatternRequest[] = createPatternRequestQueue()
  let currentPatternRequest: LifeGodPatternRequest | null = null
  let completedPatternRequests: string[] = []
  let currentPatternSpokespersonAmId: string | null = null
  let treePatternLibrary: LifeGodPlayerPattern[] = []
  let animalPatternLibrary: LifeGodPlayerPattern[] = []
  let rockPatternLibrary: LifeGodPlayerPattern[] = []
  let riverPatternLibrary: LifeGodPlayerPattern[] = []
  let housePatternLibrary: LifeGodPlayerPattern[] = []
  let toolPatternLibrary: LifeGodPlayerPattern[] = []
  let ceremonyPhase: LifeGodCeremonyPhase = 'none'
  let ceremonyCenterPoint: LifeGodRelativeCell | null = null
  let ceremonyStartTick = 0
  let ceremonyPhaseStartTick = 0
  let ceremonyRequestType: LifeGodPlayerPatternType | null = null
  let ceremonyCirclePositions: Map<string, LifeGodRelativeCell> = new Map()
  let speechBubbles: LifeGodSpeechBubble[] = []
  let lastBubbleTick = 0
  let worldAssets: LifeGodWorldAsset[] = []
  let firstAmCandidate: FirstAmCandidate | null = null
  let selectedAmId: string | null = null
  let influencePoint: { x: number; y: number; mode: LifeGodInfluenceMode } | null = null
  let status: LifeGodSimulationState['status'] = 'paused'
  let intervalId: ReturnType<typeof setInterval> | null = null
  let stepAccumulator = 0
  let terrainGrid = createGrid()
  let movedMatterSourceGrid = createGrid()
  let frozenMatterGrid: Uint8Array | null = null
  let stabilityGrid = createGrid()  // nombre de ticks consécutifs où chaque cellule est restée vivante
  let prevGrid = createGrid()       // snapshot de la grille au tick précédent (pour calculer la stabilité)
  const ruleBasedAmPolicyProvider = new RuleBasedPolicyProvider()
  const learnedAmPolicyProvider = new LearnedPolicyProvider(learnedPolicyModelPath)
  if (useLearnedAmPolicy) void learnedAmPolicyProvider.load()
  const amPolicyProvider: AmPolicyProvider = useLearnedAmPolicy
    ? new HybridPolicyProvider(ruleBasedAmPolicyProvider, learnedAmPolicyProvider)
    : ruleBasedAmPolicyProvider
  const listeners = new Set<(state: LifeGodSimulationState) => void>()

  function createGrid() {
    return new Uint8Array(GRID_WIDTH * GRID_HEIGHT)
  }

  function createPatternRequestQueue(): LifeGodPatternRequest[] {
    return (Object.entries(PLAYER_PATTERN_LIBRARY_LIMITS) as Array<[LifeGodPlayerPatternType, number]>)
      .flatMap(([type, total]) =>
        Array.from({ length: total }, (_, index) => ({
          id: `${type}_${index + 1}`,
          type,
          label: PLAYER_PATTERN_LABELS[type],
          requestIndex: index + 1,
          totalForType: total,
        }))
      )
  }

  function getPatternLibrary(type: LifeGodPlayerPatternType) {
    if (type === 'tree') return treePatternLibrary
    if (type === 'animal') return animalPatternLibrary
    if (type === 'rock') return rockPatternLibrary
    if (type === 'house') return housePatternLibrary
    if (type === 'tool') return toolPatternLibrary
    return riverPatternLibrary
  }

  function setPatternLibrary(type: LifeGodPlayerPatternType, library: LifeGodPlayerPattern[]) {
    if (type === 'tree') {
      treePatternLibrary = library
      return
    }
    if (type === 'animal') {
      animalPatternLibrary = library
      return
    }
    if (type === 'rock') {
      rockPatternLibrary = library
      return
    }
    if (type === 'house') {
      housePatternLibrary = library
      return
    }
    if (type === 'tool') {
      toolPatternLibrary = library
      return
    }
    riverPatternLibrary = library
  }

  function isPlayerPatternCollectionComplete() {
    return (
      treePatternLibrary.length >= PLAYER_PATTERN_LIBRARY_LIMITS.tree &&
      animalPatternLibrary.length >= PLAYER_PATTERN_LIBRARY_LIMITS.animal &&
      rockPatternLibrary.length >= PLAYER_PATTERN_LIBRARY_LIMITS.rock &&
      riverPatternLibrary.length >= PLAYER_PATTERN_LIBRARY_LIMITS.river &&
      housePatternLibrary.length >= PLAYER_PATTERN_LIBRARY_LIMITS.house &&
      toolPatternLibrary.length >= PLAYER_PATTERN_LIBRARY_LIMITS.tool
    )
  }

  function getState(): LifeGodSimulationState {
    const completeAmCount = amEntities.filter((am) => am.state === 'alive').length
    const adaptingAmCount = amEntities.filter((am) => am.state === 'adapting').length
    const formingAmCount = amEntities.filter((am) => am.state === 'forming' || am.state === 'hiddenForming').length
    const committedAmCount = completeAmCount + adaptingAmCount + formingAmCount + constructionSites.length
    const movingAmCount = amEntities.filter((am) =>
      am.state === 'alive' &&
      ['wandering', 'movingToFixedCell', 'carryingCellToSite'].includes(am.behaviorState)
    ).length
    const assemblingAmCount = amEntities.filter((am) => am.behaviorState === 'assemblingAm').length
    const terraformingAmCount = amEntities.filter((am) =>
      ['seekingFrozenMatter', 'shapingSoil', 'shapingVegetation', 'shapingWater', 'shapingRock'].includes(am.behaviorState)
    ).length
    const gatheredCellsTotal = amEntities.reduce((sum, am) => sum + am.gatheredCells.length, 0)
    const frozenMatterCount = matterFrozen && frozenMatterGrid
      ? frozenMatterGrid.reduce((total, cell) => total + cell, 0)
      : 0
    const createdAmCount = Math.max(0, completeAmCount - (firstAmRevealed ? 1 : 0))
    const soilCount = countTerrain(1)
    const vegetationCount = countTerrain(2)
    const waterCount = countTerrain(3)
    const rockCount = countTerrain(4)
    const terraformedCount = soilCount + vegetationCount + waterCount + rockCount
    const terraformableTotal = terraformedCount + Math.max(0, frozenMatterCount)
    const terraformationProgress = terraformableTotal > 0 ? terraformedCount / terraformableTotal : 0
    const terraformationCoherence = getTerraformCoherence()
    const criticallyBlockedAmCount = amEntities.filter((am) =>
      am.state === 'alive' &&
      am.currentGoal === 'terraforming' &&
      am.memory.terraformStuckTicks >= TERRAFORM_CRITICAL_STUCK_TICKS
    ).length
    const terraformationComplete =
      terraformationProgress >= TERRAFORM_COMPLETION_THRESHOLD &&
      soilCount > 0 &&
      vegetationCount > 0 &&
      (waterCount > 0 || terraformationProgress >= 0.82) &&
      rockCount > 0 &&
      criticallyBlockedAmCount === 0
    const terraformationStabilized = terraformationComplete && getCompleteAmCount() > 0
    const amPopulationStable =
      completeAmCount === MAX_TOTAL_AMS &&
      constructionSites.length === 0 &&
      firstAmCandidate === null &&
      !conwayActive &&
      matterFrozen &&
      activePatternIds.length >= 1 &&
      activePatternIds.length <= MAX_ACTIVE_PATTERNS_PER_SEED
    return {
      phase,
      generation,
      aliveCount,
      status,
      timeScale,
      conwayActive,
      matterFrozen,
      firstAmCandidateExists: firstAmCandidate !== null,
      firstAmRevealed,
      firstAmRevealRemainingCycles: firstAmCandidate ? Math.max(0, firstAmCandidate.revealAtCycle - generation) : 0,
      amPopulationStable,
      scanningActive: !amPopulationStable && committedAmCount < MIN_COMPLETE_AM_BEFORE_TERRAFORMING,
      maxCompleteAmBeforeScanStops: MAX_COMPLETE_AM_BEFORE_SCAN_STOPS,
      completeAmCount,
      formingAmCount,
      adaptingAmCount,
      visibleAmCount: completeAmCount,
      movingAmCount,
      assemblingAmCount,
      terraformingAmCount,
      gatheredCellsTotal,
      currentMission,
      activePatternIds,
      maxActivePatternsPerSeed: MAX_ACTIVE_PATTERNS_PER_SEED,
      frozenMatterCount: Math.max(0, frozenMatterCount),
      soilCount,
      vegetationCount,
      waterCount,
      rockCount,
      terraformationProgress,
      terraformCoherenceScore: terraformationCoherence.score,
      isolatedTerrainCount: terraformationCoherence.isolatedCount,
      terraformationComplete,
      terraformationStabilized,
      criticallyBlockedAmCount,
      currentPatternRequest,
      completedPatternRequests,
      patternRequestQueue,
      playerPatternCollectionComplete: isPlayerPatternCollectionComplete(),
      currentPatternSpokespersonAmId,
      treePatternLibrary,
      animalPatternLibrary,
      rockPatternLibrary,
      riverPatternLibrary,
      housePatternLibrary,
      toolPatternLibrary,
      ceremonyPhase,
      ceremonyCenterPoint,
      ceremonyRequestType,
      speechBubbles,
      worldAssets,
      createdAmCount,
      targetAmCount: MIN_COMPLETE_AM_BEFORE_TERRAFORMING - 1,
      aliveAmTarget: MIN_COMPLETE_AM_BEFORE_TERRAFORMING,
      gridWidth: GRID_WIDTH,
      gridHeight: GRID_HEIGHT,
      cells: current,
      terrainGrid,
      amLineages,
      protoEntities,
      amEntities,
      constructionSites,
      selectedAmId,
    }
  }

  function emit() {
    if (isHeadless) return
    const state = getState()
    listeners.forEach((listener) => listener(state))
  }

  function indexAt(x: number, y: number) {
    return y * GRID_WIDTH + x
  }

  function recountAlive(grid: Uint8Array) {
    let total = 0
    for (let i = 0; i < grid.length; i += 1) total += grid[i]
    return total
  }

  function countTerrain(type: number) {
    let total = 0
    for (let i = 0; i < terrainGrid.length; i += 1) {
      if (terrainGrid[i] === type) total += 1
    }
    return total
  }

  function isCompatibleTerrain(terrainType: number, neighborType: number) {
    if (terrainType === 0 || neighborType === 0) return false
    if (terrainType === 1) return true
    if (terrainType === 2) return neighborType === 1 || neighborType === 2
    if (terrainType === 3) return neighborType === 3 || neighborType === 1
    if (terrainType === 4) return neighborType === 1 || neighborType === 4
    return false
  }

  function getTerrainNeighborStats(x: number, y: number, terrainType: number) {
    let terrainNeighbors = 0
    let compatibleNeighbors = 0
    let sameNeighbors = 0
    let soilNeighbors = 0
    let vegetationNeighbors = 0
    let waterNeighbors = 0
    let rockNeighbors = 0
    let horizontalSame = 0
    let verticalSame = 0

    for (const offset of TERRAIN_NEIGHBOR_OFFSETS) {
      const nx = x + offset.x
      const ny = y + offset.y
      if (nx < 0 || ny < 0 || nx >= GRID_WIDTH || ny >= GRID_HEIGHT) continue
      const neighbor = terrainGrid[indexAt(nx, ny)]
      if (neighbor === 0) continue
      terrainNeighbors += 1
      if (neighbor === 1) soilNeighbors += 1
      if (neighbor === 2) vegetationNeighbors += 1
      if (neighbor === 3) waterNeighbors += 1
      if (neighbor === 4) rockNeighbors += 1
      if (neighbor === terrainType) {
        sameNeighbors += 1
        if (offset.y === 0) horizontalSame += 1
        if (offset.x === 0) verticalSame += 1
      }
      if (isCompatibleTerrain(terrainType, neighbor)) compatibleNeighbors += 1
    }

    return {
      terrainNeighbors,
      compatibleNeighbors,
      sameNeighbors,
      soilNeighbors,
      vegetationNeighbors,
      waterNeighbors,
      rockNeighbors,
      horizontalSame,
      verticalSame,
    }
  }

  function getTerraformCoherence() {
    let terrainCount = 0
    let connectedCount = 0
    let isolatedCount = 0

    for (let y = 1; y < GRID_HEIGHT - 1; y += 1) {
      for (let x = 1; x < GRID_WIDTH - 1; x += 1) {
        const terrainType = terrainGrid[indexAt(x, y)]
        if (terrainType === 0) continue
        terrainCount += 1
        const stats = getTerrainNeighborStats(x, y, terrainType)
        if (stats.compatibleNeighbors > 0) {
          connectedCount += 1
        } else {
          isolatedCount += 1
        }
      }
    }

    return {
      score: terrainCount > 0 ? connectedCount / terrainCount : 0,
      isolatedCount,
    }
  }

  function clearGrid(grid: Uint8Array) {
    grid.fill(0)
  }

  function shouldFreezeCell(x: number, y: number) {
    return !amEntities.some((am) => am.absoluteCells.some((cell) => cell.x === x && cell.y === y))
  }

  function freezeMatterFromCurrent() {
    // Snapshot des cellules normales uniquement — les AM sont exclues
    // Ce snapshot est la source de vérité immuable pour la matière figée
    frozenMatterGrid = new Uint8Array(GRID_WIDTH * GRID_HEIGHT)
    for (let i = 0; i < current.length; i += 1) {
      frozenMatterGrid[i] = current[i]
    }
    suppressMovedMatterSources(frozenMatterGrid)
    // Retirer les cellules AM du snapshot : les AM ne sont pas de la matière figée
    for (const am of amEntities) {
      for (const cell of am.absoluteCells) {
        if (cell.x < 0 || cell.y < 0 || cell.x >= GRID_WIDTH || cell.y >= GRID_HEIGHT) continue
        frozenMatterGrid[indexAt(cell.x, cell.y)] = 0
      }
    }
  }

  function computeAbsoluteCells(cells: LifeGodRelativeCell[], origin: { x: number; y: number }) {
    return cells.map((cell) => ({
      x: origin.x + cell.x,
      y: origin.y + cell.y,
    }))
  }

  function hasLivingCell(x: number, y: number) {
    return current[indexAt(x, y)] === 1
  }

  function refreshAliveCount() {
    aliveCount = recountAlive(current)
  }

  function getCompleteAmCount() {
    return amEntities.filter((am) => am.state === 'alive').length
  }

  function getFormingOrAdaptingAmCount() {
    return amEntities.filter((am) => am.state === 'forming' || am.state === 'hiddenForming' || am.state === 'adapting').length
  }

  function getCommittedAmCount() {
    return getCompleteAmCount() + getFormingOrAdaptingAmCount() + constructionSites.length
  }

  function isScanningActive() {
    return getCommittedAmCount() < MIN_COMPLETE_AM_BEFORE_TERRAFORMING
  }

  function canCreateMoreVisibleAms() {
    const stable =
      getCompleteAmCount() === MAX_TOTAL_AMS &&
      constructionSites.length === 0 &&
      firstAmCandidate === null &&
      firstAmRevealed &&
      !conwayActive &&
      matterFrozen &&
      activePatternIds.length >= 1 &&
      activePatternIds.length <= MAX_ACTIVE_PATTERNS_PER_SEED
    return !stable && getCommittedAmCount() < MIN_COMPLETE_AM_BEFORE_TERRAFORMING
  }

  function canFinishStartedAm() {
    return getCommittedAmCount() < MAX_TOTAL_AMS
  }

  function shouldRunTerraformingMission() {
    return (
      getCompleteAmCount() >= MIN_COMPLETE_AM_BEFORE_TERRAFORMING &&
      getFormingOrAdaptingAmCount() === 0 &&
      constructionSites.length === 0 &&
      !conwayActive &&
      matterFrozen &&
      frozenMatterGrid !== null
    )
  }

  function getTerraformationStabilizedForMission() {
    const state = getState()
    return state.terraformationStabilized
  }

  function choosePatternSpokesperson() {
    const existingSpeaker = currentPatternSpokespersonAmId
      ? amEntities.find((am) => am.id === currentPatternSpokespersonAmId && am.state === 'alive' && am.behaviorState !== 'escapingStuckArea')
      : null
    if (existingSpeaker) return existingSpeaker.id

    const center = { x: GRID_WIDTH / 2, y: GRID_HEIGHT / 2 }
    const candidate = [...amEntities]
      .filter((am) => am.state === 'alive' && am.behaviorState !== 'escapingStuckArea')
      .sort((a, b) => distanceBetweenCells(getAmCenter(a), center) - distanceBetweenCells(getAmCenter(b), center))[0]
    return candidate?.id ?? null
  }

  function ensureCurrentPatternRequest() {
    if (isPlayerPatternCollectionComplete()) {
      currentPatternRequest = null
      currentPatternSpokespersonAmId = null
      return
    }
    if (!currentPatternRequest) {
      currentPatternRequest = patternRequestQueue[0] ?? null
    }
    currentPatternSpokespersonAmId = choosePatternSpokesperson()
  }

  // ── Ceremony system ──────────────────────────────────────────────────

  function computeCeremonyCenter(): LifeGodRelativeCell {
    const aliveAms = amEntities.filter(am => am.state === 'alive')
    if (aliveAms.length === 0) return { x: GRID_WIDTH / 2, y: GRID_HEIGHT / 2 }
    let sx = 0, sy = 0
    for (const am of aliveAms) {
      const c = getAmCenter(am)
      sx += c.x
      sy += c.y
    }
    const margin = CEREMONY_CIRCLE_RADIUS + 10
    return {
      x: Math.round(Math.max(margin, Math.min(GRID_WIDTH - margin, sx / aliveAms.length))),
      y: Math.round(Math.max(margin, Math.min(GRID_HEIGHT - margin, sy / aliveAms.length))),
    }
  }

  function computeCirclePositions(center: LifeGodRelativeCell): Map<string, LifeGodRelativeCell> {
    const aliveAms = amEntities.filter(am => am.state === 'alive')
    const positions = new Map<string, LifeGodRelativeCell>()
    const count = aliveAms.length
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count
      positions.set(aliveAms[i].id, {
        x: Math.max(2, Math.min(GRID_WIDTH - 3, Math.round(center.x + Math.cos(angle) * CEREMONY_CIRCLE_RADIUS))),
        y: Math.max(2, Math.min(GRID_HEIGHT - 3, Math.round(center.y + Math.sin(angle) * CEREMONY_CIRCLE_RADIUS))),
      })
    }
    return positions
  }

  function areAllAmsInCircle(): boolean {
    const aliveAms = amEntities.filter(am => am.state === 'alive')
    return aliveAms.every(am => {
      const target = ceremonyCirclePositions.get(am.id)
      if (!target) return false
      return distanceBetweenCells(getAmCenter(am), target) <= CEREMONY_CIRCLE_ARRIVAL_TOLERANCE
    })
  }

  function spawnChatterBubble(isPrayer: boolean) {
    if (generation - lastBubbleTick < CEREMONY_BUBBLE_INTERVAL) return
    const activeBubbleCount = speechBubbles.filter(b => generation - b.startTick < b.durationTicks).length
    if (activeBubbleCount >= CEREMONY_BUBBLE_MAX_ACTIVE) return

    const amsWithoutBubble = amEntities.filter(am =>
      am.state === 'alive' &&
      !speechBubbles.some(b => b.amId === am.id && generation - b.startTick < b.durationTicks)
    )
    if (amsWithoutBubble.length === 0) return

    const chosen = amsWithoutBubble[Math.floor(Math.random() * amsWithoutBubble.length)]
    const phrases = isPrayer && ceremonyRequestType
      ? CEREMONY_PRAYER_PHRASES[ceremonyRequestType]
      : CEREMONY_CHATTER_PHRASES
    const text = phrases[Math.floor(Math.random() * phrases.length)]

    speechBubbles.push({ amId: chosen.id, text, startTick: generation, durationTicks: CEREMONY_BUBBLE_DURATION })
    lastBubbleTick = generation
  }

  function startCeremony() {
    ceremonyPhase = 'chattering'
    ceremonyStartTick = generation
    ceremonyPhaseStartTick = generation
    speechBubbles = []
    ceremonyRequestType = patternRequestQueue[0]?.type ?? null
    ceremonyCenterPoint = null
    ceremonyCirclePositions = new Map()
    currentMission = 'ceremonyChattering'
    amEntities = amEntities.map(am => {
      if (am.state !== 'alive') return am
      return { ...am, behaviorState: 'ceremonyWandering' as const, currentGoal: 'ceremonyChattering' as const }
    })
  }

  function tickCeremony() {
    speechBubbles = speechBubbles.filter(b => generation - b.startTick < b.durationTicks)

    if (ceremonyPhase === 'chattering') {
      spawnChatterBubble(false)
      if (generation - ceremonyPhaseStartTick >= CEREMONY_CHATTERING_DURATION) {
        ceremonyPhase = 'circleForming'
        ceremonyPhaseStartTick = generation
        ceremonyCenterPoint = computeCeremonyCenter()
        ceremonyCirclePositions = computeCirclePositions(ceremonyCenterPoint)
        currentMission = 'ceremonyCircleForming'
        amEntities = amEntities.map(am => {
          if (am.state !== 'alive') return am
          return { ...am, behaviorState: 'ceremonyApproaching' as const, currentGoal: 'ceremonyCircleForming' as const }
        })
      }
      return
    }

    if (ceremonyPhase === 'circleForming') {
      spawnChatterBubble(false)
      if (areAllAmsInCircle() || generation - ceremonyPhaseStartTick >= CEREMONY_CIRCLE_TIMEOUT) {
        ceremonyPhase = 'praying'
        ceremonyPhaseStartTick = generation
        speechBubbles = []
        currentMission = 'ceremonyPraying'
        amEntities = amEntities.map(am => {
          if (am.state !== 'alive') return am
          return { ...am, behaviorState: 'ceremonyPraying' as const, currentGoal: 'ceremonyPraying' as const }
        })
      }
      return
    }

    if (ceremonyPhase === 'praying') {
      spawnChatterBubble(true)
      if (generation - ceremonyPhaseStartTick >= CEREMONY_PRAYER_DURATION) {
        ceremonyPhase = 'drawing'
        ceremonyPhaseStartTick = generation
        currentPatternRequest = patternRequestQueue[0] ?? null
        currentMission = 'requestingPlayerPatterns'
      }
      return
    }

    if (ceremonyPhase === 'drawing') {
      spawnChatterBubble(true)
      return
    }
  }

  function endCeremonyRound() {
    if (patternRequestQueue.length > 0) {
      startCeremony()
    } else {
      ceremonyPhase = 'none'
      ceremonyCenterPoint = null
      ceremonyCirclePositions = new Map()
      speechBubbles = []
      ceremonyRequestType = null
      currentMission = 'applyingPlayerPatterns'
      currentPatternRequest = null
      currentPatternSpokespersonAmId = null
      amEntities = amEntities.map(am => {
        if (am.state !== 'alive') return am
        return { ...am, behaviorState: 'wandering' as const }
      })
    }
  }

  function placeWorldAsset(pattern: LifeGodPlayerPattern, center: LifeGodRelativeCell) {
    const offsetX = center.x - Math.floor(pattern.width / 2)
    const offsetY = center.y - Math.floor(pattern.height / 2)
    const absoluteCells = pattern.cells.map(cell => ({
      x: offsetX + cell.x,
      y: offsetY + cell.y,
    })).filter(cell =>
      cell.x >= 1 && cell.x < GRID_WIDTH - 1 &&
      cell.y >= 1 && cell.y < GRID_HEIGHT - 1
    )

    const terrainForAsset: Record<LifeGodPlayerPatternType, LifeGodTerrainType> = {
      house: 1,
      tree: 2,
      animal: 1,
      tool: 1,
      rock: 4,
      river: 3,
    }

    worldAssets = [...worldAssets, {
      id: `asset-${pattern.id}-${generation}`,
      type: pattern.type,
      position: { x: offsetX, y: offsetY },
      cells: pattern.cells,
      absoluteCells,
      colorHint: pattern.colorHint,
      placedAtGeneration: generation,
    }]

    const terrainType = terrainForAsset[pattern.type]
    for (const cell of absoluteCells) {
      const idx = indexAt(cell.x, cell.y)
      terrainGrid[idx] = terrainType
    }
  }

  // ── Mission management ────────────────────────────────────────────────

  function updateCurrentMission() {
    if (ceremonyPhase !== 'none') return

    if (isPlayerPatternCollectionComplete()) {
      currentMission = 'applyingPlayerPatterns'
      currentPatternRequest = null
      currentPatternSpokespersonAmId = null
      return
    }
    if (getTerraformationStabilizedForMission()) {
      startCeremony()
      return
    }
    if (shouldRunTerraformingMission()) {
      currentMission = frozenMatterGrid && frozenMatterGrid.some((cell) => cell === 1)
        ? 'terraforming'
        : 'stable'
      return
    }
    currentMission = 'expandingPopulation'
  }

  // Seules les cellules NORMALES se figent — jamais les entités vivantes
  function shouldFreezeNormalCells() {
    return (
      firstAmRevealed &&
      conwayActive &&
      !matterFrozen &&
      getCompleteAmCount() >= MIN_COMPLETE_AM_BEFORE_TERRAFORMING
    )
  }

  function updatePhase() {
    if (matterFrozen) {
      phase = 'frozenMatter'
      return
    }
    if (firstAmCandidate) {
      phase = 'firstAmHiddenForming'
      return
    }
    phase = amEntities.length > 0 ? 'amExpansion' : 'conwayEmergence'
  }

  function isTerraformationCompleteNow() {
    const frozenMatterCount = matterFrozen && frozenMatterGrid
      ? frozenMatterGrid.reduce((total, cell) => total + cell, 0)
      : 0
    const soilCount = countTerrain(1)
    const vegetationCount = countTerrain(2)
    const waterCount = countTerrain(3)
    const rockCount = countTerrain(4)
    const terraformedCount = soilCount + vegetationCount + waterCount + rockCount
    const terraformableTotal = terraformedCount + Math.max(0, frozenMatterCount)
    const progress = terraformableTotal > 0 ? terraformedCount / terraformableTotal : 0
    const criticallyBlockedAmCount = amEntities.filter((am) =>
      am.state === 'alive' &&
      am.currentGoal === 'terraforming' &&
      am.memory.terraformStuckTicks >= TERRAFORM_CRITICAL_STUCK_TICKS
    ).length

    return (
      progress >= TERRAFORM_COMPLETION_THRESHOLD &&
      soilCount > 0 &&
      vegetationCount > 0 &&
      (waterCount > 0 || progress >= 0.82) &&
      rockCount > 0 &&
      criticallyBlockedAmCount === 0 &&
      getCompleteAmCount() > 0
    )
  }

  function populationForLineage(lineageId: string) {
    return amEntities.filter((am) => am.lineageId === lineageId).length
  }

  function sortCells(cells: LifeGodRelativeCell[]) {
    return [...cells].sort((a, b) => (a.y - b.y) || (a.x - b.x))
  }

  function cellKey(x: number, y: number) {
    return `${x}:${y}`
  }

  function protoBounds(cells: LifeGodRelativeCell[]) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const cell of cells) {
      if (cell.x < minX) minX = cell.x
      if (cell.x > maxX) maxX = cell.x
      if (cell.y < minY) minY = cell.y
      if (cell.y > maxY) maxY = cell.y
    }
    return { minX, minY, maxX, maxY }
  }

  function isReservedByEntity(x: number, y: number) {
    return amEntities.some((am) => am.absoluteCells.some((cell) => cell.x === x && cell.y === y))
  }

  function isReservedByProto(x: number, y: number) {
    return protoEntities.some((proto) => proto.cells.some((cell) => cell.x === x && cell.y === y))
  }

  function isReservedByConstruction(x: number, y: number) {
    return constructionSites.some((site) =>
      getConstructionFootprintCells(site).some((cell) => cell.x === x && cell.y === y)
    )
  }

  function syncAmCells() {
    // SYSTÈME VIVANT — toujours actif, même si Conway est arrêté
    // Quand la matière est figée : restaurer le snapshot figé avant d'écrire les AM
    // Cela empêche les AM de laisser des "fantômes" de matière figée en se déplaçant
    // Écrire les positions actuelles des AM par-dessus
    for (const am of amEntities) {
      am.absoluteCells = computeAbsoluteCells(am.cells, am.position)
      for (const cell of am.absoluteCells) {
        if (cell.x <= 0 || cell.y <= 0 || cell.x >= GRID_WIDTH - 1 || cell.y >= GRID_HEIGHT - 1) continue
        current[indexAt(cell.x, cell.y)] = 1
      }
    }
  }

  function clearAmVisualCellsFromMatterGrid() {
    for (const am of amEntities) {
      for (const cell of am.absoluteCells) {
        if (cell.x <= 0 || cell.y <= 0 || cell.x >= GRID_WIDTH - 1 || cell.y >= GRID_HEIGHT - 1) continue
        current[indexAt(cell.x, cell.y)] = 0
      }
    }
  }

  function syncConstructionCells() {
    for (const site of constructionSites) {
      site.absoluteCells = computeAbsoluteCells(site.cells, site.origin)
    }
  }

  function updateLineagePopulation(lineageId: string) {
    amLineages = amLineages.map((lineage) =>
      lineage.id === lineageId
        ? {
            ...lineage,
            population: populationForLineage(lineage.id),
          }
        : lineage
    )
  }

  function createLineage(pattern: LifeGodAmPattern) {
    const lineage: LifeGodAmLineage = {
      id: `lineage-${pattern.id}-${generation}`,
      patternId: pattern.id,
      name: pattern.name,
      color: LINEAGE_COLORS[amLineages.length % LINEAGE_COLORS.length],
      role: pattern.suggestedRole,
      population: 0,
      createdAtCycle: generation,
    }
    amLineages = [...amLineages, lineage]
    if (!activePatternIds.includes(pattern.id)) {
      activePatternIds = [...activePatternIds, pattern.id]
    }
    return lineage
  }

  function createInitialMemory(origin: LifeGodRelativeCell): LifeGodAmEntity['memory'] {
    return {
      lastTargetCell: null,
      lastBuildSite: null,
      lastPosition: origin,
      stationaryTicks: 0,
      unstuckUntilCycle: 0,
      terraformedCells: 0,
      wallStickTicks: 0,
      overcrowdedTicks: 0,
      repeatedAreaTicks: 0,
      explorationBoostTicks: 0,
      avoidCrowdBoostTicks: 0,
      recentPositions: [origin],
      crowdedZones: [],
      wallDangerZones: [],
      usefulZones: [],
      lastMessageSent: null,
      knownResourceHints: [],
      knownDangerHints: [],
      independenceScore: 1,
      totalReward: 0,
      lastRewardAmount: 0,
      lastRewardReason: null,
      terraformStuckTicks: 0,
      failedTerraformTargets: [],
      recentBlockedPositions: [],
      lastTerraformConversionTick: generation,
      lastTerraformAction: null,
      recoveryTriggered: false,
      recentTimedPositions: [{ ...origin, tick: generation }],
      stuckAreaCenter: null,
      stuckAreaTicks: 0,
      escapeTarget: null,
      escapeTicksRemaining: 0,
      lastUsefulActionTick: generation,
      failedTargets: [],
      failedAreas: [],
      lastStuckReason: null,
    }
  }

  function clampBrainWeight(value: number) {
    return Math.max(MIN_BRAIN_WEIGHT, Math.min(MAX_BRAIN_WEIGHT, value))
  }

  function getBrainWeight(am: LifeGodAmEntity, key: keyof LifeGodAmEntity['brain']['weights']) {
    return clampBrainWeight(am.brain.weights[key])
  }

  function initializeAmBrain(role: LifeGodAmRole, parentId?: string): LifeGodAmEntity['brain'] {
    const source = trainingConfig?.initialWeights?.[role] ?? TRAINED_AM_WEIGHTS[role]

    const weights = {
      explore: clampBrainWeight(source.explore),
      seekCells: clampBrainWeight(source.seekCells),
      gatherCells: clampBrainWeight(source.gatherCells),
      carryToSite: clampBrainWeight(source.carryToSite),
      buildAm: clampBrainWeight(source.buildAm),
      avoidWall: clampBrainWeight(source.avoidWall),
      avoidCrowd: clampBrainWeight(source.avoidCrowd),
      seekFrozenMatter: clampBrainWeight(source.seekFrozenMatter),
      terraform: clampBrainWeight(source.terraform),
      rest: clampBrainWeight(source.rest),
    }

    return {
      weights,
      learningRate: 0.03,
      totalReward: 0,
      lastRewardReason: null,
      recentRewardEvents: [],
      generation,
      lastLearningGeneration: generation - 1,
      parentId,
    }
  }

  function inheritAmBrain(parentAm: LifeGodAmEntity, childRole: LifeGodAmRole): LifeGodAmEntity['brain'] {
    const baseBrain = initializeAmBrain(childRole, parentAm.id)
    const inheritedWeights = { ...baseBrain.weights }

    for (const key of Object.keys(inheritedWeights) as Array<keyof LifeGodAmEntity['brain']['weights']>) {
      const mutation = Math.random() * 0.2 - 0.1
      inheritedWeights[key] = clampBrainWeight(parentAm.brain.weights[key] * 0.7 + baseBrain.weights[key] * 0.3 + mutation)
    }

    return {
      ...baseBrain,
      weights: inheritedWeights,
      generation,
      parentId: parentAm.id,
    }
  }

  function clampList<T>(items: T[], maxItems = MAX_MEMORY_HINTS) {
    return items.slice(Math.max(0, items.length - maxItems))
  }

  function rememberCell(cells: LifeGodRelativeCell[], cell: LifeGodRelativeCell, maxItems = MAX_MEMORY_HINTS) {
    const filtered = cells.filter((item) => distanceBetweenCells(item, cell) > 2)
    return clampList([...filtered, { x: Math.round(cell.x), y: Math.round(cell.y) }], maxItems)
  }

  function rewardAm(am: LifeGodAmEntity, amount: number, reason: string): LifeGodAmEntity {
    const rewardEvent = { generation, amount, reason }
    return {
      ...am,
      brain: {
        ...am.brain,
        totalReward: am.brain.totalReward + amount,
        lastRewardReason: reason,
        recentRewardEvents: clampList(
          [...am.brain.recentRewardEvents, rewardEvent],
          MAX_RECENT_BRAIN_REWARD_EVENTS
        ),
        generation,
      },
      memory: {
        ...am.memory,
        totalReward: am.memory.totalReward + amount,
        lastRewardAmount: amount,
        lastRewardReason: reason,
      },
    }
  }

  function penalizeAm(am: LifeGodAmEntity, amount: number, reason: string): LifeGodAmEntity {
    return rewardAm(am, -Math.abs(amount), reason)
  }

  function updateAmLearning(am: LifeGodAmEntity, force = false): LifeGodAmEntity {
    if (!force && generation % AM_LEARNING_INTERVAL_TICKS !== 0) return am

    const eventsToLearn = am.brain.recentRewardEvents.filter(
      (event) => event.generation > am.brain.lastLearningGeneration
    )
    if (eventsToLearn.length === 0) {
      return {
        ...am,
        brain: {
          ...am.brain,
          generation,
        },
      }
    }

    const nextWeights = { ...am.brain.weights }
    const applyAdjustment = (
      keys: Array<keyof LifeGodAmEntity['brain']['weights']>,
      amount: number
    ) => {
      const scale = Math.min(1, Math.abs(amount) / 4)
      const delta = am.brain.learningRate * scale
      for (const key of keys) {
        nextWeights[key] = clampBrainWeight(nextWeights[key] + delta)
      }
    }

    for (const event of eventsToLearn) {
      if (event.reason === 'harvest_success') {
        applyAdjustment(['seekCells', 'gatherCells'], event.amount)
      } else if (event.reason === 'deposit_success') {
        applyAdjustment(['carryToSite'], event.amount)
      } else if (event.reason === 'build_complete' || event.reason === 'build_progress') {
        applyAdjustment(['buildAm'], event.amount)
      } else if (
        event.reason === 'terraform_success' ||
        event.reason === 'role_coherent_terrain' ||
        event.reason === 'terraform_progress_visible' ||
        event.reason === 'terraform_patch_coherent' ||
        event.reason === 'water_connected' ||
        event.reason === 'vegetation_extended' ||
        event.reason === 'rock_clustered'
      ) {
        applyAdjustment(['terraform', 'seekFrozenMatter'], event.amount)
      } else if (event.reason === 'frozen_matter_found' || event.reason === 'new_terraform_zone_found') {
        applyAdjustment(['seekFrozenMatter', 'explore'], event.amount)
      } else if (
        event.reason === 'empty_terraform_search' ||
        event.reason === 'terraforming_stuck' ||
        event.reason === 'exhausted_terraform_zone' ||
        event.reason === 'terraform_target_failed' ||
        event.reason === 'isolated_terrain' ||
        event.reason === 'scattered_water' ||
        event.reason === 'saturated_terraform_zone'
      ) {
        applyAdjustment(['explore', 'seekFrozenMatter', 'avoidWall', 'avoidCrowd'], event.amount)
      } else if (event.reason === 'wall_hugging') {
        applyAdjustment(['avoidWall', 'explore'], event.amount)
      } else if (event.reason === 'overcrowded') {
        applyAdjustment(['avoidCrowd', 'explore'], event.amount)
      } else if (event.reason === 'stuck_in_local_area') {
        applyAdjustment(['explore', 'avoidWall', 'avoidCrowd'], event.amount)
      } else if (event.reason === 'movement_step' || event.reason === 'safe_independent_move' || event.reason === 'useful_exploration') {
        applyAdjustment(['explore', 'avoidWall', 'avoidCrowd'], event.amount)
      } else if (event.reason === 'immobile' || event.reason === 'stuck' || event.reason === 'immobile_alive_timeout') {
        applyAdjustment(['explore', 'avoidWall', 'avoidCrowd'], event.amount)
      }
    }

    const lastLearningGeneration = eventsToLearn.reduce(
      (latest, event) => Math.max(latest, event.generation),
      am.brain.lastLearningGeneration
    )

    return {
      ...am,
      brain: {
        ...am.brain,
        weights: nextWeights,
        generation,
        lastLearningGeneration,
      },
    }
  }

  function publishAmMessage(
    am: LifeGodAmEntity,
    type: LifeGodAmMessageType,
    position: LifeGodRelativeCell,
    strength = 1
  ): LifeGodAmEntity {
    const roundedPosition = { x: Math.round(position.x), y: Math.round(position.y) }
    const existing = amMessages.find((message) =>
      message.senderAmId === am.id &&
      message.type === type &&
      distanceBetweenCells(message.position, roundedPosition) <= 4 &&
      message.ageTicks < 18
    )
    if (!existing) {
      amMessages = [
        ...amMessages,
        {
          id: `msg-${generation}-${am.id}-${type}-${amMessages.length}`,
          senderAmId: am.id,
          type,
          position: roundedPosition,
          strength,
          ageTicks: 0,
          payload: { lineageId: am.lineageId },
        },
      ].slice(-MAX_AM_MESSAGES)
    }
    return {
      ...am,
      memory: {
        ...am.memory,
        lastMessageSent: type,
      },
    }
  }

  function tickAmMessages() {
    amMessages = amMessages
      .map((message) => ({ ...message, ageTicks: message.ageTicks + 1 }))
      .filter((message) => message.ageTicks <= MESSAGE_TTL_TICKS)
      .slice(-MAX_AM_MESSAGES)
  }

  function tickTerraformReservations() {
    terraformReservations = terraformReservations.filter((reservation) =>
      generation - reservation.createdAtCycle <= TERRAFORM_RESERVATION_TTL &&
      isFrozenMatterAvailable(reservation.position.x, reservation.position.y, reservation.amId)
    )
  }

  function isTerraformReservedByOtherAm(cell: LifeGodRelativeCell, amId: string) {
    return terraformReservations.some((reservation) =>
      reservation.amId !== amId &&
      distanceBetweenCells(reservation.position, cell) <= TERRAFORM_RESERVATION_RADIUS
    )
  }

  function reserveTerraformZone(am: LifeGodAmEntity, cell: LifeGodRelativeCell): LifeGodAmEntity {
    terraformReservations = [
      ...terraformReservations.filter((reservation) => reservation.amId !== am.id),
      { amId: am.id, position: { x: cell.x, y: cell.y }, createdAtCycle: generation },
    ]
    return publishAmMessage(am, 'terraformingZoneClaimed', cell, 1.2)
  }

  function releaseTerraformReservation(amId: string) {
    terraformReservations = terraformReservations.filter((reservation) => reservation.amId !== amId)
  }

  function absorbNearbyMessages(am: LifeGodAmEntity): LifeGodAmEntity {
    const center = getAmCenter(am)
    let knownResourceHints = am.memory.knownResourceHints
    let knownDangerHints = am.memory.knownDangerHints
    let usefulZones = am.memory.usefulZones
    let crowdedZones = am.memory.crowdedZones
    let wallDangerZones = am.memory.wallDangerZones

    for (const message of amMessages) {
      if (message.senderAmId === am.id) continue
      if (message.payload?.lineageId && message.payload.lineageId !== am.lineageId && distanceBetweenCells(center, message.position) > COMMUNICATION_RADIUS * 0.55) {
        continue
      }
      if (distanceBetweenCells(center, message.position) > COMMUNICATION_RADIUS) continue

      if (message.type === 'stableCellsFound' || message.type === 'resourceFound' || message.type === 'frozenMatterFound' || message.type === 'goodTerraformZone') {
        knownResourceHints = rememberCell(knownResourceHints, message.position)
        usefulZones = rememberCell(usefulZones, message.position)
      }
      if (message.type === 'overcrowdedArea') {
        knownDangerHints = rememberCell(knownDangerHints, message.position)
        crowdedZones = rememberCell(crowdedZones, message.position)
      }
      if (message.type === 'wallDanger') {
        knownDangerHints = rememberCell(knownDangerHints, message.position)
        wallDangerZones = rememberCell(wallDangerZones, message.position)
      }
    }

    return {
      ...am,
      memory: {
        ...am.memory,
        knownResourceHints,
        knownDangerHints,
        usefulZones,
        crowdedZones,
        wallDangerZones,
      },
    }
  }

  function rollFormationDurations() {
    const total = Math.round(MIN_FORMATION_CYCLES + Math.random() * (MAX_FORMATION_CYCLES - MIN_FORMATION_CYCLES))
    const forming = Math.max(1, Math.round(total * 0.62))
    return {
      formationDurationCycles: forming,
      adaptationDurationCycles: Math.max(1, total - forming),
    }
  }

  function randomItem<T>(items: T[]) {
    return items[Math.floor(Math.random() * items.length)]
  }

  function choosePatternForBirth() {
    const availablePatternIds =
      activePatternIds.length < MAX_ACTIVE_PATTERNS_PER_SEED
        ? LIFE_GOD_AM_PATTERNS.map((pattern) => pattern.id)
        : activePatternIds

    const patternId = randomItem(availablePatternIds)
    return LIFE_GOD_AM_PATTERNS.find((pattern) => pattern.id === patternId) ?? LIFE_GOD_AM_PATTERNS[0]
  }

  function ensureHiddenCandidateSeed() {
    const groups = scanConnectedGroups().filter((group) => group.length >= PROTO_CONSCIOUSNESS_MIN)
    if (groups.length > 0) {
      const group = sortCells(randomItem(groups)).slice(0, PROTO_CONSCIOUSNESS_MIN)
      return group
    }

    const startX = 6 + Math.floor(Math.random() * (GRID_WIDTH - 12))
    const startY = 6 + Math.floor(Math.random() * (GRID_HEIGHT - 12))
    const offsets = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
      { x: 1, y: -1 },
      { x: -1, y: -1 },
      { x: 2, y: 0 },
    ]

    const cells = offsets.map((offset) => ({
      x: startX + offset.x,
      y: startY + offset.y,
    }))
    for (const cell of cells) {
      current[indexAt(cell.x, cell.y)] = 1
    }
    return sortCells(cells)
  }

  function initializeFirstAmCandidate() {
    const cells = ensureHiddenCandidateSeed()
    const totalFormationCycles = Math.round(
      MIN_FORMATION_CYCLES + Math.random() * (MAX_FORMATION_CYCLES - MIN_FORMATION_CYCLES)
    )
    firstAmCandidate = {
      cells,
      revealAtCycle: generation + totalFormationCycles,
    }
    updatePhase()
  }

  function spawnAm(
    lineage: LifeGodAmLineage,
    pattern: LifeGodAmPattern,
    origin: { x: number; y: number },
    parentAm?: LifeGodAmEntity
  ) {
    const roleConfig = ROLE_CONFIG[lineage.role]
    const { formationDurationCycles, adaptationDurationCycles } = rollFormationDurations()
    const am: LifeGodAmEntity = {
      id: `am-${lineage.id}-${populationForLineage(lineage.id) + 1}`,
      lineageId: lineage.id,
      patternId: pattern.id,
      position: origin,
      bodyParts: pattern.bodyParts,
      age: 0,
      energy: 82,
      state: 'forming',
      behaviorState: 'idle',
      currentGoal: 'expandingPopulation',
      cells: pattern.cells,
      absoluteCells: computeAbsoluteCells(pattern.cells, origin),
      role: lineage.role,
      color: lineage.color,
      targetPosition: null,
      buildTarget: null,
      buildSite: null,
      targetCell: null,
      carriedCell: null,
      movementDirection: null,
      gatheredCells: [],
      brain: parentAm ? inheritAmBrain(parentAm, lineage.role) : initializeAmBrain(lineage.role),
      memory: createInitialMemory(origin),
      reproductionCooldown: roleConfig.reproductionCooldown,
      behaviorCooldown: roleConfig.movementInterval,
      formationDurationCycles,
      adaptationDurationCycles,
    }

    amEntities = [...amEntities, am]
    selectedAmId = am.id
    syncAmCells()
    updateLineagePopulation(lineage.id)
    refreshAliveCount()
  }

  function forceAmAlive(amId: string) {
    amEntities = amEntities.map((am) =>
      am.id === amId
        ? {
            ...am,
            age: am.formationDurationCycles + am.adaptationDurationCycles,
            state: 'alive',
            behaviorState: 'wandering',
            reproductionCooldown: ROLE_CONFIG[am.role].reproductionCooldown,
          }
        : am
    )
  }

  function revealFirstAmCandidate() {
    if (!firstAmCandidate || !canCreateMoreVisibleAms()) return

    const pattern = choosePatternForBirth()
    let lineage = amLineages.find((item) => item.patternId === pattern.id) ?? null
    if (!lineage) {
      lineage = createLineage(pattern)
    }

    const bounds = protoBounds(firstAmCandidate.cells)
    const origin = {
      x: Math.max(1, Math.min(GRID_WIDTH - pattern.width - 2, Math.round((bounds.minX + bounds.maxX) / 2) - Math.floor(pattern.width / 2))),
      y: Math.max(1, Math.min(GRID_HEIGHT - pattern.height - 2, Math.round((bounds.minY + bounds.maxY) / 2) - Math.floor(pattern.height / 2))),
    }

    for (const cell of firstAmCandidate.cells) {
      current[indexAt(cell.x, cell.y)] = 0
    }

    spawnAm(lineage, pattern, origin)
    forceAmAlive(selectedAmId ?? '')
    firstAmRevealed = true
    firstAmCandidate = null
    phase = 'amExpansion'
  }

  function scanConnectedGroups() {
    const visited = new Set<string>()
    const blocked = new Set<string>()

    for (const am of amEntities) {
      for (const cell of am.absoluteCells) blocked.add(cellKey(cell.x, cell.y))
    }
    for (const proto of protoEntities) {
      for (const cell of proto.cells) blocked.add(cellKey(cell.x, cell.y))
    }
    for (const site of constructionSites) {
      for (const cell of site.absoluteCells) blocked.add(cellKey(cell.x, cell.y))
    }

    const groups: LifeGodRelativeCell[][] = []
    for (let y = 1; y < GRID_HEIGHT - 1; y += 1) {
      for (let x = 1; x < GRID_WIDTH - 1; x += 1) {
        if (!hasLivingCell(x, y)) continue
        const startKey = cellKey(x, y)
        if (visited.has(startKey) || blocked.has(startKey)) continue

        const stack = [{ x, y }]
        const group: LifeGodRelativeCell[] = []
        visited.add(startKey)

        while (stack.length > 0) {
          const currentCell = stack.pop()
          if (!currentCell) continue
          group.push(currentCell)

          for (let oy = -1; oy <= 1; oy += 1) {
            for (let ox = -1; ox <= 1; ox += 1) {
              if (ox === 0 && oy === 0) continue
              const nx = currentCell.x + ox
              const ny = currentCell.y + oy
              if (nx <= 0 || ny <= 0 || nx >= GRID_WIDTH - 1 || ny >= GRID_HEIGHT - 1) continue
              if (!hasLivingCell(nx, ny)) continue
              const nextKey = cellKey(nx, ny)
              if (visited.has(nextKey) || blocked.has(nextKey)) continue
              visited.add(nextKey)
              stack.push({ x: nx, y: ny })
            }
          }
        }

        groups.push(sortCells(group))
      }
    }

    return groups
  }

  function tryCreateProtoEntities() {
    if (!isScanningActive()) return
    if (generation % PROTO_SCAN_INTERVAL !== 0) return

    const existingSignatures = new Set(
      protoEntities.map((proto) => proto.cells.map((cell) => cellKey(cell.x, cell.y)).sort().join('|'))
    )

    for (const group of scanConnectedGroups()) {
      if (group.length < PROTO_CONSCIOUSNESS_MIN) continue
      const signature = group.map((cell) => cellKey(cell.x, cell.y)).sort().join('|')
      if (existingSignatures.has(signature)) continue

      const proto: LifeGodProtoEntity = {
        id: `proto-${generation}-${existingSignatures.size + 1}`,
        cells: group,
        targetCellCount: PROTO_METAMORPHOSIS_MIN,
        createdAtCycle: generation,
        state: group.length >= PROTO_METAMORPHOSIS_MIN ? 'metamorphosing' : 'awakening',
      }
      protoEntities = [...protoEntities, proto]
      existingSignatures.add(signature)
    }
  }

  function canUsePatternOrigin(pattern: LifeGodAmPattern, origin: { x: number; y: number }, protoId: string) {
    for (const cell of pattern.cells) {
      const x = origin.x + cell.x
      const y = origin.y + cell.y
      if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) return false
      if (isReservedByEntity(x, y) || isReservedByConstruction(x, y)) return false
      if (protoEntities.some((proto) => proto.id !== protoId && proto.cells.some((item) => item.x === x && item.y === y))) {
        return false
      }
    }
    return true
  }

  function findPatternOriginNearProto(pattern: LifeGodAmPattern, proto: LifeGodProtoEntity) {
    const bounds = protoBounds(proto.cells)
    const centerX = Math.round((bounds.minX + bounds.maxX) / 2)
    const centerY = Math.round((bounds.minY + bounds.maxY) / 2)
    const baseOrigin = {
      x: centerX - Math.floor(pattern.width / 2),
      y: centerY - Math.floor(pattern.height / 2),
    }

    if (canUsePatternOrigin(pattern, baseOrigin, proto.id)) return baseOrigin

    for (let distance = 1; distance <= 8; distance += 1) {
      for (let oy = -distance; oy <= distance; oy += 1) {
        for (let ox = -distance; ox <= distance; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== distance) continue
          const candidate = { x: baseOrigin.x + ox, y: baseOrigin.y + oy }
          if (canUsePatternOrigin(pattern, candidate, proto.id)) return candidate
        }
      }
    }

    return null
  }

  function choosePatternForProto(proto: LifeGodProtoEntity) {
    const cells = sortCells(proto.cells)
    let checksum = 0
    for (const cell of cells) checksum += cell.x * 31 + cell.y * 17

    const unusedPatterns = LIFE_GOD_AM_PATTERNS.filter(
      (pattern) => !amLineages.some((lineage) => lineage.patternId === pattern.id)
    )
    if (unusedPatterns.length > 0 && amLineages.length < MAX_LINEAGES) {
      return unusedPatterns[checksum % unusedPatterns.length]
    }
    if (amLineages.length > 0) {
      const lineage = [...amLineages].sort((a, b) => a.population - b.population || a.createdAtCycle - b.createdAtCycle)[0]
      return LIFE_GOD_AM_PATTERNS.find((pattern) => pattern.id === lineage.patternId) ?? LIFE_GOD_AM_PATTERNS[0]
    }
    return LIFE_GOD_AM_PATTERNS[checksum % LIFE_GOD_AM_PATTERNS.length]
  }

  function syncProtoCells() {
    for (const proto of protoEntities) {
      for (const cell of proto.cells) {
        if (cell.x <= 0 || cell.y <= 0 || cell.x >= GRID_WIDTH - 1 || cell.y >= GRID_HEIGHT - 1) continue
        current[indexAt(cell.x, cell.y)] = 1
      }
    }
  }

  function findGrowthPlacement(proto: LifeGodProtoEntity) {
    const occupied = new Set(proto.cells.map((cell) => cellKey(cell.x, cell.y)))
    const frontier: LifeGodRelativeCell[] = []

    for (const cell of proto.cells) {
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          if (ox === 0 && oy === 0) continue
          const x = cell.x + ox
          const y = cell.y + oy
          const key = cellKey(x, y)
          if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) continue
          if (occupied.has(key)) continue
          if (isReservedByEntity(x, y) || isReservedByConstruction(x, y)) continue
          if (isReservedByProto(x, y)) continue
          frontier.push({ x, y })
        }
      }
    }

    const bounds = protoBounds(proto.cells)
    frontier.sort((a, b) => {
      const da = Math.abs(a.x - Math.round((bounds.minX + bounds.maxX) / 2)) + Math.abs(a.y - Math.round((bounds.minY + bounds.maxY) / 2))
      const db = Math.abs(b.x - Math.round((bounds.minX + bounds.maxX) / 2)) + Math.abs(b.y - Math.round((bounds.minY + bounds.maxY) / 2))
      return da - db
    })

    return frontier[0] ?? null
  }

  function findNearbyLooseCell(proto: LifeGodProtoEntity) {
    const occupied = new Set(proto.cells.map((cell) => cellKey(cell.x, cell.y)))
    const bounds = protoBounds(proto.cells)
    const centerX = Math.round((bounds.minX + bounds.maxX) / 2)
    const centerY = Math.round((bounds.minY + bounds.maxY) / 2)
    const candidates: LifeGodRelativeCell[] = []

    for (let y = Math.max(1, centerY - SEARCH_RADIUS); y <= Math.min(GRID_HEIGHT - 2, centerY + SEARCH_RADIUS); y += 1) {
      for (let x = Math.max(1, centerX - SEARCH_RADIUS); x <= Math.min(GRID_WIDTH - 2, centerX + SEARCH_RADIUS); x += 1) {
        const key = cellKey(x, y)
        if (!hasLivingCell(x, y) || occupied.has(key)) continue
        if (isReservedByEntity(x, y) || isReservedByConstruction(x, y) || isReservedByProto(x, y)) continue
        candidates.push({ x, y })
      }
    }

    candidates.sort((a, b) => {
      const da = Math.abs(a.x - centerX) + Math.abs(a.y - centerY)
      const db = Math.abs(b.x - centerX) + Math.abs(b.y - centerY)
      return da - db
    })

    return candidates[0] ?? null
  }

  function morphProtoIntoAm(proto: LifeGodProtoEntity) {
    if (amEntities.length >= MAX_TOTAL_AMS) return

    const pattern = choosePatternForProto(proto)
    let lineage = amLineages.find((item) => item.patternId === pattern.id) ?? null
    if (!lineage) {
      if (!isScanningActive()) return
      if (amLineages.length >= MAX_LINEAGES) return
      lineage = createLineage(pattern)
    }
    if (populationForLineage(lineage.id) >= MAX_AMS_PER_LINEAGE) return

    const origin = findPatternOriginNearProto(pattern, proto)
    if (!origin) return

    for (const cell of proto.cells) {
      current[indexAt(cell.x, cell.y)] = 0
    }
    protoEntities = protoEntities.filter((item) => item.id !== proto.id)
    spawnAm(lineage, pattern, origin)
  }

  function tickProtoEntities() {
    if (protoEntities.length === 0) return

    protoEntities = protoEntities
      .map((proto) => {
        const livingCells = sortCells(proto.cells.filter((cell) => hasLivingCell(cell.x, cell.y)))
        if (livingCells.length < PROTO_CONSCIOUSNESS_MIN) {
          return null
        }

        let nextCells = livingCells
        if (livingCells.length < proto.targetCellCount && generation % PROTO_GATHER_INTERVAL === 0) {
          const sourceCell = findNearbyLooseCell({ ...proto, cells: livingCells })
          const placement = findGrowthPlacement({ ...proto, cells: livingCells })
          if (sourceCell && placement) {
            current[indexAt(sourceCell.x, sourceCell.y)] = 0
            current[indexAt(placement.x, placement.y)] = 1
            nextCells = sortCells([...livingCells, placement])
          }
        }

        return {
          ...proto,
          cells: nextCells,
          state:
            nextCells.length >= proto.targetCellCount
              ? 'metamorphosing'
              : nextCells.length >= PROTO_CONSCIOUSNESS_MIN + 2
                ? 'gathering'
                : 'awakening',
        }
      })
      .filter((proto): proto is LifeGodProtoEntity => proto !== null)

    for (const proto of [...protoEntities]) {
      if (proto.cells.length >= proto.targetCellCount) {
        morphProtoIntoAm(proto)
      }
    }
  }

  function isValidBuildCoordinate(x: number, y: number) {
    return x > 1 && y > 1 && x < GRID_WIDTH - 2 && y < GRID_HEIGHT - 2
  }

  function getRequiredCellCount(pattern: LifeGodAmPattern) {
    return Math.max(MIN_BUILD_PILE_CELLS, Math.min(MAX_BUILD_PILE_CELLS, pattern.cells.length))
  }

  function canPlaceConstruction(pattern: LifeGodAmPattern, origin: { x: number; y: number }, builderAmId: string) {
    if (isConstructionOriginTooClose(origin)) return false
    if (isConstructionOriginTooCloseToOtherAms(origin, builderAmId)) return false
    const cellsToCheck = [
      ...pattern.cells,
      ...BUILD_PILE_OFFSETS.slice(0, getRequiredCellCount(pattern)),
    ]

    for (const cell of cellsToCheck) {
      const x = origin.x + cell.x
      const y = origin.y + cell.y
      if (!isValidBuildCoordinate(x, y)) return false
      if (isReservedByEntity(x, y) || isReservedByConstruction(x, y) || isReservedByProto(x, y)) return false
    }
    return true
  }

  function getBuildFootprintCells(pattern: LifeGodAmPattern, origin: { x: number; y: number }) {
    const seen = new Set<string>()
    const cells: LifeGodRelativeCell[] = []
    for (const offset of [...pattern.cells, ...BUILD_PILE_OFFSETS.slice(0, getRequiredCellCount(pattern))]) {
      const cell = { x: origin.x + offset.x, y: origin.y + offset.y }
      const key = cellKey(cell.x, cell.y)
      if (seen.has(key)) continue
      seen.add(key)
      cells.push(cell)
    }
    return cells
  }

  function getConstructionFootprintCells(site: LifeGodConstructionSite) {
    const pattern = LIFE_GOD_AM_PATTERNS.find((entry) => entry.id === site.targetPatternId)
    return pattern ? getBuildFootprintCells(pattern, site.origin) : site.absoluteCells
  }

  function distanceBetweenCells(a: LifeGodRelativeCell, b: LifeGodRelativeCell) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))
  }

  function isConstructionOriginTooClose(origin: LifeGodRelativeCell) {
    return constructionSites.some((site) => distanceBetweenCells(origin, site.origin) < CONSTRUCTION_SITE_SPACING)
  }

  function isConstructionOriginTooCloseToOtherAms(origin: LifeGodRelativeCell, builderAmId: string) {
    return amEntities.some((am) => {
      if (am.id === builderAmId) return false
      return distanceBetweenCells(origin, averagePosition(am.absoluteCells)) < CONSTRUCTION_SITE_SPACING
    })
  }

  function isReservedByOtherConstruction(x: number, y: number, siteId: string) {
    return constructionSites.some((site) =>
      site.id !== siteId &&
      getConstructionFootprintCells(site).some((cell) => cell.x === x && cell.y === y)
    )
  }

  function clearNormalMatterAt(cells: LifeGodRelativeCell[], keep = new Set<string>()) {
    for (const cell of cells) {
      if (cell.x <= 0 || cell.y <= 0 || cell.x >= GRID_WIDTH - 1 || cell.y >= GRID_HEIGHT - 1) continue
      if (keep.has(cellKey(cell.x, cell.y))) continue
      if (isReservedByEntity(cell.x, cell.y) || isReservedByProto(cell.x, cell.y)) continue
      const idx = indexAt(cell.x, cell.y)
      current[idx] = 0
      if (matterFrozen && frozenMatterGrid) frozenMatterGrid[idx] = 0
      stabilityGrid[idx] = 0
    }
  }

  function markMatterMovedFrom(cell: LifeGodRelativeCell) {
    if (cell.x <= 0 || cell.y <= 0 || cell.x >= GRID_WIDTH - 1 || cell.y >= GRID_HEIGHT - 1) return
    const idx = indexAt(cell.x, cell.y)
    movedMatterSourceGrid[idx] = 1
    current[idx] = 0
    next[idx] = 0
    stabilityGrid[idx] = 0
    if (matterFrozen && frozenMatterGrid) frozenMatterGrid[idx] = 0
  }

  function suppressMovedMatterSources(grid: Uint8Array) {
    for (let i = 0; i < movedMatterSourceGrid.length; i += 1) {
      if (movedMatterSourceGrid[i] === 1) grid[i] = 0
    }
  }

  function isCellReservedByOtherAm(x: number, y: number, amId: string) {
    return amEntities.some((am) =>
      am.id !== amId &&
      am.targetCell?.x === x &&
      am.targetCell.y === y
    )
  }

  function isFixedCellAvailable(x: number, y: number, amId: string, requireStable = true) {
    if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) return false
    if (!hasLivingCell(x, y)) return false
    if (isReservedByEntity(x, y) || isReservedByConstruction(x, y) || isReservedByProto(x, y)) return false
    if (isCellReservedByOtherAm(x, y, amId)) return false
    return matterFrozen || !requireStable || stabilityGrid[indexAt(x, y)] >= STABILITY_THRESHOLD
  }

  function isFrozenMatterCell(x: number, y: number) {
    if (!frozenMatterGrid) return false
    if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) return false
    if (frozenMatterGrid[indexAt(x, y)] !== 1) return false
    if (terrainGrid[indexAt(x, y)] !== 0) return false
    return true
  }

  function isFrozenMatterAvailable(x: number, y: number, amId: string) {
    if (!isFrozenMatterCell(x, y)) return false
    if (isReservedByEntity(x, y) || isReservedByConstruction(x, y) || isReservedByProto(x, y)) return false
    return true
  }

  function isFrozenMatterTargetAvailable(cell: LifeGodRelativeCell, amId: string) {
    return isFrozenMatterAvailable(cell.x, cell.y, amId) && !isTerraformReservedByOtherAm(cell, amId)
  }

  function findNearestFrozenMatter(cx: number, cy: number, am: LifeGodAmEntity): LifeGodRelativeCell | null {
    const seekFrozenMatterWeight = getBrainWeight(am, 'seekFrozenMatter')
    const terraformWeight = getBrainWeight(am, 'terraform')
    for (let r = 1; r <= TERRAFORM_SEARCH_RADIUS; r += 1) {
      const candidates: { cell: LifeGodRelativeCell; score: number }[] = []
      for (let oy = -r; oy <= r; oy += 1) {
        for (let ox = -r; ox <= r; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue
          const x = cx + ox
          const y = cy + oy
          const cell = { x, y }
          if (!isFrozenMatterTargetAvailable(cell, am.id)) continue
          candidates.push({
            cell,
            score:
              getCommunicationScore(cell, am) * seekFrozenMatterWeight +
              countLocalGridDensity(frozenMatterGrid, cell, 3, (value) => value === 1) * terraformWeight -
              getWallDangerAt(cell, am) * 20 * getBrainWeight(am, 'avoidWall') -
              getCrowdingAt(cell, am).crowdCount * 12 * getBrainWeight(am, 'avoidCrowd'),
          })
        }
      }
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.score - a.score)
        return candidates[0].cell
      }
    }
    return null
  }

  function getTerrainRoleScore(am: LifeGodAmEntity, terrainType: LifeGodTerrainType) {
    if (terrainType === 0) return -999
    if (am.role === 'builder') {
      if (terrainType === 4) return 22
      if (terrainType === 1) return 10
      if (terrainType === 2) return 2
      return -10
    }
    if (am.role === 'gatherer') {
      if (terrainType === 2) return 18
      if (terrainType === 1) return 10
      if (terrainType === 4) return -4
      return -8
    }
    if (terrainType === 3) return 17
    if (terrainType === 2) return 10
    if (terrainType === 1) return 8
    return -6
  }

  function scoreTerraformCell(x: number, y: number, terrainType: LifeGodTerrainType, am: LifeGodAmEntity) {
    if (terrainType === 0 || !isFrozenMatterCell(x, y)) return -Infinity

    const cell = { x, y }
    const stats = getTerrainNeighborStats(x, y, terrainType)
    const similarScore = stats.sameNeighbors * 2
    const compatibleScore = stats.compatibleNeighbors * 12
    const terrainNearby = countLocalGridDensity(terrainGrid, cell, 5, (value) => value > 0)
    const frozenDensity = countLocalGridDensity(frozenMatterGrid, cell, TERRAFORM_PATCH_RADIUS, (value) => value === 1)
    const saturation = countLocalGridDensity(terrainGrid, cell, 2, (value) => value > 0)
    const wallPenalty = getWallDangerAt(cell, am) * 24 * getBrainWeight(am, 'avoidWall')
    const crowdPenalty = getCrowdingAt(cell, am).crowdCount * 14 * getBrainWeight(am, 'avoidCrowd')
    const failedPenalty =
      am.memory.failedTerraformTargets.some((target) => distanceBetweenCells(target, cell) <= 6) ||
      am.memory.failedAreas.some((area) => distanceBetweenCells(area, cell) <= LOCAL_STUCK_RADIUS)
        ? 60
        : 0

    let terrainShapeScore = 0
    if (terrainType === 1) {
      terrainShapeScore += stats.terrainNeighbors > 0 ? 8 : 2
    } else if (terrainType === 2) {
      terrainShapeScore += (stats.soilNeighbors + stats.vegetationNeighbors) * 18
      if (stats.soilNeighbors + stats.vegetationNeighbors === 0) terrainShapeScore -= 6
    } else if (terrainType === 3) {
      terrainShapeScore += stats.waterNeighbors * 24
      terrainShapeScore += Math.max(stats.horizontalSame, stats.verticalSame) * 18
      if (stats.waterNeighbors === 0 && terrainNearby > 0) terrainShapeScore -= 8
      if (stats.waterNeighbors === 0 && terrainNearby === 0) terrainShapeScore -= 12
    } else if (terrainType === 4) {
      terrainShapeScore += stats.rockNeighbors * 24 + stats.soilNeighbors * 8
    }

    return (
      80 +
      frozenDensity * 3 * getBrainWeight(am, 'terraform') +
      getTerrainRoleScore(am, terrainType) +
      similarScore +
      compatibleScore +
      terrainShapeScore -
      saturation * 7 -
      wallPenalty -
      crowdPenalty -
      failedPenalty +
      Math.min(getMinDistanceToOtherAms(cell, am), 20) * getBrainWeight(am, 'avoidCrowd') +
      Math.random() * 3
    )
  }

  function chooseTerraformTerrainType(am: LifeGodAmEntity, x: number, y: number): LifeGodTerrainType {
    const terrainTypes: LifeGodTerrainType[] = [1, 2, 3, 4]
    const scored = terrainTypes
      .map((terrainType) => ({
        terrainType,
        score: scoreTerraformCell(x, y, terrainType, am),
      }))
      .sort((a, b) => b.score - a.score)

    return scored[0]?.terrainType ?? 1
  }

  function isTerrainCoherentWithRole(am: LifeGodAmEntity, terrainType: number) {
    if (am.role === 'builder') return terrainType === 1 || terrainType === 4
    if (am.role === 'gatherer') return terrainType === 1 || terrainType === 2
    return terrainType === 1 || terrainType === 2 || terrainType === 3
  }

  function terrainBehaviorState(terrainType: number): LifeGodAmBehaviorState {
    if (terrainType === 2) return 'shapingVegetation'
    if (terrainType === 3) return 'shapingWater'
    if (terrainType === 4) return 'shapingRock'
    return 'shapingSoil'
  }

  function terraformAround(am: LifeGodAmEntity, origin: LifeGodRelativeCell): LifeGodAmEntity {
    if (!frozenMatterGrid) return { ...am, behaviorState: 'resting' as const, targetCell: null }
    const candidates: Array<{
      x: number
      y: number
      terrainType: LifeGodTerrainType
      score: number
      stats: ReturnType<typeof getTerrainNeighborStats>
    }> = []

    for (let oy = -TERRAFORM_PATCH_RADIUS; oy <= TERRAFORM_PATCH_RADIUS; oy += 1) {
      for (let ox = -TERRAFORM_PATCH_RADIUS; ox <= TERRAFORM_PATCH_RADIUS; ox += 1) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) > TERRAFORM_PATCH_RADIUS) continue
        const x = origin.x + ox
        const y = origin.y + oy
        if (!isFrozenMatterCell(x, y)) continue
        const terrainType = chooseTerraformTerrainType(am, x, y)
        const score = scoreTerraformCell(x, y, terrainType, am)
        if (!Number.isFinite(score)) continue
        candidates.push({
          x,
          y,
          terrainType,
          score,
          stats: getTerrainNeighborStats(x, y, terrainType),
        })
      }
    }

    candidates.sort((a, b) => b.score - a.score)

    let converted = 0
    let primaryTerrainType: LifeGodTerrainType = 1
    let coherentPatchCells = 0
    let waterConnectedCells = 0
    let vegetationExtendedCells = 0
    let rockClusteredCells = 0
    let isolatedCells = 0
    let scatteredWaterCells = 0
    const localSaturation = countLocalGridDensity(terrainGrid, origin, 2, (value) => value > 0)

    for (const candidate of candidates) {
      if (converted >= TERRAFORM_CELLS_PER_ACTION) break
      if (!isFrozenMatterCell(candidate.x, candidate.y)) continue
      const idx = indexAt(candidate.x, candidate.y)
      frozenMatterGrid[idx] = 0
      current[idx] = 0
      terrainGrid[idx] = candidate.terrainType
      if (converted === 0) primaryTerrainType = candidate.terrainType
      converted += 1

      const nextStats = getTerrainNeighborStats(candidate.x, candidate.y, candidate.terrainType)
      if (nextStats.compatibleNeighbors > 0) coherentPatchCells += 1
      if (candidate.terrainType === 3 && nextStats.waterNeighbors > 0) waterConnectedCells += 1
      if (candidate.terrainType === 2 && nextStats.soilNeighbors + nextStats.vegetationNeighbors > 0) vegetationExtendedCells += 1
      if (candidate.terrainType === 4 && nextStats.rockNeighbors > 0) rockClusteredCells += 1
      if (nextStats.compatibleNeighbors === 0) isolatedCells += 1
      if (candidate.terrainType === 3 && nextStats.waterNeighbors === 0) scatteredWaterCells += 1
    }

    const previousTerraformCount = am.memory.terraformedCells
    let rewardedAm = am
    if (converted > 0) {
      rewardedAm = rewardAm(rewardedAm, converted * 4, 'terraform_success')
      if (isTerrainCoherentWithRole(am, primaryTerrainType)) {
        rewardedAm = rewardAm(rewardedAm, 6, 'role_coherent_terrain')
      }
      if (coherentPatchCells > 0) rewardedAm = rewardAm(rewardedAm, coherentPatchCells * 3, 'terraform_patch_coherent')
      if (waterConnectedCells > 0) rewardedAm = rewardAm(rewardedAm, waterConnectedCells * 4, 'water_connected')
      if (vegetationExtendedCells > 0) rewardedAm = rewardAm(rewardedAm, vegetationExtendedCells * 4, 'vegetation_extended')
      if (rockClusteredCells > 0) rewardedAm = rewardAm(rewardedAm, rockClusteredCells * 4, 'rock_clustered')
      if (isolatedCells > 0) rewardedAm = penalizeAm(rewardedAm, isolatedCells * 2, 'isolated_terrain')
      if (scatteredWaterCells > 0) rewardedAm = penalizeAm(rewardedAm, scatteredWaterCells * 2, 'scattered_water')
      if (localSaturation >= 12) rewardedAm = penalizeAm(rewardedAm, 2, 'saturated_terraform_zone')
      if (
        Math.floor((previousTerraformCount + converted) / TERRAFORM_VISIBLE_PROGRESS_STEP) >
        Math.floor(previousTerraformCount / TERRAFORM_VISIBLE_PROGRESS_STEP)
      ) {
        rewardedAm = rewardAm(rewardedAm, 10, 'terraform_progress_visible')
      }
    } else {
      rewardedAm = penalizeAm(rewardedAm, localSaturation >= 12 ? 2 : 2, localSaturation >= 12 ? 'saturated_terraform_zone' : 'empty_terraform_search')
    }

    const communicatedAm = converted > 0
      ? publishAmMessage(rewardedAm, 'goodTerraformZone', origin, 1 + converted / 3)
      : rewardedAm

    if (converted > 0) releaseTerraformReservation(am.id)

    return {
      ...communicatedAm,
      behaviorState: converted > 0 ? terrainBehaviorState(primaryTerrainType) : 'seekingFrozenMatter',
      currentGoal: 'terraforming',
      targetCell: null,
      targetPosition: origin,
      memory: {
        ...communicatedAm.memory,
        lastTargetCell: origin,
        terraformedCells: communicatedAm.memory.terraformedCells + converted,
        usefulZones: converted > 0 ? rememberCell(communicatedAm.memory.usefulZones, origin) : communicatedAm.memory.usefulZones,
        terraformStuckTicks: converted > 0 ? 0 : communicatedAm.memory.terraformStuckTicks + 1,
        lastTerraformConversionTick: converted > 0 ? generation : communicatedAm.memory.lastTerraformConversionTick,
        lastTerraformAction: converted > 0 ? `converted_${converted}` : 'empty_zone',
        recoveryTriggered: false,
        lastUsefulActionTick: converted > 0 ? generation : communicatedAm.memory.lastUsefulActionTick,
      },
      behaviorCooldown: TERRAFORM_COOLDOWN,
    }
  }

  function findNearestStableCell(cx: number, cy: number, am: LifeGodAmEntity): { x: number; y: number } | null {
    const seekCellsWeight = getBrainWeight(am, 'seekCells')
    const gatherCellsWeight = getBrainWeight(am, 'gatherCells')
    for (let pass = 0; pass < 2; pass += 1) {
      const requireStable = pass === 0
      for (let r = 1; r <= CELL_ATTRACTION_RADIUS; r += 1) {
        const candidates: { cell: LifeGodRelativeCell; score: number }[] = []
        for (let oy = -r; oy <= r; oy += 1) {
          for (let ox = -r; ox <= r; ox += 1) {
            if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue
            const x = cx + ox
            const y = cy + oy
            if (!isFixedCellAvailable(x, y, am.id, requireStable)) continue
            const cell = { x, y }
            candidates.push({
              cell,
              score:
                stabilityGrid[indexAt(x, y)] * seekCellsWeight +
                countLivingNeighbors(x, y) * gatherCellsWeight +
                getCommunicationScore(cell, am) -
                getWallDangerAt(cell, am) * 16 * getBrainWeight(am, 'avoidWall') -
                getCrowdingAt(cell, am).crowdCount * 10 * getBrainWeight(am, 'avoidCrowd'),
            })
          }
        }
        if (candidates.length > 0) {
          candidates.sort((a, b) => b.score - a.score)
          return candidates[0].cell
        }
      }
    }
    return null
  }

  function findFallbackFrozenMatter(am: LifeGodAmEntity): LifeGodRelativeCell | null {
    const center = getAmCenter(am)
    const failed = am.memory.failedTerraformTargets
    const blocked = am.memory.recentBlockedPositions
    const seekFrozenMatterWeight = getBrainWeight(am, 'seekFrozenMatter')
    const avoidWallWeight = getBrainWeight(am, 'avoidWall')
    const avoidCrowdWeight = getBrainWeight(am, 'avoidCrowd')
    const candidates: { cell: LifeGodRelativeCell; score: number }[] = []

    for (let r = 12; r <= Math.max(GRID_WIDTH, GRID_HEIGHT); r += 18) {
      for (let oy = -r; oy <= r; oy += 3) {
        for (let ox = -r; ox <= r; ox += 3) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue
          const cell = { x: Math.round(center.x + ox), y: Math.round(center.y + oy) }
          if (!isFrozenMatterTargetAvailable(cell, am.id)) continue
          if (failed.some((item) => distanceBetweenCells(item, cell) <= 8)) continue
          if (blocked.some((item) => distanceBetweenCells(item, cell) <= 6)) continue
          candidates.push({
            cell,
            score:
              distanceBetweenCells(cell, center) * 0.6 * seekFrozenMatterWeight +
              getMinDistanceToOtherAms(cell, am) * 1.8 * avoidCrowdWeight -
              getWallDangerAt(cell, am) * 30 * avoidWallWeight -
              getCommunicationScore(cell, am) * seekFrozenMatterWeight,
          })
        }
      }
      if (candidates.length > 0) break
    }

    candidates.sort((a, b) => b.score - a.score)
    return candidates[0]?.cell ?? null
  }

  function findKnownStableHint(am: LifeGodAmEntity) {
    const hints = [...am.memory.knownResourceHints, ...am.memory.usefulZones]
      .filter((cell) => isFixedCellAvailable(cell.x, cell.y, am.id, false))
      .sort((a, b) => distanceBetweenCells(getAmCenter(am), a) - distanceBetweenCells(getAmCenter(am), b))
    return hints[0] ?? null
  }

  function findKnownFrozenHint(am: LifeGodAmEntity) {
    const hints = [...am.memory.knownResourceHints, ...am.memory.usefulZones]
      .filter((cell) => isFrozenMatterTargetAvailable(cell, am.id))
      .sort((a, b) => distanceBetweenCells(getAmCenter(am), a) - distanceBetweenCells(getAmCenter(am), b))
    return hints[0] ?? null
  }

  function releaseGatheredCells(am: LifeGodAmEntity) {
    for (const cell of [...am.gatheredCells, ...(am.carriedCell ? [am.carriedCell] : [])]) {
      if (cell.x <= 0 || cell.y <= 0 || cell.x >= GRID_WIDTH - 1 || cell.y >= GRID_HEIGHT - 1) continue
      const idx = indexAt(cell.x, cell.y)
      current[idx] = 1
      if (matterFrozen && frozenMatterGrid) frozenMatterGrid[idx] = 1
    }
  }

  // Met à jour stabilityGrid en comparant l'état courant au tick précédent.
  // Cellule vivante dans les deux ticks → stabilité++. Sinon → reset à 0.
  function updateStabilityGrid() {
    for (let i = 0; i < current.length; i += 1) {
      if (current[i] === 1 && prevGrid[i] === 1) {
        if (stabilityGrid[i] < 255) stabilityGrid[i] += 1
      } else {
        stabilityGrid[i] = 0
      }
    }
    prevGrid.set(current)
  }

  function countLivingNeighbors(x: number, y: number) {
    let count = 0
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        if (ox === 0 && oy === 0) continue
        const nx = x + ox
        const ny = y + oy
        if (nx <= 0 || ny <= 0 || nx >= GRID_WIDTH - 1 || ny >= GRID_HEIGHT - 1) continue
        count += current[indexAt(nx, ny)]
      }
    }
    return count
  }

  function averagePosition(cells: LifeGodRelativeCell[]) {
    let totalX = 0
    let totalY = 0
    for (const cell of cells) {
      totalX += cell.x
      totalY += cell.y
    }
    return {
      x: totalX / Math.max(cells.length, 1),
      y: totalY / Math.max(cells.length, 1),
    }
  }

  function getLineageAnchor(lineageId: string, excludeAmId: string) {
    const cells = amEntities
      .filter((am) => am.id !== excludeAmId && am.lineageId === lineageId)
      .flatMap((am) => am.absoluteCells)

    if (cells.length === 0) return { x: GRID_WIDTH / 2, y: GRID_HEIGHT / 2 }
    return averagePosition(cells)
  }

  function getLivingDensityAt(position: { x: number; y: number }, am: LifeGodAmEntity) {
    let density = 0
    for (const cell of am.cells) {
      density += countLivingNeighbors(position.x + cell.x, position.y + cell.y)
    }
    return density
  }

  function getMinDistanceToOtherAms(position: { x: number; y: number }, am: LifeGodAmEntity) {
    let minDistance = Infinity
    const candidateCenter = averagePosition(computeAbsoluteCells(am.cells, position))

    for (const other of amEntities) {
      if (other.id === am.id) continue
      const otherCenter = averagePosition(other.absoluteCells)
      const distance = Math.abs(candidateCenter.x - otherCenter.x) + Math.abs(candidateCenter.y - otherCenter.y)
      if (distance < minDistance) minDistance = distance
    }

    return Number.isFinite(minDistance) ? minDistance : 999
  }

  function getCrowdingAt(position: { x: number; y: number }, am: LifeGodAmEntity) {
    const center = getAmCenter(am, position)
    let closeCount = 0
    let crowdCount = 0
    let targetConflictCount = 0

    for (const other of amEntities) {
      if (other.id === am.id) continue
      const otherCenter = averagePosition(other.absoluteCells)
      const distance = distanceBetweenCells(center, otherCenter)
      if (distance <= OVERCROWD_CLOSE_RADIUS) closeCount += 1
      if (distance <= OVERCROWD_RADIUS) crowdCount += 1

      const otherTarget = other.targetPosition ?? other.targetCell ?? other.buildSite
      if (otherTarget && distanceBetweenCells(center, otherTarget) <= OVERCROWD_RADIUS) {
        targetConflictCount += 1
      }
    }

    return { closeCount, crowdCount, targetConflictCount }
  }

  function getWallDangerAt(position: { x: number; y: number }, am: LifeGodAmEntity) {
    const cells = computeAbsoluteCells(am.cells, position)
    const bounds = cells.reduce(
      (acc, cell) => ({
        minX: Math.min(acc.minX, cell.x),
        minY: Math.min(acc.minY, cell.y),
        maxX: Math.max(acc.maxX, cell.x),
        maxY: Math.max(acc.maxY, cell.y),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    )
    const left = Math.max(0, WALL_DANGER_MARGIN - bounds.minX + 1)
    const top = Math.max(0, WALL_DANGER_MARGIN - bounds.minY + 1)
    const right = Math.max(0, bounds.maxX - (GRID_WIDTH - 1 - WALL_DANGER_MARGIN) + 1)
    const bottom = Math.max(0, bounds.maxY - (GRID_HEIGHT - 1 - WALL_DANGER_MARGIN) + 1)
    return left + top + right + bottom
  }

  function getInwardWallScore(position: { x: number; y: number }, am: LifeGodAmEntity) {
    const currentDanger = getWallDangerAt(am.position, am)
    const nextDanger = getWallDangerAt(position, am)
    if (currentDanger === 0 && nextDanger === 0) return 0
    return (currentDanger - nextDanger) * 18 - nextDanger * 22
  }

  function getCommunicationScore(position: { x: number; y: number }, am: LifeGodAmEntity) {
    const center = getAmCenter(am, position)
    let score = 0

    for (const message of amMessages) {
      if (message.senderAmId === am.id) continue
      const distance = distanceBetweenCells(center, message.position)
      if (distance > COMMUNICATION_RADIUS) continue
      const strength = Math.max(0, message.strength * (1 - message.ageTicks / MESSAGE_TTL_TICKS))
      if (strength <= 0) continue

      if (message.type === 'overcrowdedArea' || message.type === 'wallDanger' || message.type === 'areaBusy' || message.type === 'terraformingZoneClaimed') {
        score -= Math.max(0, 18 - distance) * 2.4 * strength
      }
      if (
        (am.currentGoal === 'terraforming' && (message.type === 'frozenMatterFound' || message.type === 'goodTerraformZone')) ||
        (am.currentGoal === 'expandingPopulation' && message.type === 'stableCellsFound')
      ) {
        score += Math.max(0, 16 - distance) * 1.6 * strength
      }
      if (message.type === 'buildSiteReserved') {
        score -= Math.max(0, 12 - distance) * 2 * strength
      }
    }

    return score
  }

  function getRecentPositionPenalty(position: { x: number; y: number }, am: LifeGodAmEntity) {
    return am.memory.recentPositions.reduce((penalty, item, index) => {
      const distance = distanceBetweenCells(position, item)
      if (distance > 1) return penalty
      const recency = (index + 1) / Math.max(am.memory.recentPositions.length, 1)
      return penalty + recency * 8
    }, 0)
  }

  function getInfluenceScore(position: { x: number; y: number }, am: LifeGodAmEntity) {
    if (!influencePoint) return 0
    const center = averagePosition(computeAbsoluteCells(am.cells, position))
    const distance = Math.abs(center.x - influencePoint.x) + Math.abs(center.y - influencePoint.y)
    const clamped = Math.max(0, 18 - distance)
    if (clamped === 0) return 0
    return influencePoint.mode === 'attract' ? clamped * 7 : -clamped * 7
  }

  function countLocalGridDensity(grid: Uint8Array | null, center: LifeGodRelativeCell, radius: number, match: (value: number) => boolean) {
    if (!grid) return 0
    let matching = 0
    let total = 0
    const cx = Math.round(center.x)
    const cy = Math.round(center.y)
    for (let y = cy - radius; y <= cy + radius; y += 1) {
      for (let x = cx - radius; x <= cx + radius; x += 1) {
        if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) continue
        total += 1
        if (match(grid[indexAt(x, y)])) matching += 1
      }
    }
    return total > 0 ? matching / total : 0
  }

  function getLocalTerrainInfo(am: LifeGodAmEntity) {
    const center = getAmCenter(am)
    return {
      0: countLocalGridDensity(terrainGrid, center, 6, (value) => value === 0),
      1: countLocalGridDensity(terrainGrid, center, 6, (value) => value === 1),
      2: countLocalGridDensity(terrainGrid, center, 6, (value) => value === 2),
      3: countLocalGridDensity(terrainGrid, center, 6, (value) => value === 3),
      4: countLocalGridDensity(terrainGrid, center, 6, (value) => value === 4),
    }
  }

  function getAmWallDistances(am: LifeGodAmEntity) {
    const bounds = am.absoluteCells.reduce(
      (acc, cell) => ({
        minX: Math.min(acc.minX, cell.x),
        minY: Math.min(acc.minY, cell.y),
        maxX: Math.max(acc.maxX, cell.x),
        maxY: Math.max(acc.maxY, cell.y),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    )
    return {
      left: Math.max(0, bounds.minX),
      right: Math.max(0, GRID_WIDTH - 1 - bounds.maxX),
      top: Math.max(0, bounds.minY),
      bottom: Math.max(0, GRID_HEIGHT - 1 - bounds.maxY),
    }
  }

  function createAmPolicyWorldState(): AmPolicyWorldState {
    return {
      currentMission,
      getWallDistances: getAmWallDistances,
      getDistanceToTargetCell: (am) => am.targetCell ? distanceBetweenCells(getAmCenter(am), am.targetCell) : null,
      getDistanceToBuildSite: (am) => am.buildSite ? distanceBetweenCells(getAmCenter(am), am.buildSite) : null,
      getDistanceToNearestAm: (am) => getMinDistanceToOtherAms(am.position, am),
      getDensityAroundAm: (am) => getLivingDensityAt(am.position, am),
      getStableCellDensity: (am) => countLocalGridDensity(stabilityGrid, getAmCenter(am), 6, (value) => value >= STABILITY_THRESHOLD),
      getFrozenMatterDensity: (am) => countLocalGridDensity(frozenMatterGrid, getAmCenter(am), 6, (value) => value === 1),
      getTerrainInfoLocal: getLocalTerrainInfo,
      isOvercrowded: (am) => getCrowdingAt(am.position, am).closeCount > 0 || am.memory.overcrowdedTicks > 0,
    }
  }

  function getPolicyOutputForAm(am: LifeGodAmEntity) {
    const input = buildAmPolicyInput(am, createAmPolicyWorldState())
    const output = amPolicyProvider.scoreActions(input)
    return {
      input,
      output,
      debug: createAmPolicyDebugSnapshot(input, output),
    }
  }

  function findBehaviorTarget(am: LifeGodAmEntity) {
    const candidates = getMovementCandidates(am).filter((position) => canMoveAmTo(am, position))
    if (candidates.length === 0) return null
    const policy = getPolicyOutputForAm(am)

    const scored = applyPolicyToMovementScoring(
      am,
      policy.output,
      candidates
      .map((position) => ({
        position,
        step: { x: position.x - am.position.x, y: position.y - am.position.y },
        score: scoreMovement(am, position),
      })),
      AM_POLICY_MOVEMENT_WEIGHT
    )
      .sort((a, b) => b.score - a.score)

    return scored[0]?.position ?? null
  }

  function findNearbyConstructionOrigin(parent: LifeGodAmEntity, pattern: LifeGodAmPattern) {
    const roleConfig = ROLE_CONFIG[parent.role]
    const buildAmWeight = getBrainWeight(parent, 'buildAm')
    const exploreWeight = getBrainWeight(parent, 'explore')
    const seekCellsWeight = getBrainWeight(parent, 'seekCells')
    const avoidWallWeight = getBrainWeight(parent, 'avoidWall')
    const candidates: { x: number; y: number; score: number }[] = []

    for (let distance = roleConfig.reproductionDistanceMin; distance <= roleConfig.searchRadius; distance += 2) {
      for (let oy = -distance; oy <= distance; oy += 1) {
        for (let ox = -distance; ox <= distance; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== distance) continue
          const origin = {
            x: parent.position.x + ox,
            y: parent.position.y + oy,
          }
          if (!canPlaceConstruction(pattern, origin, parent.id)) continue

          let localDensity = 0
          for (const cell of pattern.cells) {
            localDensity += countLivingNeighbors(origin.x + cell.x, origin.y + cell.y)
          }

          const score =
            parent.role === 'gatherer'
              ? localDensity * 8 * seekCellsWeight + localDensity * buildAmWeight - distance
              : parent.role === 'explorer'
                ? distance * 6 * exploreWeight + buildAmWeight - localDensity - getWallDangerAt(origin, parent) * 12 * avoidWallWeight
                : localDensity * 3 + buildAmWeight * 8 - distance * 2 - getWallDangerAt(origin, parent) * 12 * avoidWallWeight

          candidates.push({ ...origin, score })
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score)
    if (candidates.length === 0) return null
    return { x: candidates[0].x, y: candidates[0].y }
  }

  function tryStartReproduction() {
    // Reproduction is driven by the visible collect/deposit/assemble mission in tickRoleBehavior.
  }

  function tickConstructionSites() {
    if (constructionSites.length === 0) return

    const completed: { siteId: string; lineageId: string; patternId: string; origin: { x: number; y: number }; builderAmId: string }[] = []
    const progressedBuilderIds = new Set<string>()

    constructionSites = constructionSites.filter((site) => {
      const targetPattern = LIFE_GOD_AM_PATTERNS.find((pattern) => pattern.id === site.targetPatternId)
      if (!targetPattern) return false
      const targetCells = computeAbsoluteCells(targetPattern.cells, site.origin)
      const assembling = site.depositedCells.length >= site.requiredCellCount
      const keptCells = new Set(site.depositedCells.map((cell) => cellKey(cell.x, cell.y)))
      if (assembling) {
        for (const cell of targetCells.slice(0, site.assemblyProgress)) {
          keptCells.add(cellKey(cell.x, cell.y))
        }
      }
      clearNormalMatterAt(getBuildFootprintCells(targetPattern, site.origin), keptCells)
      site.cells = assembling ? targetPattern.cells : site.depositedCells.map((cell) => ({
        x: cell.x - site.origin.x,
        y: cell.y - site.origin.y,
      }))
      site.absoluteCells = assembling ? targetCells : site.depositedCells

      if (!assembling) {
        for (const cell of site.depositedCells) {
          current[indexAt(cell.x, cell.y)] = 1
          if (matterFrozen && frozenMatterGrid) frozenMatterGrid[indexAt(cell.x, cell.y)] = 1
        }
        return true
      }

      if (site.assemblyProgress === 0) {
        for (const cell of site.depositedCells) {
          current[indexAt(cell.x, cell.y)] = 0
          if (matterFrozen && frozenMatterGrid) frozenMatterGrid[indexAt(cell.x, cell.y)] = 0
        }
      }

      for (const cell of targetCells.slice(0, site.assemblyProgress)) {
        current[indexAt(cell.x, cell.y)] = 1
      }

      if (site.assemblyProgress >= targetCells.length) {
        completed.push({
          siteId: site.id,
          lineageId: site.lineageId,
          patternId: site.targetPatternId,
          origin: site.origin,
          builderAmId: site.builderAmId,
        })
        return false
      }

      if ((generation - site.createdAtCycle) % CONSTRUCTION_STEP_INTERVAL === 0) {
        const nextCell = targetCells[site.assemblyProgress]
        current[indexAt(nextCell.x, nextCell.y)] = 1
        site.assemblyProgress += 1
        progressedBuilderIds.add(site.builderAmId)
      }

      return true
    })

    for (const item of completed) {
      const lineage = amLineages.find((entry) => entry.id === item.lineageId)
      const pattern = LIFE_GOD_AM_PATTERNS.find((entry) => entry.id === item.patternId)
      if (!lineage || !pattern) continue
      if (!canFinishStartedAm()) continue
      if (populationForLineage(lineage.id) >= MAX_AMS_PER_LINEAGE) continue
      const parentAm = amEntities.find((am) => am.id === item.builderAmId)
      spawnAm(lineage, pattern, item.origin, parentAm)
      amEntities = amEntities.map((am) =>
        am.id === item.builderAmId ? rewardAm(am, 6, 'build_complete') : am
      )
    }

    if (progressedBuilderIds.size > 0) {
      amEntities = amEntities.map((am) =>
        progressedBuilderIds.has(am.id)
          ? (() => {
              const rewardedAm = rewardAm(am, 1.5, 'build_progress')
              return {
                ...rewardedAm,
                memory: {
                  ...rewardedAm.memory,
                  lastUsefulActionTick: generation,
                },
              }
            })()
          : am
      )
    }

    amEntities = amEntities.map((am) =>
      constructionSites.some((site) => site.builderAmId === am.id)
        ? am
        : am.behaviorState === 'assemblingAm'
          ? { ...am, behaviorState: 'resting', buildTarget: null, buildSite: null, targetCell: null, carriedCell: null, gatheredCells: [] }
        : am
    )
  }

  function canMoveAmTo(am: LifeGodAmEntity, position: { x: number; y: number }) {
    if (!canMoveAmThroughStaticObstacles(am, position)) return false
    return countAmSeparationViolationsAt(am, position) === 0
  }

  function isBlockedByConstructionForAm(am: LifeGodAmEntity, x: number, y: number) {
    return constructionSites.some((site) =>
      site.builderAmId !== am.id &&
      site.absoluteCells.some((item) => item.x === x && item.y === y)
    )
  }

  function canMoveAmThroughStaticObstacles(am: LifeGodAmEntity, position: { x: number; y: number }) {
    for (const cell of am.cells) {
      const x = position.x + cell.x
      const y = position.y + cell.y
      if (x <= 0 || y <= 0 || x >= GRID_WIDTH - 1 || y >= GRID_HEIGHT - 1) return false
      if (isBlockedByConstructionForAm(am, x, y)) return false
      if (protoEntities.some((proto) => proto.cells.some((item) => item.x === x && item.y === y))) return false
    }
    return true
  }

  function countAmSeparationViolationsAt(am: LifeGodAmEntity, position: { x: number; y: number }) {
    const candidateCells = computeAbsoluteCells(am.cells, position)
    let violations = 0
    for (const cell of candidateCells) {
      for (const other of amEntities) {
        if (other.id === am.id) continue
        for (const item of other.absoluteCells) {
          const distance = Math.max(Math.abs(item.x - cell.x), Math.abs(item.y - cell.y))
          if (distance <= MIN_AM_SEPARATION_CELLS) {
            violations += MIN_AM_SEPARATION_CELLS - distance + 1
          }
        }
      }
    }
    return violations
  }

  function getNearestAmCenter(position: { x: number; y: number }, am: LifeGodAmEntity) {
    const center = getAmCenter(am, position)
    let nearest: LifeGodRelativeCell | null = null
    let nearestDistance = Infinity
    for (const other of amEntities) {
      if (other.id === am.id) continue
      const otherCenter = averagePosition(other.absoluteCells)
      const distance = Math.abs(center.x - otherCenter.x) + Math.abs(center.y - otherCenter.y)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearest = otherCenter
      }
    }
    return nearest
  }

  function getWallEscapeVector(am: LifeGodAmEntity) {
    const bounds = am.absoluteCells.reduce(
      (acc, cell) => ({
        minX: Math.min(acc.minX, cell.x),
        minY: Math.min(acc.minY, cell.y),
        maxX: Math.max(acc.maxX, cell.x),
        maxY: Math.max(acc.maxY, cell.y),
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    )
    let x = 0
    let y = 0
    if (bounds.minX <= WALL_ESCAPE_MARGIN) x += WALL_ESCAPE_MARGIN - bounds.minX + 1
    if (bounds.maxX >= GRID_WIDTH - 1 - WALL_ESCAPE_MARGIN) x -= bounds.maxX - (GRID_WIDTH - 1 - WALL_ESCAPE_MARGIN) + 1
    if (bounds.minY <= WALL_ESCAPE_MARGIN) y += WALL_ESCAPE_MARGIN - bounds.minY + 1
    if (bounds.maxY >= GRID_HEIGHT - 1 - WALL_ESCAPE_MARGIN) y -= bounds.maxY - (GRID_HEIGHT - 1 - WALL_ESCAPE_MARGIN) + 1
    return { x, y }
  }

  function moveAwayFromWallOrObstacle(am: LifeGodAmEntity): LifeGodAmEntity {
    const avoidWallWeight = getBrainWeight(am, 'avoidWall')
    const avoidCrowdWeight = getBrainWeight(am, 'avoidCrowd')
    const exploreWeight = getBrainWeight(am, 'explore')
    const currentViolations = countAmSeparationViolationsAt(am, am.position)
    const wallVector = getWallEscapeVector(am)
    const obstacleVector = am.movementDirection
      ? { x: -am.movementDirection.x, y: -am.movementDirection.y }
      : { x: 0, y: 0 }
    const escapeVector = {
      x: wallVector.x !== 0 ? wallVector.x : obstacleVector.x,
      y: wallVector.y !== 0 ? wallVector.y : obstacleVector.y,
    }

    const candidates = getMovementCandidates(am)
      .filter((position) => position.x !== am.position.x || position.y !== am.position.y)
      .filter((position) => canMoveAmThroughStaticObstacles(am, position))
      .map((position) => {
        const violations = countAmSeparationViolationsAt(am, position)
        const step = { x: position.x - am.position.x, y: position.y - am.position.y }
        const travel = Math.max(Math.abs(step.x), Math.abs(step.y))
        const center = getAmCenter(am, position)
        const edgeDistance = Math.min(center.x, center.y, GRID_WIDTH - 1 - center.x, GRID_HEIGHT - 1 - center.y)
        const escapeAlignment = step.x * escapeVector.x + step.y * escapeVector.y
        const crowding = getCrowdingAt(position, am)
        return {
          position,
          step,
          violations,
          score:
            (currentViolations - violations) * 900 +
            escapeAlignment * 12 * avoidWallWeight +
            edgeDistance * 4 * exploreWeight +
            Math.min(getMinDistanceToOtherAms(position, am), MIN_AM_SEPARATION_CELLS + 12) * 8 * avoidCrowdWeight -
            crowding.closeCount * 70 * avoidCrowdWeight -
            crowding.crowdCount * 18 * avoidCrowdWeight -
            travel,
        }
      })
      .sort((a, b) => b.score - a.score)

    const best = candidates[0]
    if (!best || (currentViolations > 0 && best.violations > currentViolations)) {
      return {
        ...penalizeAm(am, 1.4, 'local_escape_blocked'),
        behaviorCooldown: 0,
        movementDirection: null,
        memory: {
          ...am.memory,
          explorationBoostTicks: Math.max(am.memory.explorationBoostTicks, 12),
          avoidCrowdBoostTicks: Math.max(am.memory.avoidCrowdBoostTicks, 14),
          lastStuckReason: 'local_escape_blocked',
        },
      }
    }
    return {
      ...rewardAm(am, best.violations < currentViolations ? 2.5 : 0.6, 'escape_spacing'),
      position: best.position,
      absoluteCells: computeAbsoluteCells(am.cells, best.position),
      targetPosition: best.position,
      movementDirection: best.step,
      behaviorCooldown: 0,
    }
  }

  function moveOutOfAmCollision(am: LifeGodAmEntity): LifeGodAmEntity | null {
    const currentViolations = countAmSeparationViolationsAt(am, am.position)
    if (currentViolations === 0) return null
    const avoidWallWeight = getBrainWeight(am, 'avoidWall')
    const avoidCrowdWeight = getBrainWeight(am, 'avoidCrowd')
    const nearestCenter = getNearestAmCenter(am.position, am)
    const currentCenter = getAmCenter(am)
    const currentOtherDistance = getMinDistanceToOtherAms(am.position, am)

    const candidates = getMovementCandidates(am)
      .filter((position) => position.x !== am.position.x || position.y !== am.position.y)
      .filter((position) => canMoveAmThroughStaticObstacles(am, position))
      .map((position) => {
        const violations = countAmSeparationViolationsAt(am, position)
        const step = { x: position.x - am.position.x, y: position.y - am.position.y }
        const travel = Math.max(Math.abs(step.x), Math.abs(step.y))
        const otherDistance = getMinDistanceToOtherAms(position, am)
        const awayVector = nearestCenter
          ? { x: currentCenter.x - nearestCenter.x, y: currentCenter.y - nearestCenter.y }
          : { x: 0, y: 0 }
        const movesAway = step.x * awayVector.x + step.y * awayVector.y > 0 ? 18 : 0
        const keepsDirection =
          am.movementDirection &&
          step.x === am.movementDirection.x &&
          step.y === am.movementDirection.y
            ? 1
            : 0
        return {
          position,
          step,
          violations,
          otherDistance,
          score:
            (currentViolations - violations) * 1200 -
            violations * 220 +
            Math.min(otherDistance, MIN_AM_SEPARATION_CELLS + 16) * 12 * avoidCrowdWeight +
            movesAway * avoidCrowdWeight -
            travel * 6 +
            keepsDirection +
            getInwardWallScore(position, am) * avoidWallWeight,
        }
      })
      .sort((a, b) => b.score - a.score)

    const best = candidates[0]
    const canTakeReliefStep =
      best &&
      (
        best.violations <= currentViolations ||
        best.otherDistance > currentOtherDistance ||
        best.step.x * (currentCenter.x - (nearestCenter?.x ?? currentCenter.x)) +
          best.step.y * (currentCenter.y - (nearestCenter?.y ?? currentCenter.y)) > 0
      )

    if (!best || !canTakeReliefStep) {
      return {
        ...penalizeAm(am, 1.2, 'collision_escape_blocked'),
        behaviorCooldown: 0,
        movementDirection: am.movementDirection ? { x: -am.movementDirection.x, y: -am.movementDirection.y } : null,
        memory: {
          ...am.memory,
          avoidCrowdBoostTicks: Math.max(am.memory.avoidCrowdBoostTicks, 16),
          explorationBoostTicks: Math.max(am.memory.explorationBoostTicks, 10),
          lastStuckReason: 'collision_escape_blocked',
        },
      }
    }

    const rewardedAm = rewardAm(am, best.violations < currentViolations ? 5 : 1.8, 'collision_avoided')
    return {
      ...rewardedAm,
      position: best.position,
      absoluteCells: computeAbsoluteCells(am.cells, best.position),
      targetPosition: am.targetCell ?? am.buildSite ?? best.position,
      movementDirection: best.step,
      behaviorCooldown: 0,
      memory: {
        ...rewardedAm.memory,
        avoidCrowdBoostTicks: Math.max(rewardedAm.memory.avoidCrowdBoostTicks, 12),
      },
    }
  }

  function getMovementCandidates(am: LifeGodAmEntity) {
    const roleConfig = ROLE_CONFIG[am.role]
    const candidates: { x: number; y: number }[] = []

    for (let oy = -roleConfig.movementReach; oy <= roleConfig.movementReach; oy += 1) {
      for (let ox = -roleConfig.movementReach; ox <= roleConfig.movementReach; ox += 1) {
        candidates.push({ x: am.position.x + ox, y: am.position.y + oy })
      }
    }

    return candidates
  }

  function scoreMovement(am: LifeGodAmEntity, position: { x: number; y: number }) {
    const exploreWeight = getBrainWeight(am, 'explore')
    const seekCellsWeight = getBrainWeight(am, 'seekCells')
    const buildAmWeight = getBrainWeight(am, 'buildAm')
    const avoidWallWeight = getBrainWeight(am, 'avoidWall')
    const avoidCrowdWeight = getBrainWeight(am, 'avoidCrowd')
    const seekFrozenMatterWeight = getBrainWeight(am, 'seekFrozenMatter')
    const terraformWeight = getBrainWeight(am, 'terraform')
    const density = getLivingDensityAt(position, am)
    const otherDistance = getMinDistanceToOtherAms(position, am)
    const crowding = getCrowdingAt(position, am)
    const lineageAnchor = getLineageAnchor(am.lineageId, am.id)
    const center = averagePosition(computeAbsoluteCells(am.cells, position))
    const lineageDistance = Math.abs(center.x - lineageAnchor.x) + Math.abs(center.y - lineageAnchor.y)
    const influenceScore = getInfluenceScore(position, am)
    const avoidCrowdBoost = 1 + Math.min(1.3, (am.memory.avoidCrowdBoostTicks + am.memory.overcrowdedTicks) / 16)
    const exploreBoost = 1 + Math.min(1.1, (am.memory.explorationBoostTicks + am.memory.wallStickTicks) / 18)
    const independenceScore =
      Math.min(otherDistance, 26) * 2.5 * avoidCrowdBoost * avoidCrowdWeight -
      crowding.closeCount * 48 * avoidCrowdBoost * avoidCrowdWeight -
      crowding.crowdCount * 16 * avoidCrowdBoost * avoidCrowdWeight -
      crowding.targetConflictCount * 10 * avoidCrowdWeight
    const wallScore = getInwardWallScore(position, am) * avoidWallWeight
    const memoryScore = -getRecentPositionPenalty(position, am)
    const communicationScore = getCommunicationScore(position, am)

    if (am.behaviorState === 'escapingStuckArea' && am.memory.escapeTarget && am.memory.stuckAreaCenter) {
      const escapeDistance = distanceBetweenCells(center, am.memory.escapeTarget)
      const stuckDistance = distanceBetweenCells(center, am.memory.stuckAreaCenter)
      const failedAreaPenalty = isNearFailedArea(am, center, LOCAL_STUCK_RADIUS) ? 80 : 0
      return -escapeDistance * 55 * exploreWeight + stuckDistance * 35 * exploreWeight + independenceScore + wallScore + memoryScore - failedAreaPenalty + influenceScore
    }

    if (am.behaviorState === 'assemblingAm') {
      if (am.buildTarget) {
        const distToSite = Math.abs(center.x - am.buildTarget.x) + Math.abs(center.y - am.buildTarget.y)
        return -distToSite * 5 * buildAmWeight + independenceScore * 0.35 + wallScore + memoryScore + communicationScore + Math.random() * 4 + influenceScore
      }
      return density * 2 * buildAmWeight + independenceScore * 0.45 + wallScore + memoryScore + communicationScore + Math.random() * 4 + influenceScore
    }

    if (am.currentGoal === 'terraforming') {
      const frozenDensity = countLocalGridDensity(frozenMatterGrid, center, 5, (value) => value === 1)
      return frozenDensity * 4 * terraformWeight + density * 1.5 + independenceScore * 0.85 + wallScore + memoryScore + communicationScore * seekFrozenMatterWeight - lineageDistance * 2 * exploreWeight + influenceScore
    }

    if (am.role === 'explorer') {
      return lineageDistance * 4 * exploreBoost * exploreWeight + independenceScore + wallScore + memoryScore + communicationScore - density * 1.5 + influenceScore
    }
    if (am.role === 'gatherer') {
      return density * 7 * seekCellsWeight + independenceScore * 0.75 + wallScore + memoryScore + communicationScore - lineageDistance * 1.4 + influenceScore
    }
    return density * 2.5 * seekCellsWeight + independenceScore * 0.85 + wallScore + memoryScore + communicationScore - lineageDistance * 3.5 + influenceScore
  }

  function createBuildSiteMission(am: LifeGodAmEntity): LifeGodAmEntity {
    const roleConfig = ROLE_CONFIG[am.role]
    const creatorPattern = LIFE_GOD_AM_PATTERNS.find((pattern) => pattern.id === am.patternId)
    const preferredPatterns = [
      ...(creatorPattern ? [creatorPattern] : []),
      ...LIFE_GOD_AM_PATTERNS.filter((pattern) => pattern.id !== creatorPattern?.id),
    ]
    const pattern = preferredPatterns.find((candidate) => {
      const existingLineage = amLineages.find((item) => item.patternId === candidate.id) ?? null
      if (!existingLineage && activePatternIds.length >= MAX_ACTIVE_PATTERNS_PER_SEED) return false
      return !existingLineage || populationForLineage(existingLineage.id) < MAX_AMS_PER_LINEAGE
    }) ?? choosePatternForBirth()
    let lineage = amLineages.find((item) => item.patternId === pattern.id) ?? null

    if (!lineage) {
      if (activePatternIds.length >= MAX_ACTIVE_PATTERNS_PER_SEED) return { ...am, behaviorState: 'resting' as const }
      lineage = createLineage(pattern)
    }
    if (populationForLineage(lineage.id) >= MAX_AMS_PER_LINEAGE) return { ...am, behaviorState: 'resting' as const }

    const origin = findNearbyConstructionOrigin(am, pattern)
    if (!origin) return { ...am, behaviorState: 'wandering' as const, behaviorCooldown: roleConfig.movementInterval }

    const site: LifeGodConstructionSite = {
      id: `site-${am.id}-${generation}`,
      lineageId: lineage.id,
      patternId: pattern.id,
      origin,
      cells: [],
      absoluteCells: [],
      depositedCells: [],
      reservedByAmId: am.id,
      targetPatternId: pattern.id,
      requiredCellCount: getRequiredCellCount(pattern),
      assemblyProgress: 0,
      createdAtCycle: generation,
      builderAmId: am.id,
    }

    constructionSites = [...constructionSites, site]
    clearNormalMatterAt(getBuildFootprintCells(pattern, origin))
    const communicatingAm = publishAmMessage(am, 'buildSiteReserved', origin, 1.2)
    return {
      ...communicatingAm,
      energy: Math.max(0, am.energy - roleConfig.reproductionEnergyCost),
      behaviorState: 'seekingFixedCell' as const,
      currentGoal: 'expandingPopulation',
      buildTarget: origin,
      buildSite: origin,
      targetCell: null,
      carriedCell: null,
      gatheredCells: [],
      reproductionCooldown: roleConfig.reproductionCooldown,
      behaviorCooldown: roleConfig.movementInterval,
      memory: {
        ...communicatingAm.memory,
        lastBuildSite: origin,
        usefulZones: rememberCell(communicatingAm.memory.usefulZones, origin),
      },
    }
  }

  function getBuildSiteForAm(am: LifeGodAmEntity) {
    return constructionSites.find((site) => site.builderAmId === am.id) ?? null
  }

  function getAmCenter(am: LifeGodAmEntity, position = am.position) {
    return averagePosition(computeAbsoluteCells(am.cells, position))
  }

  function distanceToCell(am: LifeGodAmEntity, target: LifeGodRelativeCell) {
    return am.absoluteCells.reduce((best, cell) => {
      const distance = Math.max(Math.abs(cell.x - target.x), Math.abs(cell.y - target.y))
      return Math.min(best, distance)
    }, Infinity)
  }

  function moveToward(am: LifeGodAmEntity, targetPosition: LifeGodRelativeCell): LifeGodAmEntity {
    const currentDistance = Math.abs(getAmCenter(am).x - targetPosition.x) + Math.abs(getAmCenter(am).y - targetPosition.y)
    const isTerraforming = am.currentGoal === 'terraforming'
    const candidates = getMovementCandidates(am).filter((position) =>
      isTerraforming
        ? canMoveAmThroughStaticObstacles(am, position)
        : canMoveAmTo(am, position)
    )
    if (candidates.length === 0) return moveAwayFromWallOrObstacle(am)

    if (isTerraforming) {
      const terraScored = candidates.map((position) => {
        const center = getAmCenter(am, position)
        const distance = Math.abs(center.x - targetPosition.x) + Math.abs(center.y - targetPosition.y)
        const step = { x: position.x - am.position.x, y: position.y - am.position.y }
        const waits = step.x === 0 && step.y === 0 ? -200 : 0
        const reverses = am.movementDirection && step.x === -am.movementDirection.x && step.y === -am.movementDirection.y ? -3 : 0
        return {
          position,
          step,
          score: -distance * 100 + waits + reverses + getInwardWallScore(position, am) * 0.5,
        }
      }).sort((a, b) => b.score - a.score)
      const best = terraScored[0]
      if (!best) return moveAwayFromWallOrObstacle(am)
      const movedIntoTarget =
        (best.step.x !== 0 || best.step.y !== 0) &&
        distanceBetweenCells(getAmCenter(am, best.position), targetPosition) <= 2
      return {
        ...am,
        position: best.position,
        absoluteCells: computeAbsoluteCells(am.cells, best.position),
        targetPosition,
        movementDirection: best.step,
        behaviorCooldown: ROLE_CONFIG[am.role].movementInterval,
        memory: {
          ...am.memory,
          lastUsefulActionTick: movedIntoTarget ? generation : am.memory.lastUsefulActionTick,
        },
      }
    }

    const policy = getPolicyOutputForAm(am)
    const targetWeight =
      am.behaviorState === 'movingToFixedCell' || am.behaviorState === 'seekingFixedCell'
        ? getBrainWeight(am, 'seekCells')
        : am.behaviorState === 'carryingCellToSite'
          ? getBrainWeight(am, 'carryToSite')
          : am.behaviorState === 'assemblingAm'
            ? getBrainWeight(am, 'buildAm')
            : getBrainWeight(am, 'explore')
    const avoidWallWeight = getBrainWeight(am, 'avoidWall')
    const avoidCrowdWeight = getBrainWeight(am, 'avoidCrowd')
    const exploreWeight = getBrainWeight(am, 'explore')

    const scored = applyPolicyToMovementScoring(
      am,
      policy.output,
      candidates
      .map((position) => {
        const center = getAmCenter(am, position)
        const distance = Math.abs(center.x - targetPosition.x) + Math.abs(center.y - targetPosition.y)
        const step = { x: position.x - am.position.x, y: position.y - am.position.y }
        const keepsDirection = am.movementDirection && step.x === am.movementDirection.x && step.y === am.movementDirection.y ? 2 : 0
        const waits = step.x === 0 && step.y === 0 ? -6 : 0
        const reverses = am.movementDirection && step.x === -am.movementDirection.x && step.y === -am.movementDirection.y ? -8 : 0
        const improves = distance <= currentDistance ? 10 : -20
        const crowding = getCrowdingAt(position, am)
        const otherDistance = getMinDistanceToOtherAms(position, am)
        const avoidCrowdBoost = 1 + Math.min(1.4, (am.memory.avoidCrowdBoostTicks + am.memory.overcrowdedTicks) / 14)
        const separationScore = Math.min(otherDistance, 24) * 3 * avoidCrowdBoost * avoidCrowdWeight - crowding.closeCount * 60 * avoidCrowdWeight - crowding.crowdCount * 18 * avoidCrowdWeight
        const stuckEscapeScore = am.behaviorState === 'escapingStuckArea' && am.memory.stuckAreaCenter
          ? distanceBetweenCells(center, am.memory.stuckAreaCenter) * 35 * exploreWeight - (isNearFailedArea(am, center, LOCAL_STUCK_RADIUS) ? 90 : 0)
          : 0
        return {
          position,
          step,
          score:
            -distance * 20 * targetWeight +
            improves * targetWeight +
            keepsDirection +
            reverses +
            waits +
            separationScore +
            getInwardWallScore(position, am) * avoidWallWeight +
            getCommunicationScore(position, am) -
            getRecentPositionPenalty(position, am) +
            stuckEscapeScore +
            getInfluenceScore(position, am),
        }
      }),
      AM_POLICY_MOVEMENT_WEIGHT
    )
      .sort((a, b) => b.score - a.score)

    const best = scored[0]
    if (!best) return moveAwayFromWallOrObstacle(am)
    const movedIntoTarget =
      (best.step.x !== 0 || best.step.y !== 0) &&
      distanceBetweenCells(getAmCenter(am, best.position), targetPosition) <= 2
    return {
      ...am,
      position: best.position,
      absoluteCells: computeAbsoluteCells(am.cells, best.position),
      targetPosition,
      movementDirection: best.step,
      behaviorCooldown: ROLE_CONFIG[am.role].movementInterval,
      policyDebug: policy.debug,
      memory: {
        ...am.memory,
        lastUsefulActionTick: movedIntoTarget ? generation : am.memory.lastUsefulActionTick,
      },
    }
  }

  function isMovementMissionState(state: LifeGodAmBehaviorState) {
    return [
      'wandering',
      'selectingBuildSite',
      'seekingFixedCell',
      'movingToFixedCell',
      'carryingCellToSite',
      'assemblingAm',
      'seekingFrozenMatter',
    ].includes(state)
  }

  function getLocalStuckWindowTicks() {
    return Math.max(12, Math.round((LOCAL_STUCK_SECONDS * 1000) / TICK_MS))
  }

  function getImmobileAliveTimeoutTicks() {
    return Math.max(12, Math.round((IMMOBILE_ALIVE_TIMEOUT_SECONDS * 1000) / TICK_MS))
  }

  function getRepeatedPathWindowTicks() {
    return Math.max(12, Math.round((REPEATED_PATH_SECONDS * 1000) / TICK_MS))
  }

  function averageRecentTimedPositions(positions: Array<LifeGodRelativeCell & { tick: number }>) {
    if (positions.length === 0) return null
    const total = positions.reduce((sum, position) => ({
      x: sum.x + position.x,
      y: sum.y + position.y,
    }), { x: 0, y: 0 })
    return {
      x: total.x / positions.length,
      y: total.y / positions.length,
    }
  }

  function isNearFailedArea(am: LifeGodAmEntity, cell: LifeGodRelativeCell, radius = LOCAL_STUCK_RADIUS + 4) {
    return am.memory.failedAreas.some((area) => distanceBetweenCells(area, cell) <= radius)
  }

  function hasOscillationLoop(am: LifeGodAmEntity) {
    const recent = am.memory.recentTimedPositions.slice(-6)
    if (recent.length < 6) return false
    const a = recent[0]
    const b = recent[1]
    return recent.every((position, index) => distanceBetweenCells(position, index % 2 === 0 ? a : b) <= 1)
  }

  function hasRepeatedPathLoop(am: LifeGodAmEntity) {
    const windowStart = generation - getRepeatedPathWindowTicks()
    const recent = am.memory.recentTimedPositions.filter((position) => position.tick >= windowStart)
    if (recent.length < Math.max(12, Math.floor(getRepeatedPathWindowTicks() * 0.45))) return false
    const uniqueCells = new Set(recent.map((position) => `${Math.round(position.x)}:${Math.round(position.y)}`))
    const center = averageRecentTimedPositions(recent)
    if (!center) return false
    const maxDistanceFromCenter = recent.reduce((maxDistance, position) => {
      return Math.max(maxDistance, distanceBetweenCells(position, center))
    }, 0)
    const noUsefulAction = generation - am.memory.lastUsefulActionTick >= getRepeatedPathWindowTicks()
    return noUsefulAction && uniqueCells.size <= 8 && maxDistanceFromCenter <= LOCAL_STUCK_RADIUS + 4
  }

  function isAmLocallyStuckWithoutUsefulAction(am: LifeGodAmEntity) {
    if (am.state !== 'alive' || am.behaviorState === 'escapingStuckArea') return false
    const windowStart = generation - getLocalStuckWindowTicks()
    const recent = am.memory.recentTimedPositions.filter((position) => position.tick >= windowStart)
    if (recent.length < Math.max(10, Math.floor(getLocalStuckWindowTicks() * 0.45))) return false
    const center = averageRecentTimedPositions(recent)
    if (!center) return false
    const insideCount = recent.filter((position) => distanceBetweenCells(position, center) <= LOCAL_STUCK_RADIUS).length
    return insideCount / recent.length >= 0.82 && generation - am.memory.lastUsefulActionTick >= getLocalStuckWindowTicks()
  }

  function isAmStuckInLocalArea(am: LifeGodAmEntity) {
    if (am.state !== 'alive' || am.behaviorState === 'escapingStuckArea') return false
    if (am.currentGoal === 'terraforming' && am.targetCell && isFrozenMatterCell(am.targetCell.x, am.targetCell.y)) return false
    const windowStart = generation - getLocalStuckWindowTicks()
    const recent = am.memory.recentTimedPositions.filter((position) => position.tick >= windowStart)
    if (recent.length < Math.max(10, Math.floor(getLocalStuckWindowTicks() * 0.45))) return false
    const center = averageRecentTimedPositions(recent)
    if (!center) return false
    const insideCount = recent.filter((position) => distanceBetweenCells(position, center) <= LOCAL_STUCK_RADIUS).length
    const mostlyInside = insideCount / recent.length >= 0.82
    const noUsefulAction = generation - am.memory.lastUsefulActionTick >= getLocalStuckWindowTicks()
    const stationary = am.memory.stationaryTicks >= Math.round(getLocalStuckWindowTicks() * 0.25)
    return (mostlyInside && noUsefulAction) || (mostlyInside && stationary) || hasOscillationLoop(am) || hasRepeatedPathLoop(am)
  }

  function chooseEscapeTarget(am: LifeGodAmEntity, stuckCenter: LifeGodRelativeCell) {
    const candidates: { cell: LifeGodRelativeCell; score: number }[] = []
    for (let distance = ESCAPE_MIN_DISTANCE; distance <= ESCAPE_MAX_DISTANCE; distance += 2) {
      for (let oy = -distance; oy <= distance; oy += 2) {
        for (let ox = -distance; ox <= distance; ox += 2) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== distance) continue
          const cell = {
            x: Math.round(stuckCenter.x + ox),
            y: Math.round(stuckCenter.y + oy),
          }
          if (!canMoveAmThroughStaticObstacles(am, cell)) continue
          if (getWallDangerAt(cell, am) > 0) continue
          if (distanceBetweenCells(cell, stuckCenter) < ESCAPE_MIN_DISTANCE) continue
          if (isNearFailedArea(am, cell, LOCAL_STUCK_RADIUS)) continue
          const targetBonus =
            am.currentGoal === 'terraforming' && frozenMatterGrid && isFrozenMatterCell(cell.x, cell.y)
              ? 35
              : am.currentGoal === 'expandingPopulation' && hasLivingCell(cell.x, cell.y)
                ? 18
                : 0
          const crowding = getCrowdingAt(cell, am)
          candidates.push({
            cell,
            score:
              targetBonus +
              Math.min(getMinDistanceToOtherAms(cell, am), MIN_AM_SEPARATION_CELLS + 18) * 10 -
              crowding.closeCount * 110 -
              crowding.crowdCount * 24 -
              getRecentPositionPenalty(cell, am) -
              Math.abs(cell.x - GRID_WIDTH / 2) * 0.05 -
              Math.abs(cell.y - GRID_HEIGHT / 2) * 0.05,
          })
        }
      }
      if (candidates.length > 0) break
    }
    candidates.sort((a, b) => b.score - a.score)
    return candidates[0]?.cell ?? null
  }

  function isBuildSiteAccessible(am: LifeGodAmEntity, buildSite: LifeGodRelativeCell | null) {
    if (!buildSite) return false
    const site = getBuildSiteForAm(am)
    if (!site || site.origin.x !== buildSite.x || site.origin.y !== buildSite.y) return false
    const workTarget = findBuildSiteWorkTarget(am, site)
    return workTarget !== null && canMoveAmThroughStaticObstacles(am, workTarget)
  }

  function isTargetCellValidForCurrentGoal(am: LifeGodAmEntity, targetCell: LifeGodRelativeCell | null) {
    if (!targetCell) return false
    if (am.currentGoal === 'terraforming') return isFrozenMatterCell(targetCell.x, targetCell.y)
    if (am.currentGoal === 'expandingPopulation') return isFixedCellAvailable(targetCell.x, targetCell.y, am.id, false)
    return targetCell.x > 0 && targetCell.y > 0 && targetCell.x < GRID_WIDTH - 1 && targetCell.y < GRID_HEIGHT - 1
  }

  function getPostEscapeBehaviorState(am: LifeGodAmEntity): LifeGodAmBehaviorState {
    if (currentMission === 'terraforming' || am.currentGoal === 'terraforming') return 'seekingFrozenMatter'
    if (currentMission === 'expandingPopulation' || am.currentGoal === 'expandingPopulation') {
      return getBuildSiteForAm(am) ? 'seekingFixedCell' : 'selectingBuildSite'
    }
    return 'wandering'
  }

  function getPostEscapeGoal(am: LifeGodAmEntity): LifeGodAmMission {
    if (currentMission === 'terraforming' || am.currentGoal === 'terraforming') return 'terraforming'
    if (currentMission === 'expandingPopulation' || am.currentGoal === 'expandingPopulation') return 'expandingPopulation'
    return currentMission
  }

  function startEscapingStuckArea(am: LifeGodAmEntity, reason: string) {
    const center = averageRecentTimedPositions(am.memory.recentTimedPositions) ?? getAmCenter(am)
    const escapeTarget = chooseEscapeTarget(am, center) ?? { x: GRID_WIDTH / 2, y: GRID_HEIGHT / 2 }
    if (am.currentGoal === 'terraforming') releaseTerraformReservation(am.id)
    const escapingWall = reason === 'wall_hugging'
    if (escapingWall && am.carriedCell) releaseGatheredCells(am)
    const isTerraforming = am.currentGoal === 'terraforming'
    const preservedTargetCell = isTerraforming && am.targetCell && isFrozenMatterCell(am.targetCell.x, am.targetCell.y)
      ? am.targetCell
      : null
    const penalizedAm = penalizeAm({
      ...am,
      behaviorState: 'escapingStuckArea',
      targetCell: preservedTargetCell,
      buildTarget: escapingWall ? null : am.buildTarget,
      carriedCell: escapingWall ? null : am.carriedCell,
      gatheredCells: escapingWall ? [] : am.gatheredCells,
      targetPosition: escapeTarget,
      movementDirection: null,
      behaviorCooldown: 0,
      memory: {
        ...am.memory,
        stuckAreaCenter: { x: Math.round(center.x), y: Math.round(center.y) },
        stuckAreaTicks: am.memory.stuckAreaTicks + 1,
        escapeTarget,
        escapeTicksRemaining: ESCAPE_TICKS,
        failedAreas: rememberCell(am.memory.failedAreas, center, MAX_MEMORY_HINTS),
        failedTargets: !isTerraforming && am.targetCell ? rememberCell(am.memory.failedTargets, am.targetCell, MAX_MEMORY_HINTS) : am.memory.failedTargets,
        failedTerraformTargets: am.currentGoal === 'terraforming' && am.targetCell && !preservedTargetCell
          ? rememberCell(am.memory.failedTerraformTargets, am.targetCell, MAX_MEMORY_HINTS)
          : am.memory.failedTerraformTargets,
        recentBlockedPositions: rememberCell(am.memory.recentBlockedPositions, getAmCenter(am), MAX_MEMORY_HINTS),
        explorationBoostTicks: Math.max(am.memory.explorationBoostTicks, 24),
        avoidCrowdBoostTicks: Math.max(am.memory.avoidCrowdBoostTicks, 22),
        lastStuckReason: reason,
        lastRewardReason: reason,
      },
    }, 5, reason)
    return updateAmLearning(penalizedAm, true)
  }

  function startImmobileAliveTimeoutEscape(am: LifeGodAmEntity) {
    const center = averageRecentTimedPositions(am.memory.recentTimedPositions) ?? getAmCenter(am)
    const escapeTarget =
      chooseEscapeTarget(am, center) ??
      findBehaviorTarget({ ...am, behaviorState: 'wandering' as const, targetCell: null, targetPosition: null }) ??
      { x: Math.round(am.position.x), y: Math.round(am.position.y) }
    const targetCell = isTargetCellValidForCurrentGoal(am, am.targetCell) ? am.targetCell : null
    const buildSite = isBuildSiteAccessible(am, am.buildSite) ? am.buildSite : null

    if (am.currentGoal === 'terraforming') releaseTerraformReservation(am.id)

    const penalizedAm = penalizeAm({
      ...am,
      behaviorState: 'escapingStuckArea',
      targetCell,
      targetPosition: escapeTarget,
      buildSite,
      buildTarget: buildSite ? am.buildTarget : null,
      movementDirection: null,
      behaviorCooldown: 0,
      memory: {
        ...am.memory,
        stuckAreaCenter: { x: Math.round(center.x), y: Math.round(center.y) },
        stuckAreaTicks: am.memory.stuckAreaTicks + 1,
        escapeTarget,
        escapeTicksRemaining: ESCAPE_TICKS,
        failedAreas: rememberCell(am.memory.failedAreas, center, MAX_MEMORY_HINTS),
        failedTargets: targetCell ? am.memory.failedTargets : (am.targetCell ? rememberCell(am.memory.failedTargets, am.targetCell, MAX_MEMORY_HINTS) : am.memory.failedTargets),
        failedTerraformTargets:
          am.currentGoal === 'terraforming' && am.targetCell && !targetCell
            ? rememberCell(am.memory.failedTerraformTargets, am.targetCell, MAX_MEMORY_HINTS)
            : am.memory.failedTerraformTargets,
        recentBlockedPositions: rememberCell(am.memory.recentBlockedPositions, getAmCenter(am), MAX_MEMORY_HINTS),
        explorationBoostTicks: Math.max(am.memory.explorationBoostTicks, 28),
        avoidCrowdBoostTicks: Math.max(am.memory.avoidCrowdBoostTicks, 24),
        lastStuckReason: 'immobile_alive_timeout',
        lastRewardReason: 'immobile_alive_timeout',
      },
    }, 6, 'immobile_alive_timeout')

    return updateAmLearning(penalizedAm, true)
  }

  function tickEscapingStuckArea(am: LifeGodAmEntity) {
    const stuckCenter = am.memory.stuckAreaCenter
    const escapeTarget = am.memory.escapeTarget
    const terraformTarget = am.targetCell && am.currentGoal === 'terraforming' && isFrozenMatterCell(am.targetCell.x, am.targetCell.y)
      ? am.targetCell
      : null
    if (!stuckCenter || !escapeTarget) {
      return {
        ...am,
        currentGoal: getPostEscapeGoal(am),
        behaviorState: getPostEscapeBehaviorState(am),
        targetCell: terraformTarget,
        targetPosition: null,
        memory: {
          ...am.memory,
          escapeTarget: null,
          escapeTicksRemaining: 0,
        },
      }
    }

    const center = getAmCenter(am)
    const outOfStuckArea = distanceBetweenCells(center, stuckCenter) > LOCAL_STUCK_RADIUS + 3
    const reachedTarget = distanceBetweenCells(center, escapeTarget) <= 2
    const timeExpiredFarEnough = am.memory.escapeTicksRemaining <= 0 && distanceBetweenCells(center, stuckCenter) > LOCAL_STUCK_RADIUS

    if (outOfStuckArea || reachedTarget || timeExpiredFarEnough) {
      return rewardAm({
        ...am,
        currentGoal: getPostEscapeGoal(am),
        behaviorState: getPostEscapeBehaviorState(am),
        targetCell: terraformTarget,
        targetPosition: null,
        movementDirection: null,
        memory: {
          ...am.memory,
          escapeTarget: null,
          escapeTicksRemaining: 0,
          stuckAreaTicks: 0,
          lastUsefulActionTick: generation,
          lastStuckReason: 'escaped_stuck_area',
        },
      }, 6, 'escaped_stuck_area')
    }

    if (am.memory.escapeTicksRemaining <= 0) {
      const safeX = Math.round(GRID_WIDTH * (0.25 + Math.random() * 0.5))
      const safeY = Math.round(GRID_HEIGHT * (0.25 + Math.random() * 0.5))
      const safePosition = { x: safeX, y: safeY }
      return {
        ...am,
        position: safePosition,
        absoluteCells: computeAbsoluteCells(am.cells, safePosition),
        currentGoal: getPostEscapeGoal(am),
        behaviorState: getPostEscapeBehaviorState(am),
        targetCell: null,
        targetPosition: null,
        movementDirection: null,
        memory: {
          ...am.memory,
          escapeTarget: null,
          escapeTicksRemaining: 0,
          stuckAreaTicks: 0,
          wallStickTicks: 0,
          lastUsefulActionTick: generation,
          lastStuckReason: 'teleported_from_stuck',
          failedAreas: [],
          failedTargets: [],
          failedTerraformTargets: [],
          recentBlockedPositions: [],
          recentTimedPositions: [],
          recentPositions: [],
        },
      }
    }

    const moved = moveTowardEscapeTarget({
      ...am,
      targetCell: null,
      targetPosition: escapeTarget,
      movementDirection: null,
      behaviorCooldown: 0,
    }, escapeTarget, stuckCenter)

    return {
      ...moved,
      behaviorState: 'escapingStuckArea' as const,
      targetCell: terraformTarget,
      targetPosition: escapeTarget,
      memory: {
        ...moved.memory,
        stuckAreaCenter: stuckCenter,
        escapeTarget,
        escapeTicksRemaining: Math.max(0, am.memory.escapeTicksRemaining - 1),
        lastStuckReason: 'escaping_stuck_area',
      },
    }
  }

  function moveTowardEscapeTarget(
    am: LifeGodAmEntity,
    escapeTarget: LifeGodRelativeCell,
    stuckCenter: LifeGodRelativeCell
  ): LifeGodAmEntity {
    const currentCenter = getAmCenter(am)
    const currentDistanceToTarget = distanceBetweenCells(currentCenter, escapeTarget)
    const currentDistanceFromStuck = distanceBetweenCells(currentCenter, stuckCenter)
    const currentViolations = countAmSeparationViolationsAt(am, am.position)
    const seen = new Set<string>()
    const candidates = getMovementCandidates(am)
      .filter((position) => {
        const key = `${position.x}:${position.y}`
        if (seen.has(key)) return false
        seen.add(key)
        return position.x !== am.position.x || position.y !== am.position.y
      })
      .filter((position) => canMoveAmThroughStaticObstacles(am, position))
      .map((position) => {
        const center = getAmCenter(am, position)
        const targetDistance = distanceBetweenCells(center, escapeTarget)
        const stuckDistance = distanceBetweenCells(center, stuckCenter)
        const violations = countAmSeparationViolationsAt(am, position)
        const crowding = getCrowdingAt(position, am)
        const otherDistance = getMinDistanceToOtherAms(position, am)
        const step = { x: position.x - am.position.x, y: position.y - am.position.y }
        const travel = Math.max(Math.abs(step.x), Math.abs(step.y))
        const improvesTarget = targetDistance < currentDistanceToTarget ? 120 : -60
        const improvesEscape = stuckDistance > currentDistanceFromStuck ? 180 : -120
        const failedAreaPenalty = isNearFailedArea(am, center, LOCAL_STUCK_RADIUS) ? 220 : 0

        return {
          position,
          step,
          violations,
          score:
            (currentViolations - violations) * 1500 -
            violations * 260 -
            targetDistance * 40 +
            stuckDistance * 65 +
            Math.min(otherDistance, MIN_AM_SEPARATION_CELLS + 20) * 18 -
            crowding.closeCount * 120 -
            crowding.crowdCount * 26 +
            getInwardWallScore(position, am) -
            getRecentPositionPenalty(position, am) * 0.6 -
            failedAreaPenalty -
            travel * 4 +
            improvesTarget +
            improvesEscape,
        }
      })
      .sort((a, b) => b.score - a.score)

    const best = candidates[0]
    if (!best) {
      return {
        ...am,
        behaviorCooldown: 0,
        movementDirection: null,
        memory: {
          ...am.memory,
          avoidCrowdBoostTicks: Math.max(am.memory.avoidCrowdBoostTicks, 14),
          explorationBoostTicks: Math.max(am.memory.explorationBoostTicks, 14),
        },
      }
    }

    return {
      ...rewardAm(am, best.violations < currentViolations ? 2.5 : 0.7, 'escape_stuck_area_move'),
      position: best.position,
      absoluteCells: computeAbsoluteCells(am.cells, best.position),
      targetPosition: escapeTarget,
      movementDirection: best.step,
      behaviorCooldown: 0,
      memory: {
        ...am.memory,
        avoidCrowdBoostTicks: Math.max(am.memory.avoidCrowdBoostTicks, best.violations > 0 ? 18 : 8),
        explorationBoostTicks: Math.max(am.memory.explorationBoostTicks, 10),
      },
    }
  }

  function shouldForceUnstuck(am: LifeGodAmEntity) {
    if (isMovementMissionState(am.behaviorState)) return true
    if (am.carriedCell) return true
    if (am.currentGoal === 'expandingPopulation' && am.buildSite) return true
    return am.currentGoal === 'terraforming' && currentMission === 'terraforming'
  }

  function forceUnstuckMove(am: LifeGodAmEntity) {
    const currentCenter = getAmCenter(am)
    const target = am.targetCell ?? am.buildSite ?? am.targetPosition ?? currentCenter
    const currentViolations = countAmSeparationViolationsAt(am, am.position)
    const candidates = getMovementCandidates(am)
      .filter((position) => position.x !== am.position.x || position.y !== am.position.y)
      .filter((position) => canMoveAmThroughStaticObstacles(am, position))
      .map((position) => {
        const violations = countAmSeparationViolationsAt(am, position)
        const center = getAmCenter(am, position)
        const targetDistance = Math.abs(center.x - target.x) + Math.abs(center.y - target.y)
        const otherDistance = getMinDistanceToOtherAms(position, am)
        const travel = Math.max(Math.abs(position.x - am.position.x), Math.abs(position.y - am.position.y))
        const siteDistance = constructionSites.reduce((closest, site) => {
          if (site.builderAmId === am.id) return closest
          return Math.min(closest, distanceBetweenCells(center, site.origin))
        }, 999)
        const step = { x: position.x - am.position.x, y: position.y - am.position.y }
        const reverses = am.movementDirection && step.x === -am.movementDirection.x && step.y === -am.movementDirection.y ? -2 : 0
        const crowding = getCrowdingAt(position, am)
        return {
          position,
          step,
          violations,
          score:
            (currentViolations - violations) * 1100 -
            violations * 180 +
            -targetDistance * 5 +
            Math.min(otherDistance, MIN_AM_SEPARATION_CELLS + 16) * 12 +
            Math.min(siteDistance, 18) * 4 -
            crowding.closeCount * 80 -
            crowding.crowdCount * 20 +
            getInwardWallScore(position, am) -
            travel * 2 +
            reverses +
            Math.random(),
        }
      })
      .sort((a, b) => b.score - a.score)

    const best = candidates[0]
    if (!best) {
      const escaped = moveAwayFromWallOrObstacle(am)
      const keepTarget = am.carriedCell || (am.currentGoal === 'terraforming' && am.targetCell && isFrozenMatterCell(am.targetCell.x, am.targetCell.y))
      return {
        ...escaped,
        targetCell: keepTarget ? am.targetCell : null,
        memory: {
          ...escaped.memory,
          stationaryTicks: am.memory.stationaryTicks,
          unstuckUntilCycle: generation + STUCK_TICK_LIMIT,
        },
      }
    }

    return {
      ...rewardAm(am, best.violations < currentViolations ? 4 : 1, 'unstuck_move'),
      position: best.position,
      absoluteCells: computeAbsoluteCells(am.cells, best.position),
      targetPosition: target,
      movementDirection: best.step,
      behaviorCooldown: 0,
      memory: {
        ...am.memory,
        lastPosition: best.position,
        stationaryTicks: 0,
        unstuckUntilCycle: generation + STUCK_TICK_LIMIT,
      },
    }
  }

  function updateSpatialMemory(previous: LifeGodAmEntity, nextAm: LifeGodAmEntity, moved: boolean) {
    const center = getAmCenter(nextAm)
    const roundedCenter = { x: Math.round(center.x), y: Math.round(center.y) }
    const wallDanger = getWallDangerAt(nextAm.position, nextAm)
    const crowding = getCrowdingAt(nextAm.position, nextAm)
    const repeatedArea = nextAm.memory.recentPositions.some((item) => distanceBetweenCells(item, roundedCenter) <= 1)
    const windowStart = generation - getLocalStuckWindowTicks()
    const recentTimedPositions = clampList([
      ...nextAm.memory.recentTimedPositions.filter((position) => position.tick >= windowStart),
      { ...roundedCenter, tick: generation },
    ], getLocalStuckWindowTicks() + 6)
    let tracked: LifeGodAmEntity = {
      ...nextAm,
      memory: {
        ...nextAm.memory,
        wallStickTicks: wallDanger > 0 ? nextAm.memory.wallStickTicks + 1 : Math.max(0, nextAm.memory.wallStickTicks - 1),
        overcrowdedTicks:
          crowding.closeCount > 0 || crowding.crowdCount >= 3
            ? nextAm.memory.overcrowdedTicks + 1
            : Math.max(0, nextAm.memory.overcrowdedTicks - 1),
        repeatedAreaTicks: repeatedArea && moved ? nextAm.memory.repeatedAreaTicks + 1 : Math.max(0, nextAm.memory.repeatedAreaTicks - 1),
        explorationBoostTicks: Math.max(0, nextAm.memory.explorationBoostTicks - 1),
        avoidCrowdBoostTicks: Math.max(0, nextAm.memory.avoidCrowdBoostTicks - 1),
        recentPositions: clampList([...nextAm.memory.recentPositions, roundedCenter], MAX_MEMORY_POSITIONS),
        recentTimedPositions,
        independenceScore: Math.max(0, Math.min(1, getMinDistanceToOtherAms(nextAm.position, nextAm) / MIN_AM_SEPARATION_CELLS)),
      },
    }

    if (wallDanger > 0) {
      const penalized = penalizeAm(tracked, tracked.memory.wallStickTicks >= WALL_HUGGING_TICK_LIMIT ? 3 : 1, 'wall_hugging')
      tracked = {
        ...penalized,
        memory: {
          ...penalized.memory,
          explorationBoostTicks: Math.max(penalized.memory.explorationBoostTicks, 16),
          avoidCrowdBoostTicks: Math.max(penalized.memory.avoidCrowdBoostTicks, 10),
          wallDangerZones: rememberCell(penalized.memory.wallDangerZones, roundedCenter),
          knownDangerHints: rememberCell(penalized.memory.knownDangerHints, roundedCenter),
        },
      }
      tracked = publishAmMessage(tracked, 'wallDanger', roundedCenter, Math.min(1.8, 0.8 + tracked.memory.wallStickTicks / 8))
    } else if (previous.memory.wallStickTicks >= WALL_HUGGING_TICK_LIMIT) {
      tracked = rewardAm(tracked, 1.2, 'returned_from_wall')
    }

    if (crowding.closeCount > 0 || crowding.crowdCount >= 3) {
      const penalized = penalizeAm(tracked, tracked.memory.overcrowdedTicks >= OVERCROWD_TICK_LIMIT ? 4 : 1.2, 'overcrowded')
      tracked = {
        ...penalized,
        memory: {
          ...penalized.memory,
          avoidCrowdBoostTicks: Math.max(penalized.memory.avoidCrowdBoostTicks, 18),
          explorationBoostTicks: Math.max(penalized.memory.explorationBoostTicks, 8),
          crowdedZones: rememberCell(penalized.memory.crowdedZones, roundedCenter),
          knownDangerHints: rememberCell(penalized.memory.knownDangerHints, roundedCenter),
        },
      }
      tracked = publishAmMessage(tracked, 'overcrowdedArea', roundedCenter, Math.min(2.6, 1.2 + crowding.crowdCount / 2))
    } else if (previous.memory.overcrowdedTicks >= OVERCROWD_TICK_LIMIT) {
      tracked = rewardAm(tracked, 1, 'escaped_overcrowding')
    }

    if (tracked.memory.repeatedAreaTicks >= 5) {
      const penalized = penalizeAm(tracked, 2, 'repeated_same_area')
      tracked = {
        ...penalized,
        memory: {
          ...penalized.memory,
          explorationBoostTicks: Math.max(penalized.memory.explorationBoostTicks, 14),
          avoidCrowdBoostTicks: Math.max(penalized.memory.avoidCrowdBoostTicks, 10),
        },
      }
    }

    if (hasOscillationLoop(tracked)) {
      tracked = penalizeAm(tracked, 2.4, 'oscillation_loop')
      tracked = {
        ...tracked,
        memory: {
          ...tracked.memory,
          lastStuckReason: 'oscillation_loop',
        },
      }
    }

    if (hasRepeatedPathLoop(tracked)) {
      tracked = penalizeAm(tracked, 3.2, 'repeated_path_loop')
      const keepTerraformTarget = tracked.currentGoal === 'terraforming' && tracked.targetCell && isFrozenMatterCell(tracked.targetCell.x, tracked.targetCell.y)
      tracked = {
        ...tracked,
        targetCell: keepTerraformTarget ? tracked.targetCell : null,
        targetPosition: null,
        memory: {
          ...tracked.memory,
          explorationBoostTicks: Math.max(tracked.memory.explorationBoostTicks, 24),
          avoidCrowdBoostTicks: Math.max(tracked.memory.avoidCrowdBoostTicks, 18),
          lastStuckReason: 'repeated_path_loop',
        },
      }
    }

    if (!moved) {
      tracked = penalizeAm(tracked, tracked.memory.stationaryTicks >= 4 ? 2.4 : 0.8, 'immobile')
    } else {
      tracked = rewardAm(tracked, repeatedArea ? 0.2 : 0.6, 'movement_step')
    }

    const safelySpaced = wallDanger === 0 && getMinDistanceToOtherAms(tracked.position, tracked) >= MIN_AM_SEPARATION_CELLS && crowding.closeCount === 0
    if (moved && safelySpaced && !repeatedArea) {
      tracked = rewardAm(tracked, 1.2, 'safe_independent_move')
    } else if (moved && wallDanger === 0 && crowding.closeCount === 0 && crowding.crowdCount <= 1 && !repeatedArea) {
      tracked = rewardAm(tracked, 0.35, 'useful_exploration')
    }

    return tracked
  }

  function withMotionMemory(previous: LifeGodAmEntity, nextAm: LifeGodAmEntity) {
    if (nextAm.state !== 'alive') return nextAm
    const rawDx = nextAm.position.x - previous.position.x
    const rawDy = nextAm.position.y - previous.position.y
    const maxStep = ROLE_CONFIG[previous.role].movementReach
    let boundedNext = nextAm
    if (Math.max(Math.abs(rawDx), Math.abs(rawDy)) > maxStep) {
      const stepPosition = {
        x: previous.position.x + Math.sign(rawDx) * maxStep,
        y: previous.position.y + Math.sign(rawDy) * maxStep,
      }
      const canStep = canMoveAmThroughStaticObstacles(nextAm, stepPosition)
      boundedNext = penalizeAm({
        ...nextAm,
        position: canStep ? stepPosition : previous.position,
        absoluteCells: canStep ? computeAbsoluteCells(nextAm.cells, stepPosition) : previous.absoluteCells,
        targetPosition: nextAm.targetPosition,
        movementDirection: canStep ? { x: stepPosition.x - previous.position.x, y: stepPosition.y - previous.position.y } : null,
        behaviorCooldown: 0,
        memory: {
          ...nextAm.memory,
          lastStuckReason: 'movement_clamped_to_path',
          explorationBoostTicks: Math.max(nextAm.memory.explorationBoostTicks, 10),
        },
      }, 2.2, 'movement_clamped_to_path')
    }

    const moved = previous.position.x !== boundedNext.position.x || previous.position.y !== boundedNext.position.y
    const stationaryTicks = moved ? 0 : previous.memory.stationaryTicks + 1
    const tracked = updateSpatialMemory(previous, {
      ...boundedNext,
      memory: {
        ...boundedNext.memory,
        lastPosition: boundedNext.position,
        stationaryTicks,
      },
    }, moved)

    if (
      !moved &&
      tracked.state === 'alive' &&
      tracked.behaviorState !== 'escapingStuckArea' &&
      tracked.behaviorState !== 'ceremonyApproaching' &&
      tracked.behaviorState !== 'ceremonyPraying' &&
      tracked.behaviorState !== 'ceremonyWandering' &&
      stationaryTicks > getImmobileAliveTimeoutTicks()
    ) {
      return startImmobileAliveTimeoutEscape(tracked)
    }

    if (
      !moved &&
      shouldForceUnstuck(tracked) &&
      stationaryTicks >= STUCK_TICK_LIMIT &&
      generation >= tracked.memory.unstuckUntilCycle
    ) {
      return forceUnstuckMove(penalizeAm(tracked, 2, 'stuck'))
    }

    return tracked
  }

  function harvestTargetCell(am: LifeGodAmEntity): LifeGodAmEntity {
    if (!am.targetCell || !isFixedCellAvailable(am.targetCell.x, am.targetCell.y, am.id, false)) {
      return { ...am, behaviorState: 'seekingFixedCell' as const, targetCell: null }
    }
    markMatterMovedFrom(am.targetCell)
    const rewardedAm = rewardAm(publishAmMessage(am, 'resourceFound', am.targetCell, 1.1), 4, 'harvest_success')
    return {
      ...rewardedAm,
      behaviorState: 'carryingCellToSite' as const,
      carriedCell: am.targetCell,
      gatheredCells: [am.targetCell],
      targetCell: null,
      memory: {
        ...rewardedAm.memory,
        lastTargetCell: am.targetCell,
        usefulZones: rememberCell(rewardedAm.memory.usefulZones, am.targetCell),
        lastUsefulActionTick: generation,
      },
    }
  }

  function findDepositCell(site: LifeGodConstructionSite) {
    const occupied = new Set(site.depositedCells.map((cell) => cellKey(cell.x, cell.y)))
    for (const offset of BUILD_PILE_OFFSETS) {
      const cell = { x: site.origin.x + offset.x, y: site.origin.y + offset.y }
      const key = cellKey(cell.x, cell.y)
      if (occupied.has(key)) continue
      if (!isValidBuildCoordinate(cell.x, cell.y)) continue
      if (isReservedByEntity(cell.x, cell.y) || isReservedByProto(cell.x, cell.y)) continue
      if (isReservedByOtherConstruction(cell.x, cell.y, site.id)) continue
      if (hasLivingCell(cell.x, cell.y)) continue
      return cell
    }
    return null
  }

  function canDepositFrom(am: LifeGodAmEntity, site: LifeGodConstructionSite) {
    return distanceToCell(am, site.origin) <= BUILD_SITE_WORK_RADIUS_MIN
  }

  function findBuildSiteWorkTarget(am: LifeGodAmEntity, site: LifeGodConstructionSite) {
    const candidates: { target: LifeGodRelativeCell; score: number }[] = []
    const footprint = new Set(getConstructionFootprintCells(site).map((cell) => cellKey(cell.x, cell.y)))
    const carryToSiteWeight = getBrainWeight(am, 'carryToSite')
    const buildAmWeight = getBrainWeight(am, 'buildAm')
    const avoidCrowdWeight = getBrainWeight(am, 'avoidCrowd')

    for (let radius = BUILD_SITE_WORK_RADIUS_MIN; radius <= BUILD_SITE_WORK_RADIUS_MAX; radius += 1) {
      for (let oy = -radius; oy <= radius; oy += 1) {
        for (let ox = -radius; ox <= radius; ox += 1) {
          if (Math.max(Math.abs(ox), Math.abs(oy)) !== radius) continue
          const target = { x: site.origin.x + ox, y: site.origin.y + oy }
          if (!isValidBuildCoordinate(target.x, target.y)) continue
          if (footprint.has(cellKey(target.x, target.y))) continue
          if (isReservedByOtherConstruction(target.x, target.y, site.id)) continue
          const otherDistance = amEntities.reduce((closest, other) => {
            if (other.id === am.id) return closest
            return Math.min(closest, distanceBetweenCells(averagePosition(other.absoluteCells), target))
          }, 999)
          const crowding = getCrowdingAt(target, am)
          const score =
            -radius * 8 * carryToSiteWeight +
            Math.min(otherDistance, 22) * 4 * avoidCrowdWeight -
            crowding.closeCount * 42 * avoidCrowdWeight -
            crowding.crowdCount * 12 * avoidCrowdWeight +
            getCommunicationScore(target, am) * buildAmWeight -
            getRecentPositionPenalty(target, am) +
            Math.random()
          candidates.push({ target, score })
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score)
    return candidates[0]?.target ?? site.origin
  }

  function depositCarriedCell(am: LifeGodAmEntity, site: LifeGodConstructionSite): LifeGodAmEntity {
    if (!am.carriedCell) return { ...am, behaviorState: 'seekingFixedCell' as const, gatheredCells: [] }
    const placement = findDepositCell(site)
    if (!placement) {
      return {
        ...am,
        behaviorState: 'carryingCellToSite' as const,
        buildSite: site.origin,
        buildTarget: findBuildSiteWorkTarget(am, site),
        behaviorCooldown: 0,
      }
    }

    current[indexAt(placement.x, placement.y)] = 1
    if (matterFrozen && frozenMatterGrid) frozenMatterGrid[indexAt(placement.x, placement.y)] = 1

    constructionSites = constructionSites.map((item) =>
      item.id === site.id
        ? { ...item, depositedCells: [...item.depositedCells, placement], absoluteCells: [...item.depositedCells, placement] }
        : item
    )

    const updatedSite = constructionSites.find((item) => item.id === site.id)
    const readyToAssemble = updatedSite ? updatedSite.depositedCells.length >= updatedSite.requiredCellCount : false
    const rewardedAm = rewardAm(am, 4, 'deposit_success')
    return {
      ...rewardedAm,
      behaviorState: readyToAssemble ? 'assemblingAm' as const : 'seekingFixedCell' as const,
      carriedCell: null,
      gatheredCells: [],
      targetCell: null,
      targetPosition: placement,
      memory: {
        ...rewardedAm.memory,
        usefulZones: rememberCell(rewardedAm.memory.usefulZones, placement),
        lastUsefulActionTick: generation,
      },
    }
  }

  function wanderAm(am: LifeGodAmEntity): LifeGodAmEntity {
    const policy = getPolicyOutputForAm({ ...am, behaviorState: 'wandering' as const })
    const roamingTarget = findBehaviorTarget({ ...am, behaviorState: 'wandering' as const })
    if (!roamingTarget || (roamingTarget.x === am.position.x && roamingTarget.y === am.position.y)) {
      return {
        ...am,
        behaviorState: 'wandering' as const,
        targetPosition: roamingTarget,
        behaviorCooldown: 0,
        policyDebug: policy.debug,
      }
    }
    return {
      ...am,
      position: roamingTarget,
      absoluteCells: computeAbsoluteCells(am.cells, roamingTarget),
      behaviorState: 'wandering' as const,
      targetPosition: roamingTarget,
      behaviorCooldown: ROLE_CONFIG[am.role].movementInterval,
      policyDebug: policy.debug,
    }
  }

  function recoverTerraformingAm(am: LifeGodAmEntity): LifeGodAmEntity {
    const currentCenter = getAmCenter(am)
    const failedTargets = am.targetCell
      ? rememberCell(am.memory.failedTerraformTargets, am.targetCell, MAX_MEMORY_HINTS)
      : am.memory.failedTerraformTargets
    const blockedPositions = rememberCell(am.memory.recentBlockedPositions, currentCenter, MAX_MEMORY_HINTS)
    const recoveryReason = am.memory.terraformStuckTicks >= TERRAFORM_STUCK_TICK_LIMIT
      ? 'terraforming_stuck'
      : am.targetCell && !isFrozenMatterTargetAvailable(am.targetCell, am.id)
        ? 'exhausted_terraform_zone'
        : am.memory.wallStickTicks > WALL_HUGGING_TICK_LIMIT
          ? 'wall_hugging_terraforming'
          : 'terraform_target_failed'
    releaseTerraformReservation(am.id)

    const baseAm = penalizeAm({
      ...am,
      targetCell: null,
      targetPosition: null,
      behaviorCooldown: 0,
      memory: {
        ...am.memory,
        failedTerraformTargets: failedTargets,
        recentBlockedPositions: blockedPositions,
        terraformStuckTicks: 0,
        explorationBoostTicks: Math.max(am.memory.explorationBoostTicks, 22),
        avoidCrowdBoostTicks: Math.max(am.memory.avoidCrowdBoostTicks, 20),
        lastTerraformAction: 'recovery',
        recoveryTriggered: true,
      },
    }, 3, recoveryReason)

    const target = findFallbackFrozenMatter(baseAm)
    const recoveredAm = target
      ? reserveTerraformZone(rewardAm(baseAm, 2, 'new_terraform_zone_found'), target)
      : publishAmMessage(baseAm, 'areaBusy', currentCenter, 1.4)

    const movementTarget = target ?? { x: GRID_WIDTH / 2, y: GRID_HEIGHT / 2 }
    const moved = moveToward({
      ...recoveredAm,
      currentGoal: 'terraforming',
      behaviorState: 'seekingFrozenMatter',
      targetCell: target,
      targetPosition: movementTarget,
    }, movementTarget)

    return {
      ...moved,
      currentGoal: 'terraforming',
      behaviorState: 'seekingFrozenMatter',
      targetCell: target,
      memory: {
        ...moved.memory,
        failedTerraformTargets: target ? moved.memory.failedTerraformTargets : failedTargets,
        recentBlockedPositions: blockedPositions,
        terraformStuckTicks: 0,
        lastTerraformAction: target ? 'recovered_new_target' : 'recovered_roaming',
        recoveryTriggered: true,
      },
    }
  }

  function tickRoleBehavior() {
    const previousAmEntities = amEntities
    const nextAmEntities: LifeGodAmEntity[] = []

    for (let amIndex = 0; amIndex < previousAmEntities.length; amIndex += 1) {
      const am = previousAmEntities[amIndex]
      amEntities = [...nextAmEntities, ...previousAmEntities.slice(amIndex)]
      const nextAm = withMotionMemory(am, ((): LifeGodAmEntity => {
      if (am.state !== 'alive') return am
      const roleConfig = ROLE_CONFIG[am.role]

      if (ceremonyPhase !== 'none') {
        if (am.behaviorState === 'ceremonyWandering') {
          return wanderAm({ ...am, currentGoal: currentMission })
        }
        if (am.behaviorState === 'ceremonyApproaching') {
          const target = ceremonyCirclePositions.get(am.id)
          if (!target) return wanderAm(am)
          if (distanceBetweenCells(getAmCenter(am), target) <= CEREMONY_CIRCLE_ARRIVAL_TOLERANCE) {
            return { ...am, targetPosition: target, movementDirection: null, behaviorCooldown: roleConfig.movementInterval }
          }
          return moveToward(am, target)
        }
        if (am.behaviorState === 'ceremonyPraying') {
          return { ...am, targetPosition: ceremonyCirclePositions.get(am.id) ?? null, movementDirection: null, behaviorCooldown: roleConfig.movementInterval }
        }
        return { ...am, behaviorState: 'ceremonyWandering' as const, currentGoal: currentMission }
      }

      if (am.behaviorState === 'escapingStuckArea') {
        return tickEscapingStuckArea(am)
      }

      if (isAmStuckInLocalArea(am)) {
        const stuckReason = isAmLocallyStuckWithoutUsefulAction(am)
          ? 'stuck_in_local_area'
          : hasOscillationLoop(am)
          ? 'oscillation_loop'
          : hasRepeatedPathLoop(am)
            ? 'repeated_path_loop'
            : 'stuck_in_local_area'
        return startEscapingStuckArea(am, stuckReason)
      }

      if (
        getWallDangerAt(am.position, am) > 0 &&
        am.memory.wallStickTicks > WALL_HUGGING_TICK_LIMIT &&
        !(am.currentGoal === 'terraforming' && am.targetCell && isFrozenMatterCell(am.targetCell.x, am.targetCell.y))
      ) {
        return startEscapingStuckArea(am, 'wall_hugging')
      }

      if (currentMission === 'requestingPlayerPatterns') {
        if (am.id === currentPatternSpokespersonAmId) {
          return {
            ...am,
            currentGoal: 'requestingPlayerPatterns',
            behaviorState: 'requestingPattern' as const,
            targetCell: null,
            targetPosition: null,
            movementDirection: null,
            behaviorCooldown: ROLE_CONFIG[am.role].movementInterval,
          }
        }
        return wanderAm({ ...am, currentGoal: 'requestingPlayerPatterns', targetCell: null })
      }

      const collisionEscape = moveOutOfAmCollision(am)
      if (collisionEscape) return collisionEscape
      const site = getBuildSiteForAm(am)
      const wantsToBuild = canCreateMoreVisibleAms()

      if (currentMission === 'terraforming') {
        const lastConv = am.memory.lastTerraformConversionTick || generation
        if (
          am.memory.terraformStuckTicks >= TERRAFORM_STUCK_TICK_LIMIT ||
          (am.targetCell && !isFrozenMatterCell(am.targetCell.x, am.targetCell.y)) ||
          generation - lastConv > TERRAFORM_STUCK_TICK_LIMIT * 3
        ) {
          return recoverTerraformingAm(am)
        }

        const terraformStates: LifeGodAmBehaviorState[] = ['shapingSoil', 'shapingVegetation', 'shapingWater', 'shapingRock']
        if (terraformStates.includes(am.behaviorState)) {
          const nextCooldown = Math.max(0, am.behaviorCooldown - 1)
          return {
            ...am,
            currentGoal: 'terraforming',
            behaviorState: nextCooldown > 0 ? am.behaviorState : 'seekingFrozenMatter',
            behaviorCooldown: nextCooldown,
          }
        }

        const targetCell = am.targetCell && isFrozenMatterCell(am.targetCell.x, am.targetCell.y)
          ? am.targetCell
          : findKnownFrozenHint(am) ??
            findNearestFrozenMatter(Math.round(getAmCenter(am).x), Math.round(getAmCenter(am).y), am) ??
            findFallbackFrozenMatter(am)

        if (!targetCell) {
          const roamingTarget = findBehaviorTarget({ ...am, currentGoal: 'terraforming' })
          if (!roamingTarget) {
            return wanderAm({ ...am, currentGoal: 'terraforming', targetCell: null })
          }
          return {
            ...am,
            currentGoal: 'terraforming',
            behaviorState: 'wandering' as const,
            targetCell: null,
            targetPosition: roamingTarget,
            position: roamingTarget,
            absoluteCells: computeAbsoluteCells(am.cells, roamingTarget),
            behaviorCooldown: roleConfig.movementInterval,
          }
        }

        const foundNewFrozenZone = !am.targetCell || distanceBetweenCells(am.targetCell, targetCell) > 2
        const foundAm = foundNewFrozenZone ? rewardAm(am, 2, 'frozen_matter_found') : am
        const informedAm = reserveTerraformZone(
          publishAmMessage(foundAm, 'frozenMatterFound', targetCell, 1),
          targetCell
        )

        if (distanceToCell(informedAm, targetCell) <= 2) {
          return terraformAround({ ...informedAm, targetCell, currentGoal: 'terraforming' }, targetCell)
        }

        const nextCooldown = Math.max(0, informedAm.behaviorCooldown - 1)
        if (nextCooldown > 0) {
          return {
            ...informedAm,
            currentGoal: 'terraforming',
            behaviorState: 'seekingFrozenMatter' as const,
            targetCell,
            behaviorCooldown: nextCooldown,
            memory: {
              ...informedAm.memory,
              terraformStuckTicks: informedAm.memory.terraformStuckTicks + 1,
              lastTerraformAction: 'moving_to_target',
              recoveryTriggered: false,
            },
          }
        }

        const moved = moveToward({ ...informedAm, currentGoal: 'terraforming', targetCell }, targetCell)
        const didMove = moved.position.x !== am.position.x || moved.position.y !== am.position.y
        const closerToTarget = didMove && distanceToCell(moved, targetCell) < distanceToCell(am, targetCell)
        return {
          ...moved,
          currentGoal: 'terraforming',
          behaviorState: 'seekingFrozenMatter' as const,
          targetCell,
          memory: {
            ...moved.memory,
            terraformStuckTicks: didMove ? Math.max(0, moved.memory.terraformStuckTicks - 1) : moved.memory.terraformStuckTicks + 1,
            lastTerraformAction: 'moving_to_target',
            lastUsefulActionTick: closerToTarget ? generation : moved.memory.lastUsefulActionTick,
            recoveryTriggered: false,
          },
        }
      }

      if (!wantsToBuild && !site) {
        if (am.gatheredCells.length > 0 || am.carriedCell) releaseGatheredCells(am)
        return wanderAm({
          ...am,
          currentGoal: currentMission,
          buildSite: null,
          buildTarget: null,
          targetCell: null,
          carriedCell: null,
          gatheredCells: [],
        })
      }

      if (!site) {
        return createBuildSiteMission({ ...am, currentGoal: 'expandingPopulation', behaviorState: 'selectingBuildSite' as const })
      }

      if (site && am.carriedCell && am.behaviorState !== 'carryingCellToSite' && am.behaviorState !== 'assemblingAm') {
        return {
          ...am,
          behaviorState: 'carryingCellToSite' as const,
          buildSite: site.origin,
          buildTarget: findBuildSiteWorkTarget(am, site),
          targetCell: null,
          behaviorCooldown: 0,
        }
      }

      if (site && am.behaviorState === 'assemblingAm') {
        const workTarget = findBuildSiteWorkTarget(am, site)
        const nextCooldown = Math.max(0, am.behaviorCooldown - 1)
        if (nextCooldown > 0) return { ...am, buildSite: site.origin, buildTarget: workTarget, behaviorCooldown: nextCooldown }
        const moved = moveToward({ ...am, buildSite: site.origin, buildTarget: workTarget }, workTarget)
        return {
          ...moved,
          behaviorState: 'assemblingAm' as const,
          buildSite: site.origin,
          buildTarget: workTarget,
          gatheredCells: [],
          carriedCell: null,
        }
      }

      if (site && (am.behaviorState === 'seekingFixedCell' || am.behaviorState === 'movingToFixedCell')) {
        const targetCell = am.targetCell && isFixedCellAvailable(am.targetCell.x, am.targetCell.y, am.id, false)
          ? am.targetCell
          : findKnownStableHint(am) ?? findNearestStableCell(Math.round(getAmCenter(am).x), Math.round(getAmCenter(am).y), am)
        if (!targetCell) return { ...am, behaviorState: 'wandering' as const, targetCell: null, buildSite: site.origin }
        const informedAm = publishAmMessage(rewardAm(am, 0.4, 'stable_cell_found'), 'stableCellsFound', targetCell, 1)
        if (distanceToCell(informedAm, targetCell) <= 1) {
          return harvestTargetCell({
            ...informedAm,
            behaviorState: 'harvestingCell' as const,
            targetCell,
            buildSite: site.origin,
            buildTarget: site.origin,
          })
        }

        const nextCooldown = Math.max(0, informedAm.behaviorCooldown - 1)
        if (nextCooldown > 0) {
          return { ...informedAm, behaviorState: 'movingToFixedCell' as const, targetCell, buildSite: site.origin, behaviorCooldown: nextCooldown }
        }
        const moved = moveToward({ ...informedAm, targetCell, buildSite: site.origin, buildTarget: site.origin }, targetCell)
        return {
          ...moved,
          behaviorState: 'movingToFixedCell' as const,
          targetCell,
          buildSite: site.origin,
          buildTarget: site.origin,
        }
      }

      if (site && am.behaviorState === 'carryingCellToSite') {
        if (!am.carriedCell) return { ...am, behaviorState: 'seekingFixedCell' as const, gatheredCells: [] }
        if (canDepositFrom(am, site)) {
          return depositCarriedCell({ ...am, behaviorState: 'depositingCell' as const }, site)
        }
        const workTarget = findBuildSiteWorkTarget(am, site)
        const nextCooldown = Math.max(0, am.behaviorCooldown - 1)
        if (nextCooldown > 0) return { ...am, buildSite: site.origin, buildTarget: workTarget, behaviorCooldown: nextCooldown }
        const moved = moveToward({ ...am, buildSite: site.origin, buildTarget: workTarget }, workTarget)
        return {
          ...moved,
          behaviorState: 'carryingCellToSite' as const,
          buildSite: site.origin,
          buildTarget: workTarget,
        }
      }

      if (site) {
        return {
          ...am,
          behaviorState: 'seekingFixedCell' as const,
          buildSite: site.origin,
          buildTarget: site.origin,
          behaviorCooldown: roleConfig.movementInterval,
        }
      }

      return wanderAm(am)
      })())
      nextAmEntities.push(nextAm)
    }

    amEntities = nextAmEntities
  }
  function tickAmState() {
    amEntities = amEntities.map((am) => {
      const roleConfig = ROLE_CONFIG[am.role]
      const nextAge = am.age + 1
      const nextState: LifeGodAmEntity['state'] =
        nextAge < am.formationDurationCycles
          ? 'forming'
          : nextAge < am.formationDurationCycles + am.adaptationDurationCycles
            ? 'adapting'
            : 'alive'
      const cooldown = nextState === 'alive' ? Math.max(0, am.reproductionCooldown - 1) : am.reproductionCooldown
      const energyGain = nextState === 'alive' ? roleConfig.energyGain : roleConfig.energyGain * 0.35
      const energy = Math.min(100, am.energy + energyGain)
      const nextAm: LifeGodAmEntity = {
        ...am,
        age: nextAge,
        energy,
        reproductionCooldown: cooldown,
        state: nextState,
        behaviorState: nextState === 'alive' ? am.behaviorState : 'idle',
        absoluteCells: computeAbsoluteCells(am.cells, am.position),
      }
      const learnedAm = updateAmLearning(nextAm)
      return nextState === 'alive' ? absorbNearbyMessages(learnedAm) : learnedAm
    })
  }

  function seedRandomGrid() {
    clearGrid(current)
    stepAccumulator = 0
    phase = 'conwayEmergence'
    conwayActive = true
    matterFrozen = false
    frozenMatterGrid = null
    terrainGrid = createGrid()
    movedMatterSourceGrid = createGrid()
    currentMission = 'expandingPopulation'
    firstAmRevealed = false
    amLineages = []
    activePatternIds = []
    protoEntities = []
    amEntities = []
    constructionSites = []
    amMessages = []
    terraformReservations = []
    firstAmCandidate = null
    selectedAmId = null
    stabilityGrid = createGrid()
    prevGrid = createGrid()

    for (let y = 1; y < GRID_HEIGHT - 1; y += 1) {
      for (let x = 1; x < GRID_WIDTH - 1; x += 1) {
        current[indexAt(x, y)] = Math.random() < RANDOM_FILL_CHANCE ? 1 : 0
      }
    }

    prevGrid.set(current)
    generation = 0
    refreshAliveCount()
    initializeFirstAmCandidate()
    emit()
  }

  function stepSimulationCycle() {
    // AM = agent autonome, pas cellule Conway ni matiere figable.
    // On retire le corps visuel du tick precedent avant tout calcul de matiere.
    if (matterFrozen && frozenMatterGrid) {
      current.set(frozenMatterGrid)
    } else {
      clearAmVisualCellsFromMatterGrid()
    }

    // ── SYSTÈME 1 : Conway — actif uniquement si conwayActive ─────────────────
    if (conwayActive) {
      let nextAlive = 0

      for (let y = 0; y < GRID_HEIGHT; y += 1) {
        const rowOffset = y * GRID_WIDTH
        for (let x = 0; x < GRID_WIDTH; x += 1) {
          const index = rowOffset + x
          if (x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1) {
            next[index] = 0
            continue
          }

          const neighbors =
            current[index - GRID_WIDTH - 1] +
            current[index - GRID_WIDTH] +
            current[index - GRID_WIDTH + 1] +
            current[index - 1] +
            current[index + 1] +
            current[index + GRID_WIDTH - 1] +
            current[index + GRID_WIDTH] +
            current[index + GRID_WIDTH + 1]

          const alive = current[index] === 1
          const nextValue = neighbors === 3 || (alive && neighbors === 2) ? 1 : 0
          next[index] = nextValue
          nextAlive += nextValue
        }
      }

      suppressMovedMatterSources(next)
      current = next
      next = createGrid()
      aliveCount = recountAlive(current)
    }

    generation += 1

    if (firstAmCandidate && generation >= firstAmCandidate.revealAtCycle) {
      revealFirstAmCandidate()
    }

    updateCurrentMission()
    tickCeremony()

    // ── SYSTÈME 2 : Entités vivantes — TOUJOURS actif ─────────────────────────
    // Ce système continue même si Conway est arrêté et la matière figée.
    // Les AM ne sont jamais gelées, jamais traitées comme des cellules normales.
    tickAmState()
    tickRoleBehavior()
    tickConstructionSites()  // les chantiers continuent après le gel
    syncConstructionCells()
    syncAmCells()            // dessine les AM par-dessus la matiere en fin de tick
    tickAmMessages()
    tickTerraformReservations()
    refreshAliveCount()
    tryStartReproduction()
    updateStabilityGrid()    // calcule la stabilité des cellules pour guider les AM

    // ── Condition de gel : seules les cellules normales se figent ─────────────
    // Condition : firstAmRevealed && 11 AM alive && Conway encore actif
    if (shouldFreezeNormalCells()) {
      conwayActive = false
      matterFrozen = true
      phase = 'frozenMatter'
      // NE PAS vider constructionSites — les AM continuent de se reproduire
      freezeMatterFromCurrent()
      updateCurrentMission()
    } else {
      updatePhase()
      updateCurrentMission()
    }
  }

  function step() {
    stepAccumulator += timeScale
    let executed = false

    while (stepAccumulator >= 1) {
      stepSimulationCycle()
      stepAccumulator -= 1
      executed = true
    }

    if (!executed && timeScale >= 1) {
      stepSimulationCycle()
      stepAccumulator = 0
      executed = true
    }

    if (executed) {
      emit()
    }
  }

  function ensureLoop() {
    if (intervalId !== null) return
    intervalId = setInterval(step, TICK_MS)
  }

  function stopLoop() {
    if (intervalId === null) return
    clearInterval(intervalId)
    intervalId = null
  }

  seedRandomGrid()

  return {
    getState() {
      return getState()
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(getState())
      return () => {
        listeners.delete(listener)
      }
    },
    play() {
      if (status === 'playing') return
      status = 'playing'
      ensureLoop()
      emit()
    },
    pause() {
      if (status === 'paused') return
      status = 'paused'
      stopLoop()
      emit()
    },
    toggle() {
      if (status === 'playing') {
        status = 'paused'
        stopLoop()
        emit()
        return
      }
      status = 'playing'
      ensureLoop()
      emit()
    },
    reset() {
      stopLoop()
      status = 'paused'
      clearGrid(current)
      next = createGrid()
      stepAccumulator = 0
      phase = 'conwayEmergence'
      conwayActive = true
      matterFrozen = false
      frozenMatterGrid = null
      terrainGrid = createGrid()
      movedMatterSourceGrid = createGrid()
      currentMission = 'expandingPopulation'
      firstAmRevealed = false
      generation = 0
      aliveCount = 0
      amLineages = []
      activePatternIds = []
      protoEntities = []
      amEntities = []
      constructionSites = []
      amMessages = []
      terraformReservations = []
      patternRequestQueue = createPatternRequestQueue()
      currentPatternRequest = null
      completedPatternRequests = []
      currentPatternSpokespersonAmId = null
      treePatternLibrary = []
      animalPatternLibrary = []
      rockPatternLibrary = []
      riverPatternLibrary = []
      housePatternLibrary = []
      toolPatternLibrary = []
      ceremonyPhase = 'none'
      ceremonyCenterPoint = null
      ceremonyStartTick = 0
      ceremonyPhaseStartTick = 0
      ceremonyRequestType = null
      ceremonyCirclePositions = new Map()
      speechBubbles = []
      lastBubbleTick = 0
      worldAssets = []
      firstAmCandidate = null
      selectedAmId = null
      stabilityGrid = createGrid()
      prevGrid = createGrid()
      emit()
    },
    randomize() {
      stopLoop()
      status = 'paused'
      next = createGrid()
      stepAccumulator = 0
      currentMission = 'expandingPopulation'
      patternRequestQueue = createPatternRequestQueue()
      currentPatternRequest = null
      completedPatternRequests = []
      currentPatternSpokespersonAmId = null
      treePatternLibrary = []
      animalPatternLibrary = []
      rockPatternLibrary = []
      riverPatternLibrary = []
      housePatternLibrary = []
      toolPatternLibrary = []
      ceremonyPhase = 'none'
      ceremonyCenterPoint = null
      ceremonyStartTick = 0
      ceremonyPhaseStartTick = 0
      ceremonyRequestType = null
      ceremonyCirclePositions = new Map()
      speechBubbles = []
      lastBubbleTick = 0
      worldAssets = []
      seedRandomGrid()
    },
    increaseTimeScale() {
      const currentIndex = TIME_SCALES.indexOf(timeScale)
      if (currentIndex < TIME_SCALES.length - 1) {
        timeScale = TIME_SCALES[currentIndex + 1]
        emit()
      }
    },
    decreaseTimeScale() {
      const currentIndex = TIME_SCALES.indexOf(timeScale)
      if (currentIndex > 0) {
        timeScale = TIME_SCALES[currentIndex - 1]
        emit()
      }
    },
    setInfluence(x, y, mode) {
      influencePoint = { x, y, mode }
    },
    clearInfluence() {
      influencePoint = null
    },
    paintCell(x, y, mode) {
      if (x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) return
      if (x === 0 || y === 0 || x === GRID_WIDTH - 1 || y === GRID_HEIGHT - 1) return
      if (amEntities.some((am) => am.absoluteCells.some((cell) => cell.x === x && cell.y === y))) return

      const index = indexAt(x, y)
      const nextValue = mode === 'draw' ? 1 : 0
      if (current[index] === nextValue) return

      current[index] = nextValue
      refreshAliveCount()
      emit()
    },
    submitPlayerPattern(pattern) {
      const request = currentPatternRequest
      if (!request || pattern.type !== request.type) return false
      if (pattern.cells.length === 0) return false
      const library = getPatternLibrary(request.type)
      if (library.length >= PLAYER_PATTERN_LIBRARY_LIMITS[request.type]) return false

      const storedPattern: LifeGodPlayerPattern = {
        ...pattern,
        id: `player-${request.id}-${generation}`,
        createdAt: generation,
        requestIndex: request.requestIndex,
        colorHint: PLAYER_PATTERN_COLOR_HINTS[request.type],
      }

      setPatternLibrary(request.type, [...library, storedPattern])
      completedPatternRequests = [...completedPatternRequests, request.id]
      patternRequestQueue = patternRequestQueue.filter((item) => item.id !== request.id)

      if (ceremonyCenterPoint) {
        placeWorldAsset(storedPattern, ceremonyCenterPoint)
      }

      amEntities = amEntities.map(am => {
        if (am.state !== 'alive') return am
        return rewardAm(am, 2, 'prayer_answered')
      })

      endCeremonyRound()
      emit()
      return true
    },
    selectAm(amId) {
      selectedAmId = amEntities.some((am) => am.id === amId) ? amId : null
      emit()
    },
    stepSync() {
      stepSimulationCycle()
    },
    destroy() {
      stopLoop()
      listeners.clear()
    },
  }
}
