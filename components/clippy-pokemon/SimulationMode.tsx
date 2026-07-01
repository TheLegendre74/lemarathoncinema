'use client'
import { useState, useCallback } from 'react'
import type { CardData, FilmCombatant, MoveEngine, GenreType } from './types'
import { buildCombatant, applyClimaxToTeam } from './cardsData'
import type { Saison1Entry } from './cardsData'
import { chooseAI, resolveTurn, newSide, newField, switchIn, updateClimaxMult } from './battleEngine'
import { BALANCE } from './config/balance.config'

// ── Types ──

interface FilmStat {
  appearances: number
  wins: number
  koGiven: number
  koReceived: number
  hpRemSum: number
  aliveAtEnd: number
}

interface MoveStat {
  equipped: number
  played: number
  totalDamage: number
  koCount: number
}

interface WL { w: number; t: number }

interface SimState {
  version: 2
  run: number
  cumBattles: number
  climaxAwakened: number
  totalTurns: number
  earlyWins: number
  filmStats: Record<number, FilmStat>
  moveStats: Record<string, MoveStat>
  archetypeWR: Record<string, WL>
  genreWR: Record<string, WL>
  rarityWR: Record<string, WL>
  passiveWR: Record<string, WL>
}

interface Props {
  allCards: CardData[]
  saison1: Map<number, Saison1Entry>
}

interface SessionBattle {
  teamA: number[]
  teamB: number[]
  winner: string
  turns: number
}

// ── Helpers ──

function mk(num: number, name: string) { return `${num}|${name}` }

function isIaPilotee(mv: MoveEngine): boolean {
  if (mv.cat === 'phys' || mv.cat === 'spe') return true
  const e = mv.eff ?? ''
  return e === 'recover' || e.startsWith('boost:') || e === 'vatout'
}

function classifyArchetype(team: FilmCombatant[]): string {
  if (team.filter(m => m.rarity === 'RARE').length >= 2) return 'Outsider'
  if (team.some(m => m.moves.some(mv => (mv.eff ?? '') === 'trickroom'))) return 'Distorsion'
  const snowG: string[] = ['Drame', 'Science-Fiction', 'Fantastique']
  if (team.filter(m => m.types.some(t => snowG.includes(t))).length >= 4) return 'Neige'
  if (team.filter(m => m.moves.some(mv => mv.eff === 'recover')).length >= 2) return 'Stall'
  const avg = team.reduce((s, m) => s + m.bst, 0) / team.length
  if (avg > 440 && !team.some(m => m.moves.some(mv => mv.eff === 'recover'))) return 'HO'
  return 'Balance'
}

function initState(cards: CardData[]): SimState {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('cinemon_sim_state') : null
  if (saved) {
    try {
      const p = JSON.parse(saved)
      if (p.version === 2) return p
    } catch { /* reset */ }
  }
  const filmStats: Record<number, FilmStat> = {}
  for (const c of cards) filmStats[c.num] = { appearances: 0, wins: 0, koGiven: 0, koReceived: 0, hpRemSum: 0, aliveAtEnd: 0 }
  return {
    version: 2, run: 0, cumBattles: 0, climaxAwakened: 0, totalTurns: 0, earlyWins: 0,
    filmStats, moveStats: {},
    archetypeWR: {}, genreWR: {}, rarityWR: {}, passiveWR: {},
  }
}

function saveState(st: SimState) {
  if (typeof window !== 'undefined') localStorage.setItem('cinemon_sim_state', JSON.stringify(st))
}

function wlInc(rec: Record<string, WL>, k: string, won: boolean) {
  if (!rec[k]) rec[k] = { w: 0, t: 0 }
  if (won) rec[k].w++
  rec[k].t++
}

function pct(n: number, d: number): string {
  return d > 0 ? (n * 100 / d).toFixed(1) + '%' : '—'
}

// ── Team building with Climax ──

