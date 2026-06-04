/**
 * Affiche un resume lisible des resultats d'entrainement v2.
 * Montre le breakdown par axe, la comparaison vs baseline, et l'historique.
 *
 * Usage :  npx tsx app/labo/life/_life-god-game/training/show-results.ts
 *
 * Options :
 *   --save     Applique les poids si amelioration > 15% (appelle apply-weights)
 *   --force    Avec --save, applique meme si amelioration < 15%
 *   --history  Affiche l'historique detaille de toutes les sessions
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import type { LifeGodAmBrainWeights } from '../types'

const WEIGHT_KEYS: (keyof LifeGodAmBrainWeights)[] = [
  'explore', 'seekCells', 'gatherCells', 'carryToSite', 'buildAm',
  'avoidWall', 'avoidCrowd', 'seekFrozenMatter', 'terraform', 'rest',
]

interface FitnessBreakdown {
  total: number
  expansion: number
  terraform: number
  cooperation: number
  specialization: number
  efficiency: number
  penalties: number
}

function bar(value: number, max = 3.0, width = 20): string {
  const filled = Math.round((Math.min(value, max) / max) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function scoreBar(value: number, max: number, width = 25): string {
  const ratio = Math.max(0, Math.min(1, value / max))
  const filled = Math.round(ratio * width)
  const color = ratio > 0.7 ? '\x1b[32m' : ratio > 0.4 ? '\x1b[33m' : '\x1b[31m'
  return color + '█'.repeat(filled) + '\x1b[90m' + '░'.repeat(width - filled) + '\x1b[0m'
}

function formatBreakdownTable(b: FitnessBreakdown, baseline?: FitnessBreakdown): string {
  const axes: Array<{ label: string; key: keyof FitnessBreakdown; max: number }> = [
    { label: 'Expansion', key: 'expansion', max: 200 },
    { label: 'Terraform', key: 'terraform', max: 300 },
    { label: 'Cooperation', key: 'cooperation', max: 150 },
    { label: 'Specialisation', key: 'specialization', max: 100 },
    { label: 'Efficacite', key: 'efficiency', max: 100 },
    { label: 'Penalites', key: 'penalties', max: 100 },
  ]

  const lines: string[] = []
  for (const axis of axes) {
    const val = b[axis.key]
    const isPenalty = axis.key === 'penalties'
    const barStr = isPenalty ? '' : scoreBar(val, axis.max)
    const valStr = `${val.toFixed(1)}`.padStart(7)
    const maxStr = `/${axis.max}`.padStart(5)

    let deltaStr = ''
    if (baseline) {
      const baseVal = baseline[axis.key]
      const delta = val - baseVal
      if (isPenalty) {
        deltaStr = delta < 0 ? `  \x1b[32m${delta.toFixed(1)}\x1b[0m` : delta > 0 ? `  \x1b[31m+${delta.toFixed(1)}\x1b[0m` : ''
      } else {
        deltaStr = delta > 0 ? `  \x1b[32m+${delta.toFixed(1)}\x1b[0m` : delta < 0 ? `  \x1b[31m${delta.toFixed(1)}\x1b[0m` : ''
      }
    }

    if (isPenalty) {
      lines.push(`    ${axis.label.padEnd(16)} ${valStr}      \x1b[31m${'x'.repeat(Math.min(25, Math.round(val / 4)))}\x1b[0m${deltaStr}`)
    } else {
      lines.push(`    ${axis.label.padEnd(16)} ${valStr}${maxStr}  ${barStr}${deltaStr}`)
    }
  }

  lines.push(`    ${'─'.repeat(50)}`)
  lines.push(`    ${'TOTAL'.padEnd(16)} ${b.total.toFixed(1).padStart(7)}${baseline ? `       (baseline: ${baseline.total.toFixed(1)})` : ''}`)

  return lines.join('\n')
}

function run() {
  const args = process.argv.slice(2)
  const wantsSave = args.includes('--save')
  const wantsForce = args.includes('--force')
  const wantsHistory = args.includes('--history')
  const filePath = args.find(a => !a.startsWith('--')) || path.join(__dirname, 'training-results', 'best-weights.json')

  if (!fs.existsSync(filePath)) {
    console.log('Aucun resultat d\'entrainement trouve.')
    console.log('Lance d\'abord: npx tsx app/labo/life/_life-god-game/training/run-training.ts')
    return
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  const meta = data.meta
  const top10: Array<{
    rank: number
    fitness: number
    breakdown: FitnessBreakdown
    weights: Record<string, LifeGodAmBrainWeights>
    session?: number
  }> = data.top10 || []

  console.log()
  console.log('='.repeat(60))
  console.log('       RESULTATS ENTRAINEMENT AMs v2')
  console.log('='.repeat(60))
  console.log()
  console.log(`  Sessions cumulees :  ${meta.totalSessions}`)
  console.log(`  Derniere session  :  ${meta.date?.split('T')[0] ?? '?'}`)
  console.log(`  Config            :  pop=${meta.populationSize} gen=${meta.generations} ticks=${meta.ticksPerEval} runs=${meta.runsPerIndividual}`)
  console.log()
  console.log(`  Meilleure fitness :  \x1b[1m${meta.bestFitness?.toFixed(1) ?? '?'}\x1b[0m`)
  console.log(`  Baseline (1.0)    :  ${meta.baselineFitness?.toFixed(1) ?? '?'}`)

  const improvement = meta.improvementPercent ?? 0
  const improvementColor = improvement >= 15 ? '\x1b[32m' : improvement >= 5 ? '\x1b[33m' : '\x1b[31m'
  console.log(`  Amelioration      :  ${improvementColor}${improvement >= 0 ? '+' : ''}${improvement.toFixed(1)}%\x1b[0m${improvement >= 15 ? ' \x1b[32m✓\x1b[0m' : ' \x1b[31m< seuil 15%\x1b[0m'}`)
  console.log()

  // ── Breakdown du meilleur ──
  if (data.breakdown) {
    console.log('-'.repeat(60))
    console.log('  BREAKDOWN MEILLEUR INDIVIDU')
    console.log('-'.repeat(60))
    console.log()

    const baselineBreakdown: FitnessBreakdown | undefined = meta.baselineFitness != null ? {
      total: meta.baselineFitness,
      expansion: 0, terraform: 0, cooperation: 0, specialization: 0, efficiency: 0, penalties: 0,
    } : undefined

    console.log(formatBreakdownTable(data.breakdown, undefined))
    console.log()
  }

  // ── Top 10 ──
  console.log('-'.repeat(60))
  console.log('  TOP 10 GLOBAL')
  console.log('-'.repeat(60))
  console.log()
  for (const entry of top10) {
    const bd = entry.breakdown
    const bdStr = bd ? `  [Exp:${bd.expansion} Ter:${bd.terraform} Coop:${bd.cooperation} Spec:${bd.specialization}]` : ''
    console.log(`  #${String(entry.rank).padStart(2)}  fitness: ${String(entry.fitness.toFixed(1)).padStart(8)}  |  session #${entry.session ?? '?'}${bdStr}`)
  }
  console.log()

  if (top10.length === 0) return

  // ── Poids du meilleur ──
  const best = top10[0]
  console.log('-'.repeat(60))
  console.log(`  POIDS DU MEILLEUR  (fitness: ${best.fitness.toFixed(1)})`)
  console.log('-'.repeat(60))

  for (const role of ['builder', 'gatherer', 'explorer'] as const) {
    const w: LifeGodAmBrainWeights = best.weights[role]
    console.log()
    console.log(`  \x1b[1m${role.toUpperCase()}\x1b[0m`)
    for (const k of WEIGHT_KEYS) {
      const v = w[k]
      const deviation = Math.abs(v - 1.0)
      const color = deviation > 0.5 ? (v > 1 ? '\x1b[32m' : '\x1b[31m') : '\x1b[0m'
      console.log(`    ${k.padEnd(16)} ${color}${v.toFixed(2).padStart(5)}\x1b[0m  ${bar(v)}`)
    }
  }

  // ── Analyse des tendances ──
  if (top10.length >= 3) {
    console.log()
    console.log('-'.repeat(60))
    console.log('  TENDANCES (moyennes top 5)')
    console.log('-'.repeat(60))
    console.log()

    const topN = top10.slice(0, Math.min(5, top10.length))

    for (const role of ['builder', 'gatherer', 'explorer'] as const) {
      const avgWeights: Record<string, number> = {}
      const stdWeights: Record<string, number> = {}
      for (const k of WEIGHT_KEYS) {
        const values = topN.map(e => e.weights[role][k])
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / values.length
        avgWeights[k] = avg
        stdWeights[k] = Math.sqrt(variance)
      }

      console.log(`  \x1b[1m${role.toUpperCase()}\x1b[0m`)
      for (const k of WEIGHT_KEYS) {
        const avg = avgWeights[k]
        const std = stdWeights[k]
        const stability = std < 0.15 ? '\x1b[32m stable\x1b[0m' : std < 0.4 ? '\x1b[33m variable\x1b[0m' : '\x1b[31m instable\x1b[0m'
        console.log(`    ${k.padEnd(16)} avg: ${avg.toFixed(2).padStart(5)}  std: ${std.toFixed(2).padStart(5)}  ${stability}`)
      }
      console.log()
    }
  }

  // ── Historique detaille ──
  if (wantsHistory) {
    console.log('-'.repeat(60))
    console.log('  HISTORIQUE PAR SESSION')
    console.log('-'.repeat(60))
    console.log()

    const sessions = new Map<number, typeof top10>()
    for (const entry of top10) {
      const s = entry.session ?? 0
      if (!sessions.has(s)) sessions.set(s, [])
      sessions.get(s)!.push(entry)
    }

    for (const [sessionNum, entries] of [...sessions.entries()].sort((a, b) => a[0] - b[0])) {
      const bestInSession = entries.sort((a, b) => b.fitness - a.fitness)[0]
      console.log(`  Session #${sessionNum}  |  meilleur: ${bestInSession.fitness.toFixed(1)}  |  ${entries.length} individu(s) dans le top 10`)
    }
    console.log()
  }

  console.log('='.repeat(60))

  // ── Save ──
  if (wantsSave) {
    console.log()
    console.log('Application des poids...')
    const forceArg = wantsForce ? ' --force' : ''
    try {
      const applyScript = path.join(__dirname, 'apply-weights.ts')
      const result = execSync(`npx tsx "${applyScript}" "${filePath}"${forceArg}`, {
        encoding: 'utf-8',
        cwd: path.join(__dirname, '..', '..', '..', '..'),
      })
      console.log(result)
    } catch (error: unknown) {
      const err = error as { stderr?: string; stdout?: string }
      if (err.stderr) console.error(err.stderr)
      if (err.stdout) console.log(err.stdout)
      process.exit(1)
    }
  } else {
    console.log()
    console.log('Pour appliquer ces poids :  npx tsx app/labo/life/_life-god-game/training/show-results.ts --save')
    console.log()
  }
}

run()
