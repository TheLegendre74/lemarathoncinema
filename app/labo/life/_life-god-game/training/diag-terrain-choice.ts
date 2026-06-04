import { createLifeGodSimulation } from '../simulation/createLifeGodSimulation'

const sim = createLifeGodSimulation({ headless: true })

let frozenAt = -1

for (let t = 0; t < 50000; t++) {
  sim.stepSync()
  const s = sim.getState()

  if (s.matterFrozen && frozenAt < 0) {
    frozenAt = t
    const alive = s.amEntities.filter(a => a.state === 'alive')
    const roleCounts: Record<string, number> = {}
    for (const a of alive) { roleCounts[a.role] = (roleCounts[a.role] || 0) + 1 }
    process.stdout.write(`[t=${t}] FROZEN — ${alive.length} AMs, roles: ${Object.entries(roleCounts).map(([r, c]) => `${r}=${c}`).join(' ')}\n`)
  }

  if (frozenAt < 0) continue

  if ((t - frozenAt) % 500 === 0) {
    const alive = s.amEntities.filter(a => a.state === 'alive')
    const shaping = alive.filter(a => ['shapingSoil', 'shapingVegetation', 'shapingWater', 'shapingRock'].includes(a.behaviorState))
    const shapingCounts: Record<string, number> = {}
    for (const a of shaping) { shapingCounts[a.behaviorState] = (shapingCounts[a.behaviorState] || 0) + 1 }

    const terraforming = alive.filter(a => a.currentGoal === 'terraforming')
    const roleTerraform: Record<string, number> = {}
    for (const a of terraforming) { roleTerraform[a.role] = (roleTerraform[a.role] || 0) + 1 }

    process.stdout.write(
      `[t=${String(t).padStart(5)}] progress=${(s.terraformationProgress * 100).toFixed(1)}% ` +
      `soil=${s.soilCount} veg=${s.vegetationCount} water=${s.waterCount} rock=${s.rockCount} ` +
      `frozen=${s.frozenMatterCount} | ` +
      `shaping: ${Object.entries(shapingCounts).map(([b, c]) => `${b}=${c}`).join(' ') || 'none'} | ` +
      `terraforming roles: ${Object.entries(roleTerraform).map(([r, c]) => `${r}=${c}`).join(' ') || 'none'}\n`
    )

    for (const a of alive.filter(am => am.role === 'builder' && am.currentGoal === 'terraforming').slice(0, 3)) {
      process.stdout.write(
        `  builder ${a.id.slice(-8)} state=${a.behaviorState} pos=(${a.position.x},${a.position.y}) ` +
        `tgt=${a.targetCell ? `(${a.targetCell.x},${a.targetCell.y})` : 'null'} ` +
        `terraformed=${a.memory.terraformedCells} stuckTks=${a.memory.terraformStuckTicks}\n`
      )
    }
  }

  if (s.terraformationProgress >= 0.5 && s.rockCount === 0) {
    if ((t - frozenAt) % 2000 === 0) {
      process.stdout.write(`\n!!! WARNING: progress=${(s.terraformationProgress * 100).toFixed(1)}% but rock=0 at t=${t}\n\n`)
    }
  }

  if (s.ceremonyPhase !== 'none') {
    process.stdout.write(`[t=${t}] CEREMONY phase=${s.ceremonyPhase}\n`)
    break
  }

  if (s.terraformationComplete) {
    process.stdout.write(`[t=${t}] TERRAFORMATION COMPLETE\n`)
    break
  }
}

sim.destroy()
const s = sim.getState()
process.stdout.write(`\nFinal: soil=${s.soilCount} veg=${s.vegetationCount} water=${s.waterCount} rock=${s.rockCount}\n`)
process.stdout.write(`Progress: ${(s.terraformationProgress * 100).toFixed(1)}%\n`)
process.stdout.write(`Complete: ${s.terraformationComplete}\n`)
