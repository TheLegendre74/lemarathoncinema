'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadClippyTeams, loadCards } from '@/lib/battle/data';
import { getClippyTeam, generateSessionSeed, getClippyDifficultyLabel, getClippyDifficultyDesc } from '@/lib/battle/clippy';
import ClippyScouting from '@/components/battle/ClippyScouting';
import type { ClippyTeams, CardData, Difficulty } from '@/lib/battle/types';

const DIFFICULTIES: Difficulty[] = ['facile', 'moyen', 'difficile'];

export default function BattleLobbyPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<ClippyTeams | null>(null);
  const [cards, setCards] = useState<Record<number, CardData> | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('moyen');
  const [seed] = useState(() => generateSessionSeed());

  useEffect(() => {
    loadClippyTeams().then(setTeams);
    loadCards().then(setCards);
  }, []);

  if (!teams || !cards) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg" style={{ color: 'var(--text2)' }}>Chargement…</div>
      </div>
    );
  }

  const clippy = getClippyTeam(teams, difficulty, seed);

  const handleStart = () => {
    const params = new URLSearchParams({
      difficulty,
      seed: String(seed),
      archetype: clippy.key,
    });
    router.push(`/labo/battle/team-builder?${params}`);
  };

  return (
    <div className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl mb-2" style={{ color: 'var(--gold)' }}>
          ⚔️ Défi Clippy
        </h1>
        <p className="text-sm" style={{ color: 'var(--text2)' }}>
          Choisis ta difficulté, étudie l'équipe de Clippy, puis monte la tienne.
        </p>
      </div>

      {/* Choix de difficulté */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>Difficulté</div>
        <div className="grid grid-cols-3 gap-2">
          {DIFFICULTIES.map(d => {
            const active = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="rounded-xl p-3 transition-all text-left"
                style={{
                  background: active ? 'var(--gold3)' : 'var(--bg3)',
                  border: active ? '2px solid var(--gold)' : '2px solid var(--border)',
                }}
              >
                <div className="font-bold text-sm" style={{ color: active ? 'var(--gold)' : 'var(--text)' }}>
                  {getClippyDifficultyLabel(d)}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--text2)' }}>
                  {getClippyDifficultyDesc(d)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scouting */}
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text3)' }}>
          Scouting — Équipe active de Clippy
        </div>
        <ClippyScouting archetype={clippy.key} meta={clippy.meta} films={clippy.films} />
      </div>

      {/* Bouton */}
      <button
        onClick={handleStart}
        className="w-full py-4 rounded-xl font-display text-xl transition-all hover:brightness-110"
        style={{ background: 'var(--gold)', color: '#000' }}
      >
        Construire mon équipe →
      </button>

      {/* Lien simulateur */}
      <div className="mt-4 text-center">
        <button
          onClick={() => router.push('/labo/battle/simulator')}
          className="text-xs px-4 py-2 rounded-lg transition-all"
          style={{ background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)' }}
        >
          Simulateur IA vs IA (équilibrage)
        </button>
      </div>
    </div>
  );
}
