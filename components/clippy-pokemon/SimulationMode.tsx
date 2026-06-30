'use client'
import { useState, useCallback } from 'react'
import type { CardData, FilmCombatant, MoveEngine, TurnDecision } from './types'
import { buildCombatant } from './cardsData'
import { chooseAI, resolveTurn, newSide, newField, switchIn } from './battleEngine'
import { BALANCE } from './config/balance.config'

interface Props {
  allCards: CardData[]
}

interface SimState {
  run: number
  cumBattles: number
  moveUsage: Record<string, number>
  moveEquipped: Record<string, number>
  filmSeen: Record<number, number>
}

function mkey(num: number, name: string) { return `${num}|${name}` }

function getInitialState(cards: CardData[]): SimState {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('cinemon_sim_state') : null
  if (saved) {
    try { return JSON.parse(saved) } catch {}
  }
  const filmSeen: Record<number, number> = {}
  for (const c of cards) filmSeen[c.num] = 0
  return { run: 0, cumBattles: 0, moveUsage: {}, moveEquipped: {}, filmSeen }
}

function saveState(st: SimState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cinemon_sim_state', JSON.stringify(st))
  }
}

function buildSimTeam(cards: CardData[], st: SimState): FilmCombatant[] {
  const legends = cards.filter(c => c.rarity === 'LÉGENDAIRE')
  const nonLeg = cards.filter(c => c.rarity !== 'LÉGENDAIRE')

  const numLeg = Math.floor(Math.random() * 4) // 0-3 legends
  const legPicks = weighted(legends, numLeg, st.filmSeen)
  const nlPicks = weighted(nonLeg, 6 - numLeg, st.filmSeen)
  const picks = [...legPicks, ...nlPicks]

  return picks.map(card => {
    st.filmSeen[card.num] = (st.filmSeen[card.num] ?? 0) + 1

    // Vary equipped moves — bias toward least-equipped
    const pool = card.moves_engine
    let chosen: string[]
    if (pool.length <= 4) {
      chosen = pool.map(m => m.name)
    } else {
      const scored = [...pool].sort((a, b) =>
        (st.moveEquipped[mkey(card.num, a.name)] ?? 0) - (st.moveEquipped[mkey(card.num, b.name)] ?? 0)
        + (Math.random() * 2 - 1)
      )
      chosen = scored.slice(0, 4).map(m => m.name)
    }
    for (const name of chosen) {
      const k = mkey(card.num, name)
      st.moveEquipped[k] = (st.moveEquipped[k] ?? 0) + 1
    }

    return buildCombatant(card, chosen)
  })
}

function weighted(pool: CardData[], k: number, seen: Record<number, number>): CardData[] {
  const sorted = [...pool].sort((a, b) =>
    (seen[a.num] ?? 0) - (seen[b.num] ?? 0) + (Math.random() * 3 - 1.5)
  )
  return sorted.slice(0, k)
}

export interface TurnLog {
  turn: number
  stateA: { num: number; hp: number; maxHp: number }
  stateB: { num: number; hp: number; maxHp: number }
  actionA: string
  actionB: string
  events: string[]
}

