/**
 * Programme d'entrainement evolutif des AMs — v2
 *
 * Lancer avec :  npx tsx app/labo/life/_life-god-game/training/run-training.ts
 *
 * Options :
 *   --pop <n>        taille de la population  (defaut 30)
 *   --gen <n>        nombre de generations    (defaut 40)
 *   --ticks <n>      ticks par evaluation     (defaut 8000)
 *   --runs <n>       runs par individu        (defaut 2)
 *   --out <path>     fichier de sortie JSON
 *
 * Ameliorations v2 :
 *   - Fitness multi-phase avec echantillonnage temporel (snapshots toutes les 500 ticks)
 *   - Sous-scores : expansion, terraformation, cooperation, specialisation
 *   - Baseline automatique (poids neutres 1.0) — rejette si pas >15% mieux
 *   - Metriques societe : role coherence, communication, distribution spatiale
 *   - Rapport detaille en fin de session
 */

import { createLifeGodSimulation } from '../simulation/createLifeGodSimulation'
import type {
  LifeGodAmBrainWeights,
  LifeGodTrainingWeights,
  LifeGodSimulationState,
  LifeGodAmEntity,
} from '../types'
import * as fs from 'fs'
import * as path from 'path'

// ── Config CLI ───────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string, def: string) => {
    const i = args.indexOf(flag)
    return i >= 0 && i + 1 < args.length ? args[i + 1] : def
  }
  return {
    populationSize: parseInt(get('--pop', '30'), 10),
    generations: parseInt(get('--gen', '40'), 10),
    ticksPerEval: parseInt(get('--ticks', '8000'), 10),
    runsPerIndividual: parseInt(get('--runs', '2'), 10),
    outPath: get('--out', path.join(__dirname, 'training-results', 'best-weights.json')),
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

interface FitnessBreakdown {
  total: number
  expansion: number
  terraform: number
  cooperation: number
  specialization: number
  efficiency: number
  penalties: number
}

interface Individual {
  weights: LifeGodTrainingWeights
  fitness: number
  breakdown: FitnessBreakdown
}

interface SavedOutput {
  meta: {
    date: string
    populationSize: number
    generations: number
    ticksPerEval: number
    runsPerIndividual: number
    bestFitness: number
    baselineFitness: number
    improvementPercent: number
    totalSessions: number
  }
  weights: LifeGodTrainingWeights
  breakdown: FitnessBreakdown
  top10: Array<{
    rank: number
    fitness: number
    breakdown: FitnessBreakdown
    weights: LifeGodTrainingWeights
    session?: number
  }>
}

const WEIGHT_KEYS: (keyof LifeGodAmBrainWeights)[] = [
  'explore', 'seekCells', 'gatherCells', 'carryToSite', 'buildAm',
  'avoidWall', 'avoidCrowd', 'seekFrozenMatter', 'terraform', 'rest',
]

const ROLES = ['builder', 'gatherer', 'explorer'] as const

const MIN_W = 0.2
const MAX_W = 3.0
const SNAPSHOT_INTERVAL = 500

// ── Utilitaires poids ────────────────────────────────────────────────────────

function clamp(v: number) {
  return Math.max(MIN_W, Math.min(MAX_W, v))
}

function randomWeight() {
  return clamp(MIN_W + Math.random() * (MAX_W - MIN_W))
}

function randomBrainWeights(): LifeGodAmBrainWeights {
  const w: Record<string, number> = {}
  for (const k of WEIGHT_KEYS) w[k] = randomWeight()
  return w as unknown as LifeGodAmBrainWeights
}

function neutralBrainWeights(): LifeGodAmBrainWeights {
  const w: Record<string, number> = {}
  for (const k of WEIGHT_KEYS) w[k] = 1.0
  return w as unknown as LifeGodAmBrainWeights
}

function randomIndividual(): LifeGodTrainingWeights {
  return { builder: randomBrainWeights(), gatherer: randomBrainWeights(), explorer: randomBrainWeights() }
}

function neutralWeights(): LifeGodTrainingWeights {
  return { builder: neutralBrainWeights(), gatherer: neutralBrainWeights(), explorer: neutralBrainWeights() }
}

// ── Chargement des sessions precedentes ─────────────────────────────────────

function loadPreviousResults(outPath: string): SavedOutput | null {
  if (!fs.existsSync(outPath)) return null
  try {
    const data = JSON.parse(fs.readFileSync(outPath, 'utf-8')) as SavedOutput
    if (!data.top10 || !Array.isArray(data.top10)) return null
    return data
  } catch {
    return null
  }
}

// ── Algorithme genetique ─────────────────────────────────────────────────────

function tournamentSelect(pop: Individual[], k = 3): Individual {
  let best: Individual | null = null
  for (let i = 0; i < k; i++) {
    const candidate = pop[Math.floor(Math.random() * pop.length)]
    if (!best || candidate.fitness > best.fitness) best = candidate
  }
  return best!
}

function crossover(a: LifeGodTrainingWeights, b: LifeGodTrainingWeights): LifeGodTrainingWeights {
  const child: LifeGodTrainingWeights = { builder: { ...a.builder }, gatherer: { ...a.gatherer }, explorer: { ...a.explorer } }
  for (const role of ROLES) {
    if (Math.random() < 0.3) {
      child[role] = { ...(Math.random() < 0.5 ? a : b)[role] }
    } else {
      for (const k of WEIGHT_KEYS) {
        child[role][k] = Math.random() < 0.5 ? a[role][k] : b[role][k]
      }
    }
  }
  return child
}

function mutate(w: LifeGodTrainingWeights, rate = 0.18, strength = 0.3): LifeGodTrainingWeights {
  const m: LifeGodTrainingWeights = { builder: { ...w.builder }, gatherer: { ...w.gatherer }, explorer: { ...w.explorer } }
  for (const role of ROLES) {
    for (const k of WEIGHT_KEYS) {
      if (Math.random() < rate) {
        m[role][k] = clamp(m[role][k] + (Math.random() * 2 - 1) * strength)
      }
    }
  }
  return m
}

// ── Metriques avancees ──────────────────────────────────────────────────────

function getAliveAms(s: LifeGodSimulationState): LifeGodAmEntity[] {
  return s.amEntities.filter(am => am.state === 'alive')
}

function measureRoleSpecialization(s: LifeGodSimulationState): number {
  const alive = getAliveAms(s)
  if (alive.length < 3) return 0

  let score = 0
  for (const am of alive) {
    const w = am.brain.weights
    if (am.role === 'builder') {
      const buildFocus = (w.buildAm + w.seekCells + w.carryToSite) / 3
      const otherFocus = (w.explore + w.terraform) / 2
      if (buildFocus > otherFocus) score += 1
    } else if (am.role === 'gatherer') {
      const gatherFocus = (w.seekCells + w.gatherCells + w.carryToSite) / 3
      const otherFocus = (w.explore + w.terraform) / 2
      if (gatherFocus > otherFocus) score += 1
    } else if (am.role === 'explorer') {
      const exploreFocus = (w.explore + w.seekFrozenMatter) / 2
      const otherFocus = (w.buildAm + w.gatherCells) / 2
      if (exploreFocus > otherFocus) score += 1
    }
  }
  return score / alive.length
}

function measureSpatialDistribution(s: LifeGodSimulationState): number {
  const alive = getAliveAms(s)
  if (alive.length < 2) return 0

  let totalDist = 0
  let pairs = 0
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const dx = alive[i].position.x - alive[j].position.x
      const dy = alive[i].position.y - alive[j].position.y
      totalDist += Math.sqrt(dx * dx + dy * dy)
      pairs++
    }
  }
  const avgDist = pairs > 0 ? totalDist / pairs : 0
  const ideal = 35
  return Math.max(0, 1 - Math.abs(avgDist - ideal) / ideal)
}

