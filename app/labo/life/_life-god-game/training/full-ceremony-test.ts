import { createLifeGodSimulation } from '../simulation/createLifeGodSimulation'

const MAX_TICKS = 60000
const REPORT_INTERVAL = 200

const sim = createLifeGodSimulation({ headless: true })

let frozenAt = -1
let terraformCompleteAt = -1
let ceremonyStartAt = -1
let sawChattering = false
let sawCircleForming = false
let sawPraying = false
let sawDrawing = false
let lastPhase = 'none'

for (let t = 0; t < MAX_TICKS; t++) {
  sim.stepSync()
  const s = sim.getState()

  if (s.matterFrozen && frozenAt < 0) {
    frozenAt = t
    const alive = s.amEntities.filter(a => a.state === 'alive')
    const roleCounts: Record<string, number> = {}
    for (const a of alive) { roleCounts[a.role] = (roleCounts[a.role] || 0) + 1 }
    process.stdout.write(`\n[t=${t}] MATTER FROZEN — ${alive.length} AMs, roles: ${Object.entries(roleCounts).map(([r, c]) => `${r}=${c}`).join(' ')}\n`)
  }

  if (s.terraformationComplete && terraformCompleteAt < 0) {
    terraformCompleteAt = t
    process.stdout.write(`[t=${t}] TERRAFORMATION COMPLETE — progress=${(s.terraformationProgress * 100).toFixed(1)}% soil=${s.soilCount} veg=${s.vegetationCount} water=${s.waterCount} rock=${s.rockCount}\n`)
  }

  if (s.ceremonyPhase !== 'none' && ceremonyStartAt < 0) {
    ceremonyStartAt = t
    process.stdout.write(`[t=${t}] CEREMONY STARTED — phase=${s.ceremonyPhase}\n`)
  }

  if (s.ceremonyPhase !== lastPhase) {
    process.stdout.write(`[t=${t}] phase: ${lastPhase} -> ${s.ceremonyPhase}`)
    if (s.ceremonyPhase === 'chattering') sawChattering = true
    if (s.ceremonyPhase === 'circleForming') sawCircleForming = true
    if (s.ceremonyPhase === 'praying') sawPraying = true
    if (s.ceremonyPhase === 'drawing') sawDrawing = true

    if (s.ceremonyPhase !== 'none') {
      const alive = s.amEntities.filter(a => a.state === 'alive')
      const behaviors: Record<string, number> = {}
      for (const a of alive) { behaviors[a.behaviorState] = (behaviors[a.behaviorState] || 0) + 1 }
      process.stdout.write(` | behaviors: ${Object.entries(behaviors).map(([b, c]) => `${b}=${c}`).join(' ')}`)
      if (s.speechBubbles.length > 0) {
        process.stdout.write(` | bubbles=${s.speechBubbles.length}`)
      }
      if (s.ceremonyCenterPoint) {
        process.stdout.write(` | center=(${s.ceremonyCenterPoint.x},${s.ceremonyCenterPoint.y})`)
      }
      if (s.ceremonyRequestType) {
        process.stdout.write(` | request=${s.ceremonyRequestType}`)
      }
    }
    process.stdout.write('\n')
    lastPhase = s.ceremonyPhase
  }

  if (frozenAt >= 0 && t % REPORT_INTERVAL === 0 && s.ceremonyPhase === 'none' && !s.terraformationComplete) {
    process.stdout.write(
      `  [t=${String(t).padStart(5)}] progress=${(s.terraformationProgress * 100).toFixed(1)}% soil=${s.soilCount} veg=${s.vegetationCount} water=${s.waterCount} rock=${s.rockCount}\n`
    )
  }

  if (sawDrawing) {
    process.stdout.write(`\n=== DRAWING PHASE REACHED at t=${t} ===\n`)
    break
  }
}

sim.destroy()
const s = sim.getState()

process.stdout.write('\n--- RESULTS ---\n')
process.stdout.write(`frozenAt=${frozenAt} terraformCompleteAt=${terraformCompleteAt} ceremonyStartAt=${ceremonyStartAt}\n`)
process.stdout.write(`soil=${s.soilCount} veg=${s.vegetationCount} water=${s.waterCount} rock=${s.rockCount}\n`)
process.stdout.write(`progress=${(s.terraformationProgress * 100).toFixed(1)}%\n`)
process.stdout.write(`Phases seen: chattering=${sawChattering} circleForming=${sawCircleForming} praying=${sawPraying} drawing=${sawDrawing}\n`)

const ok = sawChattering && sawCircleForming && sawPraying && sawDrawing
process.stdout.write(ok ? '\nTEST PASSED\n' : '\nTEST FAILED — did not reach all ceremony phases\n')
process.exit(ok ? 0 : 1)