function buildSimTeam(cards: CardData[], st: SimState, saison1: Map<number, Saison1Entry>): FilmCombatant[] {
  const legends = cards.filter(c => c.rarity === 'LÉGENDAIRE')
  const nonLeg = cards.filter(c => c.rarity !== 'LÉGENDAIRE')
  const nLeg = Math.floor(Math.random() * 4)
  const picks = [...wpick(legends, nLeg, st.filmStats), ...wpick(nonLeg, 6 - nLeg, st.filmStats)]

  const team = picks.map(card => {
    const pool = card.moves_engine
    let chosen: string[]
    if (pool.length <= 4) {
      chosen = pool.map(m => m.name)
    } else {
      const scored = [...pool].sort((a, b) =>
        ((st.moveStats[mk(card.num, a.name)]?.equipped ?? 0) -
         (st.moveStats[mk(card.num, b.name)]?.equipped ?? 0))
        + (Math.random() * 2 - 1)
      )
      chosen = scored.slice(0, 4).map(m => m.name)
    }
    for (const n of chosen) {
      const k = mk(card.num, n)
      if (!st.moveStats[k]) st.moveStats[k] = { equipped: 0, played: 0, totalDamage: 0, koCount: 0 }
      st.moveStats[k].equipped++
    }
    return buildCombatant(card, chosen)
  })

  applyClimaxToTeam(team, saison1)
  return team
}

function wpick(pool: CardData[], k: number, fs: Record<number, FilmStat>): CardData[] {
  const sorted = [...pool].sort((a, b) =>
    (fs[a.num]?.appearances ?? 0) - (fs[b.num]?.appearances ?? 0) + (Math.random() * 3 - 1.5)
  )
  return sorted.slice(0, k)
}

// ── Climax auto-awaken ──

function awaken(mon: FilmCombatant, side: ReturnType<typeof newSide>, field: ReturnType<typeof newField>): boolean {
  if (!mon.mega || mon.megaActive || !mon.isAlive) return false
  mon.megaActive = true
  if (mon.mega.affinity) {
    field.weather = mon.mega.affinity
    field.weatherTurns = BALANCE.WEATHER_DURATION
    field.weatherSetter = side
  }
  updateClimaxMult(mon, field)
  return true
}

// ── Battle simulation ──