function measureCommunicationEfficiency(s: LifeGodSimulationState): number {
  const alive = getAliveAms(s)
  if (alive.length === 0) return 0

  let totalHints = 0
  let totalUsefulZones = 0
  for (const am of alive) {
    totalHints += am.memory.knownResourceHints.length + am.memory.knownDangerHints.length
    totalUsefulZones += am.memory.usefulZones.length
  }
  const avgHints = totalHints / alive.length
  const avgUseful = totalUsefulZones / alive.length
  return Math.min(1, (avgHints * 0.3 + avgUseful * 0.5) / 4)
}

function measureMovementEfficiency(s: LifeGodSimulationState): number {
  const alive = getAliveAms(s)
  if (alive.length === 0) return 0

  let totalStuck = 0
  let totalImmobile = 0
  let totalEscaping = 0
  for (const am of alive) {
    if (am.behaviorState === 'escapingStuckArea') totalEscaping++
    if (am.memory.stationaryTicks > 20) totalImmobile++
    totalStuck += am.memory.stuckAreaTicks
  }
  const stuckRatio = (totalEscaping + totalImmobile) / alive.length
  return Math.max(0, 1 - stuckRatio)
}

function measureTerraformDiversity(s: LifeGodSimulationState): number {
  const types = [s.soilCount, s.vegetationCount, s.waterCount, s.rockCount]
  const total = types.reduce((a, b) => a + b, 0)
  if (total === 0) return 0

  const ratios = types.map(t => t / total)
  let entropy = 0
  for (const r of ratios) {
    if (r > 0) entropy -= r * Math.log2(r)
  }
  return entropy / 2
}

