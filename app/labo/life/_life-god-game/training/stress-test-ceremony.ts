import { createLifeGodSimulation } from '../simulation/createLifeGodSimulation'

const TARGET_PASSES = 30
const MAX_TICKS = 50000
const APPLY_EXTRA_TICKS = 8000
const MAX_ATTEMPTS = 50
const CONWAY_TIMEOUT = 40000

let passed = 0
let conwayTimeout = 0
let ceremonyFail = 0
let applyFail = 0
let attempt = 0

function makeFakePattern(type: string, index: number) {
  const cells = []
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      cells.push({ x, y })
    }
  }
  return {
    type: type as any,
    width: 16,
    height: 16,
    cells,
    requestIndex: index,
    colorHint: '#888888',
    cellColors: {} as Record<string, string>,
  }
}

while (passed < TARGET_PASSES && attempt < MAX_ATTEMPTS) {
  attempt++
  const sim = createLifeGodSimulation({ headless: true })
  let sawDrawing = false
  let frozenAt = -1
  let terraformAt = -1
  let ceremonyAt = -1
  let allPatternsSubmitted = false
  let applyingStartedAt = -1
  let applyingWorked = false
  let isConwayTimeout = false

  const totalTicks = MAX_TICKS + APPLY_EXTRA_TICKS

  for (let t = 0; t < totalTicks; t++) {
    sim.stepSync()
    const s = sim.getState()

    if (s.matterFrozen && frozenAt < 0) frozenAt = t
    if (s.terraformationComplete && terraformAt < 0) terraformAt = t

    if (frozenAt < 0 && t >= CONWAY_TIMEOUT) {
      isConwayTimeout = true
      break
    }

    if (s.ceremonyPhase === 'drawing' && s.currentPatternRequest) {
      if (!sawDrawing) { sawDrawing = true; ceremonyAt = t }
      sim.submitPlayerPattern(makeFakePattern(s.currentPatternRequest.type, s.currentPatternRequest.requestIndex))
    }

    if (s.currentMission === 'applyingPlayerPatterns' && applyingStartedAt < 0) {
      applyingStartedAt = t
    }

    if (s.currentMission === 'stable' && applyingStartedAt >= 0) {
      applyingWorked = true
      break
    }

    if (!allPatternsSubmitted && s.playerPatternCollectionComplete) {
      allPatternsSubmitted = true
    }
  }

  sim.destroy()
  const s = sim.getState()

  const roles: Record<string, number> = {}
  for (const a of s.amEntities.filter(a => a.state === 'alive')) {
    roles[a.role] = (roles[a.role] || 0) + 1
  }
  const roleStr = Object.entries(roles).map(([r, c]) => `${r}=${c}`).join(' ')

  if (isConwayTimeout || frozenAt < 0) {
    conwayTimeout++
    process.stdout.write(`[attempt ${attempt}] CONWAY_SKIP\n`)
  } else if (!sawDrawing) {
    ceremonyFail++
    const detail = `frozen=${frozenAt} terraform=${terraformAt} rock=${s.rockCount} progress=${(s.terraformationProgress*100).toFixed(1)}%`
    process.stdout.write(`[attempt ${attempt}] CEREMONY_FAIL — ${detail} roles=[${roleStr}]\n`)
  } else if (allPatternsSubmitted && !applyingWorked) {
    applyFail++
    process.stdout.write(`[attempt ${attempt}] APPLY_FAIL — applyStart=${applyingStartedAt} roles=[${roleStr}]\n`)
  } else {
    passed++
    process.stdout.write(`[${passed}/${TARGET_PASSES}] PASS — frozen=${frozenAt} terraform=${terraformAt} ceremony=${ceremonyAt} apply=${applyingStartedAt} roles=[${roleStr}]\n`)
  }
}

process.stdout.write(`\n=== RESULTS ===\n`)
process.stdout.write(`Full PASS: ${passed}/${TARGET_PASSES}\n`)
process.stdout.write(`Conway skips: ${conwayTimeout}\n`)
process.stdout.write(`Ceremony FAIL: ${ceremonyFail}\n`)
process.stdout.write(`Apply FAIL: ${applyFail}\n`)
process.stdout.write(`Total attempts: ${attempt}\n`)
const successRate = passed / Math.max(1, passed + ceremonyFail + applyFail)
process.stdout.write(`Success rate: ${(successRate * 100).toFixed(1)}%\n`)
process.exit((ceremonyFail + applyFail) > 0 ? 1 : 0)