function runSimBattle(tA: FilmCombatant[], tB: FilmCombatant[], st: SimState): { winner: string; turns: number; clxFired: number } {
  const sA = newSide(), sB = newSide()
  const field = newField()
  let iA = 0, iB = 0
  let cA = false, cB = false, clxF = 0

  switchIn(tA[0], sA, tB[0], field, [])
  switchIn(tB[0], sB, tA[0], field, [])

  for (let turn = 0; turn < BALANCE.MAX_TURNS; turn++) {
    const a = tA[iA], b = tB[iB]

    if (!a.isAlive || !b.isAlive) {
      if (!a.isAlive) {
        const nx = tA.findIndex((m, i) => i !== iA && m.isAlive)
        if (nx < 0) return { winner: 'B', turns: turn, clxFired: clxF }
        iA = nx; switchIn(tA[iA], sA, tB[iB], field, [])
      }
      if (!b.isAlive) {
        const nx = tB.findIndex((m, i) => i !== iB && m.isAlive)
        if (nx < 0) return { winner: 'A', turns: turn, clxFired: clxF }
        iB = nx; switchIn(tB[iB], sB, tA[iA], field, [])
      }
      continue
    }

    // Auto-awaken Climax
    if (turn >= BALANCE.CLIPPY_CLIMAX_TURN) {
      if (!cA && awaken(tA[iA], sA, field)) { cA = true; clxF++ }
      if (!cB && awaken(tB[iB], sB, field)) { cB = true; clxF++ }
    }

    const hpA0 = a.hp, hpB0 = b.hp
    const aLive0 = a.isAlive, bLive0 = b.isAlive

    const decA = chooseAI(a, b, sA, sB, field, tA, iA)
    const decB = chooseAI(b, a, sB, sA, field, tB, iB)

    if (decA.type === 'move' && decA.move.name !== 'Lutte') {
      const k = mk(a.num, decA.move.name)
      if (!st.moveStats[k]) st.moveStats[k] = { equipped: 0, played: 0, totalDamage: 0, koCount: 0 }
      st.moveStats[k].played++
    }
    if (decB.type === 'move' && decB.move.name !== 'Lutte') {
      const k = mk(b.num, decB.move.name)
      if (!st.moveStats[k]) st.moveStats[k] = { equipped: 0, played: 0, totalDamage: 0, koCount: 0 }
      st.moveStats[k].played++
    }

    const res = resolveTurn(tA, iA, tB, iB, decA, decB, sA, sB, field)

    // Damage + KO: A → B
    if (decA.type === 'move' && decA.move.name !== 'Lutte' && (decA.move.cat === 'phys' || decA.move.cat === 'spe')) {
      const dmg = Math.max(0, hpB0 - b.hp)
      const k = mk(a.num, decA.move.name)
      if (st.moveStats[k]) st.moveStats[k].totalDamage += dmg
      if (bLive0 && !b.isAlive) {
        if (st.moveStats[k]) st.moveStats[k].koCount++
        if (st.filmStats[a.num]) st.filmStats[a.num].koGiven++
        if (st.filmStats[b.num]) st.filmStats[b.num].koReceived++
      }
    } else if (bLive0 && !b.isAlive) {
      if (st.filmStats[b.num]) st.filmStats[b.num].koReceived++
    }

    // Damage + KO: B → A
    if (decB.type === 'move' && decB.move.name !== 'Lutte' && (decB.move.cat === 'phys' || decB.move.cat === 'spe')) {
      const dmg = Math.max(0, hpA0 - a.hp)
      const k = mk(b.num, decB.move.name)
      if (st.moveStats[k]) st.moveStats[k].totalDamage += dmg
      if (aLive0 && !a.isAlive) {
        if (st.moveStats[k]) st.moveStats[k].koCount++
        if (st.filmStats[b.num]) st.filmStats[b.num].koGiven++
        if (st.filmStats[a.num]) st.filmStats[a.num].koReceived++
      }
    } else if (aLive0 && !a.isAlive) {
      if (st.filmStats[a.num]) st.filmStats[a.num].koReceived++
    }

    iA = res.newPlayerIdx
    iB = res.newClippyIdx

    if (res.done) {
      return {
        winner: res.winner === 'player' ? 'A' : res.winner === 'clippy' ? 'B' : 'draw',
        turns: turn,
        clxFired: clxF,
      }
    }
  }

  const hpA = tA.reduce((s, m) => s + m.hp, 0)
  const hpB = tB.reduce((s, m) => s + m.hp, 0)
  return { winner: hpA > hpB ? 'A' : hpB > hpA ? 'B' : 'draw', turns: BALANCE.MAX_TURNS, clxFired: clxF }
}

// ── Post-battle aggregation ──

function aggregateBattle(
  st: SimState, cards: CardData[],
  teamA: FilmCombatant[], teamB: FilmCombatant[],
  winner: string, turns: number, clxFired: number,
) {
  st.totalTurns += turns
  st.climaxAwakened += clxFired
  if (turns < 10) st.earlyWins++

  const process = (team: FilmCombatant[], won: boolean) => {
    const arch = classifyArchetype(team)
    wlInc(st.archetypeWR, arch, won)

    for (const m of team) {
      if (!st.filmStats[m.num]) st.filmStats[m.num] = { appearances: 0, wins: 0, koGiven: 0, koReceived: 0, hpRemSum: 0, aliveAtEnd: 0 }
      st.filmStats[m.num].appearances++
      if (won) st.filmStats[m.num].wins++
      if (m.isAlive) {
        st.filmStats[m.num].hpRemSum += m.hp
        st.filmStats[m.num].aliveAtEnd++
      }

      for (const t of m.types) wlInc(st.genreWR, t, won)
      wlInc(st.rarityWR, m.rarity, won)

      const card = cards.find(c => c.num === m.num)
      if (card) wlInc(st.passiveWR, card.passive_engine.cat, won)
    }
  }

  process(teamA, winner === 'A')
  process(teamB, winner === 'B')
}

// ── Report generation ──

