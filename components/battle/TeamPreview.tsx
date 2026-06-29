'use client';
import { useState } from 'react';
import type { CardData, GenreType } from '@/lib/battle/types';
import TypeBadge from './TypeBadge';
import RarityBadge from './RarityBadge';
import { BATTLE_CONFIG } from '@/lib/battle/config';
import { TYPE_COLORS } from '@/lib/battle/type-chart';

interface Props {
  team: number[];
  cards: Record<number, CardData>;
  enemyTeam: number[];
  onConfirm: (picked: number[]) => void;
}

export default function TeamPreview({ team, cards, enemyTeam, onConfirm }: Props) {
  const [picked, setPicked] = useState<number[]>([]);

  const toggle = (num: number) => {
    if (picked.includes(num)) {
      setPicked(picked.filter(n => n !== num));
    } else if (picked.length < BATTLE_CONFIG.PICK_SIZE) {
      setPicked([...picked, num]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Équipe adverse */}
      <div>
        <h3 className="font-display text-lg mb-3" style={{ color: 'var(--red)' }}>📎 Équipe de Clippy</h3>
        <div className="grid grid-cols-3 gap-2">
          {enemyTeam.map(num => {
            const card = cards[num];
            if (!card) return null;
            return (
              <div key={num} className="rounded-xl p-2" style={{ background: 'var(--bg3)' }}>
                <div className="font-bold text-xs truncate">{card.name}</div>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {card.types.map(t => <TypeBadge key={t} type={t as GenreType} small />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mon équipe - sélection pick-4 */}
      <div>
        <h3 className="font-display text-lg mb-1" style={{ color: 'var(--gold)' }}>
          Ton équipe — choisis {BATTLE_CONFIG.PICK_SIZE}
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text2)' }}>
          {picked.length}/{BATTLE_CONFIG.PICK_SIZE} sélectionnés
        </p>
        <div className="grid grid-cols-3 gap-2">
          {team.map(num => {
            const card = cards[num];
            if (!card) return null;
            const sel = picked.includes(num);
            const mainColor = TYPE_COLORS[card.types[0] as GenreType] ?? '#666';
            return (
              <div
                key={num}
                className="rounded-xl p-3 cursor-pointer transition-all"
                style={{
                  background: sel ? mainColor + '22' : 'var(--bg3)',
                  border: sel ? `2px solid ${mainColor}` : '2px solid transparent',
                }}
                onClick={() => toggle(num)}
              >
                <div className="font-bold text-sm truncate">{card.name}</div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {card.types.map(t => <TypeBadge key={t} type={t as GenreType} small />)}
                </div>
                <div className="mt-1"><RarityBadge rarity={card.rarity} /></div>
                {sel && (
                  <div className="mt-1 text-xs font-bold" style={{ color: mainColor }}>
                    ✓ Sélectionné ({picked.indexOf(num) + 1})
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        disabled={picked.length !== BATTLE_CONFIG.PICK_SIZE}
        onClick={() => onConfirm(picked)}
        className="w-full py-3 rounded-xl font-display text-lg transition-all"
        style={{
          background: picked.length === BATTLE_CONFIG.PICK_SIZE ? 'var(--gold)' : 'var(--bg4)',
          color: picked.length === BATTLE_CONFIG.PICK_SIZE ? '#000' : 'var(--text3)',
          cursor: picked.length === BATTLE_CONFIG.PICK_SIZE ? 'pointer' : 'not-allowed',
        }}
      >
        Lancer le combat !
      </button>
    </div>
  );
}
