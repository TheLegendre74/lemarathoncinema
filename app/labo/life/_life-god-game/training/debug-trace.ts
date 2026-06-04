import { createLifeGodSimulation } from '../simulation/createLifeGodSimulation'

const sim = createLifeGodSimulation({ headless: true })

let frozenAt = -1

for (let t = 0; t < 30000; t++) {
  sim.stepSync()
  const s = sim.getState()

  if (s.matterFrozen && frozenAt < 0) {
    frozenAt = t
    const alive = s.amEntities.filter(a => a.state === 'alive')
    process.stdout.write(`\n=== MATTER FROZEN at t=${t} with ${alive.length} AMs ===\n`)
    process.stdout.write(`  frozenMatterCount=${s.frozenMatterCount}\n`)
    const roleCounts: Record<string, number> = {}
    for (const a of alive) { roleCounts[a.role] = (roleCounts[a.role] || 0) + 1 }
    process.stdout.write(`  roles: ${Object.entries(roleCounts).map(([r, c]) => `${r}=${c}`).join(' ')}\n\n`)
  }

  if (frozenAt < 0) continue
  if ((t - frozenAt) % 100 !== 0) continue

  const alive = s.amEntities.filter(a => a.state === 'alive')
  const escaping = alive.filter(a => a.behaviorState === 'escapingStuckArea')
  const seeking = alive.filter(a => a.behaviorState === 'seekingFrozenMatter')
  const shaping = alive.filter(a => ['shapingSoil', 'shapingVegetation', 'shapingWater', 'shapingRock'].includes(a.behaviorState))

  process.stdout.write(
    `t=${String(t).padStart(5)} dt=${String(t - frozenAt).padStart(5)} | ` +
    `seek=${seeking.length} shape=${shaping.length} esc=${escaping.length} | ` +
    `soil=${s.soilCount} veg=${s.vegetationCount} water=${s.waterCount} rock=${s.rockCount} | ` +
    `progress=${(s.terraformationProgress * 100).toFixed(1)}%\n`
  )

  // Detail each stuck AM
  for (const am of escaping) {
    const pos = `(${am.position.x},${am.position.y})`
    const esc = am.memory.escapeTarget ? `→(${am.memory.escapeTarget.x},${am.memory.escapeTarget.y})` : '→null'
    const tgt = am.targetCell ? `tgt(${am.targetCell.x},${am.targetCell.y})` : 'tgt=null'
    const dist = am.memory.escapeTarget
      ? Math.abs(am.position.x - am.memory.escapeTarget.x) + Math.abs(am.position.y - am.memory.escapeTarget.y)
      : -1
    const stuckTks = am.memory.stuckAreaTicks
    const escTks = am.memory.escapeTicksRemaining
    const reason = am.memory.lastStuckReason ?? '?'
    const wallTks = am.memory.wallStickTicks
    const failedAreas = am.memory.failedAreas.length
    process.stdout.write(
      `  ESC ${am.id.slice(-12)} ${pos} ${esc} dist=${dist} escTks=${escTks} stuckTks=${stuckTks} wall=${wallTks} reason=${reason} failedAreas=${failedAreas} ${tgt}\n`
    )
  }

  if (s.ceremonyPhase !== 'none') {
    process.stdout.write(`  [CEREMONY] phase=${s.ceremonyPhase}\n`)
    break
  }
}

sim.destroy()
const s = sim.getState()
process.stdout.write(`\nFinal: soil=${s.soilCount} veg=${s.vegetationCount} water=${s.waterCount} rock=${s.rockCount}\n`)
process.stdout.write(`Progress: ${(s.terraformationProgress * 100).toFixed(1)}%\n`)
process.stdout.write('Done.\n')