// ── Fitness multi-phase ─────────────────────────────────────────────────────

interface Snapshot {
  tick: number
  aliveCount: number
  phase: string
  terraformProgress: number
  terraformCoherence: number
  stuckCount: number
  immobileCount: number
  totalReward: number
  constructionSites: number
}

function evaluateFitness(weights: LifeGodTrainingWeights, totalTicks: number): { fitness: number; breakdown: FitnessBreakdown } {
  const sim = createLifeGodSimulation({ headless: true, initialWeights: weights })

  const snapshots: Snapshot[] = []

  for (let t = 1; t <= totalTicks; t++) {
    sim.stepSync()

    if (t % SNAPSHOT_INTERVAL === 0 || t === totalTicks) {
      const s = sim.getState()
      const alive = getAliveAms(s)
      snapshots.push({
        tick: t,
        aliveCount: alive.length,
        phase: s.phase,
        terraformProgress: s.terraformationProgress,
        terraformCoherence: s.terraformCoherenceScore,
        stuckCount: alive.filter(am => am.behaviorState === 'escapingStuckArea').length,
        immobileCount: alive.filter(am => am.memory.stationaryTicks > 20).length,
        totalReward: alive.reduce((sum, am) => sum + am.brain.totalReward, 0),
        constructionSites: s.constructionSites.length,
      })
    }
  }

  const final = sim.getState()
  sim.destroy()

  const alive = getAliveAms(final)
  const aliveCount = alive.length

  // ── 1. EXPANSION (0-200 pts) ──
  // Vitesse a atteindre chaque palier de population
  let expansionScore = 0

  const firstAmTick = snapshots.find(s => s.aliveCount >= 1)?.tick ?? totalTicks
  const fiveAmTick = snapshots.find(s => s.aliveCount >= 5)?.tick ?? totalTicks
  const tenAmTick = snapshots.find(s => s.aliveCount >= 10)?.tick ?? totalTicks

  expansionScore += Math.max(0, 30 * (1 - firstAmTick / totalTicks))
  expansionScore += Math.max(0, 60 * (1 - fiveAmTick / totalTicks))
  expansionScore += Math.max(0, 80 * (1 - tenAmTick / totalTicks))
  expansionScore += Math.min(30, aliveCount * 3)

  // ── 2. TERRAFORM (0-300 pts) ──
  let terraformScore = 0

  terraformScore += final.terraformationProgress * 120

  terraformScore += final.terraformCoherenceScore * 60

  terraformScore += measureTerraformDiversity(final) * 50

  const terraformSpeedCurve = snapshots.reduce((acc, snap, i) => {
    if (i === 0) return 0
    const prev = snapshots[i - 1]
    const delta = snap.terraformProgress - prev.terraformProgress
    return acc + (delta > 0 ? delta * (1 - snap.tick / totalTicks) : 0)
  }, 0)
  terraformScore += terraformSpeedCurve * 200

  if (final.terraformationComplete) terraformScore += 40
  if (final.terraformationStabilized) terraformScore += 30

  // ── 3. COOPERATION (0-150 pts) ──
  let cooperationScore = 0

  cooperationScore += measureCommunicationEfficiency(final) * 50

  cooperationScore += measureSpatialDistribution(final) * 40

  cooperationScore += measureMovementEfficiency(final) * 40

  const avgIndependence = alive.length > 0
    ? alive.reduce((sum, am) => sum + am.memory.independenceScore, 0) / alive.length
    : 0
  cooperationScore += Math.min(20, avgIndependence * 20)

  // ── 4. SPECIALISATION (0-100 pts) ──
  let specializationScore = 0

  specializationScore += measureRoleSpecialization(final) * 40

  const roleGroups = { builder: 0, gatherer: 0, explorer: 0 }
  for (const am of alive) roleGroups[am.role]++
  const roleVariance = Object.values(roleGroups).reduce((sum, count) => {
    const expected = aliveCount / 3
    return sum + Math.abs(count - expected)
  }, 0)
  specializationScore += Math.max(0, 30 - roleVariance * 5)

  const terraformByRole = { builder: 0, gatherer: 0, explorer: 0 }
  for (const am of alive) terraformByRole[am.role] += am.memory.terraformedCells
  const totalTerraformed = Object.values(terraformByRole).reduce((a, b) => a + b, 0)
  if (totalTerraformed > 0) {
    const builderRatio = terraformByRole.builder / totalTerraformed
    const explorerContrib = terraformByRole.explorer / totalTerraformed
    if (builderRatio > 0.2) specializationScore += 15
    if (explorerContrib > 0.15) specializationScore += 15
  }

  // ── 5. EFFICACITE (0-100 pts) ──
  let efficiencyScore = 0

  const rewardCurve = snapshots.map((snap, i) => {
    if (i === 0) return 0
    return snap.totalReward - snapshots[i - 1].totalReward
  })
  const avgRewardGrowth = rewardCurve.length > 0
    ? rewardCurve.reduce((a, b) => a + b, 0) / rewardCurve.length
    : 0
  efficiencyScore += Math.min(40, avgRewardGrowth * 2)

  const avgEnergy = alive.length > 0
    ? alive.reduce((sum, am) => sum + am.energy, 0) / alive.length
    : 0
  efficiencyScore += Math.min(20, avgEnergy * 0.3)

  const stuckSnapshots = snapshots.reduce((sum, snap) => sum + snap.stuckCount + snap.immobileCount, 0)
  const maxStuckPossible = snapshots.length * 15
  const stuckRatio = maxStuckPossible > 0 ? stuckSnapshots / maxStuckPossible : 0
  efficiencyScore += Math.max(0, 40 * (1 - stuckRatio * 3))

  // ── 6. PENALITES ──
  let penalties = 0

  penalties += final.criticallyBlockedAmCount * 25
  penalties += final.isolatedTerrainCount * 0.15

  const latestSnapshots = snapshots.slice(-3)
  const lateStuck = latestSnapshots.reduce((sum, s) => sum + s.stuckCount + s.immobileCount, 0)
  penalties += lateStuck * 8

  if (aliveCount < 5 && totalTicks > 4000) penalties += 40
  if (aliveCount === 0) penalties += 100

  const breakdown: FitnessBreakdown = {
    total: 0,
    expansion: Math.round(expansionScore * 10) / 10,
    terraform: Math.round(terraformScore * 10) / 10,
    cooperation: Math.round(cooperationScore * 10) / 10,
    specialization: Math.round(specializationScore * 10) / 10,
    efficiency: Math.round(efficiencyScore * 10) / 10,
    penalties: Math.round(penalties * 10) / 10,
  }

  breakdown.total = Math.round(
    (breakdown.expansion + breakdown.terraform + breakdown.cooperation +
     breakdown.specialization + breakdown.efficiency - breakdown.penalties) * 10
  ) / 10

  return { fitness: breakdown.total, breakdown }
}