function generateReport(
  cards: CardData[], st: SimState, session: SessionBattle[], nb: number,
): string {
  const L: string[] = []
  const w = (s = '') => L.push(s)

  w('═'.repeat(72))
  w('  MARATHON CINÉMA — RAPPORT DE SIMULATION v2 (Climax actif)')
  w(`  Run #${st.run}  ·  ${new Date().toISOString().slice(0, 16)}`)
  w(`  ${nb} combats cette session  ·  ${st.cumBattles} cumulés`)
  w('═'.repeat(72))
  w()

  // [1] Résumé
  const avgTurns = st.totalTurns / Math.max(1, st.cumBattles)
  const clxRate = st.climaxAwakened / Math.max(1, st.cumBattles * 2)
  const earlyRate = st.earlyWins / Math.max(1, st.cumBattles)
  const sideA = session.filter(s => s.winner === 'A').length
  w('[1] RÉSUMÉ')
  w(`    Équilibre A/B cette session : ${pct(sideA, nb)} / ${pct(nb - sideA, nb)}`)
  w(`    Durée moyenne              : ${avgTurns.toFixed(1)} tours`)
  w(`    Taux d'éveil Climax        : ${pct(st.climaxAwakened, st.cumBattles * 2)} (par équipe)`)
  w(`    Combats décidés < 10 tours : ${pct(st.earlyWins, st.cumBattles)}`)
  w()

  // [2] Couverture
  const allMoves: [number, string][] = []
  for (const c of cards) for (const m of c.moves_engine) allMoves.push([c.num, m.name])
  const totalMoves = allMoves.length
  const equippedCov = allMoves.filter(([n, name]) => (st.moveStats[mk(n, name)]?.equipped ?? 0) > 0).length
  const playedCov = allMoves.filter(([n, name]) => (st.moveStats[mk(n, name)]?.played ?? 0) > 0).length
  const filmsSeen = cards.filter(c => (st.filmStats[c.num]?.appearances ?? 0) > 0).length

  w('[2] COUVERTURE')
  w(`    Films apparus            : ${filmsSeen}/490 (${pct(filmsSeen, 490)})`)
  w(`    Attaques équipées ≥1×    : ${equippedCov}/${totalMoves} (${pct(equippedCov, totalMoves)})`)
  w(`    Attaques jouées par l'IA : ${playedCov}/${totalMoves} (${pct(playedCov, totalMoves)})`)
  w()

  // [3] Top / Bottom films
  const minApp = Math.max(5, Math.floor(st.cumBattles * 0.02))
  const ranked = cards
    .filter(c => (st.filmStats[c.num]?.appearances ?? 0) >= minApp)
    .map(c => {
      const f = st.filmStats[c.num]!
      return { num: c.num, name: c.name, rarity: c.rarity, wr: f.wins / f.appearances, ...f }
    })
    .sort((a, b) => b.wr - a.wr)

  w(`[3] TOP 10 FILMS (min ${minApp} apparitions)`)
  for (const f of ranked.slice(0, 10)) {
    w(`    #${String(f.num).padStart(3)} ${f.name.substring(0, 28).padEnd(28)} ${f.rarity.padEnd(12)} WR ${(f.wr * 100).toFixed(1)}%  KO +${f.koGiven}/-${f.koReceived}  (${f.appearances} app)`)
  }
  w()
  w('    BOTTOM 10 (hors RARE)')
  for (const f of ranked.filter(f => f.rarity !== 'RARE').slice(-10).reverse()) {
    w(`    #${String(f.num).padStart(3)} ${f.name.substring(0, 28).padEnd(28)} ${f.rarity.padEnd(12)} WR ${(f.wr * 100).toFixed(1)}%  KO +${f.koGiven}/-${f.koReceived}  (${f.appearances} app)`)
  }
  w()
  w('    BOTTOM RARES (synergie Outsider — 1v1 trompeur)')
  for (const f of ranked.filter(f => f.rarity === 'RARE').slice(-5).reverse()) {
    w(`    #${String(f.num).padStart(3)} ${f.name.substring(0, 28).padEnd(28)} WR ${(f.wr * 100).toFixed(1)}%  (${f.appearances} app)`)
  }
  w()

  // [4] Passifs
  const passiveEntries = Object.entries(st.passiveWR)
    .filter(([, v]) => v.t >= minApp)
    .map(([k, v]) => ({ cat: k, wr: v.w / v.t, ...v }))
    .sort((a, b) => b.wr - a.wr)

  w('[4] PASSIFS — SUR/SOUS-PERFORMANTS')
  const avgWR = st.cumBattles > 0
    ? Object.values(st.filmStats).reduce((s, f) => s + f.wins, 0) / Object.values(st.filmStats).reduce((s, f) => s + f.appearances, 0)
    : 0.5
  for (const p of passiveEntries) {
    const delta = ((p.wr - avgWR) * 100).toFixed(1)
    const flag = p.wr > avgWR + 0.08 ? ' ⬆ SUR-PERF' : p.wr < avgWR - 0.08 ? ' ⬇ SOUS-PERF' : ''
    w(`    ${p.cat.padEnd(20)} WR ${(p.wr * 100).toFixed(1)}% (Δ${delta}%) [${p.t} app]${flag}`)
  }
  w()

  // [5] Agrégats par genre/rareté/archétype
  w('[5] WINRATE PAR GENRE')
  for (const [g, v] of Object.entries(st.genreWR).sort((a, b) => b[1].w / b[1].t - a[1].w / a[1].t)) {
    w(`    ${g.padEnd(18)} ${pct(v.w, v.t).padStart(6)}  (${v.t} app)`)
  }
  w()
  w('    PAR RARETÉ')
  for (const [r, v] of Object.entries(st.rarityWR).sort((a, b) => b[1].w / b[1].t - a[1].w / a[1].t)) {
    w(`    ${r.padEnd(18)} ${pct(v.w, v.t).padStart(6)}  (${v.t} app)`)
  }
  w()
  w('    PAR ARCHÉTYPE')
  for (const [a, v] of Object.entries(st.archetypeWR).sort((a, b) => b[1].w / b[1].t - a[1].w / a[1].t)) {
    w(`    ${a.padEnd(18)} ${pct(v.w, v.t).padStart(6)}  (${v.t} app)`)
  }
  w()

  // [6] Attaques jamais jouées (avec tag ia_pilotee)
  const neverPlayed = allMoves
    .filter(([n, name]) => (st.moveStats[mk(n, name)]?.played ?? 0) === 0)
    .map(([n, name]) => {
      const card = cards.find(c => c.num === n)!
      const mv = card.moves_engine.find(m => m.name === name)!
      return { num: n, film: card.name, move: name, ia: isIaPilotee(mv), cat: mv.cat, type: mv.type }
    })

  const neverIA = neverPlayed.filter(m => m.ia)
  const neverNonIA = neverPlayed.filter(m => !m.ia)

  w(`[6] ATTAQUES JAMAIS JOUÉES — ${neverPlayed.length} total`)
  w(`    dont ia_pilotee=true (PROBLÈME POTENTIEL) : ${neverIA.length}`)
  w(`    dont ia_pilotee=false (normal — IA ne les pilote pas) : ${neverNonIA.length}`)
  w()
  if (neverIA.length > 0) {
    w('    ⚠ Attaques pilotées mais jamais jouées (top 20) :')
    for (const m of neverIA.slice(0, 20)) {
      w(`      #${m.num} ${m.film.substring(0, 22).padEnd(22)} → ${m.move.padEnd(30)} [${m.cat}/${m.type}]`)
    }
    if (neverIA.length > 20) w(`      … +${neverIA.length - 20} autres`)
  }
  w()

  // [7] Climax
  w('[7] CLIMAX')
  w(`    Éveils totaux : ${st.climaxAwakened}`)
  w(`    Taux par équipe : ${pct(st.climaxAwakened, st.cumBattles * 2)}`)
  const climaxFilms = cards.filter(c => {
    const f = st.filmStats[c.num]
    return f && f.appearances >= minApp
  })
  const climaxable = climaxFilms.filter(c => {
    const entry = cards.find(cc => cc.num === c.num)
    return entry !== undefined
  })
  w(`    100 films Climax / 490 total → couverture attendue ~78% des équipes`)
  w()

  w('═'.repeat(72))
  w('  ⚠ Cette data est un détecteur de gros problèmes, pas un oracle')
  w('  de balance fine. Le réglage fin se fait en playtest.')
  w('═'.repeat(72))

  return L.join('\n')
}