function runSimBattle(teamA: FilmCombatant[], teamB: FilmCombatant[], st: SimState, turnLogs?: TurnLog[]): { winner: string; turns: number } {
  const sideA = newSide(), sideB = newSide()
  const field = newField()
  let idxA = 0, idxB = 0
  const evts: any[] = []
  switchIn(teamA[0], sideA, teamB[0], field, evts)
  switchIn(teamB[0], sideB, teamA[0], field, evts)

  for (let turn = 0; turn < BALANCE.MAX_TURNS; turn++) {
    const a = teamA[idxA], b = teamB[idxB]
    if (!a.isAlive || !b.isAlive) {
      // Auto-switch
      if (!a.isAlive) {
        const next = teamA.findIndex((m, i) => i !== idxA && m.isAlive)
        if (next < 0) return { winner: 'B', turns: turn }
        idxA = next; switchIn(teamA[idxA], sideA, teamB[idxB], field, [])
      }
      if (!b.isAlive) {
        const next = teamB.findIndex((m, i) => i !== idxB && m.isAlive)
        if (next < 0) return { winner: 'A', turns: turn }
        idxB = next; switchIn(teamB[idxB], sideB, teamA[idxA], field, [])
      }
      continue
    }

    const decA = chooseAI(a, b, sideA, sideB, field, teamA, idxA)
    const decB = chooseAI(b, a, sideB, sideA, field, teamB, idxB)

    if (decA.type === 'move' && decA.move.name !== 'Lutte') {
      const k = mkey(a.num, decA.move.name)
      st.moveUsage[k] = (st.moveUsage[k] ?? 0) + 1
    }
    if (decB.type === 'move' && decB.move.name !== 'Lutte') {
      const k = mkey(b.num, decB.move.name)
      st.moveUsage[k] = (st.moveUsage[k] ?? 0) + 1
    }

    const result = resolveTurn(teamA, idxA, teamB, idxB, decA, decB, sideA, sideB, field)

    if (turnLogs) {
      turnLogs.push({
        turn,
        stateA: { num: a.num, hp: a.hp, maxHp: a.maxHp },
        stateB: { num: b.num, hp: b.hp, maxHp: b.maxHp },
        actionA: decA.type === 'move' ? `move:${decA.move.name}` : `switch:${decA.targetIndex}`,
        actionB: decB.type === 'move' ? `move:${decB.move.name}` : `switch:${decB.targetIndex}`,
        events: result.events.map(e => e.text),
      })
    }

    idxA = result.newPlayerIdx
    idxB = result.newClippyIdx

    if (result.done) {
      return { winner: result.winner === 'player' ? 'A' : result.winner === 'clippy' ? 'B' : 'draw', turns: turn }
    }
  }

  // Tiebreaker
  const hpA = teamA.reduce((s, m) => s + m.hp, 0)
  const hpB = teamB.reduce((s, m) => s + m.hp, 0)
  return { winner: hpA > hpB ? 'A' : hpB > hpA ? 'B' : 'draw', turns: BALANCE.MAX_TURNS }
}

function generateReport(
  cards: CardData[], st: SimState, sessionResults: { winner: string; turns: number }[], nb: number,
): string {
  const allMoves: [number, string][] = []
  for (const c of cards) {
    for (const m of c.moves_engine) allMoves.push([c.num, m.name])
  }
  const totalMoves = allMoves.length

  const equippedCov = allMoves.filter(([n, name]) => (st.moveEquipped[mkey(n, name)] ?? 0) > 0).length
  const usedCov = allMoves.filter(([n, name]) => (st.moveUsage[mkey(n, name)] ?? 0) > 0).length
  const neverUsed = allMoves.filter(([n, name]) => (st.moveUsage[mkey(n, name)] ?? 0) === 0)
  const filmsSeen = cards.filter(c => (st.filmSeen[c.num] ?? 0) > 0).length

  const winsA = sessionResults.filter(r => r.winner === 'A').length
  const avgTurns = sessionResults.reduce((s, r) => s + r.turns, 0) / sessionResults.length

  // Rarity winrates (approximate from session)
  const rarityData: Record<string, number[]> = {}
  // Simplified: track from film appearances

  const lines: string[] = []
  const w = (s = '') => lines.push(s)

  w('='.repeat(68))
  w('  MARATHON CINÉMA — RAPPORT DE SIMULATION D\'ÉQUILIBRAGE')
  w(`  Run #${st.run}  ·  ${new Date().toISOString().slice(0, 16)}  ·  ${nb} combats cette session  ·  ${st.cumBattles} cumulés`)
  w('='.repeat(68))
  w()
  w('[1] COUVERTURE (cumulée sur tous les runs)')
  w(`    Films apparus           : ${filmsSeen}/490 (${Math.floor(filmsSeen * 100 / 490)}%)`)
  w(`    Attaques équipées ≥1×    : ${equippedCov}/${totalMoves} (${Math.floor(equippedCov * 100 / totalMoves)}%)`)
  w(`    Attaques JOUÉES par l'IA : ${usedCov}/${totalMoves} (${Math.floor(usedCov * 100 / totalMoves)}%)`)
  w(`    Attaques JAMAIS jouées   : ${neverUsed.length}`)
  w()
  w('[2] COMBINAISONS ALÉATOIRES (cette session)')
  w(`    ${nb} combats · équilibre côté A ${Math.floor(winsA * 100 / nb)}% · durée moy ${avgTurns.toFixed(0)} tours`)
  w()
  w(`[3] ATTAQUES JAMAIS JOUÉES PAR L'IA (${neverUsed.length}) — extrait`)
  for (const [n, name] of neverUsed.slice(0, 30)) {
    const card = cards.find(c => c.num === n)
    w(`    #${n} ${(card?.name ?? '?').substring(0, 22).padEnd(22)} → ${name}`)
  }
  if (neverUsed.length > 30) w(`    … +${neverUsed.length - 30} autres`)
  w()
  w('[4] FLAGS & PISTES D\'ÉQUILIBRAGE')
  w('    • Méta DAMAGE-FORWARD depuis le rework attaques.')
  w('    • Outsider FRAGILE → en playtest, tester un bonus PLAT (+12% dès 2 Rares).')
  w(`    • ${neverUsed.length} attaques jamais jouées par l'IA → vérifier en jeu HUMAIN.`)
  w('    • PP à normaliser (certaines à 99). Cap Légendaire = 3 (validé).')
  w('    • Le réglage FIN se fait en playtest.')
  w()
  w('='.repeat(68))
  w('  Relancer le simu accumule la couverture et varie les matchups/loadouts.')
  w('  Objectif : approcher 100% d\'attaques exercées sur plusieurs runs.')
  w('='.repeat(68))

  return lines.join('\n')
}

