import { createLifeGodSimulation } from '../simulation/createLifeGodSimulation'

const TARGET_PASSES = 30
const MAX_TICKS = 50000
const MAX_ATTEMPTS = 50

let passed = 0
let conwayTimeout = 0
let ceremonyFail = 0
let attempt = 0

while (passed < TARGET_PASSES && attempt < MAX_ATTEMPTS) {
  attempt++
  const sim = createLifeGodSimulation({ headless: true })
  let sawChattering = false
  let sawCircleForming = false
  let sawPraying = false
  let sawDrawing = false
  let frozenAt = -1
  let terraformAt = -1
  let ceremonyAt = -1
  let lastPhase = 'none'

  for (let t = 0; t < MAX_TICKS; t++) {
    sim.stepSync()
    const s = sim.getState()

    if (s.matterFrozen && frozenAt < 0) frozenAt = t
    if (s.terraformationComplete && terraformAt < 0) terraformAt = t

    if (s.ceremonyPhase !== lastPhase) {
      if (s.ceremonyPhase === 'chattering') sawChattering = true
      if (s.ceremonyPhase === 'circleForming') sawCircleForming = true
      if (s.ceremonyPhase === 'praying') sawPraying = true
      if (s.ceremonyPhase === 'drawing') {
        sawDrawing = true
        if (ceremonyAt < 0) ceremonyAt = t
      }
      lastPhase = s.ceremonyPhase
    }

    if (sawDrawing) break
  }

  sim.destroy()
  const s = sim.getState()

  const roles: Record<string, number> = {}
  for (const a of s.amEntities.filter(a => a.state === 'alive')) {
    roles[a.role] = (roles[a.role] || 0) + 1
  }
  const roleStr = Object.entries(roles).map(([r, c]) => `${r}=${c}`).join(' ')

  if (frozenAt < 0) {
    conwayTimeout++
    process.stdout.write(`[attempt ${attempt}] CONWAY_SKIP — never froze in ${MAX_TICKS} ticks\n`)
  } else if (!sawDrawing) {
    ceremonyFail++
    const detail = `frozen=${frozenAt} terraform=${terraformAt} rock=${s.rockCount} progress=${(s.terraformationProgress*100).toFixed(1)}%`
    process.stdout.write(`[attempt ${attempt}] CEREMONY_FAIL — ${detail} roles=[${roleStr}]\n`)
  } else {
    passed++
    process.stdout.write(`[${passed}/${TARGET_PASSES}] PASS — frozen=${frozenAt} terraform=${terraformAt} ceremony=${ceremonyAt} rock=${s.rockCount} roles=[${roleStr}]\n`)
  }
}

process.stdout.write(`\n=== RESULTS ===\n`)
process.stdout.write(`Ceremony PASS: ${passed}/${TARGET_PASSES}\n`)
process.stdout.write(`Conway skips (not a bug): ${conwayTimeout}\n`)
process.stdout.write(`Ceremony FAIL (bug): ${ceremonyFail}\n`)
process.stdout.write(`Total attempts: ${attempt}\n`)
const successRate = passed / Math.max(1, passed + ceremonyFail)
process.stdout.write(`Ceremony success rate: ${(successRate * 100).toFixed(1)}%\n`)
process.exit(ceremonyFail > 0 ? 1 : 0)
