'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadCards, loadSaison, loadClippyTeams, getClimaxMap } from '@/lib/battle/data';
import { getClippyTeam, buildClippyMon, buildPlayerMon } from '@/lib/battle/clippy';
import TeamPreview from '@/components/battle/TeamPreview';
import type { CardData, ClimaxData, ClippyTeams, Difficulty } from '@/lib/battle/types';

export default function PreviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const difficulty = (searchParams.get('difficulty') ?? 'moyen') as Difficulty;
  const seed = parseInt(searchParams.get('seed') ?? '0');
  const teamNums = (searchParams.get('team') ?? '').split(',').map(Number);
  const climaxNum = searchParams.get('climax') ? parseInt(searchParams.get('climax')!) : null;

  const [cards, setCards] = useState<Record<number, CardData> | null>(null);
  const [saison, setSaison] = useState<ClimaxData[] | null>(null);
  const [clippyTeams, setClippyTeams] = useState<ClippyTeams | null>(null);

  useEffect(() => {
    loadCards().then(setCards);
    loadSaison().then(setSaison);
    loadClippyTeams().then(setClippyTeams);
  }, []);

  if (!cards || !saison || !clippyTeams) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div style={{ color: 'var(--text2)' }}>Chargement…</div>
      </div>
    );
  }

  const climaxMap = getClimaxMap(saison);
  const clippy = getClippyTeam(clippyTeams, difficulty, seed);
  const enemyNums = clippy.films.map(f => f.num);

  const handleConfirm = (picked: number[]) => {
    const params = new URLSearchParams({
      difficulty,
      seed: String(seed),
      picked: picked.join(','),
      team: teamNums.join(','),
      climax: climaxNum ? String(climaxNum) : '',
    });
    router.push(`/labo/battle/fight?${params}`);
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="font-display text-2xl mb-1" style={{ color: 'var(--gold)' }}>
          Team Preview
        </h1>
        <p className="text-sm" style={{ color: 'var(--text2)' }}>
          Les deux équipes sont révélées. Choisis tes 4 combattants.
        </p>
      </div>

      <TeamPreview
        team={teamNums}
        cards={cards}
        enemyTeam={enemyNums}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
