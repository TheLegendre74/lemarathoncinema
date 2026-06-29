'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadCards, loadSaison, loadClippyTeams, getClimaxMap } from '@/lib/battle/data';
import { getClippyTeam, buildClippyMon, buildPlayerMon } from '@/lib/battle/clippy';
import { BattleState } from '@/lib/battle/battle-state';
import type { MonTuple } from '@/lib/battle/engine';
import BattleUI from '@/components/battle/BattleUI';
import type { CardData, ClimaxData, ClippyTeams, Difficulty } from '@/lib/battle/types';

export default function FightPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const difficulty = (searchParams.get('difficulty') ?? 'moyen') as Difficulty;
  const seed = parseInt(searchParams.get('seed') ?? '0');
  const picked = (searchParams.get('picked') ?? '').split(',').map(Number).filter(Boolean);
  const teamNums = (searchParams.get('team') ?? '').split(',').map(Number).filter(Boolean);
  const climaxNum = searchParams.get('climax') ? parseInt(searchParams.get('climax')!) : null;

  const [cards, setCards] = useState<Record<number, CardData> | null>(null);
  const [saison, setSaison] = useState<ClimaxData[] | null>(null);
  const [clippyTeams, setClippyTeams] = useState<ClippyTeams | null>(null);
  const [battleState, setBattleState] = useState<BattleState | null>(null);

  useEffect(() => {
    Promise.all([loadCards(), loadSaison(), loadClippyTeams()]).then(([c, s, t]) => {
      setCards(c); setSaison(s); setClippyTeams(t);
    });
  }, []);

  useEffect(() => {
    if (!cards || !saison || !clippyTeams || battleState) return;

    const climaxMap = getClimaxMap(saison);
    const clippy = getClippyTeam(clippyTeams, difficulty, seed);

    const teamA: MonTuple[] = picked.map(num =>
      buildPlayerMon(num, cards, climaxMap, num === climaxNum)
    );

    const teamB: MonTuple[] = clippy.films.slice(0, picked.length).map(f =>
      buildClippyMon(f, cards, difficulty)
    );

    const state = new BattleState(teamA, teamB, cards, difficulty);
    setBattleState(state);
  }, [cards, saison, clippyTeams]);

  if (!battleState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="text-2xl animate-pulse">🎬</div>
          <div style={{ color: 'var(--text2)' }}>Préparation du combat…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <BattleUI
        state={battleState}
        onFinish={() => router.push('/labo/battle')}
      />
    </div>
  );
}