function evaluateWithRuns(weights: LifeGodTrainingWeights, ticks: number, runs: number): { fitness: number; breakdown: FitnessBreakdown } {
  let totalFitness = 0
  const totalBreakdown: FitnessBreakdown = {
    total: 0, expansion: 0, terraform: 0, cooperation: 0,
    specialization: 0, efficiency: 0, penalties: 0,
  }

  for (let r = 0; r < runs; r++) {
    const result = evaluateFitness(weights, ticks)
    totalFitness += result.fitness
    for (const key of Object.keys(totalBreakdown) as (keyof FitnessBreakdown)[]) {
      totalBreakdown[key] += result.breakdown[key]
    }
  }

  for (const key of Object.keys(totalBreakdown) as (keyof FitnessBreakdown)[]) {
    totalBreakdown[key] = Math.round((totalBreakdown[key] / runs) * 10) / 10
  }

  return { fitness: Math.round((totalFitness / runs) * 10) / 10, breakdown: totalBreakdown }
}

// ── Fusion du top 10 global ─────────────────────────────────────────────────

function mergeTop10(
  previousTop10: SavedOutput['top10'],
  currentTop10: Array<{ fitness: number; breakdown: FitnessBreakdown; weights: LifeGodTrainingWeights }>,
  currentSession: number,
): SavedOutput['top10'] {
  const all = [
    ...previousTop10.map(e => ({ fitness: e.fitness, breakdown: e.breakdown, weights: e.weights, session: e.session ?? 0 })),
    ...currentTop10.map(e => ({ fitness: e.fitness, breakdown: e.breakdown, weights: e.weights, session: currentSession })),
  ]
  all.sort((a, b) => b.fitness - a.fitness)

  const seen = new Set<string>()
  const unique: typeof all = []
  for (const entry of all) {
    const key = JSON.stringify(entry.weights)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(entry)
    if (unique.length >= 10) break
  }

  return unique.map((e, i) => ({
    rank: i + 1,
    fitness: e.fitness,
    breakdown: e.breakdown,
    weights: e.weights,
    session: e.session,
  }))
}

