/**
 * Applique les poids entraines dans la simulation.
 *
 * Usage :  npx tsx app/labo/life/_life-god-game/training/apply-weights.ts [path/to/best-weights.json]
 *
 * Lit le fichier de resultats et met a jour le fichier trained-weights.ts.
 * Refuse d'appliquer si l'amelioration vs baseline est < 15%.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { LifeGodTrainingWeights, LifeGodAmBrainWeights } from '../types'

const WEIGHT_KEYS: (keyof LifeGodAmBrainWeights)[] = [
  'explore', 'seekCells', 'gatherCells', 'carryToSite', 'buildAm',
  'avoidWall', 'avoidCrowd', 'seekFrozenMatter', 'terraform', 'rest',
]

const MIN_IMPROVEMENT_PERCENT = 15

function formatWeightsObject(w: LifeGodAmBrainWeights, indent: string): string {
  const lines = WEIGHT_KEYS.map(k => `${indent}  ${k}: ${w[k].toFixed(4)},`)
  return `{\n${lines.join('\n')}\n${indent}}`
}

function run() {
  const inputPath = process.argv[2] || path.join(__dirname, 'training-results', 'best-weights.json')
  const forceFlag = process.argv.includes('--force')

  if (!fs.existsSync(inputPath)) {
    console.error(`Fichier introuvable: ${inputPath}`)
    console.error('Lancez d\'abord: npx tsx app/labo/life/_life-god-game/training/run-training.ts')
    process.exit(1)
  }

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
  const weights: LifeGodTrainingWeights = data.weights

  if (!weights?.builder || !weights?.gatherer || !weights?.explorer) {
    console.error('Format de fichier invalide: les poids builder/gatherer/explorer sont manquants.')
    process.exit(1)
  }

  const improvement = data.meta?.improvementPercent ?? 0
  const baselineFitness = data.meta?.baselineFitness ?? 0
  const bestFitness = data.meta?.bestFitness ?? 0

  console.log('=== VALIDATION DES POIDS ===')
  console.log(`  Baseline:      ${baselineFitness}`)
  console.log(`  Meilleur:      ${bestFitness}`)
  console.log(`  Amelioration:  ${improvement >= 0 ? '+' : ''}${improvement}%`)
  console.log(`  Seuil requis:  +${MIN_IMPROVEMENT_PERCENT}%`)
  console.log()

  if (improvement < MIN_IMPROVEMENT_PERCENT && !forceFlag) {
    console.error(`REFUSE : amelioration de ${improvement}% < seuil de ${MIN_IMPROVEMENT_PERCENT}%.`)
    console.error('Les poids ne sont pas assez meilleurs que le baseline (1.0) pour etre appliques.')
    console.error('Options :')
    console.error('  - Relancez l\'entrainement avec plus de generations/population')
    console.error('  - Utilisez --force pour appliquer quand meme (deconseille)')
    process.exit(1)
  }

  if (forceFlag && improvement < MIN_IMPROVEMENT_PERCENT) {
    console.log(`  ⚠ Application forcee malgre amelioration insuffisante (${improvement}%).`)
    console.log()
  }

  const breakdown = data.breakdown
  const breakdownComment = breakdown
    ? `\n * Breakdown: Exp=${breakdown.expansion} Ter=${breakdown.terraform} Coop=${breakdown.cooperation} Spec=${breakdown.specialization} Eff=${breakdown.efficiency} Pen=-${breakdown.penalties}`
    : ''

  const outputPath = path.join(__dirname, '..', 'simulation', 'trained-weights.ts')

  const content = `import type { LifeGodTrainingWeights } from '../types'

/**
 * Poids optimises par algorithme evolutif v2.
 * Genere le ${new Date().toISOString().split('T')[0]}
 * Fitness: ${data.meta?.bestFitness?.toFixed(1) ?? '?'} (baseline: ${baselineFitness}, +${improvement}%)
 * Config: pop=${data.meta?.populationSize ?? '?'} gen=${data.meta?.generations ?? '?'} ticks=${data.meta?.ticksPerEval ?? '?'} runs=${data.meta?.runsPerIndividual ?? '?'}${breakdownComment}
 */
export const TRAINED_AM_WEIGHTS: LifeGodTrainingWeights = {
  builder: ${formatWeightsObject(weights.builder, '  ')},
  gatherer: ${formatWeightsObject(weights.gatherer, '  ')},
  explorer: ${formatWeightsObject(weights.explorer, '  ')},
}
`

  fs.writeFileSync(outputPath, content, 'utf-8')
  console.log(`Poids appliques dans: ${outputPath}`)
  console.log()
  console.log('Builder:')
  for (const k of WEIGHT_KEYS) console.log(`  ${k}: ${weights.builder[k].toFixed(4)}`)
  console.log('Gatherer:')
  for (const k of WEIGHT_KEYS) console.log(`  ${k}: ${weights.gatherer[k].toFixed(4)}`)
  console.log('Explorer:')
  for (const k of WEIGHT_KEYS) console.log(`  ${k}: ${weights.explorer[k].toFixed(4)}`)
}

run()