export default function SimulationMode({ allCards }: Props) {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [report, setReport] = useState<string | null>(null)
  const [battleCount, setBattleCount] = useState(100)

  const runSim = useCallback(async () => {
    setRunning(true)
    setProgress(0)
    setReport(null)

    // Run in chunks to not block UI
    await new Promise(resolve => setTimeout(resolve, 50))

    const st = getInitialState(allCards)
    st.run++
    const results: { winner: string; turns: number }[] = []
    const chunkSize = 10

    for (let i = 0; i < battleCount; i += chunkSize) {
      const end = Math.min(i + chunkSize, battleCount)
      for (let j = i; j < end; j++) {
        const teamA = buildSimTeam(allCards, st)
        const teamB = buildSimTeam(allCards, st)
        const result = runSimBattle(teamA, teamB, st)
        results.push(result)
      }
      st.cumBattles += (end - i)
      setProgress(Math.floor((end / battleCount) * 100))
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    saveState(st)
    const reportTxt = generateReport(allCards, st, results, battleCount)
    setReport(reportTxt)
    setRunning(false)
  }, [allCards, battleCount])

  const downloadReport = () => {
    if (!report) return
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `RAPPORT_SIMU_${new Date().toISOString().slice(0, 10)}.txt`
    a.click(); URL.revokeObjectURL(url)
  }

  const downloadData = () => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('cinemon_sim_state') : null
    if (!raw) return
    const blob = new Blob([raw], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `SIMU_DATA_${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      padding: 24, maxWidth: 800, margin: '0 auto',
      fontFamily: 'monospace', color: '#fff',
    }}>
      <h2 style={{ marginBottom: 16 }}>Mode Simulation — Équilibrage</h2>
      <p style={{ color: '#aaa', fontSize: 13, marginBottom: 16 }}>
        Lance des combats IA-vs-IA en masse pour tester l&apos;équilibrage.
        La couverture s&apos;accumule entre les runs (état persistant).
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
        <label style={{ fontSize: 13, color: '#aaa' }}>
          Nombre de combats :
          <input
            type="number"
            value={battleCount}
            onChange={e => setBattleCount(Math.max(10, Math.min(1000, parseInt(e.target.value) || 100)))}
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
          {running ? `Simulation en cours… ${progress}%` : 'Lancer la simulation'}
        </button>

        <button
          onClick={downloadData}
          style={{
            padding: '8px 16px', background: '#1a3a5a',
            color: '#8ab4f8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
          }}
        >
          Exporter données JSON
        </button>

        <button
          onClick={() => { localStorage.removeItem('cinemon_sim_state'); setReport(null) }}
          style={{
            padding: '8px 16px', background: '#333',
            color: '#aaa', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12,
          }}
        >
          Reset couverture
        </button>
      </div>

      {report && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Rapport</h3>
            <button
              onClick={downloadReport}
              style={{
                padding: '6px 16px', background: '#2a6a4a',
                color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold',
              }}
            >
              Télécharger le rapport .txt
            </button>
          </div>
          <pre style={{
            background: '#111828', padding: 16, borderRadius: 8,
            border: '1px solid #333', fontSize: 11, overflow: 'auto',
            maxHeight: 500, whiteSpace: 'pre-wrap',
          }}>
            {report}
          </pre>
        </div>
      )}
    </div>
  )
}
