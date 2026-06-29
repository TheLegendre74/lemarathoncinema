'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { loadCards, loadSaison, loadClippyTeams, getClimaxMap, getCardList } from '@/lib/battle/data';
import { getClippyTeam, buildClippyMon, buildPlayerMon, generateSessionSeed } from '@/lib/battle/clippy';
import { battle } from '@/lib/battle/engine';
import type { MonTuple } from '@/lib/battle/engine';
import type { CardData, ClimaxData, ClippyTeams, BattleResult } from '@/lib/battle/types';
import { WEATHER_LABELS } from '@/lib/battle/weather';

export default function SimulatorPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Record<number, CardData> | null>(null);
  const [saison, setSaison] = useState<ClimaxData[] | null>(null);
  const [clippyTeams, setClippyTeams] = useState<ClippyTeams | null>(null);
  const [results, setResults] = useState<SimResult[]>([]);
  const [running, setRunning] = useState(false);
  const [simCount, setSimCount] = useState(100);

  useEffect(() => {
    Promise.all([loadCards(), loadSaison(), loadClippyTeams()]).then(([c, s, t]) => {
      setCards(c); setSaison(s); setClippyTeams(t);
    });
  }, []);

  const runSim = () => {
    if (!cards || !clippyTeams) return;
    setRunning(true);
    const allNums = Object.keys(cards).map(Number);
    const newResults: SimResult[] = [];

    setTimeout(() => {
      for (let i = 0; i < simCount; i++) {
        const aNums = pickRandom(allNums, 4);
        const bNums = pickRandom(allNums, 4);
        const teamA: MonTuple[] = aNums.map(n => [n, cards[n].passive?.name ?? '', cards[n].moves_engine, null]);
        const teamB: MonTuple[] = bNums.map(n => [n, cards[n].passive?.name ?? '', cards[n].moves_engine, null]);

        try {
          const result = battle(teamA, teamB, cards);
          newResults.push({
            id: i,
            winner: result.winner,
            turns: result.turns,
            aliveA: result.aliveA,
            aliveB: result.aliveB,
            teamA: aNums.map(n => cards[n].name),
            teamB: bNums.map(n => cards[n].name),
            logSize: result.log.length,
          });
        } catch {
          newResults.push({
            id: i, winner: 'error' as any, turns: 0,
            aliveA: 0, aliveB: 0,
            teamA: aNums.map(n => cards[n]?.name ?? '?'),
            teamB: bNums.map(n => cards[n]?.name ?? '?'),
            logSize: 0,
          });
        }
      }
      setResults(newResults);
      setRunning(false);
    }, 50);
  };

  const runClippySim = () => {
    if (!cards || !clippyTeams || !saison) return;
    setRunning(true);
    const allNums = Object.keys(cards).map(Number);
    const climaxMap = getClimaxMap(saison);
    const newResults: SimResult[] = [];
    const seed = generateSessionSeed();

    setTimeout(() => {
      const teams = ['HO', 'Stall', 'Balance', 'Neige', 'Distorsion'];
      for (let i = 0; i < simCount; i++) {
        const teamKey = teams[i % teams.length];
        const clippy = clippyTeams[teamKey];
        if (!clippy) continue;

        const playerNums = pickRandom(allNums, 4);
        const teamA: MonTuple[] = playerNums.map(n =>
          buildPlayerMon(n, cards, climaxMap, false)
        );
        const teamB: MonTuple[] = clippy.films.slice(0, 4).map(f =>
          buildClippyMon(f, cards, 'moyen')
        );

        try {
          const result = battle(teamA, teamB, cards);
          newResults.push({
            id: i,
            winner: result.winner,
            turns: result.turns,
            aliveA: result.aliveA,
            aliveB: result.aliveB,
            teamA: playerNums.map(n => cards[n].name),
            teamB: clippy.films.slice(0, 4).map(f => cards[f.num]?.name ?? '?'),
            logSize: result.log.length,
            meta: `vs ${teamKey}`,
          });
        } catch {
          newResults.push({
            id: i, winner: 'error' as any, turns: 0,
            aliveA: 0, aliveB: 0,
            teamA: playerNums.map(n => cards[n]?.name ?? '?'),
            teamB: clippy.films.slice(0, 4).map(f => f.name),
            logSize: 0, meta: `vs ${teamKey}`,
          });
        }
      }
      setResults(newResults);
      setRunning(false);
    }, 50);
  };

  if (!cards || !saison || !clippyTeams) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div style={{ color: 'var(--text2)' }}>Chargement…</div>
      </div>
    );
  }

  const winsA = results.filter(r => r.winner === 'A').length;
  const winsB = results.filter(r => r.winner === 'B').length;
  const draws = results.filter(r => r.winner === 'draw').length;
  const avgTurns = results.length > 0
    ? (results.reduce((s, r) => s + r.turns, 0) / results.length).toFixed(1)
    : '—';

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl" style={{ color: 'var(--gold)' }}>
            Simulateur IA vs IA
          </h1>
          <p className="text-xs" style={{ color: 'var(--text3)' }}>
            Pour tester l'équilibrage — combat auto-résolu (pas le vrai jeu)
          </p>
        </div>
        <button
          onClick={() => router.push('/labo/battle')}
          className="text-sm px-3 py-1 rounded-lg"
          style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
        >
          ← Retour
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text2)' }}>
          Combats :
          <select
            value={simCount}
            onChange={e => setSimCount(Number(e.target.value))}
            className="rounded-lg px-2 py-1 text-sm"
            style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            {[10, 50, 100, 500, 1000].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <button
          onClick={runSim}
          disabled={running}
          className="px-4 py-2 rounded-xl font-display text-sm"
          style={{ background: running ? 'var(--bg4)' : 'var(--gold)', color: running ? 'var(--text3)' : '#000' }}
        >
          {running ? 'Simulation…' : 'Random vs Random'}
        </button>

        <button
          onClick={runClippySim}
          disabled={running}
          className="px-4 py-2 rounded-xl font-display text-sm"
          style={{ background: running ? 'var(--bg4)' : '#60a5fa', color: running ? 'var(--text3)' : '#000' }}
        >
          {running ? 'Simulation…' : 'Random vs Clippy'}
        </button>
      </div>

      {/* Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <StatCard label="A gagne" value={winsA} total={results.length} color="#4ade80" />
          <StatCard label="B gagne" value={winsB} total={results.length} color="#ef4444" />
          <StatCard label="Nuls" value={draws} total={results.length} color="#94a3b8" />
          <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg3)' }}>
            <div className="text-lg font-bold" style={{ color: 'var(--gold)' }}>{avgTurns}</div>
            <div className="text-[10px]" style={{ color: 'var(--text3)' }}>tours moy.</div>
          </div>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--bg3)' }}>
                  <th className="px-2 py-1 text-left" style={{ color: 'var(--text3)' }}>#</th>
                  <th className="px-2 py-1 text-left" style={{ color: 'var(--text3)' }}>Gagnant</th>
                  <th className="px-2 py-1 text-left" style={{ color: 'var(--text3)' }}>Tours</th>
                  <th className="px-2 py-1 text-left" style={{ color: 'var(--text3)' }}>Score</th>
                  <th className="px-2 py-1 text-left" style={{ color: 'var(--text3)' }}>Info</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 200).map(r => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="px-2 py-1" style={{ color: 'var(--text3)' }}>{r.id + 1}</td>
                    <td className="px-2 py-1 font-bold" style={{
                      color: r.winner === 'A' ? '#4ade80' : r.winner === 'B' ? '#ef4444' : 'var(--text3)',
                    }}>
                      {r.winner === 'A' ? 'A' : r.winner === 'B' ? 'B' : '='}
                    </td>
                    <td className="px-2 py-1" style={{ color: 'var(--text2)' }}>{r.turns}</td>
                    <td className="px-2 py-1" style={{ color: 'var(--text2)' }}>{r.aliveA}v{r.aliveB}</td>
                    <td className="px-2 py-1" style={{ color: 'var(--text3)' }}>{r.meta ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: 'var(--bg3)' }}>
      <div className="text-lg font-bold" style={{ color }}>{pct}%</div>
      <div className="text-[10px]" style={{ color: 'var(--text3)' }}>{label} ({value})</div>
    </div>
  );
}

interface SimResult {
  id: number;
  winner: 'A' | 'B' | 'draw';
  turns: number;
  aliveA: number;
  aliveB: number;
  teamA: string[];
  teamB: string[];
  logSize: number;
  meta?: string;
}

function pickRandom(arr: number[], n: number): number[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}