// ── Affichage ───────────────────────────────────────────────────────────────

function formatWeights(w: LifeGodAmBrainWeights): string {
  return WEIGHT_KEYS.map(k => `${k}=${w[k].toFixed(2)}`).join(' ')
}

function formatBreakdown(b: FitnessBreakdown): string {
  return `Exp:${b.expansion} Ter:${b.terraform} Coop:${b.cooperation} Spec:${b.specialization} Eff:${b.efficiency} Pen:-${b.penalties}`
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// ── Boucle principale ────────────────────────────────────────────────────────

function run() {
  const sessionStart = Date.now()
  const cfg = parseArgs()
  const previous = loadPreviousResults(cfg.outPath)
  const sessionNumber = (previous?.meta.totalSessions ?? 0) + 1

  console.log('=== ENTRAINEMENT EVOLUTIF DES AMs v2 ===')
  console.log(`Session #${sessionNumber}`)
  console.log(`Population: ${cfg.populationSize}  |  Generations: ${cfg.generations}  |  Ticks/eval: ${cfg.ticksPerEval}  |  Runs/individu: ${cfg.runsPerIndividual}`)
  console.log(`Snapshots: toutes les ${SNAPSHOT_INTERVAL} ticks (${Math.floor(cfg.ticksPerEval / SNAPSHOT_INTERVAL)} checkpoints par eval)`)

  if (previous) {
    console.log(`\nSessions precedentes detectees (${previous.meta.totalSessions} sessions)`)
    console.log(`Record actuel: fitness ${previous.meta.bestFitness.toFixed(1)}`)
  }
  console.log()

  // ── Baseline : poids neutres (1.0) ──
  console.log('Evaluation baseline (poids neutres 1.0)...')
  const baselineResult = evaluateWithRuns(neutralWeights(), cfg.ticksPerEval, Math.max(3, cfg.runsPerIndividual))
  console.log(`  Baseline: ${baselineResult.fitness.toFixed(1)}  [${formatBreakdown(baselineResult.breakdown)}]`)
  console.log()

  // ── Population initiale ──
  let population: Individual[] = []

  // Toujours inclure le baseline comme reference
  population.push({ weights: neutralWeights(), fitness: baselineResult.fitness, breakdown: baselineResult.breakdown })

  // Reinjecter les elites des sessions precedentes
  if (previous?.top10) {
    console.log('Reinjection des elites precedentes...')
    for (const elite of previous.top10.slice(0, 5)) {
      const result = evaluateWithRuns(elite.weights, cfg.ticksPerEval, cfg.runsPerIndividual)
      population.push({ weights: elite.weights, fitness: result.fitness, breakdown: result.breakdown })
      const delta = result.fitness - elite.fitness
      console.log(`  Elite #${elite.rank} (session #${elite.session ?? '?'}) -> ${result.fitness.toFixed(1)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`)
    }
  }

  // Individus proches du baseline avec petites mutations
  const nearBaselineCount = Math.min(5, Math.floor(cfg.populationSize * 0.15))
  console.log(`Generation de ${nearBaselineCount} mutants proches du baseline...`)
  for (let i = 0; i < nearBaselineCount; i++) {
    const weights = mutate(neutralWeights(), 0.4, 0.15)
    const result = evaluateWithRuns(weights, cfg.ticksPerEval, cfg.runsPerIndividual)
    population.push({ weights, fitness: result.fitness, breakdown: result.breakdown })
  }

  // Completer avec des individus aleatoires
  const remaining = Math.max(0, cfg.populationSize - population.length)
  if (remaining > 0) console.log(`Generation de ${remaining} individus aleatoires...`)
  for (let i = 0; i < remaining; i++) {
    const weights = randomIndividual()
    const result = evaluateWithRuns(weights, cfg.ticksPerEval, cfg.runsPerIndividual)
    population.push({ weights, fitness: result.fitness, breakdown: result.breakdown })
    process.stdout.write(`  Individu ${i + 1}/${remaining} -> fitness: ${result.fitness.toFixed(1)}\r`)
  }

  population.sort((a, b) => b.fitness - a.fitness)
  console.log(`\nGen 0  |  Best: ${population[0].fitness.toFixed(1)}  Med: ${population[Math.floor(population.length / 2)].fitness.toFixed(1)}  |  Baseline: ${baselineResult.fitness.toFixed(1)}`)
  console.log(`        [${formatBreakdown(population[0].breakdown)}]`)

  // ── Boucle evolutive ──
  let bestEver = population[0]
  let stagnationCount = 0
  let lastBestFitness = bestEver.fitness

  for (let gen = 1; gen <= cfg.generations; gen++) {
    const genStart = Date.now()
    const nextPop: Individual[] = []

    // Elitisme : top 3
    for (let i = 0; i < Math.min(3, population.length); i++) {
      nextPop.push(population[i])
    }

    // Detection de stagnation → augmenter mutations
    const improved = population[0].fitness > lastBestFitness
    stagnationCount = improved ? 0 : stagnationCount + 1
    lastBestFitness = population[0].fitness

    const mutationRate = stagnationCount > 5 ? 0.3 : stagnationCount > 3 ? 0.22 : 0.18
    const mutationStrength = stagnationCount > 5 ? 0.5 : stagnationCount > 3 ? 0.35 : 0.3

    while (nextPop.length < cfg.populationSize) {
      const parentA = tournamentSelect(population)
      const parentB = tournamentSelect(population)
      let child = crossover(parentA.weights, parentB.weights)
      child = mutate(child, mutationRate, mutationStrength)
      const result = evaluateWithRuns(child, cfg.ticksPerEval, cfg.runsPerIndividual)
      nextPop.push({ weights: child, fitness: result.fitness, breakdown: result.breakdown })
      process.stdout.write(`  Gen ${gen}: ${nextPop.length}/${cfg.populationSize}\r`)
    }

    nextPop.sort((a, b) => b.fitness - a.fitness)
    population = nextPop

    if (population[0].fitness > bestEver.fitness) {
      bestEver = population[0]
    }

    const elapsed = ((Date.now() - genStart) / 1000).toFixed(1)
    const best = population[0].fitness.toFixed(1)
    const median = population[Math.floor(population.length / 2)].fitness.toFixed(1)
    const worst = population[population.length - 1].fitness.toFixed(1)
    const vsBaseline = ((population[0].fitness / baselineResult.fitness - 1) * 100).toFixed(1)
    const stag = stagnationCount > 0 ? ` stag:${stagnationCount}` : ''
    console.log(`Gen ${gen}/${cfg.generations}  |  Best: ${best} (${vsBaseline}% vs baseline)  Med: ${median}  Worst: ${worst}  |  ${elapsed}s${stag}`)

    if (gen % 10 === 0) {
      console.log(`  [${formatBreakdown(population[0].breakdown)}]`)
    }
  }

  // ── Validation finale ──
  console.log('\n=== VALIDATION FINALE ===')
  console.log('Re-evaluation du meilleur avec 5 runs...')
  const validationResult = evaluateWithRuns(bestEver.weights, cfg.ticksPerEval, 5)
  console.log(`  Fitness validee: ${validationResult.fitness.toFixed(1)}`)
  console.log(`  [${formatBreakdown(validationResult.breakdown)}]`)

  bestEver = { ...bestEver, fitness: validationResult.fitness, breakdown: validationResult.breakdown }

  const improvementPercent = baselineResult.fitness > 0
    ? ((bestEver.fitness / baselineResult.fitness) - 1) * 100
    : 0

  console.log(`\n  Baseline:     ${baselineResult.fitness.toFixed(1)}`)
  console.log(`  Meilleur:     ${bestEver.fitness.toFixed(1)}`)
  console.log(`  Amelioration: ${improvementPercent >= 0 ? '+' : ''}${improvementPercent.toFixed(1)}%`)

  if (improvementPercent < 15) {
    console.log('\n  ⚠ ATTENTION: amelioration < 15% par rapport au baseline.')
    console.log('  Les poids seront sauvegardes mais NE DEVRAIENT PAS etre appliques.')
    console.log('  Relancez avec plus de generations (--gen 80) ou plus de population (--pop 50).')
  } else {
    console.log('\n  ✓ Amelioration significative. Poids prets a etre appliques.')
  }

  // ── Fusion top 10 global ──
  const currentSessionTop = population.slice(0, 10).map(ind => ({
    fitness: ind.fitness,
    breakdown: ind.breakdown,
    weights: ind.weights,
  }))
  const globalTop10 = mergeTop10(
    (previous?.top10 ?? []).map(e => ({
      ...e,
      breakdown: e.breakdown ?? { total: e.fitness, expansion: 0, terraform: 0, cooperation: 0, specialization: 0, efficiency: 0, penalties: 0 },
    })),
    currentSessionTop,
    sessionNumber,
  )
  const globalBest = globalTop10[0]

  // ── Rapport final ──
  console.log('\n=== TOP 10 GLOBAL (toutes sessions) ===')
  for (const entry of globalTop10) {
    console.log(`  #${entry.rank}  fitness: ${entry.fitness.toFixed(1)}  (session #${entry.session})  [${formatBreakdown(entry.breakdown)}]`)
  }

  console.log('\n=== MEILLEURS POIDS ===')
  console.log('  Builder:  ' + formatWeights(globalBest.weights.builder))
  console.log('  Gatherer: ' + formatWeights(globalBest.weights.gatherer))
  console.log('  Explorer: ' + formatWeights(globalBest.weights.explorer))

  console.log('\n=== COMPARAISON DETAILLEE vs BASELINE ===')
  const bb = baselineResult.breakdown
  const gb = globalBest.breakdown
  console.log(`  Expansion:       ${bb.expansion.toFixed(1)} -> ${gb.expansion.toFixed(1)}  (${gb.expansion > bb.expansion ? '+' : ''}${(gb.expansion - bb.expansion).toFixed(1)})`)
  console.log(`  Terraform:       ${bb.terraform.toFixed(1)} -> ${gb.terraform.toFixed(1)}  (${gb.terraform > bb.terraform ? '+' : ''}${(gb.terraform - bb.terraform).toFixed(1)})`)
  console.log(`  Cooperation:     ${bb.cooperation.toFixed(1)} -> ${gb.cooperation.toFixed(1)}  (${gb.cooperation > bb.cooperation ? '+' : ''}${(gb.cooperation - bb.cooperation).toFixed(1)})`)
  console.log(`  Specialisation:  ${bb.specialization.toFixed(1)} -> ${gb.specialization.toFixed(1)}  (${gb.specialization > bb.specialization ? '+' : ''}${(gb.specialization - bb.specialization).toFixed(1)})`)
  console.log(`  Efficacite:      ${bb.efficiency.toFixed(1)} -> ${gb.efficiency.toFixed(1)}  (${gb.efficiency > bb.efficiency ? '+' : ''}${(gb.efficiency - bb.efficiency).toFixed(1)})`)
  console.log(`  Penalites:       ${bb.penalties.toFixed(1)} -> ${gb.penalties.toFixed(1)}  (${gb.penalties < bb.penalties ? '-' : '+'}${Math.abs(gb.penalties - bb.penalties).toFixed(1)})`)

  // ── Export ──
  const outDir = path.dirname(cfg.outPath)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  const output: SavedOutput = {
    meta: {
      date: new Date().toISOString(),
      populationSize: cfg.populationSize,
      generations: cfg.generations,
      ticksPerEval: cfg.ticksPerEval,
      runsPerIndividual: cfg.runsPerIndividual,
      bestFitness: globalBest.fitness,
      baselineFitness: baselineResult.fitness,
      improvementPercent: Math.round(improvementPercent * 10) / 10,
      totalSessions: sessionNumber,
    },
    weights: globalBest.weights,
    breakdown: globalBest.breakdown,
    top10: globalTop10,
  }

  fs.writeFileSync(cfg.outPath, JSON.stringify(output, null, 2), 'utf-8')
  console.log(`\nResultats sauvegardes dans: ${cfg.outPath}`)
  console.log(`Sessions cumulees: ${sessionNumber}`)

  const totalTime = formatDuration(Date.now() - sessionStart)
  console.log('\n' + '='.repeat(56))
  console.log('   ENTRAINEMENT TERMINE  -  Duree: ' + totalTime)
  console.log('='.repeat(56))
  console.log('\nTu peux fermer cette fenetre et relancer le raccourci')
  console.log('pour une nouvelle session (les resultats se cumulent).\n')
  process.stdout.write('\x07')
}

run()