// ── CSV / JSON exports ──

function generateFilmsCsv(cards: CardData[], st: SimState): string {
  const header = 'num,name,rarity,types,passive,passive_cat,appearances,wins,winrate,koGiven,koReceived,koRatio,hpRemAvg'
  const rows = cards.map(c => {
    const f = st.filmStats[c.num] ?? { appearances: 0, wins: 0, koGiven: 0, koReceived: 0, hpRemSum: 0, aliveAtEnd: 0 }
    const wr = f.appearances > 0 ? (f.wins / f.appearances).toFixed(4) : ''
    const koR = f.koReceived > 0 ? (f.koGiven / f.koReceived).toFixed(2) : f.koGiven > 0 ? '∞' : ''
    const hpAvg = f.aliveAtEnd > 0 ? (f.hpRemSum / f.aliveAtEnd).toFixed(1) : ''
    const types = c.types.join('+')
    const name = c.name.replace(/,/g, ';')
    const passive = c.passive.name.replace(/,/g, ';')
    return `${c.num},${name},${c.rarity},${types},${passive},${c.passive_engine.cat},${f.appearances},${f.wins},${wr},${f.koGiven},${f.koReceived},${koR},${hpAvg}`
  })
  return [header, ...rows].join('\n')
}

function generateMovesCsv(cards: CardData[], st: SimState): string {
  const header = 'filmNum,filmName,moveName,type,cat,pow,acc,equipped,played,avgDamage,koRate,ia_pilotee'
  const rows: string[] = []
  for (const c of cards) {
    for (const mv of c.moves_engine) {
      const k = mk(c.num, mv.name)
      const ms = st.moveStats[k] ?? { equipped: 0, played: 0, totalDamage: 0, koCount: 0 }
      const avgDmg = ms.played > 0 ? (ms.totalDamage / ms.played).toFixed(1) : ''
      const koRate = ms.played > 0 ? (ms.koCount / ms.played).toFixed(4) : ''
      const ia = isIaPilotee(mv) ? 'true' : 'false'
      const name = c.name.replace(/,/g, ';')
      const mvName = mv.name.replace(/,/g, ';')
      rows.push(`${c.num},${name},${mvName},${mv.type},${mv.cat},${mv.pow ?? ''},${mv.acc ?? 100},${ms.equipped},${ms.played},${avgDmg},${koRate},${ia}`)
    }
  }
  return [header, ...rows].join('\n')
}

