/**
 * Test de parité moteur : vérifie que battleEngine.ts reproduit EXACTEMENT
 * les 334 cas de parity_reference.json (calculés par engine2.py avec RNG figée).
 *
 * Usage: npx tsx components/clippy-pokemon/parity.test.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import type { FilmCombatant, MoveEngine, FieldState, SideState, GenreType, StatId, Rarity } from './types'
import { emptyStages, getStageMult } from './types'
import { calculateDamage, newSide } from './battleEngine'
import { BALANCE } from './config/balance.config'
import { getTypeMult } from './config/types.config'

// ── Load data from filesystem (not fetch) ──

const cardsPath = path.resolve(__dirname, '../../public/data/cards.json')
const refPath = path.resolve(__dirname, 'parity_reference.json')

const cardsRaw: Record<string, any> = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'))
const cards: Record<number, any> = {}
for (const [k, v] of Object.entries(cardsRaw)) cards[Number(k)] = v

const ref = JSON.parse(fs.readFileSync(refPath, 'utf-8'))
const cases: any[] = ref.cases

// ── Verify balance config matches reference ──

const cfg = ref.meta.config_utilisee
const configChecks: [string, any, any][] = [
  ['HP_MULT', BALANCE.HP_MULT, cfg.HP_MULT],
  ['ANTISTALL_WALLBREAK_FACTOR', BALANCE.ANTISTALL_WALLBREAK_FACTOR, cfg.AS_B_FACTOR],
  ['OUTSIDER_GATE', BALANCE.OUTSIDER_GATE, cfg.UNDER_GATE],
  ['OUTSIDER_SCALE', BALANCE.OUTSIDER_SCALE, cfg.UNDER_SCALE],
  ['WEATHER_TEAM_BUFF', BALANCE.WEATHER_TEAM_BUFF, cfg.WEATHER_TEAM_BUFF],
  ['LEG_COLD_FACTOR', BALANCE.LEG_COLD_FACTOR, cfg.LEG_COLD_FACTOR],
  ['LEG_WARM', BALANCE.LEG_WARM, cfg.LEG_WARM],
]

let configOK = true
for (const [name, actual, expected] of configChecks) {
  if (actual !== expected) {
    console.error(`CONFIG MISMATCH: ${name} = ${actual}, expected ${expected}`)
    configOK = false
  }
}

// Verify stage table
for (const [k, v] of Object.entries(cfg.STAGE)) {
  const stage = Number(k)
  const expected = v as number
  const actual = getStageMult(stage)
  if (Math.abs(actual - expected) > 0.001) {
    console.error(`STAGE MISMATCH: stage ${k} = ${actual}, expected ${expected}`)
    configOK = false
  }
}

// Verify genre weather mapping
for (const [genre, weather] of Object.entries(cfg.GENRE_WEATHER)) {
  const actual = BALANCE.GENRE_WEATHER[genre]
  const expected = weather as string | null
  if (actual !== expected) {
    console.error(`GENRE_WEATHER MISMATCH: ${genre} = ${actual}, expected ${expected}`)
    configOK = false
  }
}

if (!configOK) {
  console.error('\n⛔ Config mismatches found — fix balance.config.ts before running parity test.')
  process.exit(1)
}
console.log('✓ Balance config matches reference.')

// ── Build a minimal FilmCombatant from card data + test case state ──

function buildTestCombatant(tc: any, side: 'att' | 'def'): FilmCombatant {
  const caseData = tc[side]
  const card = cards[caseData.num]
  if (!card) throw new Error(`Card #${caseData.num} not found in cards.json`)

  const s = card.stats
  const maxHp = Math.floor(s.Post * BALANCE.HP_MULT)
  const hpFull = side === 'def' ? (caseData.hp_full ?? false) : true

  const stages = emptyStages()
  if (caseData.stage) {
    for (const [k, v] of Object.entries(caseData.stage)) {
      stages[k as StatId] = v as number
    }
  }

  const pe = card.passive_engine ?? { cat: 'flavor', params: {} }

  return {
    num: card.num,
    name: card.name,
    types: card.types as GenreType[],
    rarity: (caseData.rarity ?? card.rarity) as Rarity,
    bst: card.bst,
    baseStats: s,
    passive: card.passive ?? { name: '', effet: '' },
    passiveEngine: pe,

    maxHp,
    hp: hpFull ? maxHp : maxHp - 1,
    base: { Spec: s.Spec, Tec: s.Tec, Sce: s.Sce, Prof: s.Prof, Ryt: s.Ryt },
    stages,

    moves: [],
    movesDisplay: [],
    ppLeft: [],

    status: caseData.status ?? null,
    toxCounter: 0,
    sleepTurns: 0,
    confTurns: 0,
    tauntTurns: 0,
    isProtected: false,
    protectStreak: 0,

    disguise: false,
    firstTurn: side === 'att' ? (caseData.first_turn ?? false) : false,
    pivotPending: false,
    recoverCount: 0,
    idleTurns: 0,
    dealtDamage: false,

    dodgeUsed: false,
    endureUsed: false,
    lowhpDone: false,
    entryDone: false,

    mega: null,
    megaActive: false,
    megaMult: 1.0,

    isOutsider: (caseData.rarity ?? card.rarity) === 'RARE',
    outsiderCombo: caseData.undercombo ?? 0,

    isAlive: true,
  }
}

// ── Run all 334 cases ──

let pass = 0
let fail = 0
const failures: string[] = []

for (const tc of cases) {
  const att = buildTestCombatant(tc, 'att')
  const dfn = buildTestCombatant(tc, 'def')

  const mv: MoveEngine = {
    name: tc.move.name,
    type: tc.move.type,
    cat: tc.move.cat,
    pow: tc.move.pow,
    acc: 100,
    pri: 0,
    pp: 99,
  }

  const field: FieldState = {
    weather: tc.field.weather ?? null,
    weatherTurns: tc.field.weather ? 5 : 0,
    weatherSetter: null,
    trickRoom: tc.field.tr ?? 0,
  }

  const sideDef: SideState = {
    ...newSide(),
    reflect: tc.side_def.reflect ?? 0,
    lightscreen: tc.side_def.lightscreen ?? 0,
  }

  const result = calculateDamage(att, dfn, mv, field, sideDef, { deterministic: true })

  const expDmg = tc.expected.damage
  const expTm = tc.expected.type_mult

  if (result.damage === expDmg && result.typeMult === expTm) {
    pass++
  } else {
    fail++
    const line = `#${tc.id} [${tc.label}] att=#${tc.att.num} def=#${tc.def.num} move=${tc.move.name}(${tc.move.type}/${tc.move.cat}/${tc.move.pow}) — got dmg=${result.damage} tm=${result.typeMult}, expected dmg=${expDmg} tm=${expTm}`
    failures.push(line)
  }
}

console.log(`\n${'='.repeat(60)}`)
console.log(`  RÉSULTAT PARITÉ : ${pass}/${cases.length} cas OK`)
console.log(`${'='.repeat(60)}`)

if (failures.length > 0) {
  console.log(`\n⛔ ${fail} cas en échec :\n`)
  for (const f of failures.slice(0, 50)) console.log(`  ${f}`)
  if (failures.length > 50) console.log(`  … +${failures.length - 50} autres`)
  process.exit(1)
} else {
  console.log('\n✅ 334/334 — Parité moteur parfaite.')
}
