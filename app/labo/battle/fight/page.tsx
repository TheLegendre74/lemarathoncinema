'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadCards, loadSaison, loadClippyTeams, getClimaxMap } from '@/lib/battle/data';
import { getClippyTeam, buildClippyMon, buildPlayerMon } from '@/lib/battle/clippy';
import { battle } from '@/lib/battle/engine';
import type { MonTuple } from '@/lib/battle/engine';
import BattleUI from '@/components/battle/BattleUI';
import type { CardData, ClimaxData, ClippyTeams, Difficulty, BattleResult } from '@/lib/battle/types';

export default function FightPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const difficulty = (searchParams.get('difficulty') ?? 'moyen') as Difficulty;
  const seed = parseInt(searchParams.get('seed') ?? '0');
  const picked = (searchParams.get('picked') ?? '').split(',').map(Number);
  const teamNums = (searchParams.get('team') ?? '').split(',').map(Number);
  const climaxNum = searchParams.get('climax') ? parseInt(searchParams.get('climax')!) : null;

  const [cards, setCards] = useState<Record<number, CardData> | null>(null);
  const [saison, setSaison] = useState<ClimaxData[] | null>(null);
  const [clippyTeams, setClippyTeams] = useState<ClippyTeams | null>(null);
  const [result, setResult] = useState<BattleResult | null>(null);

  useEffect(() => {
    Promise.all([loadCards(), loadSaison(), loadClippyTeams()]).then(([c, s, t]) => {
      setCards(c); setSaison(s); setClippyTeams(t);
    });
  }, []);

  useEffect(() => {
    if (!cards || !saison || !clippyTeams) return;
    if (result) return;

    const climaxMap = getClimaxMap(saison);
    const clippy = getClippyTeam(clippyTeams, difficulty, seed);

    // Build player team (picked 4)
    const teamA: MonTuple[] = picked.map(num =>
      buildPlayerMon(num, cards, climaxMap, num === climaxNum)
    );

    // Build Clippy team (pick best 4 from 6 for now — or all 6 if engine supports)
    const teamB: MonTuple[] = clippy.films.slice(0, picked.length).map(f =>
      buildClippyMon(f, cards, difficulty)
    );

    const battleResult = battle(teamA, teamB, cards);
    setResult(battleResult);
  }, [cards, saison, clippyTeams, result, picked, climaxNum, difficulty, seed]);

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div style={{ color: 'var(--text2)' }}>Simulation du combat…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="text-center mb-4">
        <h1 className="font-display text-2xl" style={{ color: 'var(--gold)' }}>
          ⚔️ Combat !
        </h1>
      </div>

      <BattleUI
        result={result}
        teamA={picked}
        teamB={cards ? Object.keys(cards).map(Number).slice(0, picked.length) : []}
        cards={cards!}
        onFinish={() => router.push('/labo/battle')}
      />
    </div>
  );
}