function generateAggregatsJson(st: SimState): string {
  const toWR = (rec: Record<string, WL>) => {
    const out: Record<string, { winrate: number; wins: number; total: number }> = {}
    for (const [k, v] of Object.entries(rec)) {
      out[k] = { winrate: v.t > 0 ? +(v.w / v.t).toFixed(4) : 0, wins: v.w, total: v.t }
    }
    return out
  }
  return JSON.stringify({
    meta: {
      cumBattles: st.cumBattles,
      avgTurns: st.totalTurns / Math.max(1, st.cumBattles),
      climaxRate: st.climaxAwakened / Math.max(1, st.cumBattles * 2),
      earlyWinRate: st.earlyWins / Math.max(1, st.cumBattles),
    },
    genreWinrates: toWR(st.genreWR),
    rarityWinrates: toWR(st.rarityWR),
    archetypeWinrates: toWR(st.archetypeWR),
    passiveWinrates: toWR(st.passiveWR),
  }, null, 2)
}

// ── Component ──

export default function SimulationMode({ allCards, saison1 }: Props) {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState<string | null>(null)
  const [battleCount, setBattleCount] = useState(200)
  const [lastState, setLastState] = useState<SimState | null>(null)

  const runSim = useCallback(async () => {
    setRunning(true)
    setProgress(0)
    setReport(null)
    await new Promise(r => setTimeout(r, 50))

    const st = initState(allCards)
    st.run++
    const session: SessionBattle[] = []
    const chunkSize = 10

    for (let i = 0; i < battleCount; i += chunkSize) {
      const end = Math.min(i + chunkSize, battleCount)
      for (let j = i; j < end; j++) {
        const teamA = buildSimTeam(allCards, st, saison1)
        const teamB = buildSimTeam(allCards, st, saison1)
        const { winner, turns, clxFired } = runSimBattle(teamA, teamB, st)

        aggregateBattle(st, allCards, teamA, teamB, winner, turns, clxFired)

        session.push({
          teamA: teamA.map(m => m.num),
          teamB: teamB.map(m => m.num),
          winner,
          turns,
        })
      }
      st.cumBattles += (end - i)
      setProgress(Math.floor((end / battleCount) * 100))
      await new Promise(r => setTimeout(r, 0))
    }

    saveState(st)
    setLastState(st)
    setReport(generateReport(allCards, st, session, battleCount))
    setRunning(false)
  }, [allCards, saison1, battleCount])

  const download = (content: string, filename: string, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url)
  }

  const d = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'monospace', color: '#fff' }}>
      <h2 style={{ marginBottom: 8 }}>Mode Simulation v2 — Climax actif</h2>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>
        Combats IA-vs-IA avec Climax, métriques enrichies, tag ia_pilotee, exports structurés.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13, color: '#aaa' }}>
          Combats :
          <input
            type="number"
            value={battleCount}
            onChange={e => setBattleCount(Math.max(10, Math.min(5000, parseInt(e.target.value) || 200)))}
            style={{
              marginLeft: 8, width: 80, padding: '4px 8px',
              background: '#111828', border: '1px solid #333', borderRadius: 4,
              color: '#fff', fontSize: 13,
            }}
          />
        </label>
        <button
          onClick={runSim}
          disabled={running}
          style={{
            padding: '8px 24px', background: running ? '#333' : '#e50914',
            color: '#fff', border: 'none', borderRadius: 6,
            cursor: running ? 'not-allowed' : 'pointer', fontWeight: 'bold',
          }}
        >
          {running ? `Simulation… ${progress}%` : 'Lancer la simulation'}
        </button>
        <button
          onClick={() => { localStorage.removeItem('cinemon_sim_state'); setReport(null); setLastState(null) }}
          style={{ padding: '8px 16px', background: '#333', color: '#aaa', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
        >
          Reset
        </button>
      </div>

      {lastState && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => report && download(report, `RAPPORT_SIMU_${d}.txt`)}
            style={btnStyle('#2a6a4a')}>Rapport .txt</button>
          <button onClick={() => download(generateFilmsCsv(allCards, lastState), `films_${d}.csv`)}
            style={btnStyle('#1a3a5a')}>films.csv</button>
          <button onClick={() => download(generateMovesCsv(allCards, lastState), `moves_${d}.csv`)}
            style={btnStyle('#1a3a5a')}>moves.csv</button>
          <button onClick={() => download(generateAggregatsJson(lastState), `aggregats_${d}.json`, 'application/json;charset=utf-8')}
            style={btnStyle('#1a3a5a')}>agrégats.json</button>
          <button onClick={() => download(JSON.stringify(lastState), `SIMU_DATA_${d}.json`, 'application/json;charset=utf-8')}
            style={btnStyle('#333')}>Données brutes</button>
        </div>
      )}

      {report && (
        <pre style={{
          background: '#111828', padding: 16, borderRadius: 8,
          border: '1px solid #333', fontSize: 11, overflow: 'auto',
          maxHeight: 600, whiteSpace: 'pre-wrap',
        }}>
          {report}
        </pre>
      )}
    </div>
  )
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    padding: '6px 14px', background: bg,
    color: '#fff', border: 'none', borderRadius: 6,
    cursor: 'pointer', fontSize: 12, fontWeight: 'bold',
  }
}
